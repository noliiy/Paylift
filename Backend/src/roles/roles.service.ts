import { Injectable } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
  ) {}

  async create(businessId: string, dto: CreateRoleDto, user: JwtPayload) {
    await this.tenant.assertBusinessAccess(
      user.businessId,
      businessId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.role.create({
      data: {
        businessId,
        name: dto.name,
        code: dto.code,
        rolePermissions: dto.permissionIds?.length
          ? {
              create: dto.permissionIds.map((permissionId) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async findAll(businessId: string, user: JwtPayload) {
    await this.tenant.assertBusinessAccess(
      user.businessId,
      businessId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.role.findMany({
      where: { businessId },
      include: { rolePermissions: { include: { permission: true } } },
      orderBy: { name: "asc" },
    });
  }

  async update(roleId: string, dto: UpdateRoleDto, user: JwtPayload) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role?.businessId) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Role not found", 404);
    }
    await this.tenant.assertBusinessAccess(
      user.businessId,
      role.businessId,
      user.role === RoleCode.ADMIN,
    );

    if (dto.permissionIds) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId } });
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: { name: dto.name },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }
}
