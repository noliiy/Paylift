import { Test, TestingModule } from "@nestjs/testing";
import { PaymentMode, RoleCode } from "@prisma/client";
import { BillService } from "./bill.service";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";

describe("BillService", () => {
  let service: BillService;
  const prisma = {
    order: { findMany: jest.fn() },
    sessionParticipant: { findFirst: jest.fn() },
    orderItem: { findMany: jest.fn(), findFirst: jest.fn() },
    orderItemOwnerShare: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
  };
  const tenant = { assertSessionAccess: jest.fn() };
  const user = { sub: "user-1", businessId: "biz-1", role: RoleCode.CUSTOMER };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantService, useValue: tenant },
      ],
    }).compile();
    service = module.get(BillService);
  });

  it("calculates OWN_ITEMS for participant shares", async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        items: [
          {
            id: "item-1",
            unitPriceCents: 1000,
            quantity: 1,
            taxRateSnapshot: 0.1,
            paymentStatus: "UNPAID",
            modifiers: [],
            ownerShares: [
              {
                id: "share-1",
                participantId: "p1",
                amountCents: 500,
                isPaid: false,
              },
            ],
          },
        ],
      },
    ]);

    const result = await service.calculate(
      "sess-1",
      { mode: PaymentMode.OWN_ITEMS, participantId: "p1" },
      user,
    );

    expect(result.amountCents).toBe(500);
    expect(result.allocations).toHaveLength(1);
  });

  it("calculates FULL_BILL excluding paid items via unpaid filter", async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        items: [
          {
            id: "item-1",
            unitPriceCents: 1000,
            quantity: 1,
            taxRateSnapshot: 0,
            paymentStatus: "UNPAID",
            modifiers: [],
            ownerShares: [],
          },
          {
            id: "item-2",
            unitPriceCents: 2000,
            quantity: 1,
            taxRateSnapshot: 0,
            paymentStatus: "PAID",
            modifiers: [],
            ownerShares: [],
          },
        ],
      },
    ]);

    const result = await service.calculate(
      "sess-1",
      { mode: PaymentMode.FULL_BILL },
      user,
    );
    expect(result.amountCents).toBe(1000);
  });
});
