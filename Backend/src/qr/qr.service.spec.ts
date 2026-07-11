import { Test, TestingModule } from "@nestjs/testing";
import { RoleCode } from "@prisma/client";
import { QrService } from "./qr.service";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import { hashToken } from "../common/utils/crypto.util";

describe("QrService", () => {
  let service: QrService;
  const prisma = {
    qRToken: { findUnique: jest.fn(), create: jest.fn() },
    restaurantTable: { findUnique: jest.fn() },
    tableSession: { findFirst: jest.fn() },
  };
  const tenant = {
    assertBusinessAccess: jest.fn(),
    assertBranchAccess: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantService, useValue: tenant },
      ],
    }).compile();
    service = module.get(QrService);
  });

  it("resolves valid token", async () => {
    const token = "valid-token";
    prisma.qRToken.findUnique.mockResolvedValue({
      businessId: "b1",
      branchId: "br1",
      tableId: "t1",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
      business: { id: "b1" },
      branch: { id: "br1" },
      table: { id: "t1" },
    });
    prisma.tableSession.findFirst.mockResolvedValue({ id: "sess-1" });

    const result = await service.resolve({ token });
    expect(result.tableSession).toEqual({ id: "sess-1" });
  });

  it("rejects expired token", async () => {
    prisma.qRToken.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    });

    await expect(service.resolve({ token: "expired" })).rejects.toMatchObject({
      code: ErrorCodes.QR_TOKEN_EXPIRED,
    });
  });

  it("rejects revoked token", async () => {
    prisma.qRToken.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: new Date(),
    });

    await expect(service.resolve({ token: "revoked" })).rejects.toMatchObject({
      code: ErrorCodes.QR_TOKEN_REVOKED,
    });
  });

  it("rejects invalid token", async () => {
    prisma.qRToken.findUnique.mockResolvedValue(null);
    await expect(service.resolve({ token: "bad" })).rejects.toBeInstanceOf(
      AppException,
    );
  });
});
