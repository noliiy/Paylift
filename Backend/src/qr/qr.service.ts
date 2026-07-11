import { Injectable } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import { generateToken, hashToken } from "../common/utils/crypto.util";
import { CreateQrTokenDto, ResolveQrTokenDto } from "./dto/qr.dto";

@Injectable()
export class QrService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
  ) {}

  async createToken(dto: CreateQrTokenDto, user: JwtPayload) {
    await this.tenant.assertBusinessAccess(
      user.businessId,
      dto.businessId,
      user.role === RoleCode.ADMIN,
    );
    await this.tenant.assertBranchAccess(
      user.businessId,
      dto.branchId,
      user.role === RoleCode.ADMIN,
    );

    const table = await this.prisma.restaurantTable.findUnique({
      where: { id: dto.tableId },
    });
    if (!table || table.branchId !== dto.branchId) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Table not found", 404);
    }

    const plainToken = generateToken(32);
    const tokenHash = hashToken(plainToken);
    const ttlMinutes = dto.ttlMinutes ?? 60;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const record = await this.prisma.qRToken.create({
      data: {
        businessId: dto.businessId,
        branchId: dto.branchId,
        tableId: dto.tableId,
        tokenHash,
        expiresAt,
      },
    });

    return { id: record.id, token: plainToken, expiresAt: record.expiresAt };
  }

  async resolve(dto: ResolveQrTokenDto) {
    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.qRToken.findUnique({
      where: { tokenHash },
      include: { business: true, branch: true, table: true },
    });

    if (!record) {
      throw new AppException(
        ErrorCodes.QR_TOKEN_INVALID,
        "Invalid QR token",
        401,
      );
    }
    if (record.revokedAt) {
      throw new AppException(
        ErrorCodes.QR_TOKEN_REVOKED,
        "QR token has been revoked",
        401,
      );
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new AppException(
        ErrorCodes.QR_TOKEN_EXPIRED,
        "QR token has expired",
        401,
      );
    }

    const activeSession = await this.prisma.tableSession.findFirst({
      where: { tableId: record.tableId, status: "OPEN" },
      include: { participants: true },
    });

    return {
      businessId: record.businessId,
      branchId: record.branchId,
      tableId: record.tableId,
      business: record.business,
      branch: record.branch,
      table: record.table,
      tableSession: activeSession ?? null,
      createSessionHint: activeSession
        ? null
        : { tableId: record.tableId, branchId: record.branchId },
    };
  }
}
