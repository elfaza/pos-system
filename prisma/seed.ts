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

  await prisma.product.upsert({
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

  await prisma.product.upsert({
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

  await prisma.product.upsert({
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
