import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  OrderItemPaymentStatus,
  OrderItemStatus,
  PaymentProvider,
  PaymentStatus,
  RoleCode,
} from "@prisma/client";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { AppException } from "../common/utils/app-exception";

describe("PaymentsService", () => {
  let service: PaymentsService;
  const mockTx = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    orderItemOwnerShare: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tip: { create: jest.fn() },
    refund: { create: jest.fn() },
  };

  const prisma = {
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
  };

  const tenant = {
    assertSessionAccess: jest.fn().mockResolvedValue({
      branchId: "branch-1",
      branch: { businessId: "biz-1" },
    }),
    assertBusinessAccess: jest.fn(),
  };

  const user = { sub: "user-1", businessId: "biz-1", role: RoleCode.CUSTOMER };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantService, useValue: tenant },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(300) },
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it("returns existing payment for duplicate idempotency key", async () => {
    const existing = { id: "pay-1", idempotencyKey: "key-1" };
    prisma.payment.findUnique.mockResolvedValue(existing);

    const result = await service.createIntent(
      {
        tableSessionId: "sess-1",
        payerParticipantId: "part-1",
        provider: PaymentProvider.MOCK,
        amountCents: 1000,
        allocations: [{ orderItemId: "item-1", amountCents: 1000 }],
      },
      "key-1",
      user,
    );

    expect(result).toBe(existing);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects payment when item is locked", async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    mockTx.orderItem.findUnique.mockResolvedValue({
      id: "item-1",
      status: OrderItemStatus.ACTIVE,
      paymentStatus: OrderItemPaymentStatus.LOCKED,
      lockedByPaymentId: "other-pay",
      lockExpiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.createIntent(
        {
          tableSessionId: "sess-1",
          payerParticipantId: "part-1",
          provider: PaymentProvider.MOCK,
          amountCents: 1000,
          allocations: [{ orderItemId: "item-1", amountCents: 1000 }],
        },
        "key-2",
        user,
      ),
    ).rejects.toBeInstanceOf(AppException);
  });

  it("unlocks items on cancel", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: "pay-1",
      businessId: "biz-1",
      status: PaymentStatus.PENDING,
      allocations: [],
    });
    mockTx.payment.update.mockResolvedValue({
      id: "pay-1",
      status: PaymentStatus.CANCELLED,
    });

    await service.cancel("pay-1", {}, user);

    expect(mockTx.orderItem.updateMany).toHaveBeenCalledWith({
      where: { lockedByPaymentId: "pay-1" },
      data: expect.objectContaining({
        paymentStatus: OrderItemPaymentStatus.UNPAID,
      }),
    });
  });
});
