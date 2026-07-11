import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import {
  CancelPaymentDto,
  ConfirmPaymentDto,
  CreatePaymentIntentDto,
  RefundPaymentDto,
} from "./dto/payment.dto";
import { AuditAction, IdempotencyKey } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("payments")
@ApiBearerAuth()
@Controller("payments")
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post("intents")
  @ApiOperation({ summary: "Create payment intent" })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @AuditAction("PAYMENT_INTENT_CREATE", "Payment")
  createIntent(
    @Body() dto: CreatePaymentIntentDto,
    @IdempotencyKey() idempotencyKey: string | undefined,
    @Headers("idempotency-key") headerKey: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.payments.createIntent(dto, idempotencyKey ?? headerKey, user);
  }

  @Get(":paymentId")
  @ApiOperation({ summary: "Get payment" })
  findOne(
    @Param("paymentId") paymentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.payments.findOne(paymentId, user);
  }

  @Post(":paymentId/confirm")
  @ApiOperation({ summary: "Confirm payment" })
  @AuditAction("PAYMENT_CONFIRM", "Payment")
  confirm(
    @Param("paymentId") paymentId: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.payments.confirm(paymentId, dto, user);
  }

  @Post(":paymentId/cancel")
  @ApiOperation({ summary: "Cancel payment and unlock items" })
  @AuditAction("PAYMENT_CANCEL", "Payment")
  cancel(
    @Param("paymentId") paymentId: string,
    @Body() dto: CancelPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.payments.cancel(paymentId, dto, user);
  }

  @Post(":paymentId/refund")
  @ApiOperation({ summary: "Refund payment" })
  @AuditAction("PAYMENT_REFUND", "Refund")
  refund(
    @Param("paymentId") paymentId: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.payments.refund(paymentId, dto, user);
  }
}
