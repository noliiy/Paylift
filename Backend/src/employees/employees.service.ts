import { Injectable } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import { CreateEmployeeDto, UpdateEmployeeDto } from "./dto/employee.dto";

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
  ) {}

  async create(businessId: string, dto: CreateEmployeeDto, user: JwtPayload) {
    await this.tenant.assertBusinessAccess(
      user.businessId,
      businessId,
      user.role === RoleCode.ADMIN,
    );
    if (dto.branchId) {
      await this.tenant.assertBranchAccess(
        user.businessId,
        dto.branchId,
        user.role === RoleCode.ADMIN,
      );
    }
    return this.prisma.employee.create({
      data: {
        businessId,
        userId: dto.userId,
        roleId: dto.roleId,
        branchId: dto.branchId,
      },
      include: { user: true, role: true, branch: true },
    });
  }

  async findAll(businessId: string, user: JwtPayload) {
    await this.tenant.assertBusinessAccess(
      user.businessId,
      businessId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.employee.findMany({
      where: { businessId },
      include: { user: true, role: true, branch: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(employeeId: string, dto: UpdateEmployeeDto, user: JwtPayload) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Employee not found", 404);
    }
    await this.tenant.assertBusinessAccess(
      user.businessId,
      employee.businessId,
      user.role === RoleCode.ADMIN,
    );
    if (dto.branchId) {
      await this.tenant.assertBranchAccess(
        user.businessId,
        dto.branchId,
        user.role === RoleCode.ADMIN,
      );
    }
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: dto,
      include: { user: true, role: true, branch: true },
    });
  }
}
