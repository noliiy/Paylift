import { Injectable } from "@nestjs/common";
import { OrderItemStatus, OrderStatus, RoleCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import {
  CancelOrderItemDto,
  CreateOrderDto,
  UpdateOrderStatusDto,
} from "./dto/order.dto";

const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.DRAFT]: [OrderStatus.PENDING_APPROVAL, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_APPROVAL]: [OrderStatus.APPROVED, OrderStatus.CANCELLED],
  [OrderStatus.APPROVED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.CANCELLED],
  [OrderStatus.SERVED]: [OrderStatus.REFUNDED],
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
  ) {}

  async create(sessionId: string, dto: CreateOrderDto, user: JwtPayload) {
    const session = await this.tenant.assertSessionAccess(
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
        "Participant not found in session",
        404,
      );
    }

    const menuItemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });
    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    return this.prisma.order.create({
      data: {
        tableSessionId: sessionId,
        participantId: dto.participantId,
        note: dto.note ?? "",
        status: OrderStatus.PENDING_APPROVAL,
        items: {
          create: dto.items.map((item) => {
            const menuItem = menuMap.get(item.menuItemId);
            if (!menuItem) {
              throw new AppException(
                ErrorCodes.NOT_FOUND,
                `Menu item ${item.menuItemId} not found`,
                404,
              );
            }
            return {
              menuItemId: item.menuItemId,
              nameSnapshot: menuItem.name,
              quantity: item.quantity,
              unitPriceCents: menuItem.priceCents,
              taxRateSnapshot: menuItem.taxRate,
              note: item.note ?? "",
            };
          }),
        },
      },
      include: { items: true },
    });
  }

  async findBySession(sessionId: string, user: JwtPayload) {
    await this.tenant.assertSessionAccess(
      user.businessId,
      sessionId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.order.findMany({
      where: { tableSessionId: sessionId },
      include: {
        items: { include: { modifiers: true, ownerShares: true } },
        participant: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    user: JwtPayload,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { tableSession: { include: { branch: true } } },
    });
    if (!order) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Order not found", 404);
    }
    await this.tenant.assertBusinessAccess(
      user.businessId,
      order.tableSession.branch.businessId,
      user.role === RoleCode.ADMIN,
    );

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new AppException(
        ErrorCodes.ORDER_INVALID_TRANSITION,
        `Cannot transition from ${order.status} to ${dto.status}`,
        409,
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        approvedByEmployeeId:
          dto.status === OrderStatus.APPROVED
            ? (user.employeeId ?? undefined)
            : undefined,
      },
      include: { items: true },
    });
  }

  async cancelOrder(orderId: string, user: JwtPayload) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { tableSession: { include: { branch: true } } },
    });
    if (!order) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Order not found", 404);
    }
    await this.tenant.assertBusinessAccess(
      user.businessId,
      order.tableSession.branch.businessId,
      user.role === RoleCode.ADMIN,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { orderId },
        data: { status: OrderItemStatus.CANCELLED },
      });
      return tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
        include: { items: true },
      });
    });
  }

  async cancelOrderItem(
    orderItemId: string,
    _dto: CancelOrderItemDto,
    user: JwtPayload,
  ) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: { include: { tableSession: { include: { branch: true } } } },
      },
    });
    if (!item) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Order item not found", 404);
    }
    await this.tenant.assertBusinessAccess(
      user.businessId,
      item.order.tableSession.branch.businessId,
      user.role === RoleCode.ADMIN,
    );

    return this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: OrderItemStatus.CANCELLED },
    });
  }
}
