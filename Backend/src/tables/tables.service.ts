import { Injectable } from "@nestjs/common";
import { RoleCode, TableStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import { CreateTableDto, UpdateTableDto } from "./dto/table.dto";

@Injectable()
export class TablesService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
  ) {}

  async create(branchId: string, dto: CreateTableDto, user: JwtPayload) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.restaurantTable.create({
      data: {
        branchId,
        number: dto.number,
        displayName: dto.displayName,
        capacity: dto.capacity,
      },
    });
  }

  async findAll(branchId: string, user: JwtPayload) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.restaurantTable.findMany({
      where: { branchId },
      orderBy: { number: "asc" },
    });
  }

  async update(tableId: string, dto: UpdateTableDto, user: JwtPayload) {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Table not found", 404);
    }
    await this.tenant.assertBranchAccess(
      user.businessId,
      table.branchId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.restaurantTable.update({
      where: { id: tableId },
      data: dto,
    });
  }

  async disable(tableId: string, user: JwtPayload) {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Table not found", 404);
    }
    await this.tenant.assertBranchAccess(
      user.businessId,
      table.branchId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.restaurantTable.update({
      where: { id: tableId },
      data: { status: TableStatus.DISABLED },
    });
  }
}
