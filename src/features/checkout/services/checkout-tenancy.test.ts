import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findHeldOrderById,
  findOrderByIdForUser,
  findProductsForCheckout,
  listHeldOrdersForUser,
  listOrdersForUser,
} from "../repositories/order-repository";

const mocks = vi.hoisted(() => ({
  productFindMany: vi.fn(),
  orderFindMany: vi.fn(),
  orderFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: mocks.productFindMany },
    order: { findMany: mocks.orderFindMany, findFirst: mocks.orderFindFirst },
  },
}));

const tenant = { userId: "user-a", organizationId: "org-a", outletId: "outlet-a", role: "owner" as const };

describe("checkout repository tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("only resolves active products for the current organization and outlet", async () => {
    mocks.productFindMany.mockResolvedValue([]);
    await findProductsForCheckout(tenant, ["product-guessed"]);

    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        organizationId: "org-a",
        id: { in: ["product-guessed"] },
        outletProducts: { some: { outletId: "outlet-a", isAvailable: true } },
      },
      include: expect.objectContaining({
        outletProducts: { where: { outletId: "outlet-a" }, take: 1 },
      }),
    }));
  });

  it("scopes held and historical order reads to the active outlet", async () => {
    const user = { id: "user-a", role: "cashier" };
    mocks.orderFindMany.mockResolvedValue([]);
    mocks.orderFindFirst.mockResolvedValue(null);

    await listHeldOrdersForUser(tenant, user);
    await listOrdersForUser(tenant, user);
    await findHeldOrderById(tenant, "guessed-order", user);
    await findOrderByIdForUser(tenant, "guessed-order", user);

    for (const [args] of mocks.orderFindMany.mock.calls) {
      expect(args.where).toMatchObject({ organizationId: "org-a", outletId: "outlet-a", cashierId: "user-a" });
    }
    for (const [args] of mocks.orderFindFirst.mock.calls) {
      expect(args.where).toMatchObject({ organizationId: "org-a", outletId: "outlet-a", cashierId: "user-a" });
    }
  });
});
