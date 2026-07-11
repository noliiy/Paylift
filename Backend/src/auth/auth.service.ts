import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RoleCode, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateToken } from '../common/utils/crypto.util';
import { JwtPayload } from '../common/types';
import { OAuthSignInDto } from './dto/oauth-sign-in.dto';

type OAuthProvider = 'apple' | 'google';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  signInWithApple(dto: OAuthSignInDto) {
    return this.signInWithOAuth('apple', dto);
  }

  signInWithGoogle(dto: OAuthSignInDto) {
    return this.signInWithOAuth('google', dto);
  }

  private async signInWithOAuth(provider: OAuthProvider, dto: OAuthSignInDto) {
    const subject =
      dto.identityToken ??
      `mock-${provider}-${dto.displayName.toLowerCase().replace(/\s/g, '-')}`;

    const where =
      provider === 'apple'
        ? { appleSubject: subject, deletedAt: null }
        : { googleSubject: subject, deletedAt: null };

    let user = await this.prisma.user.findFirst({ where });

    if (!user) {
      const existingByEmail = dto.email
        ? await this.prisma.user.findFirst({
            where: { email: dto.email, deletedAt: null },
          })
        : null;

      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data:
            provider === 'apple'
              ? { appleSubject: subject, displayName: dto.displayName }
              : { googleSubject: subject, displayName: dto.displayName },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            displayName: dto.displayName,
            email: dto.email,
            ...(provider === 'apple'
              ? { appleSubject: subject }
              : { googleSubject: subject }),
            customerProfile: { create: { displayName: dto.displayName } },
          },
        });
      }
    } else if (dto.email && !user.email) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { email: dto.email },
      });
    }

    return this.issueTokensForUser(user);
  }

  async refresh(refreshToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    let matched = null as (typeof tokens)[0] | null;
    for (const t of tokens) {
      if (await bcrypt.compare(refreshToken, t.tokenHash)) {
        matched = t;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokensForUser(matched.user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokens = await this.prisma.refreshToken.findMany({
        where: { userId, revokedAt: null },
      });
      for (const t of tokens) {
        if (await bcrypt.compare(refreshToken, t.tokenHash)) {
          await this.prisma.refreshToken.update({
            where: { id: t.id },
            data: { revokedAt: new Date() },
          });
        }
      }
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        employees: {
          where: { isActive: true },
          include: { role: true, business: true, branch: true },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async issueTokensForUser(user: User) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId: user.id, isActive: true },
      include: { role: true },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: employee?.role.code ?? RoleCode.CUSTOMER,
      businessId: employee?.businessId,
      branchId: employee?.branchId ?? undefined,
      employeeId: employee?.id,
    };

    return this.issueTokens(payload);
  }

  private async issueTokens(payload: JwtPayload) {
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('jwt.accessSecret'),
      expiresIn: this.config.get('jwt.accessTtl'),
    });

    const refreshToken = generateToken(48);
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const refreshTtl = this.config.get<string>('jwt.refreshTtl') ?? '7d';
    const expiresAt = new Date(Date.now() + this.parseTtlMs(refreshTtl));

    await this.prisma.refreshToken.create({
      data: { userId: payload.sub, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get('jwt.accessTtl'),
      userId: payload.sub,
    };
  }

  private parseTtlMs(ttl: string): number {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const n = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };
    return n * (multipliers[unit] ?? 86400000);
  }
}
