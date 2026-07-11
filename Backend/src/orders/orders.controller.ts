import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import {
  CancelOrderItemDto,
  CreateOrderDto,
  UpdateOrderStatusDto,
} from "./dto/order.dto";
import { AuditAction } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("orders")
@ApiBearerAuth()
@Controller()
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post("table-sessions/:sessionId/orders")
  @ApiOperation({ summary: "Create order for session" })
  @AuditAction("ORDER_CREATE", "Order")
  create(
    @Param("sessionId") sessionId: string,
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orders.create(sessionId, dto, user);
  }

  @Get("table-sessions/:sessionId/orders")
  @ApiOperation({ summary: "List session orders" })
  findBySession(
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orders.findBySession(sessionId, user);
  }

  @Patch("orders/:orderId/status")
  @ApiOperation({ summary: "Update order status" })
  @AuditAction("ORDER_STATUS_UPDATE", "Order")
  updateStatus(
    @Param("orderId") orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orders.updateStatus(orderId, dto, user);
  }

  @Post("orders/:orderId/cancel")
  @ApiOperation({ summary: "Cancel order" })
  @AuditAction("ORDER_CANCEL", "Order")
  cancelOrder(
    @Param("orderId") orderId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orders.cancelOrder(orderId, user);
  }

  @Post("order-items/:orderItemId/cancel")
  @ApiOperation({ summary: "Cancel order item" })
  @AuditAction("ORDER_ITEM_CANCEL", "OrderItem")
  cancelItem(
    @Param("orderItemId") orderItemId: string,
    @Body() dto: CancelOrderItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orders.cancelOrderItem(orderItemId, dto, user);
  }
}
