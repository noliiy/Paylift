import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AppException, ErrorCodes } from "./app-exception";

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async assertBusinessAccess(
    userBusinessId: string | undefined,
    businessId: string,
    isAdmin = false,
  ) {
    if (isAdmin) return;
    if (!userBusinessId || userBusinessId !== businessId) {
      throw new AppException(
        ErrorCodes.TENANT_ISOLATION,
        "Cross-business access denied",
        403,
      );
    }
  }

  async assertBranchAccess(
    userBusinessId: string | undefined,
    branchId: string,
    isAdmin = false,
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Branch not found", 404);
    }
    await this.assertBusinessAccess(userBusinessId, branch.businessId, isAdmin);
    return branch;
  }

  async assertSessionAccess(
    userBusinessId: string | undefined,
    sessionId: string,
    isAdmin = false,
  ) {
    const session = await this.prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: { branch: true },
    });
    if (!session) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        "Table session not found",
        404,
      );
    }
    await this.assertBusinessAccess(
      userBusinessId,
      session.branch.businessId,
      isAdmin,
    );
    return session;
  }
}
