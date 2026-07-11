import { Injectable } from "@nestjs/common";
import {
  OrderItemPaymentStatus,
  OrderItemStatus,
  PaymentMode,
  RoleCode,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import { itemTotalCents, splitCentsEqually } from "../common/utils/crypto.util";
import {
  AssignBillItemsDto,
  CalculateBillDto,
  SplitBillItemDto,
} from "./dto/bill.dto";

@Injectable()
export class BillService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
  ) {}

  async getBill(sessionId: string, user: JwtPayload) {
    await this.tenant.assertSessionAccess(
      user.businessId,
      sessionId,
      user.role === RoleCode.ADMIN,
    );

    const orders = await this.prisma.order.findMany({
      where: { tableSessionId: sessionId, status: { not: "CANCELLED" } },
      include: {
        items: {
          where: { status: OrderItemStatus.ACTIVE },
          include: {
            modifiers: true,
            ownerShares: { include: { participant: true } },
          },
        },
        participant: true,
      },
    });

    let subtotalCents = 0;
    let taxCents = 0;
    const items = orders.flatMap((o) =>
      o.items.map((item) => {
        const modifierDelta = item.modifiers.reduce(
          (s, m) => s + m.priceDeltaCents,
          0,
        );
        const lineTotal = itemTotalCents(
          item.unitPriceCents,
          item.quantity,
          modifierDelta,
        );
        const taxRate = Number(item.taxRateSnapshot);
        subtotalCents += lineTotal;
        taxCents += Math.round(lineTotal * taxRate);
        return { ...item, lineTotalCents: lineTotal };
      }),
    );

    return {
      sessionId,
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
      items,
      orders,
    };
  }

  async assignItems(
    sessionId: string,
    dto: AssignBillItemsDto,
    user: JwtPayload,
  ) {
    await this.tenant.assertSessionAccess(
      user.businessId,
      sessionId,
      user.role === RoleCode.ADMIN,
    );

    const participant = await this.prisma.sessionParticipant.findFirst({
      where: { id: dto.participantId, tableSessionId: sessionId },
    });
    if (!participant) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        "Participant not found",
        404,
      );
    }

    const items = await this.prisma.orderItem.findMany({
      where: {
        id: { in: dto.orderItemIds },
        order: { tableSessionId: sessionId },
        status: OrderItemStatus.ACTIVE,
      },
      include: { modifiers: true },
    });

    const results = [];
    for (const item of items) {
      const modifierDelta = item.modifiers.reduce(
        (s, m) => s + m.priceDeltaCents,
        0,
      );
      const total = itemTotalCents(
        item.unitPriceCents,
        item.quantity,
        modifierDelta,
      );

      await this.prisma.orderItemOwnerShare.deleteMany({
        where: { orderItemId: item.id },
      });
      const share = await this.prisma.orderItemOwnerShare.create({
        data: {
          orderItemId: item.id,
          participantId: dto.participantId,
          amountCents: total,
        },
      });
      results.push(share);
    }

    return results;
  }

  async splitItem(sessionId: string, dto: SplitBillItemDto, user: JwtPayload) {
    await this.tenant.assertSessionAccess(
      user.businessId,
      sessionId,
      user.role === RoleCode.ADMIN,
    );

    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: dto.orderItemId,
        order: { tableSessionId: sessionId },
        status: OrderItemStatus.ACTIVE,
      },
      include: { modifiers: true },
    });
    if (!item) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Order item not found", 404);
    }

    const modifierDelta = item.modifiers.reduce(
      (s, m) => s + m.priceDeltaCents,
      0,
    );
    const total = itemTotalCents(
      item.unitPriceCents,
      item.quantity,
      modifierDelta,
    );
    const parts = splitCentsEqually(total, dto.participantIds.length);
    const sum = parts.reduce((a, b) => a + b, 0);
    if (sum !== total) {
      throw new AppException(
        ErrorCodes.SPLIT_TOTAL_MISMATCH,
        "Split amounts do not match total",
        400,
      );
    }

    await this.prisma.orderItemOwnerShare.deleteMany({
      where: { orderItemId: item.id },
    });
    const shares = await Promise.all(
      dto.participantIds.map((participantId, i) =>
        this.prisma.orderItemOwnerShare.create({
          data: {
            orderItemId: item.id,
            participantId,
            amountCents: parts[i],
          },
        }),
      ),
    );

    return shares;
  }

  async calculate(sessionId: string, dto: CalculateBillDto, user: JwtPayload) {
    const bill = await this.getBill(sessionId, user);
    const unpaidItems = bill.items.filter(
      (i) =>
        i.paymentStatus === OrderItemPaymentStatus.UNPAID ||
        i.paymentStatus === OrderItemPaymentStatus.PARTIALLY_PAID,
    );

    let amountCents = 0;
    const allocations: {
      orderItemId: string;
      ownerShareId?: string;
      amountCents: number;
    }[] = [];

    switch (dto.mode) {
      case PaymentMode.OWN_ITEMS: {
        if (!dto.participantId) {
          throw new AppException(
            ErrorCodes.VALIDATION_ERROR,
            "participantId required",
            400,
          );
        }
        for (const item of unpaidItems) {
          const shares = item.ownerShares.filter(
            (s) => s.participantId === dto.participantId && !s.isPaid,
          );
          for (const share of shares) {
            amountCents += share.amountCents;
            allocations.push({
              orderItemId: item.id,
              ownerShareId: share.id,
              amountCents: share.amountCents,
            });
          }
          if (shares.length === 0 && item.ownerShares.length === 0) {
            const modifierDelta = item.modifiers.reduce(
              (s, m) => s + m.priceDeltaCents,
              0,
            );
            const lineTotal = itemTotalCents(
              item.unitPriceCents,
              item.quantity,
              modifierDelta,
            );
            amountCents += lineTotal;
            allocations.push({ orderItemId: item.id, amountCents: lineTotal });
          }
        }
        break;
      }
      case PaymentMode.SELECTED_ITEMS: {
        if (!dto.orderItemIds?.length) {
          throw new AppException(
            ErrorCodes.VALIDATION_ERROR,
            "orderItemIds required",
            400,
          );
        }
        for (const item of unpaidItems.filter((i) =>
          dto.orderItemIds!.includes(i.id),
        )) {
          const modifierDelta = item.modifiers.reduce(
            (s, m) => s + m.priceDeltaCents,
            0,
          );
          const lineTotal = itemTotalCents(
            item.unitPriceCents,
            item.quantity,
            modifierDelta,
          );
          amountCents += lineTotal;
          allocations.push({ orderItemId: item.id, amountCents: lineTotal });
        }
        break;
      }
      case PaymentMode.FULL_BILL: {
        for (const item of unpaidItems) {
          const modifierDelta = item.modifiers.reduce(
            (s, m) => s + m.priceDeltaCents,
            0,
          );
          const lineTotal = itemTotalCents(
            item.unitPriceCents,
            item.quantity,
            modifierDelta,
          );
          amountCents += lineTotal;
          allocations.push({ orderItemId: item.id, amountCents: lineTotal });
        }
        break;
      }
      case PaymentMode.PERCENTAGE: {
        if (dto.percentage === undefined) {
          throw new AppException(
            ErrorCodes.VALIDATION_ERROR,
            "percentage required",
            400,
          );
        }
        amountCents = Math.round(bill.totalCents * (dto.percentage / 100));
        break;
      }
      case PaymentMode.FIXED_AMOUNT: {
        if (dto.fixedAmountCents === undefined) {
          throw new AppException(
            ErrorCodes.VALIDATION_ERROR,
            "fixedAmountCents required",
            400,
          );
        }
        amountCents = dto.fixedAmountCents;
        break;
      }
      default:
        throw new AppException(
          ErrorCodes.VALIDATION_ERROR,
          `Unsupported mode: ${dto.mode}`,
          400,
        );
    }

    return {
      sessionId,
      mode: dto.mode,
      amountCents,
      allocations: dto.allocations ?? allocations,
      billTotalCents: bill.totalCents,
    };
  }
}
