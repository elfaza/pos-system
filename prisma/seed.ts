import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/features/auth/utils/password";

const prisma = new PrismaClient();

async function main() {
  const [adminPasswordHash, cashierPasswordHash] = await Promise.all([
    hashPassword("admin12345"),
    hashPassword("cashier12345"),
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

  const coffee = await prisma.category.upsert({
    where: { slug: "coffee" },
    update: { name: "Coffee", sortOrder: 10, isActive: true },
    create: { name: "Coffee", slug: "coffee", sortOrder: 10 },
  });

  const nonCoffee = await prisma.category.upsert({
    where: { slug: "non-coffee" },
    update: { name: "Non-Coffee", sortOrder: 20, isActive: true },
    create: { name: "Non-Coffee", slug: "non-coffee", sortOrder: 20 },
  });

  const food = await prisma.category.upsert({
    where: { slug: "food" },
    update: { name: "Food", sortOrder: 30, isActive: true },
    create: { name: "Food", slug: "food", sortOrder: 30 },
  });

  const espresso = await prisma.product.upsert({
    where: { sku: "COF-ESP" },
    update: {
      categoryId: coffee.id,
      name: "Espresso",
      price: "18000",
      isAvailable: true,
      trackStock: false,
    },
    create: {
      categoryId: coffee.id,
      name: "Espresso",
      sku: "COF-ESP",
      price: "18000",
    },
  });

  const latte = await prisma.product.upsert({
    where: { sku: "COF-LAT" },
    update: {
      categoryId: coffee.id,
      name: "Caffe Latte",
      price: "28000",
      isAvailable: true,
      trackStock: false,
    },
    create: {
      categoryId: coffee.id,
      name: "Caffe Latte",
      sku: "COF-LAT",
      price: "28000",
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "COF-LAT-L" },
    update: { productId: latte.id, name: "Large", priceDelta: "6000", isActive: true },
    create: { productId: latte.id, name: "Large", sku: "COF-LAT-L", priceDelta: "6000" },
  });

  const matcha = await prisma.product.upsert({
    where: { sku: "NON-MAT" },
    update: {
      categoryId: nonCoffee.id,
      name: "Matcha Latte",
      price: "30000",
      isAvailable: true,
      trackStock: false,
    },
    create: {
      categoryId: nonCoffee.id,
      name: "Matcha Latte",
      sku: "NON-MAT",
      price: "30000",
    },
  });

  const croissant = await prisma.product.upsert({
    where: { sku: "FOD-CRS" },
    update: {
      categoryId: food.id,
      name: "Butter Croissant",
      price: "24000",
      isAvailable: true,
      trackStock: true,
      stockQuantity: "25",
      lowStockThreshold: "5",
    },
    create: {
      categoryId: food.id,
      name: "Butter Croissant",
      sku: "FOD-CRS",
      price: "24000",
      trackStock: true,
      stockQuantity: "25",
      lowStockThreshold: "5",
    },
  });

  const beans = await prisma.ingredient.upsert({
    where: { sku: "ING-BEANS" },
    update: {
      name: "Espresso Beans",
      unit: "gram",
      currentStock: "5000",
      lowStockThreshold: "500",
      isActive: true,
    },
    create: {
      name: "Espresso Beans",
      sku: "ING-BEANS",
      unit: "gram",
      currentStock: "5000",
      lowStockThreshold: "500",
    },
  });

  const milk = await prisma.ingredient.upsert({
    where: { sku: "ING-MILK" },
    update: {
      name: "Fresh Milk",
      unit: "ml",
      currentStock: "12000",
      lowStockThreshold: "2000",
      isActive: true,
    },
    create: {
      name: "Fresh Milk",
      sku: "ING-MILK",
      unit: "ml",
      currentStock: "12000",
      lowStockThreshold: "2000",
    },
  });

  const matchaPowder = await prisma.ingredient.upsert({
    where: { sku: "ING-MATCHA" },
    update: {
      name: "Matcha Powder",
      unit: "gram",
      currentStock: "1500",
      lowStockThreshold: "250",
      isActive: true,
    },
    create: {
      name: "Matcha Powder",
      sku: "ING-MATCHA",
      unit: "gram",
      currentStock: "1500",
      lowStockThreshold: "250",
    },
  });

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

  const settings = await prisma.appSetting.findFirst();
  if (settings) {
    await prisma.appSetting.update({
      where: { id: settings.id },
      data: {
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

  const cashAccount = await prisma.account.upsert({
    where: { code: "1000" },
    update: { name: "Cash on Hand", type: "asset", isActive: true },
    create: { code: "1000", name: "Cash on Hand", type: "asset" },
  });
  const equityAccount = await prisma.account.upsert({
    where: { code: "1100" },
    update: { name: "QRIS Clearing", type: "asset", isActive: true },
    create: { code: "1100", name: "QRIS Clearing", type: "asset" },
  });
  await prisma.account.upsert({
    where: { code: "3000" },
    update: { name: "Owner Equity and Cash Variance", type: "equity", isActive: true },
    create: { code: "3000", name: "Owner Equity and Cash Variance", type: "equity" },
  });
  await prisma.account.upsert({
    where: { code: "4000" },
    update: { name: "Sales Revenue", type: "income", isActive: true },
    create: { code: "4000", name: "Sales Revenue", type: "income" },
  });
  await prisma.account.upsert({
    where: { code: "4010" },
    update: { name: "Service Charge Revenue", type: "income", isActive: true },
    create: { code: "4010", name: "Service Charge Revenue", type: "income" },
  });
  await prisma.account.upsert({
    where: { code: "2100" },
    update: { name: "Tax Payable", type: "liability", isActive: true },
    create: { code: "2100", name: "Tax Payable", type: "liability" },
  });
  const expenseAccount = await prisma.account.upsert({
    where: { code: "5000" },
    update: { name: "Operating Expense", type: "expense", isActive: true },
    create: { code: "5000", name: "Operating Expense", type: "expense" },
  });

  await Promise.all(
    ["Supplies", "Utilities", "Maintenance"].map((name) =>
      prisma.expenseCategory.upsert({
        where: { name },
        update: { accountId: expenseAccount.id, isActive: true },
        create: { name, accountId: expenseAccount.id },
      }),
    ),
  );

  await prisma.cashLedgerEntry.upsert({
    where: {
      sourceType_sourceId: {
        sourceType: "cash_movement",
        sourceId: "seed-opening-cash",
      },
    },
    update: {
      businessDate: "2026-05-04",
      direction: "in",
      amount: "500000",
      description: "Opening cash float",
    },
    create: {
      sourceType: "cash_movement",
      sourceId: "seed-opening-cash",
      businessDate: "2026-05-04",
      direction: "in",
      amount: "500000",
      description: "Opening cash float",
    },
  });

  await prisma.journalEntry.upsert({
    where: {
      sourceType_sourceId: {
        sourceType: "cash_movement",
        sourceId: "seed-opening-cash",
      },
    },
    update: {},
    create: {
      entryNumber: "JE-SEED-OPENING-CASH",
      sourceType: "cash_movement",
      sourceId: "seed-opening-cash",
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
