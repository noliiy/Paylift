import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { AppException, ErrorCodes } from "../utils/app-exception";
import { JwtPayload } from "../types";

@Injectable()
export class BusinessAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: JwtPayload; params: Record<string, string> }
      >();
    const user = request.user;
    if (!user) return true;

    const businessId =
      request.params.businessId ??
      request.body?.businessId ??
      request.query?.businessId;
    const branchId =
      request.params.branchId ??
      request.body?.branchId ??
      request.query?.branchId;

    if (user.role === "ADMIN") return true;

    if (businessId && user.businessId && businessId !== user.businessId) {
      throw new AppException(
        ErrorCodes.TENANT_ISOLATION,
        "Cross-business access denied",
        403,
      );
    }

    if (branchId && user.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
      });
      if (branch && user.businessId && branch.businessId !== user.businessId) {
        throw new AppException(
          ErrorCodes.TENANT_ISOLATION,
          "Cross-business branch access denied",
          403,
        );
      }
    }

    return true;
  }
}
