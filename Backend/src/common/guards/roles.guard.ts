import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RoleCode } from "@prisma/client";
import { Request } from "express";
import { ROLES_KEY } from "../decorators";
import { AppException, ErrorCodes } from "../utils/app-exception";
import { JwtPayload } from "../types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    if (!user?.role) {
      throw new AppException(ErrorCodes.FORBIDDEN, "Insufficient role", 403);
    }
    if (user.role === RoleCode.ADMIN) return true;
    if (!requiredRoles.includes(user.role)) {
      throw new AppException(ErrorCodes.FORBIDDEN, "Insufficient role", 403);
    }
    return true;
  }
}
