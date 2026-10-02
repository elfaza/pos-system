import { createMaintenancePrismaClient } from "../src/lib/prisma";
import { hashPassword } from "../src/features/auth/utils/password";

// This seed is for local development only; these fixture passwords are not production credentials.
const prisma = createMaintenancePrismaClient();

async function main() {
  const developmentOrganization = await prisma.organization.upsert({
    where: { slug: "development" },
    update: { name: "Development Organization", isActive: true },
    create: { name: "Development Organization", slug: "development" },
  });
  const developmentOutlet = await prisma.outlet.upsert({
    where: { organizationId_slug: { organizationId: developmentOrganization.id, slug: "main" } },
    update: { name: "Development Outlet", isActive: true },
    create: { organizationId: developmentOrganization.id, name: "Development Outlet", slug: "main" },
  });
  const [adminPasswordHash, cashierPasswordHash, kitchenPasswordHash, queuePasswordHash, cfdPasswordHash] = await Promise.all([
    hashPassword("admin12345"),
    hashPassword("cashier12345"),
    hashPassword("kitchen12345"),
    hashPassword("queue12345"),
    hashPassword("cfd12345"),
  ]);

  await prisma.user.upsert({
    where: { email: "admin@pos.local" },
    update: {
      name: "Admin User",
      passwordHash: adminPasswordHash,
      role: "admin",
      isActive: true,
    },
    create: {
      name: "Admin User",
      email: "admin@pos.local",
      passwordHash: adminPasswordHash,
      role: "admin",
    },
  });


  await prisma.user.upsert({
    where: { email: "kitchen@pos.local" },
    update: {
      name: "Kitchen Display",
      passwordHash: kitchenPasswordHash,
      role: "kitchen",
      isActive: true,
    },
    create: {
      name: "Kitchen Display",
      email: "kitchen@pos.local",
      passwordHash: kitchenPasswordHash,
      role: "kitchen",
    },
  });

  await prisma.user.upsert({
    where: { email: "queue@pos.local" },
    update: {
      name: "Queue Display",
      passwordHash: queuePasswordHash,
      role: "queue",
      isActive: true,
    },
    create: {
      name: "Queue Display",
      email: "queue@pos.local",
      passwordHash: queuePasswordHash,
      role: "queue",
    },
  });

  await prisma.user.upsert({
    where: { email: "cfd@pos.local" },
    update: {
      name: "Customer Facing Display",
      passwordHash: cfdPasswordHash,
      role: "customer_facing_display",
      isActive: true,
    },
    create: {
      name: "Customer Facing Display",
      email: "cfd@pos.local",
      passwordHash: cfdPasswordHash,
      role: "customer_facing_display",
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@pos.local" },
    update: {
      name: "Cashier User",
      passwordHash: cashierPasswordHash,
      role: "cashier",
      isActive: true,
    },
    create: {
      name: "Cashier User",
      email: "cashier@pos.local",
      passwordHash: cashierPasswordHash,
      role: "cashier",
    },
  });

  const seedUsers = await prisma.user.findMany({
    where: { email: { in: ["admin@pos.local", "cashier@pos.local", "kitchen@pos.local", "queue@pos.local", "cfd@pos.local"] } },
    select: { id: true, email: true },
  });
  const seedRoles = new Map([
    ["cashier@pos.local", "cashier" as const],
    ["kitchen@pos.local", "kitchen" as const],
    ["queue@pos.local", "queue" as const],
    ["cfd@pos.local", "customer_facing_display" as const],
  ]);
  for (const user of seedUsers) {
    if (user.email === "admin@pos.local") {
      await prisma.organizationMembership.upsert({
        where: { organizationId_userId: { organizationId: developmentOrganization.id, userId: user.id } },
        update: { role: "owner", isActive: true },
        create: { organizationId: developmentOrganization.id, userId: user.id, role: "owner" },
      });
    }
    await prisma.outletMembership.upsert({
      where: { outletId_userId: { outletId: developmentOutlet.id, userId: user.id } },
      update: { organizationId: developmentOrganization.id, role: user.email === "admin@pos.local" ? "admin" : seedRoles.get(user.email)!, isActive: true },
      create: {
        organizationId: developmentOrganization.id,
        outletId: developmentOutlet.id,
        userId: user.id,
        role: user.email === "admin@pos.local" ? "admin" : seedRoles.get(user.email)!,
      },
    });
  }

  const coffee = await prisma.category.upsert({
    where: { slug: "development-coffee" },
    update: { organizationId: developmentOrganization.id, name: "Coffee", sortOrder: 10, isActive: true },
    create: { organizationId: developmentOrganization.id, name: "Coffee", slug: "development-coffee", sortOrder: 10 },
  });

  const nonCoffee = await prisma.category.upsert({
    where: { slug: "development-non-coffee" },
    update: { organizationId: developmentOrganization.id, name: "Non-Coffee", sortOrder: 20, isActive: true },
    create: { organizationId: developmentOrganization.id, name: "Non-Coffee", slug: "development-non-coffee", sortOrder: 20 },
  });

  const food = await prisma.category.upsert({
    where: { slug: "development-food" },
    update: { organizationId: developmentOrganization.id, name: "Food", sortOrder: 30, isActive: true },
    create: { organizationId: developmentOrganization.id, name: "Food", slug: "development-food", sortOrder: 30 },
  });

  const espresso = await prisma.product.upsert({
    where: { sku: "DEV-COF-ESP" },
    update: {
      organizationId: developmentOrganization.id,
      categoryId: coffee.id,
      name: "Espresso",
      price: "18000",
      trackStock: false,
    },
    create: {
      organizationId: developmentOrganization.id,
      categoryId: coffee.id,
      name: "Espresso",
      sku: "DEV-COF-ESP",
      price: "18000",
    },
  });

  const latte = await prisma.product.upsert({
    where: { sku: "DEV-COF-LAT" },
    update: {
      organizationId: developmentOrganization.id,
      categoryId: coffee.id,
      name: "Caffe Latte",
      price: "28000",
      trackStock: false,
    },
    create: {
      organizationId: developmentOrganization.id,
      categoryId: coffee.id,
      name: "Caffe Latte",
      sku: "DEV-COF-LAT",
      price: "28000",
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "DEV-COF-LAT-L" },
    update: { organizationId: developmentOrganization.id, productId: latte.id, name: "Large", priceDelta: "6000", isActive: true },
    create: { organizationId: developmentOrganization.id, productId: latte.id, name: "Large", sku: "DEV-COF-LAT-L", priceDelta: "6000" },
  });

  const matcha = await prisma.product.upsert({
    where: { sku: "DEV-NON-MAT" },
    update: {
      organizationId: developmentOrganization.id,
      categoryId: nonCoffee.id,
      name: "Matcha Latte",
      price: "30000",
      trackStock: false,
    },
    create: {
      organizationId: developmentOrganization.id,
      categoryId: nonCoffee.id,
      name: "Matcha Latte",
      sku: "DEV-NON-MAT",
      price: "30000",
    },
  });

  const croissant = await prisma.product.upsert({
    where: { sku: "DEV-FOD-CRS" },
    update: {
      organizationId: developmentOrganization.id,
      categoryId: food.id,
      name: "Butter Croissant",
      price: "24000",
      trackStock: true,
    },
    create: {
      organizationId: developmentOrganization.id,
      categoryId: food.id,
      name: "Butter Croissant",
      sku: "DEV-FOD-CRS",
      price: "24000",
      trackStock: true,
    },
  });

  const beans = await prisma.ingredient.upsert({
    where: { sku: "DEV-ING-BEANS" },
    update: {
      organizationId: developmentOrganization.id,
      name: "Espresso Beans",
      unit: "gram",
      currentStock: "0",
      lowStockThreshold: null,
      isActive: true,
    },
    create: {
      organizationId: developmentOrganization.id,
      name: "Espresso Beans",
      sku: "DEV-ING-BEANS",
      unit: "gram",
      currentStock: "0",
    },
  });

  const milk = await prisma.ingredient.upsert({
    where: { sku: "DEV-ING-MILK" },
    update: {
      organizationId: developmentOrganization.id,
      name: "Fresh Milk",
      unit: "ml",
      currentStock: "0",
      lowStockThreshold: null,
      isActive: true,
    },
    create: {
      organizationId: developmentOrganization.id,
      name: "Fresh Milk",
      sku: "DEV-ING-MILK",
      unit: "ml",
      currentStock: "0",
    },
  });

  const matchaPowder = await prisma.ingredient.upsert({
    where: { sku: "DEV-ING-MATCHA" },
    update: {
      organizationId: developmentOrganization.id,
      name: "Matcha Powder",
      unit: "gram",
      currentStock: "0",
      lowStockThreshold: null,
      isActive: true,
    },
    create: {
      organizationId: developmentOrganization.id,
      name: "Matcha Powder",
      sku: "DEV-ING-MATCHA",
      unit: "gram",
      currentStock: "0",
    },
  });

  for (const [product, stockQuantity, lowStockThreshold] of [
    [espresso, null, null], [latte, null, null], [matcha, null, null], [croissant, "25", "5"],
  ] as const) {
    await prisma.outletProduct.upsert({
      where: { outletId_productId: { outletId: developmentOutlet.id, productId: product.id } },
      update: { isAvailable: true, stockQuantity, lowStockThreshold },
      create: { outletId: developmentOutlet.id, productId: product.id, isAvailable: true, stockQuantity, lowStockThreshold },
    });
  }
  for (const [ingredient, currentStock, lowStockThreshold] of [
    [beans, "5000", "500"], [milk, "12000", "2000"], [matchaPowder, "1500", "250"],
  ] as const) {
    await prisma.outletIngredientStock.upsert({
      where: { outletId_ingredientId: { outletId: developmentOutlet.id, ingredientId: ingredient.id } },
      update: { currentStock, lowStockThreshold },
      create: { outletId: developmentOutlet.id, ingredientId: ingredient.id, currentStock, lowStockThreshold },
    });
  }

  await prisma.productIngredient.deleteMany({
    where: { productId: { in: [espresso.id, latte.id, matcha.id, croissant.id] } },
  });

  await prisma.productIngredient.createMany({
    data: [
      { productId: espresso.id, ingredientId: beans.id, quantityRequired: "18" },
      { productId: latte.id, ingredientId: beans.id, quantityRequired: "18" },
      { productId: latte.id, ingredientId: milk.id, quantityRequired: "180" },
      { productId: matcha.id, ingredientId: matchaPowder.id, quantityRequired: "12" },
      { productId: matcha.id, ingredientId: milk.id, quantityRequired: "160" },
    ],
  });

  const settings = await prisma.appSetting.findFirst({
    where: { organizationId: developmentOrganization.id, outletId: developmentOutlet.id },
  });
  if (settings) {
    await prisma.appSetting.updateMany({
      where: { id: settings.id, organizationId: developmentOrganization.id, outletId: developmentOutlet.id },
      data: {
        organizationId: developmentOrganization.id,
        outletId: developmentOutlet.id,
        storeName: "Maza Cafe",
        storeAddress: "Jakarta",
        storePhone: "+62 812 0000 0000",
        taxEnabled: true,
        taxRate: "11",
        serviceChargeEnabled: true,
        serviceChargeRate: "5",
        receiptFooter: "Thank you for visiting.",
      },
    });
  } else {
    await prisma.appSetting.create({
      data: {
        organizationId: developmentOrganization.id,
        outletId: developmentOutlet.id,
        storeName: "Maza Cafe",
        storeAddress: "Jakarta",
        storePhone: "+62 812 0000 0000",
        taxEnabled: true,
        taxRate: "11",
        serviceChargeEnabled: true,
        serviceChargeRate: "5",
        receiptFooter: "Thank you for visiting.",
      },
    });
  }

  const accountCode = (code: string) => code;
  const cashAccount = await prisma.account.upsert({
    where: { organizationId_code: { organizationId: developmentOrganization.id, code: accountCode("1000") } },
    update: { organizationId: developmentOrganization.id, name: "Cash on Hand", type: "asset", isActive: true },
    create: { organizationId: developmentOrganization.id, code: accountCode("1000"), name: "Cash on Hand", type: "asset" },
  });
  const equityAccount = await prisma.account.upsert({
    where: { organizationId_code: { organizationId: developmentOrganization.id, code: accountCode("1100") } },
    update: { organizationId: developmentOrganization.id, name: "QRIS Clearing", type: "asset", isActive: true },
    create: { organizationId: developmentOrganization.id, code: accountCode("1100"), name: "QRIS Clearing", type: "asset" },
  });
  await prisma.account.upsert({
    where: { organizationId_code: { organizationId: developmentOrganization.id, code: accountCode("3000") } },
    update: { organizationId: developmentOrganization.id, name: "Owner Equity and Cash Variance", type: "equity", isActive: true },
    create: { organizationId: developmentOrganization.id, code: accountCode("3000"), name: "Owner Equity and Cash Variance", type: "equity" },
  });
  await prisma.account.upsert({
    where: { organizationId_code: { organizationId: developmentOrganization.id, code: accountCode("4000") } },
    update: { organizationId: developmentOrganization.id, name: "Sales Revenue", type: "income", isActive: true },
    create: { organizationId: developmentOrganization.id, code: accountCode("4000"), name: "Sales Revenue", type: "income" },
  });
  await prisma.account.upsert({
    where: { organizationId_code: { organizationId: developmentOrganization.id, code: accountCode("4010") } },
    update: { organizationId: developmentOrganization.id, name: "Service Charge Revenue", type: "income", isActive: true },
    create: { organizationId: developmentOrganization.id, code: accountCode("4010"), name: "Service Charge Revenue", type: "income" },
  });
  await prisma.account.upsert({
    where: { organizationId_code: { organizationId: developmentOrganization.id, code: accountCode("2100") } },
    update: { organizationId: developmentOrganization.id, name: "Tax Payable", type: "liability", isActive: true },
    create: { organizationId: developmentOrganization.id, code: accountCode("2100"), name: "Tax Payable", type: "liability" },
  });
  const expenseAccount = await prisma.account.upsert({
    where: { organizationId_code: { organizationId: developmentOrganization.id, code: accountCode("5000") } },
    update: { organizationId: developmentOrganization.id, name: "Operating Expense", type: "expense", isActive: true },
    create: { organizationId: developmentOrganization.id, code: accountCode("5000"), name: "Operating Expense", type: "expense" },
  });

  await Promise.all(
    ["Supplies", "Utilities", "Maintenance"].map((name) =>
      prisma.expenseCategory.upsert({
        where: { organizationId_name: { organizationId: developmentOrganization.id, name } },
        update: { accountId: expenseAccount.id, isActive: true },
        create: { organizationId: developmentOrganization.id, name, accountId: expenseAccount.id },
      }),
    ),
  );

  await prisma.cashLedgerEntry.upsert({
    where: {
      outletId_sourceType_sourceId: { outletId: developmentOutlet.id,
        sourceType: "cash_movement",
        sourceId: "development-seed-opening-cash",
      },
    },
    update: {
      businessDate: "2026-05-04",
      direction: "in",
      amount: "500000",
      description: "Opening cash float",
    },
    create: {
      organizationId: developmentOrganization.id,
      outletId: developmentOutlet.id,
      sourceType: "cash_movement",
      sourceId: "development-seed-opening-cash",
      businessDate: "2026-05-04",
      direction: "in",
      amount: "500000",
      description: "Opening cash float",
    },
  });

  await prisma.journalEntry.upsert({
    where: {
      outletId_sourceType_sourceId: { outletId: developmentOutlet.id,
        sourceType: "cash_movement",
        sourceId: "development-seed-opening-cash",
      },
    },
    update: {},
    create: {
      organizationId: developmentOrganization.id,
      outletId: developmentOutlet.id,
      entryNumber: "JE-DEVELOPMENT-SEED-OPENING-CASH",
      sourceType: "cash_movement",
      sourceId: "development-seed-opening-cash",
      businessDate: "2026-05-04",
      description: "Opening cash float",
      lines: {
        create: [
          { accountId: cashAccount.id, debitAmount: "500000" },
          { accountId: equityAccount.id, creditAmount: "500000" },
        ],
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
