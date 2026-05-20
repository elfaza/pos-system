import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, ValidationError } from "@/lib/api-response";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireModuleEnabled: vi.fn(),
  getKitchenBoard: vi.fn(),
  changeKitchenStatus: vi.fn(),
  getKitchenTicket: vi.fn(),
}));

vi.mock("@/features/auth/services/session-service", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/features/catalog/services/module-config", () => ({
  requireModuleEnabled: mocks.requireModuleEnabled,
}));

vi.mock("@/features/kitchen/services/kitchen-service", () => ({
  getKitchenBoard: mocks.getKitchenBoard,
  changeKitchenStatus: mocks.changeKitchenStatus,
  getKitchenTicket: mocks.getKitchenTicket,
  parseKitchenStatus: (status: string) => {
    if (status === "preparing") return "preparing";
    throw new ValidationError("Invalid status");
  },
}));

describe("kitchen API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireModuleEnabled.mockResolvedValue({});
  });

  describe("GET /api/kitchen/orders", () => {
    it("returns forbidden if the user does not have permission", async () => {
      mocks.requireUser.mockRejectedValue(new ForbiddenError());
      const { GET } = await import("@/app/api/kitchen/orders/route");

      const response = await GET();

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "You do not have permission to perform this action.",
      });
      expect(mocks.requireUser).toHaveBeenCalledWith(["admin", "cashier"]);
      expect(mocks.getKitchenBoard).not.toHaveBeenCalled();
    });

    it("returns forbidden if the kitchen module is disabled", async () => {
      mocks.requireUser.mockResolvedValue({ id: "user-1", role: "cashier" });
      mocks.requireModuleEnabled.mockRejectedValue(
        new ForbiddenError("Kitchen module is disabled."),
      );
      const { GET } = await import("@/app/api/kitchen/orders/route");

      const response = await GET();

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "Kitchen module is disabled.",
      });
      expect(mocks.getKitchenBoard).not.toHaveBeenCalled();
    });

    it("returns active kitchen board successfully", async () => {
      mocks.requireUser.mockResolvedValue({ id: "user-1", role: "cashier" });
      const mockBoard = { received: [], preparing: [], ready: [] };
      mocks.getKitchenBoard.mockResolvedValue(mockBoard);
      const { GET } = await import("@/app/api/kitchen/orders/route");

      const response = await GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ board: mockBoard });
      expect(mocks.getKitchenBoard).toHaveBeenCalled();
    });
  });

  describe("PATCH /api/kitchen/orders/[id]/status", () => {
    it("updates kitchen status successfully", async () => {
      const user = { id: "user-1", role: "cashier" };
      mocks.requireUser.mockResolvedValue(user);
      const mockOrder = { id: "order-1", kitchenStatus: "preparing" };
      mocks.changeKitchenStatus.mockResolvedValue(mockOrder);
      const { PATCH } = await import("@/app/api/kitchen/orders/[id]/status/route");

      const request = new Request("http://localhost/api/kitchen/orders/order-1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "preparing" }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "order-1" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ order: mockOrder });
      expect(mocks.changeKitchenStatus).toHaveBeenCalledWith("order-1", "preparing", user);
    });

    it("returns validation/parsing error for invalid status", async () => {
      mocks.requireUser.mockResolvedValue({ id: "user-1", role: "cashier" });
      const { PATCH } = await import("@/app/api/kitchen/orders/[id]/status/route");

      const request = new Request("http://localhost/api/kitchen/orders/order-1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "invalid" }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "order-1" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty("error");
      expect(mocks.changeKitchenStatus).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/kitchen/orders/[id]/ticket", () => {
    it("returns print-ready ticket payload successfully", async () => {
      mocks.requireUser.mockResolvedValue({ id: "user-1", role: "cashier" });
      const mockTicket = { orderId: "order-1", orderNumber: "ORD-001" };
      mocks.getKitchenTicket.mockResolvedValue(mockTicket);
      const { GET } = await import("@/app/api/kitchen/orders/[id]/ticket/route");

      const request = new Request("http://localhost/api/kitchen/orders/order-1/ticket");
      const response = await GET(request, {
        params: Promise.resolve({ id: "order-1" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ticket: mockTicket });
      expect(mocks.getKitchenTicket).toHaveBeenCalledWith("order-1");
    });
  });
});
