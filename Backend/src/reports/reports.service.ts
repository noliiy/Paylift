import { Injectable } from "@nestjs/common";
import { PaymentStatus, RoleCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
  ) {}

  async dailyReport(
    branchId: string,
    dateStr: string | undefined,
    user: JwtPayload,
  ) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );

    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);

    const payments = await this.prisma.payment.findMany({
      where: {
        branchId,
        status: PaymentStatus.PAID,
        createdAt: { gte: date, lt: next },
      },
    });

    const grossSalesCents = payments.reduce((s, p) => s + p.amountCents, 0);
    const tipCents = payments.reduce((s, p) => s + p.tipCents, 0);

    return {
      branchId,
      reportDate: date.toISOString().slice(0, 10),
      grossSalesCents,
      netSalesCents: grossSalesCents,
      tipCents,
      paymentCount: payments.length,
    };
  }

  async monthlyReport(
    branchId: string,
    monthStr: string | undefined,
    user: JwtPayload,
  ) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );

    const [year, month] = (monthStr ?? new Date().toISOString().slice(0, 7))
      .split("-")
      .map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const payments = await this.prisma.payment.findMany({
      where: {
        branchId,
        status: PaymentStatus.PAID,
        createdAt: { gte: start, lt: end },
      },
    });

    return {
      branchId,
      month: `${year}-${String(month).padStart(2, "0")}`,
      grossSalesCents: payments.reduce((s, p) => s + p.amountCents, 0),
      tipCents: payments.reduce((s, p) => s + p.tipCents, 0),
      paymentCount: payments.length,
    };
  }

  async productsReport(branchId: string, user: JwtPayload) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );

    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { tableSession: { branchId } },
        status: "ACTIVE",
      },
      include: { menuItem: true },
    });

    const byProduct = new Map<
      string,
      { name: string; quantity: number; revenueCents: number }
    >();
    for (const item of items) {
      const key = item.menuItemId;
      const existing = byProduct.get(key) ?? {
        name: item.nameSnapshot,
        quantity: 0,
        revenueCents: 0,
      };
      existing.quantity += item.quantity;
      existing.revenueCents += item.unitPriceCents * item.quantity;
      byProduct.set(key, existing);
    }

    return Array.from(byProduct.entries()).map(([menuItemId, stats]) => ({
      menuItemId,
      ...stats,
    }));
  }

  async tablesReport(branchId: string, user: JwtPayload) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );

    const sessions = await this.prisma.tableSession.groupBy({
      by: ["tableId"],
      where: { branchId },
      _count: true,
    });

    const tables = await this.prisma.restaurantTable.findMany({
      where: { branchId },
    });
    const tableMap = new Map(tables.map((t) => [t.id, t]));

    return sessions.map((s) => ({
      tableId: s.tableId,
      table: tableMap.get(s.tableId),
      sessionCount: s._count,
    }));
  }

  async employeesReport(branchId: string, user: JwtPayload) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );

    const employees = await this.prisma.employee.findMany({
      where: { branchId, isActive: true },
      include: { user: true, role: true },
    });

    const approvedCounts = await this.prisma.order.groupBy({
      by: ["approvedByEmployeeId"],
      where: {
        approvedByEmployeeId: { not: null },
        tableSession: { branchId },
      },
      _count: true,
    });

    const countMap = new Map(
      approvedCounts.map((c) => [c.approvedByEmployeeId, c._count]),
    );

    return employees.map((e) => ({
      employee: e,
      approvedOrderCount: countMap.get(e.id) ?? 0,
    }));
  }
}
