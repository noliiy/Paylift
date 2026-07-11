import { Injectable } from "@nestjs/common";
import {
  OrderStatus,
  PaymentStatus,
  RoleCode,
  TableSessionStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Injectable()
export class BranchesService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
  ) {}

  async create(businessId: string, dto: CreateBranchDto, user: JwtPayload) {
    await this.tenant.assertBusinessAccess(
      user.businessId,
      businessId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.branch.create({
      data: {
        businessId,
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        timezone: dto.timezone ?? "Europe/Istanbul",
      },
    });
  }

  async findOne(branchId: string, user: JwtPayload) {
    const branch = await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );
    return branch;
  }

  async update(branchId: string, dto: UpdateBranchDto, user: JwtPayload) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.branch.update({ where: { id: branchId }, data: dto });
  }

  async getDashboard(branchId: string, user: JwtPayload) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [openSessions, activeOrders, todayPayments, tables] =
      await Promise.all([
        this.prisma.tableSession.count({
          where: { branchId, status: TableSessionStatus.OPEN },
        }),
        this.prisma.order.count({
          where: {
            tableSession: { branchId, status: TableSessionStatus.OPEN },
            status: {
              in: [
                OrderStatus.PENDING_APPROVAL,
                OrderStatus.PREPARING,
                OrderStatus.READY,
              ],
            },
          },
        }),
        this.prisma.payment.aggregate({
          where: {
            branchId,
            status: PaymentStatus.PAID,
            createdAt: { gte: today, lt: tomorrow },
          },
          _sum: { amountCents: true, tipCents: true },
          _count: true,
        }),
        this.prisma.restaurantTable.groupBy({
          by: ["status"],
          where: { branchId },
          _count: true,
        }),
      ]);

    return {
      branchId,
      openSessions,
      activeOrders,
      todayRevenueCents: todayPayments._sum.amountCents ?? 0,
      todayTipsCents: todayPayments._sum.tipCents ?? 0,
      todayPaymentCount: todayPayments._count,
      tableStatusBreakdown: tables,
    };
  }
}
