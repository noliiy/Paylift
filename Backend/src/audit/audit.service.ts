import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RequestContext } from "../common/types";

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    businessId: string;
    branchId?: string;
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ctx?: RequestContext;
  }) {
    await this.prisma.auditLog.create({
      data: {
        businessId: params.businessId,
        branchId: params.branchId,
        actorUserId: params.actorUserId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadataJson: (params.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: params.ctx?.ipAddress,
        userAgent: params.ctx?.userAgent,
      },
    });
  }
}
