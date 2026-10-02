import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

const mocks = vi.hoisted(() => ({ requireTenantContext: vi.fn() }));
vi.mock("@/features/auth/services/session-service", () => ({ requireTenantContext: mocks.requireTenantContext }));

const databaseUrl = process.env.TENANT_TRANSACTION_TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

integrationDescribe("checkout tenancy (PostgreSQL)", () => {
  const suffix = randomUUID();
  let client: PrismaClient;
  let service: typeof import("./checkout-service");
  let organizationId: string;
  let outletId: string;
  let userId: string;
  let productId: string;
  let otherProductId: string;
  let ingredientId: string;
  const tenant = { userId: "", organizationId: "", outletId: "", role: "admin" as const };

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    url.searchParams.set("connection_limit", "1");
    process.env.DATABASE_URL = url.toString();
    client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    const organization = await client.organization.create({ data: { name: `Checkout ${suffix}`, slug: `checkout-${suffix}` } });
    organizationId = organization.id;
    const [outlet, otherOrganization] = await Promise.all([
      client.outlet.create({ data: { organizationId, name: "Main", slug: `main-${suffix}` } }),
      client.organization.create({ data: { name: `Other ${suffix}`, slug: `other-${suffix}` } }),
    ]);
    outletId = outlet.id;
    const otherOutlet = await client.outlet.create({ data: { organizationId: otherOrganization.id, name: "Other", slug: `other-${suffix}` } });
    const user = await client.user.create({ data: { name: "Cashier", email: `cashier-${suffix}@example.test`, passwordHash: "fixture", role: "cashier" } });
    userId = user.id;
    Object.assign(tenant, { userId, organizationId, outletId });
    mocks.requireTenantContext.mockResolvedValue(tenant);
    const [category, otherCategory] = await Promise.all([
      client.category.create({ data: { organizationId, name: "Food", slug: `food-${suffix}` } }),
      client.category.create({ data: { organizationId: otherOrganization.id, name: "Food", slug: `other-food-${suffix}` } }),
    ]);
    const [product, otherProduct] = await Promise.all([
      client.product.create({ data: { organizationId, categoryId: category.id, name: "Tenant Product", sku: `sku-${suffix}`, price: "100", trackStock: true,
        outletProducts: { create: { outletId, stockQuantity: "5", isAvailable: true } } } }),
      client.product.create({ data: { organizationId: otherOrganization.id, categoryId: otherCategory.id, name: "Other Product", sku: `other-${suffix}`, price: "100", trackStock: true,
        outletProducts: { create: { outletId: otherOutlet.id, stockQuantity: "5", isAvailable: true } } } }),
    ]);
    productId = product.id;
    otherProductId = otherProduct.id;
    const ingredient = await client.ingredient.create({
      data: { organizationId, name: `Coffee ${suffix}`, unit: "g", currentStock: "0",
        outletStocks: { create: { outletId, currentStock: "10" } } },
    });
    ingredientId = ingredient.id;
    await client.productIngredient.create({ data: { productId, ingredientId, quantityRequired: "3" } });
    await client.appSetting.create({ data: { organizationId, outletId, storeName: "Checkout Test", inventoryEnabled: true, kitchenEnabled: false, queueEnabled: false, accountingEnabled: false, autoRestoreStockOnRefund: true } });
    service = await import("./checkout-service");
  });

  afterAll(async () => {
    if (organizationId) {
      await client.refund.deleteMany({ where: { order: { organizationId } } });
      await client.order.deleteMany({ where: { organizationId } });
      await client.stockMovement.deleteMany({ where: { organizationId } });
      await client.activityLog.deleteMany({ where: { organizationId } });
      const rows = await client.organization.findMany({ where: { slug: { contains: suffix } }, select: { id: true } });
      const organizationIds = rows.map(({ id }) => id);
      await client.outletProduct.deleteMany({ where: { product: { organizationId: { in: organizationIds } } } });
      await client.outletIngredientStock.deleteMany({ where: { ingredient: { organizationId: { in: organizationIds } } } });
      await client.productIngredient.deleteMany({ where: { product: { organizationId: { in: organizationIds } } } });
      await client.ingredient.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await client.product.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await client.category.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await client.appSetting.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await client.organization.deleteMany({ where: { id: { in: organizationIds } } });
    }
    if (userId) await client.user.deleteMany({ where: { id: userId } });
    await client?.$disconnect();
  });

  it("stamps the order and deducts only its outlet balance; hides another organization's product", async () => {
    const order = await service.finalizeCheckout({
      orderType: "takeaway", paymentMethod: "qris", cashReceivedAmount: null,
      items: [{ productId, variantId: null, selectedOptionValueIds: [], quantity: 2, discountAmount: 0, notes: "" }],
    }, { id: userId, name: "Cashier", email: `cashier-${suffix}@example.test`, role: "cashier" });
    const [storedOrder, balance] = await Promise.all([
      client.order.findUniqueOrThrow({ where: { id: order.id } }),
      client.outletProduct.findUniqueOrThrow({ where: { outletId_productId: { outletId, productId } } }),
    ]);
    expect(storedOrder).toMatchObject({ organizationId, outletId });
    expect(Number(balance.stockQuantity)).toBe(3);
    expect(Number((await client.outletIngredientStock.findUniqueOrThrow({ where: { outletId_ingredientId: { outletId, ingredientId } } })).currentStock)).toBe(4);
    await service.refundOrder(order.id, { reason: "Integration test" }, { id: userId, name: "Owner", email: `cashier-${suffix}@example.test`, role: "admin" });
    const restoredBalance = await client.outletProduct.findUniqueOrThrow({ where: { outletId_productId: { outletId, productId } } });
    expect(Number(restoredBalance.stockQuantity)).toBe(5);
    expect(Number((await client.outletIngredientStock.findUniqueOrThrow({ where: { outletId_ingredientId: { outletId, ingredientId } } })).currentStock)).toBe(10);
    expect(await client.stockMovement.count({ where: { orderId: order.id, type: "refund_restore", organizationId, outletId } })).toBe(2);
    await expect(service.finalizeCheckout({
      orderType: "takeaway", paymentMethod: "qris", cashReceivedAmount: null,
      items: [{ productId: otherProductId, variantId: null, selectedOptionValueIds: [], quantity: 1, discountAmount: 0, notes: "" }],
    }, { id: userId, name: "Cashier", email: `cashier-${suffix}@example.test`, role: "cashier" })).rejects.toMatchObject({
      fieldErrors: expect.objectContaining({ "items.0.productId": expect.any(String) }),
    });
  });
});
