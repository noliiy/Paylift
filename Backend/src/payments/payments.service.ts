import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OrderItemPaymentStatus,
  OrderItemStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  RefundStatus,
  RoleCode,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import { isLockExpired } from "../common/utils/crypto.util";
import {
  CancelPaymentDto,
  ConfirmPaymentDto,
  CreatePaymentIntentDto,
  RefundPaymentDto,
} from "./dto/payment.dto";

type TxClient = Prisma.TransactionClient;

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
    private config: ConfigService,
  ) {}

  async createIntent(
    dto: CreatePaymentIntentDto,
    idempotencyKey: string | undefined,
    user: JwtPayload,
  ) {
    if (!idempotencyKey) {
      throw new AppException(
        ErrorCodes.VALIDATION_ERROR,
        "Idempotency-Key header is required",
        400,
      );
    }

    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
      include: { allocations: true },
    });
    if (existing) {
      return existing;
    }

    const session = await this.tenant.assertSessionAccess(
      user.businessId,
      dto.tableSessionId,
      user.role === RoleCode.ADMIN,
    );

    const lockTtlSeconds =
      this.config.get<number>("paymentLockTtlSeconds") ?? 300;
    const lockExpiresAt = new Date(Date.now() + lockTtlSeconds * 1000);
    const businessId = session.branch.businessId;

    const payment = await this.prisma.$transaction(async (tx) => {
      await this.lockAllocations(tx, dto.allocations);

      try {
        const created = await tx.payment.create({
          data: {
            businessId,
            branchId: session.branchId,
            tableSessionId: dto.tableSessionId,
            payerParticipantId: dto.payerParticipantId,
            provider: dto.provider,
            amountCents: dto.amountCents,
            tipCents: dto.tipCents ?? 0,
            idempotencyKey,
            status: PaymentStatus.PENDING,
            allocations: {
              create: dto.allocations.map((a) => ({
                orderItemId: a.orderItemId,
                ownerShareId: a.ownerShareId,
                participantId: a.participantId,
                amountCents: a.amountCents,
              })),
            },
          },
          include: { allocations: true },
        });

        for (const alloc of dto.allocations) {
          await tx.orderItem.update({
            where: { id: alloc.orderItemId },
            data: {
              paymentStatus: OrderItemPaymentStatus.LOCKED,
              lockedByPaymentId: created.id,
              lockExpiresAt,
            },
          });
        }

        return created;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          const dup = await tx.payment.findUnique({
            where: { idempotencyKey },
            include: { allocations: true },
          });
          if (dup) return dup;
          throw new AppException(
            ErrorCodes.IDEMPOTENCY_CONFLICT,
            "Idempotency conflict",
            409,
          );
        }
        throw err;
      }
    });

    if (dto.provider === PaymentProvider.MOCK) {
      return this.confirm(payment.id, {}, user);
    }

    return payment;
  }

  async confirm(paymentId: string, dto: ConfirmPaymentDto, user: JwtPayload) {
    const payment = await this.getPaymentWithAccess(paymentId, user);

    if (payment.status === PaymentStatus.PAID) {
      return payment;
    }
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.REQUIRES_ACTION
    ) {
      throw new AppException(
        ErrorCodes.PAYMENT_ALREADY_PROCESSED,
        "Payment cannot be confirmed",
        409,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          providerReference:
            dto.providerReference ?? `mock-${paymentId.slice(0, 8)}`,
        },
        include: { allocations: true },
      });

      for (const alloc of updated.allocations) {
        await tx.orderItem.update({
          where: { id: alloc.orderItemId },
          data: {
            paymentStatus: OrderItemPaymentStatus.PAID,
            lockedByPaymentId: null,
            lockExpiresAt: null,
          },
        });

        if (alloc.ownerShareId) {
          await tx.orderItemOwnerShare.update({
            where: { id: alloc.ownerShareId },
            data: { isPaid: true, paidAt: new Date() },
          });
        }
      }

      if (updated.tipCents > 0) {
        await tx.tip.create({
          data: { paymentId, amountCents: updated.tipCents },
        });
      }

      return updated;
    });
  }

  async cancel(paymentId: string, _dto: CancelPaymentDto, user: JwtPayload) {
    const payment = await this.getPaymentWithAccess(paymentId, user);

    if (payment.status === PaymentStatus.PAID) {
      throw new AppException(
        ErrorCodes.PAYMENT_ALREADY_PROCESSED,
        "Paid payment cannot be cancelled",
        409,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.unlockPaymentItems(tx, paymentId);
      return tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.CANCELLED },
        include: { allocations: true },
      });
    });
  }

  async refund(paymentId: string, dto: RefundPaymentDto, user: JwtPayload) {
    const payment = await this.getPaymentWithAccess(paymentId, user);

    if (
      payment.status !== PaymentStatus.PAID &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new AppException(
        ErrorCodes.PAYMENT_ALREADY_PROCESSED,
        "Payment is not refundable",
        409,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          paymentId,
          amountCents: dto.amountCents,
          reason: dto.reason,
          status: RefundStatus.COMPLETED,
        },
      });

      const newStatus =
        dto.amountCents >= payment.amountCents
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: newStatus },
      });

      if (newStatus === PaymentStatus.REFUNDED) {
        await this.unlockPaymentItems(
          tx,
          paymentId,
          OrderItemPaymentStatus.REFUNDED,
        );
      }

      return refund;
    });
  }

  async findOne(paymentId: string, user: JwtPayload) {
    return this.getPaymentWithAccess(paymentId, user);
  }

  private async getPaymentWithAccess(paymentId: string, user: JwtPayload) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { allocations: true, refunds: true },
    });
    if (!payment) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Payment not found", 404);
    }
    await this.tenant.assertBusinessAccess(
      user.businessId,
      payment.businessId,
      user.role === RoleCode.ADMIN,
    );
    return payment;
  }

  private async lockAllocations(
    tx: TxClient,
    allocations: CreatePaymentIntentDto["allocations"],
  ) {
    for (const alloc of allocations) {
      const item = await tx.orderItem.findUnique({
        where: { id: alloc.orderItemId },
      });
      if (!item || item.status !== OrderItemStatus.ACTIVE) {
        throw new AppException(
          ErrorCodes.NOT_FOUND,
          `Order item ${alloc.orderItemId} not found`,
          404,
        );
      }

      if (item.paymentStatus === OrderItemPaymentStatus.PAID) {
        throw new AppException(
          ErrorCodes.PAYMENT_ITEM_ALREADY_PAID,
          "Item already paid",
          409,
        );
      }

      if (
        item.paymentStatus === OrderItemPaymentStatus.LOCKED &&
        item.lockedByPaymentId &&
        !isLockExpired(item.lockExpiresAt)
      ) {
        throw new AppException(
          ErrorCodes.PAYMENT_ITEM_LOCKED,
          "Item is locked by another payment",
          409,
        );
      }

      if (alloc.ownerShareId) {
        const share = await tx.orderItemOwnerShare.findUnique({
          where: { id: alloc.ownerShareId },
        });
        if (!share || share.isPaid) {
          throw new AppException(
            ErrorCodes.PAYMENT_ITEM_ALREADY_PAID,
            "Share already paid",
            409,
          );
        }
      }
    }
  }

  private async unlockPaymentItems(
    tx: TxClient,
    paymentId: string,
    paymentStatus: OrderItemPaymentStatus = OrderItemPaymentStatus.UNPAID,
  ) {
    await tx.orderItem.updateMany({
      where: { lockedByPaymentId: paymentId },
      data: {
        paymentStatus,
        lockedByPaymentId: null,
        lockExpiresAt: null,
      },
    });
  }
}
