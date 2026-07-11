import {
  OrderItemPaymentStatus,
  OrderItemStatus,
  OrderStatus,
  PrismaClient,
  RoleCode,
  TableSessionStatus,
  TableStatus,
} from "@prisma/client";
import { hashToken } from "../src/common/utils/crypto.util";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Paylift demo data...");

  await prisma.paymentAllocation.deleteMany();
  await prisma.orderItemOwnerShare.deleteMany();
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.sessionParticipant.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.qRToken.deleteMany();
  await prisma.menuItemAllergen.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.menuItemOption.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.restaurantTable.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.business.deleteMany();

  const permissions = await Promise.all(
    [
      ["menu.read", "Read menu"],
      ["menu.write", "Edit menu"],
      ["orders.read", "Read orders"],
      ["orders.write", "Manage orders"],
      ["reports.read", "Read reports"],
      ["employees.manage", "Manage employees"],
      ["roles.manage", "Manage roles"],
      ["payments.read", "Read payments"],
    ].map(([code, description]) =>
      prisma.permission.create({ data: { code, description } }),
    ),
  );

  const business = await prisma.business.create({
    data: {
      name: "Paylift Demo Bistro",
      legalName: "Paylift Demo Bistro A.Ş.",
      taxNumber: "1234567890",
      defaultCurrency: "TRY",
    },
  });

  const branch = await prisma.branch.create({
    data: {
      businessId: business.id,
      name: "Nişantaşı Şube",
      address: "Teşvikiye Mah. Abdi İpekçi Cad. No:42, Şişli/İstanbul",
      latitude: 41.0522,
      longitude: 28.9948,
      timezone: "Europe/Istanbul",
    },
  });

  const ownerRole = await prisma.role.create({
    data: { businessId: business.id, name: "Owner", code: RoleCode.OWNER },
  });
  const staffRole = await prisma.role.create({
    data: { businessId: business.id, name: "Staff", code: RoleCode.STAFF },
  });
  const customerRole = await prisma.role.create({
    data: { name: "Customer", code: RoleCode.CUSTOMER },
  });

  for (const perm of permissions) {
    await prisma.rolePermission.create({
      data: { roleId: ownerRole.id, permissionId: perm.id },
    });
    if (
      ["menu.read", "orders.read", "orders.write", "payments.read"].includes(
        perm.code,
      )
    ) {
      await prisma.rolePermission.create({
        data: { roleId: staffRole.id, permissionId: perm.id },
      });
    }
  }

  const ayse = await prisma.user.create({
    data: {
      displayName: "Ayşe",
      email: "ayse@paylift.demo",
      appleSubject: "demo-apple-ayse",
    },
  });
  const emre = await prisma.user.create({
    data: {
      displayName: "Emre",
      email: "emre@paylift.demo",
      appleSubject: "demo-apple-emre",
      customerProfile: { create: { displayName: "Emre" } },
    },
  });
  const deniz = await prisma.user.create({
    data: {
      displayName: "Deniz",
      email: "deniz@paylift.demo",
      appleSubject: "demo-apple-deniz",
      customerProfile: { create: { displayName: "Deniz" } },
    },
  });

  await prisma.employee.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      userId: ayse.id,
      roleId: staffRole.id,
      isActive: true,
    },
  });

  const tables = [];
  for (let i = 1; i <= 12; i++) {
    const table = await prisma.restaurantTable.create({
      data: {
        branchId: branch.id,
        number: String(i),
        displayName: `Masa ${i}`,
        capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
        status: i === 12 ? TableStatus.OCCUPIED : TableStatus.AVAILABLE,
      },
    });
    tables.push(table);
  }

  const table12 = tables[11];
  const session = await prisma.tableSession.create({
    data: {
      branchId: branch.id,
      tableId: table12.id,
      status: TableSessionStatus.OPEN,
    },
  });

  const pEmre = await prisma.sessionParticipant.create({
    data: {
      tableSessionId: session.id,
      userId: emre.id,
      displayName: "Emre",
      seatLabel: "A",
    },
  });
  const pDeniz = await prisma.sessionParticipant.create({
    data: {
      tableSessionId: session.id,
      userId: deniz.id,
      displayName: "Deniz",
      seatLabel: "B",
    },
  });
  const pGuest3 = await prisma.sessionParticipant.create({
    data: {
      tableSessionId: session.id,
      displayName: "Misafir 3",
      seatLabel: "C",
    },
  });

  const menu = await prisma.menu.create({
    data: { branchId: branch.id, name: "Ana Menü", isActive: true },
  });

  const catMain = await prisma.menuCategory.create({
    data: { menuId: menu.id, name: "Ana Yemek", sortOrder: 1 },
  });
  const catShare = await prisma.menuCategory.create({
    data: { menuId: menu.id, name: "Paylaşım", sortOrder: 2 },
  });
  const catDrink = await prisma.menuCategory.create({
    data: { menuId: menu.id, name: "İçecek", sortOrder: 3 },
  });
  const catDessert = await prisma.menuCategory.create({
    data: { menuId: menu.id, name: "Tatlı", sortOrder: 4 },
  });

  const items = {
    burger: await prisma.menuItem.create({
      data: {
        categoryId: catMain.id,
        name: "Trüf Burger",
        description: "180g dana köfte, trüf mayonez, karamelize soğan",
        priceCents: 48500,
        taxRate: 0.1,
        preparationMinutes: 20,
        isPopular: true,
      },
    }),
    pasta: await prisma.menuItem.create({
      data: {
        categoryId: catMain.id,
        name: "Fesleğenli Makarna",
        description: "Taze fesleğen, cherry domates, parmesan",
        priceCents: 32000,
        taxRate: 0.1,
        preparationMinutes: 15,
        isVegetarian: true,
      },
    }),
    meze: await prisma.menuItem.create({
      data: {
        categoryId: catShare.id,
        name: "Ortaya Karışık Meze",
        description: "Humus, haydari, acılı ezme, zeytinyağlı enginar",
        priceCents: 28000,
        taxRate: 0.1,
        preparationMinutes: 10,
        isRecommended: true,
      },
    }),
    lemonade: await prisma.menuItem.create({
      data: {
        categoryId: catDrink.id,
        name: "Ev Yapımı Limonata",
        description: "Taze sıkılmış limon, nane",
        priceCents: 9500,
        taxRate: 0.1,
        preparationMinutes: 5,
      },
    }),
    coffee: await prisma.menuItem.create({
      data: {
        categoryId: catDrink.id,
        name: "Filtre Kahve",
        description: "Single origin Ethiopia",
        priceCents: 12000,
        taxRate: 0.1,
        preparationMinutes: 5,
      },
    }),
    cheesecake: await prisma.menuItem.create({
      data: {
        categoryId: catDessert.id,
        name: "San Sebastian",
        description: "Yanık cheesecake, vişne reçeli",
        priceCents: 18500,
        taxRate: 0.1,
        preparationMinutes: 5,
        isPopular: true,
      },
    }),
  };

  const orderEmre = await prisma.order.create({
    data: {
      tableSessionId: session.id,
      participantId: pEmre.id,
      status: OrderStatus.APPROVED,
    },
  });
  const oiBurger = await prisma.orderItem.create({
    data: {
      orderId: orderEmre.id,
      menuItemId: items.burger.id,
      nameSnapshot: items.burger.name,
      quantity: 1,
      unitPriceCents: items.burger.priceCents,
      taxRateSnapshot: items.burger.taxRate,
      status: OrderItemStatus.ACTIVE,
      paymentStatus: OrderItemPaymentStatus.UNPAID,
    },
  });
  const oiLemonade = await prisma.orderItem.create({
    data: {
      orderId: orderEmre.id,
      menuItemId: items.lemonade.id,
      nameSnapshot: items.lemonade.name,
      quantity: 1,
      unitPriceCents: items.lemonade.priceCents,
      taxRateSnapshot: items.lemonade.taxRate,
      status: OrderItemStatus.ACTIVE,
      paymentStatus: OrderItemPaymentStatus.UNPAID,
    },
  });
  await prisma.orderItemOwnerShare.create({
    data: {
      orderItemId: oiBurger.id,
      participantId: pEmre.id,
      amountCents: items.burger.priceCents,
    },
  });
  await prisma.orderItemOwnerShare.create({
    data: {
      orderItemId: oiLemonade.id,
      participantId: pEmre.id,
      amountCents: items.lemonade.priceCents,
    },
  });

  const orderDeniz = await prisma.order.create({
    data: {
      tableSessionId: session.id,
      participantId: pDeniz.id,
      status: OrderStatus.PREPARING,
    },
  });
  const oiPasta = await prisma.orderItem.create({
    data: {
      orderId: orderDeniz.id,
      menuItemId: items.pasta.id,
      nameSnapshot: items.pasta.name,
      quantity: 1,
      unitPriceCents: items.pasta.priceCents,
      taxRateSnapshot: items.pasta.taxRate,
      status: OrderItemStatus.ACTIVE,
      paymentStatus: OrderItemPaymentStatus.UNPAID,
    },
  });
  await prisma.orderItemOwnerShare.create({
    data: {
      orderItemId: oiPasta.id,
      participantId: pDeniz.id,
      amountCents: items.pasta.priceCents,
    },
  });

  const orderShared = await prisma.order.create({
    data: {
      tableSessionId: session.id,
      participantId: pEmre.id,
      status: OrderStatus.SERVED,
    },
  });
  const oiMeze = await prisma.orderItem.create({
    data: {
      orderId: orderShared.id,
      menuItemId: items.meze.id,
      nameSnapshot: items.meze.name,
      quantity: 1,
      unitPriceCents: items.meze.priceCents,
      taxRateSnapshot: items.meze.taxRate,
      status: OrderItemStatus.ACTIVE,
      paymentStatus: OrderItemPaymentStatus.UNPAID,
    },
  });
  const mezeShare = Math.floor(items.meze.priceCents / 3);
  const mezeRemainder = items.meze.priceCents - mezeShare * 3;
  await prisma.orderItemOwnerShare.createMany({
    data: [
      {
        orderItemId: oiMeze.id,
        participantId: pEmre.id,
        amountCents: mezeShare + mezeRemainder,
      },
      {
        orderItemId: oiMeze.id,
        participantId: pDeniz.id,
        amountCents: mezeShare,
      },
      {
        orderItemId: oiMeze.id,
        participantId: pGuest3.id,
        amountCents: mezeShare,
      },
    ],
  });

  const orderGuest = await prisma.order.create({
    data: {
      tableSessionId: session.id,
      participantId: pGuest3.id,
      status: OrderStatus.APPROVED,
    },
  });
  const oiCheesecake = await prisma.orderItem.create({
    data: {
      orderId: orderGuest.id,
      menuItemId: items.cheesecake.id,
      nameSnapshot: items.cheesecake.name,
      quantity: 1,
      unitPriceCents: items.cheesecake.priceCents,
      taxRateSnapshot: items.cheesecake.taxRate,
      status: OrderItemStatus.ACTIVE,
      paymentStatus: OrderItemPaymentStatus.UNPAID,
    },
  });
  await prisma.orderItemOwnerShare.create({
    data: {
      orderItemId: oiCheesecake.id,
      participantId: pGuest3.id,
      amountCents: items.cheesecake.priceCents,
    },
  });

  const demoQrToken = "paylift-demo-table-12-token";
  await prisma.qRToken.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      tableId: table12.id,
      tokenHash: hashToken(demoQrToken),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seed complete.");
  console.log({
    businessId: business.id,
    branchId: branch.id,
    sessionId: session.id,
    table12Id: table12.id,
    demoQrToken,
    participants: { emre: pEmre.id, deniz: pDeniz.id, guest3: pGuest3.id },
    staffAppleSubject: "demo-apple-ayse",
    googleSignIn: { displayName: "Deniz", identityToken: "demo-google-deniz" },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
