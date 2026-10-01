import { pbkdf2Sync } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

const FIXTURE_DATE = new Date("2026-09-30T08:00:00.000Z");
const BUSINESS_DATE = "2026-09-30";

function deterministicPasswordHash(password: string) {
  const salt = "00112233445566778899aabbccddeeff";
  const key = pbkdf2Sync(password, salt, 210_000, 64, "sha512");
  return `210000:${salt}:${key.toString("hex")}`;
}

async function assertEmptyDatabase(client: Prisma.TransactionClient) {
  const populatedModels = await Promise.all([
    client.user.count(),
    client.product.count(),
    client.order.count(),
    client.account.count(),
  ]);

  if (populatedModels.some((count) => count > 0)) {
    throw new Error(
      "Legacy tenant baseline fixture requires an empty disposable database.",
    );
  }
}

export async function loadLegacyTenantBaseline(prisma: PrismaClient) {
  await prisma.$transaction(async (client) => {
    await assertEmptyDatabase(client);

    const passwordHash = deterministicPasswordHash("fixture-password");
    await client.user.createMany({
      data: [
        { id: "legacy_user_admin", name: "Legacy Admin", email: "admin@legacy.test", passwordHash, role: "admin" },
        { id: "legacy_user_cashier", name: "Legacy Cashier", email: "cashier@legacy.test", passwordHash, role: "cashier" },
        { id: "legacy_user_kitchen", name: "Legacy Kitchen", email: "kitchen@legacy.test", passwordHash, role: "kitchen" },
        { id: "legacy_user_queue", name: "Legacy Queue", email: "queue@legacy.test", passwordHash, role: "queue" },
        { id: "legacy_user_cfd", name: "Legacy Customer Display", email: "display@legacy.test", passwordHash, role: "customer_facing_display" },
      ],
    });

    await client.session.create({
      data: {
        id: "legacy_session_cashier",
        userId: "legacy_user_cashier",
        tokenHash: "legacy-fixture-session-token-hash",
        expiresAt: new Date("2026-10-07T08:00:00.000Z"),
      },
    });

    await client.category.createMany({
      data: [
        { id: "legacy_category_drinks", name: "Drinks", slug: "drinks", sortOrder: 10 },
        { id: "legacy_category_food", name: "Food", slug: "food", sortOrder: 20 },
      ],
    });

    await client.product.createMany({
      data: [
        {
          id: "legacy_product_latte",
          categoryId: "legacy_category_drinks",
          name: "Legacy Latte",
          sku: "LEGACY-LATTE",
          price: "30000",
          costPrice: "12000",
          trackStock: false,
          isAvailable: true,
        },
        {
          id: "legacy_product_pastry",
          categoryId: "legacy_category_food",
          name: "Legacy Pastry",
          sku: "LEGACY-PASTRY",
          price: "20000",
          costPrice: "8000",
          trackStock: true,
          stockQuantity: "18",
          lowStockThreshold: "4",
          isAvailable: true,
        },
      ],
    });

    await client.productVariant.create({
      data: {
        id: "legacy_variant_latte_large",
        productId: "legacy_product_latte",
        name: "Large",
        sku: "LEGACY-LATTE-L",
        priceDelta: "5000",
        costDelta: "2000",
      },
    });

    await client.ingredient.createMany({
      data: [
        { id: "legacy_ingredient_beans", name: "Coffee Beans", sku: "LEGACY-BEANS", unit: "gram", currentStock: "5000", lowStockThreshold: "500" },
        { id: "legacy_ingredient_milk", name: "Fresh Milk", sku: "LEGACY-MILK", unit: "ml", currentStock: "10000", lowStockThreshold: "1500" },
        { id: "legacy_ingredient_oat", name: "Oat Milk", sku: "LEGACY-OAT", unit: "ml", currentStock: "4000", lowStockThreshold: "800" },
      ],
    });

    await client.productIngredient.createMany({
      data: [
        { id: "legacy_recipe_beans", productId: "legacy_product_latte", ingredientId: "legacy_ingredient_beans", quantityRequired: "18" },
        { id: "legacy_recipe_milk", productId: "legacy_product_latte", ingredientId: "legacy_ingredient_milk", quantityRequired: "180" },
      ],
    });

    await client.productOptionGroup.create({
      data: {
        id: "legacy_option_group_milk",
        productId: "legacy_product_latte",
        name: "Milk choice",
        selectionType: "single",
        isRequired: true,
        values: {
          create: [
            { id: "legacy_option_value_regular", name: "Regular milk", sortOrder: 10 },
            { id: "legacy_option_value_oat", name: "Oat milk", priceDelta: "5000", sortOrder: 20 },
          ],
        },
      },
    });

    await client.productOptionValueIngredient.create({
      data: {
        id: "legacy_option_recipe_oat",
        optionValueId: "legacy_option_value_oat",
        ingredientId: "legacy_ingredient_oat",
        quantityRequired: "180",
      },
    });
    await client.productOptionValueIngredientReplacement.create({
      data: {
        id: "legacy_option_replacement_oat",
        optionValueId: "legacy_option_value_oat",
        replacedIngredientId: "legacy_ingredient_milk",
        replacementIngredientId: "legacy_ingredient_oat",
        quantityRequired: "180",
      },
    });

    await client.appSetting.create({
      data: {
        id: "legacy_settings",
        storeName: "Legacy Cafe",
        storeAddress: "Jakarta",
        storePhone: "+62 800 0000 0000",
        taxEnabled: true,
        taxRate: "11",
        serviceChargeEnabled: true,
        serviceChargeRate: "5",
        receiptFooter: "Legacy fixture receipt",
      },
    });
    await client.customerDisplayState.create({
      data: {
        id: "legacy_customer_display",
        scopeKey: "default",
        status: "active",
        storeName: "Legacy Cafe",
        payload: { orderNumber: "LEGACY-PAID", totalAmount: 55000 },
      },
    });
    await client.diningTable.create({
      data: { id: "legacy_table_1", name: "Table 1", sortOrder: 10 },
    });

    const orderDefinitions = [
      { id: "legacy_order_draft", number: "LEGACY-DRAFT", type: "dine_in", status: "draft", total: "30000", tableId: "legacy_table_1" },
      { id: "legacy_order_held", number: "LEGACY-HELD", type: "dine_in", status: "held", total: "30000", tableId: "legacy_table_1", heldAt: FIXTURE_DATE },
      { id: "legacy_order_pending", number: "LEGACY-PENDING", type: "delivery", status: "pending_payment", total: "35000" },
      { id: "legacy_order_paid", number: "LEGACY-PAID", type: "takeaway", status: "paid", total: "55000", paidAt: FIXTURE_DATE, queueNumber: 1 },
      { id: "legacy_order_cancelled", number: "LEGACY-CANCELLED", type: "delivery", status: "cancelled", total: "20000", cancelledAt: FIXTURE_DATE },
      { id: "legacy_order_refunded", number: "LEGACY-REFUNDED", type: "takeaway", status: "refunded", total: "30000", paidAt: FIXTURE_DATE, refundedAt: FIXTURE_DATE, queueNumber: 2 },
    ] as const;

    for (const order of orderDefinitions) {
      await client.order.create({
        data: {
          id: order.id,
          orderNumber: order.number,
          cashierId: "legacy_user_cashier",
          orderType: order.type,
          tableId: "tableId" in order ? order.tableId : null,
          status: order.status,
          subtotalAmount: order.total,
          totalAmount: order.total,
          heldAt: "heldAt" in order ? order.heldAt : null,
          paidAt: "paidAt" in order ? order.paidAt : null,
          cancelledAt: "cancelledAt" in order ? order.cancelledAt : null,
          refundedAt: "refundedAt" in order ? order.refundedAt : null,
          queueBusinessDate: "queueNumber" in order ? BUSINESS_DATE : null,
          queueNumber: "queueNumber" in order ? order.queueNumber : null,
          kitchenStatus: order.status === "paid" ? "received" : null,
          deliveryCustomerName: order.type === "delivery" ? "Fixture Customer" : null,
          deliveryCustomerPhone: order.type === "delivery" ? "+62 811 1111 1111" : null,
          deliveryAddress: order.type === "delivery" ? "Fixture Address" : null,
          items: {
            create: {
              id: `${order.id}_item`,
              productId: "legacy_product_latte",
              productNameSnapshot: "Legacy Latte",
              quantity: "1",
              unitPrice: order.total,
              lineTotal: order.total,
            },
          },
        },
      });
    }

    await client.orderItemOptionSelection.create({
      data: {
        id: "legacy_order_paid_oat",
        orderItemId: "legacy_order_paid_item",
        optionGroupId: "legacy_option_group_milk",
        optionValueId: "legacy_option_value_oat",
        groupNameSnapshot: "Milk choice",
        valueNameSnapshot: "Oat milk",
        priceDelta: "5000",
      },
    });

    await client.payment.createMany({
      data: [
        { id: "legacy_payment_pending", orderId: "legacy_order_pending", method: "qris", status: "pending", amount: "35000", provider: "fixture" },
        { id: "legacy_payment_paid", orderId: "legacy_order_paid", method: "cash", status: "paid", amount: "55000", cashReceivedAmount: "60000", changeAmount: "5000", paidAt: FIXTURE_DATE },
        { id: "legacy_payment_refunded", orderId: "legacy_order_refunded", method: "qris", status: "refunded", amount: "30000", provider: "fixture", providerReference: "fixture-refunded", paidAt: FIXTURE_DATE },
      ],
    });
    await client.refund.create({
      data: {
        id: "legacy_refund",
        orderId: "legacy_order_refunded",
        paymentId: "legacy_payment_refunded",
        approvedByUserId: "legacy_user_admin",
        amount: "30000",
        reason: "Fixture refund",
        stockRestored: true,
      },
    });

    await client.stockMovement.createMany({
      data: [
        { id: "legacy_stock_product_sale", productId: "legacy_product_pastry", orderId: "legacy_order_paid", type: "sale_deduction", quantityChange: "-1", createdByUserId: "legacy_user_cashier" },
        { id: "legacy_stock_ingredient_sale", ingredientId: "legacy_ingredient_beans", orderId: "legacy_order_paid", type: "sale_deduction", quantityChange: "-18", createdByUserId: "legacy_user_cashier" },
        { id: "legacy_stock_refund", ingredientId: "legacy_ingredient_beans", orderId: "legacy_order_refunded", type: "refund_restore", quantityChange: "18", createdByUserId: "legacy_user_admin" },
        { id: "legacy_stock_waste", ingredientId: "legacy_ingredient_milk", type: "waste", quantityChange: "-100", reason: "Fixture waste", createdByUserId: "legacy_user_admin" },
      ],
    });

    await client.account.createMany({
      data: [
        { id: "legacy_account_cash", code: "1000", name: "Cash", type: "asset" },
        { id: "legacy_account_qris", code: "1100", name: "QRIS Clearing", type: "asset" },
        { id: "legacy_account_tax", code: "2100", name: "Tax Payable", type: "liability" },
        { id: "legacy_account_equity", code: "3000", name: "Owner Equity", type: "equity" },
        { id: "legacy_account_sales", code: "4000", name: "Sales Revenue", type: "income" },
        { id: "legacy_account_expense", code: "5000", name: "Operating Expense", type: "expense" },
      ],
    });
    await client.expenseCategory.create({
      data: {
        id: "legacy_expense_category",
        name: "Fixture Supplies",
        accountId: "legacy_account_expense",
      },
    });
    await client.expense.create({
      data: {
        id: "legacy_expense",
        categoryId: "legacy_expense_category",
        amount: "12500",
        businessDate: BUSINESS_DATE,
        paymentSource: "cash",
        description: "Fixture supplies",
        createdByUserId: "legacy_user_admin",
      },
    });
    await client.cashMovement.create({
      data: {
        id: "legacy_cash_movement",
        type: "cash_in",
        amount: "500000",
        businessDate: BUSINESS_DATE,
        reason: "Fixture opening cash",
        createdByUserId: "legacy_user_admin",
      },
    });
    await client.cashLedgerEntry.createMany({
      data: [
        { id: "legacy_ledger_sale", sourceType: "order", sourceId: "legacy_order_paid", businessDate: BUSINESS_DATE, direction: "in", amount: "55000", description: "Fixture sale" },
        { id: "legacy_ledger_expense", sourceType: "expense", sourceId: "legacy_expense", businessDate: BUSINESS_DATE, direction: "out", amount: "12500", description: "Fixture expense" },
        { id: "legacy_ledger_opening", sourceType: "cash_movement", sourceId: "legacy_cash_movement", businessDate: BUSINESS_DATE, direction: "in", amount: "500000", description: "Fixture opening cash" },
      ],
    });

    await client.journalEntry.create({
      data: {
        id: "legacy_journal_sale",
        entryNumber: "LEGACY-JE-001",
        sourceType: "order",
        sourceId: "legacy_order_paid",
        businessDate: BUSINESS_DATE,
        description: "Fixture sale",
        createdByUserId: "legacy_user_admin",
        lines: {
          create: [
            { id: "legacy_journal_sale_debit", accountId: "legacy_account_cash", debitAmount: "55000" },
            { id: "legacy_journal_sale_credit", accountId: "legacy_account_sales", creditAmount: "55000" },
          ],
        },
      },
    });
    await client.journalEntry.create({
      data: {
        id: "legacy_journal_expense",
        entryNumber: "LEGACY-JE-002",
        sourceType: "expense",
        sourceId: "legacy_expense",
        businessDate: BUSINESS_DATE,
        description: "Fixture expense",
        createdByUserId: "legacy_user_admin",
        lines: {
          create: [
            { id: "legacy_journal_expense_debit", accountId: "legacy_account_expense", debitAmount: "12500" },
            { id: "legacy_journal_expense_credit", accountId: "legacy_account_cash", creditAmount: "12500" },
          ],
        },
      },
    });
    await client.journalEntry.create({
      data: {
        id: "legacy_journal_opening",
        entryNumber: "LEGACY-JE-003",
        sourceType: "cash_movement",
        sourceId: "legacy_cash_movement",
        businessDate: BUSINESS_DATE,
        description: "Fixture opening cash",
        createdByUserId: "legacy_user_admin",
        lines: {
          create: [
            { id: "legacy_journal_opening_debit", accountId: "legacy_account_cash", debitAmount: "500000" },
            { id: "legacy_journal_opening_credit", accountId: "legacy_account_equity", creditAmount: "500000" },
          ],
        },
      },
    });

    await client.dailyClose.create({
      data: {
        id: "legacy_daily_close",
        businessDate: BUSINESS_DATE,
        expectedCashAmount: "542500",
        countedCashAmount: "542000",
        differenceAmount: "-500",
        closedByUserId: "legacy_user_admin",
        closedAt: FIXTURE_DATE,
      },
    });
    await client.activityLog.createMany({
      data: [
        { id: "legacy_activity_login", userId: "legacy_user_cashier", action: "auth.login", entityType: "user", entityId: "legacy_user_cashier" },
        { id: "legacy_activity_payment", userId: "legacy_user_cashier", action: "order.paid", entityType: "order", entityId: "legacy_order_paid", metadata: { paymentMethod: "cash" } },
        { id: "legacy_activity_refund", userId: "legacy_user_admin", action: "order.refunded", entityType: "order", entityId: "legacy_order_refunded" },
      ],
    });
  });
}
