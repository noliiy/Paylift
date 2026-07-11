import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  SignInWithAppleDto,
  SignInWithGoogleDto,
  RefreshTokenDto,
  LogoutDto,
} from './dto/oauth-sign-in.dto';
import { Public } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types';
import { AuditAction } from '../common/decorators';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('sign-in-with-apple')
  @ApiOperation({ summary: 'Sign in with Apple (mockable for MVP)' })
  @AuditAction('AUTH_SIGN_IN_APPLE', 'User')
  signInWithApple(@Body() dto: SignInWithAppleDto) {
    return this.auth.signInWithApple(dto);
  }

  @Public()
  @Post('sign-in-with-google')
  @ApiOperation({ summary: 'Sign in with Google (mockable for MVP)' })
  @AuditAction('AUTH_SIGN_IN_GOOGLE', 'User')
  signInWithGoogle(@Body() dto: SignInWithGoogleDto) {
    return this.auth.signInWithGoogle(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @AuditAction('AUTH_LOGOUT', 'User')
  logout(@CurrentUser() user: JwtPayload, @Body() dto: LogoutDto) {
    return this.auth.logout(user.sub, dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }
}
