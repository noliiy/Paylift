import { Test, TestingModule } from "@nestjs/testing";
import { TenantService } from "./tenant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AppException, ErrorCodes } from "./app-exception";

describe("TenantService", () => {
  let service: TenantService;
  const prisma = {
    branch: { findUnique: jest.fn() },
    tableSession: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(TenantService);
  });

  it("blocks cross-business access", async () => {
    await expect(
      service.assertBusinessAccess("biz-a", "biz-b"),
    ).rejects.toMatchObject({
      code: ErrorCodes.TENANT_ISOLATION,
    });
  });

  it("allows admin cross-business access", async () => {
    await expect(
      service.assertBusinessAccess("biz-a", "biz-b", true),
    ).resolves.toBeUndefined();
  });

  it("allows same-business access", async () => {
    await expect(
      service.assertBusinessAccess("biz-a", "biz-a"),
    ).resolves.toBeUndefined();
  });
});
