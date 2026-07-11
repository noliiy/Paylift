import { Injectable } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

@Injectable()
export class BusinessesService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
  ) {}

  async create(dto: CreateBusinessDto) {
    return this.prisma.business.create({
      data: {
        name: dto.name,
        legalName: dto.legalName,
        taxNumber: dto.taxNumber,
        defaultCurrency: dto.defaultCurrency ?? "TRY",
      },
    });
  }

  async findAll(user: JwtPayload) {
    if (user.role === RoleCode.ADMIN) {
      return this.prisma.business.findMany({ orderBy: { createdAt: "desc" } });
    }
    if (!user.businessId) {
      return [];
    }
    const business = await this.prisma.business.findUnique({
      where: { id: user.businessId },
    });
    return business ? [business] : [];
  }

  async update(businessId: string, dto: UpdateBusinessDto, user: JwtPayload) {
    await this.tenant.assertBusinessAccess(
      user.businessId,
      businessId,
      user.role === RoleCode.ADMIN,
    );
    const existing = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!existing) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Business not found", 404);
    }
    return this.prisma.business.update({
      where: { id: businessId },
      data: dto,
    });
  }

  async findBranches(businessId: string, user: JwtPayload) {
    await this.tenant.assertBusinessAccess(
      user.businessId,
      businessId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.branch.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
    });
  }
}
