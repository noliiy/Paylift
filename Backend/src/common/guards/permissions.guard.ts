import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { PERMISSIONS_KEY } from "../decorators";
import { AppException, ErrorCodes } from "../utils/app-exception";
import { JwtPayload } from "../types";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    if (!user?.employeeId) {
      throw new AppException(
        ErrorCodes.FORBIDDEN,
        "Employee context required",
        403,
      );
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: user.employeeId },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });

    const codes = new Set(
      employee?.role.rolePermissions.map((rp) => rp.permission.code) ?? [],
    );

    const hasAll = required.every((p) => codes.has(p));
    if (!hasAll) {
      throw new AppException(
        ErrorCodes.FORBIDDEN,
        "Missing required permissions",
        403,
      );
    }
    return true;
  }
}
