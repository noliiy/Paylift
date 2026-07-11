import { Injectable } from "@nestjs/common";
import { RoleCode, TableSessionStatus, TableStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import {
  CreateTableSessionDto,
  JoinTableSessionDto,
  MergeTableSessionDto,
  TransferTableSessionDto,
} from "./dto/table-session.dto";

@Injectable()
export class TableSessionsService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
  ) {}

  async create(dto: CreateTableSessionDto, user: JwtPayload) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      dto.branchId,
      user.role === RoleCode.ADMIN,
    );

    const table = await this.prisma.restaurantTable.findUnique({
      where: { id: dto.tableId },
    });
    if (!table || table.branchId !== dto.branchId) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        "Table not found in branch",
        404,
      );
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tableSession.create({
        data: {
          branchId: dto.branchId,
          tableId: dto.tableId,
          openedByEmployeeId: dto.openedByEmployeeId ?? user.employeeId,
        },
      });
      await tx.restaurantTable.update({
        where: { id: dto.tableId },
        data: { status: TableStatus.OCCUPIED },
      });
      return created;
    });

    return session;
  }

  async join(sessionId: string, dto: JoinTableSessionDto, user: JwtPayload) {
    const session = await this.tenant.assertSessionAccess(
      user.businessId,
      sessionId,
      user.role === RoleCode.ADMIN,
    );
    if (session.status !== TableSessionStatus.OPEN) {
      throw new AppException(
        ErrorCodes.SESSION_CLOSED,
        "Session is not open",
        409,
      );
    }

    return this.prisma.sessionParticipant.create({
      data: {
        tableSessionId: sessionId,
        userId: user.sub,
        displayName: dto.displayName,
        seatLabel: dto.seatLabel,
      },
    });
  }

  async findOne(sessionId: string, user: JwtPayload) {
    await this.tenant.assertSessionAccess(
      user.businessId,
      sessionId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: true,
        orders: { include: { items: true } },
        table: true,
      },
    });
  }

  async close(sessionId: string, user: JwtPayload) {
    const session = await this.tenant.assertSessionAccess(
      user.businessId,
      sessionId,
      user.role === RoleCode.ADMIN,
    );
    if (session.status !== TableSessionStatus.OPEN) {
      throw new AppException(
        ErrorCodes.SESSION_CLOSED,
        "Session already closed",
        409,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const closed = await tx.tableSession.update({
        where: { id: sessionId },
        data: { status: TableSessionStatus.CLOSED, closedAt: new Date() },
      });
      await tx.restaurantTable.update({
        where: { id: session.tableId },
        data: { status: TableStatus.AVAILABLE },
      });
      return closed;
    });
  }

  async transferTable(
    sessionId: string,
    dto: TransferTableSessionDto,
    user: JwtPayload,
  ) {
    const session = await this.tenant.assertSessionAccess(
      user.businessId,
      sessionId,
      user.role === RoleCode.ADMIN,
    );
    if (session.status !== TableSessionStatus.OPEN) {
      throw new AppException(
        ErrorCodes.SESSION_CLOSED,
        "Session is not open",
        409,
      );
    }

    const targetTable = await this.prisma.restaurantTable.findUnique({
      where: { id: dto.targetTableId },
    });
    if (!targetTable || targetTable.branchId !== session.branchId) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        "Target table not found",
        404,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.restaurantTable.update({
        where: { id: session.tableId },
        data: { status: TableStatus.AVAILABLE },
      });
      await tx.restaurantTable.update({
        where: { id: dto.targetTableId },
        data: { status: TableStatus.OCCUPIED },
      });
      return tx.tableSession.update({
        where: { id: sessionId },
        data: {
          tableId: dto.targetTableId,
          status: TableSessionStatus.TRANSFERRED,
          transferredFromTableId: session.tableId,
        },
      });
    });
  }

  async merge(sessionId: string, dto: MergeTableSessionDto, user: JwtPayload) {
    const target = await this.tenant.assertSessionAccess(
      user.businessId,
      sessionId,
      user.role === RoleCode.ADMIN,
    );
    const source = await this.tenant.assertSessionAccess(
      user.businessId,
      dto.sourceSessionId,
      user.role === RoleCode.ADMIN,
    );

    if (
      target.status !== TableSessionStatus.OPEN ||
      source.status !== TableSessionStatus.OPEN
    ) {
      throw new AppException(
        ErrorCodes.SESSION_CLOSED,
        "Both sessions must be open",
        409,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.sessionParticipant.updateMany({
        where: { tableSessionId: dto.sourceSessionId },
        data: { tableSessionId: sessionId },
      });
      await tx.order.updateMany({
        where: { tableSessionId: dto.sourceSessionId },
        data: { tableSessionId: sessionId },
      });
      await tx.tableSession.update({
        where: { id: dto.sourceSessionId },
        data: {
          status: TableSessionStatus.MERGED,
          mergedIntoSessionId: sessionId,
          closedAt: new Date(),
        },
      });
      await tx.restaurantTable.update({
        where: { id: source.tableId },
        data: { status: TableStatus.AVAILABLE },
      });
      return tx.tableSession.findUnique({
        where: { id: sessionId },
        include: { participants: true, orders: true },
      });
    });
  }
}
