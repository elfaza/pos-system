import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/lib/api-response";
import { deactivateOutletMember, listOutletMembers, saveOutletMember } from "./membership-service";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(), userFindUnique: vi.fn(), userCreate: vi.fn(), userUpdate: vi.fn(), membershipFindUnique: vi.fn(),
  membershipFindFirst: vi.fn(), membershipUpsert: vi.fn(), membershipUpdate: vi.fn(),
  orgFindFirst: vi.fn(), orgCount: vi.fn(), orgUpdate: vi.fn(), activityCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/features/auth/services/session-service", () => ({
  requireTenantContext: vi.fn().mockResolvedValue({ userId: "owner-1", organizationId: "org-1", outletId: "outlet-1", role: "owner" }),
}));
vi.mock("@/lib/tenant-prisma", () => ({
  withTenantTransaction: (_context: unknown, callback: (tx: unknown) => Promise<unknown>) => callback({
    user: { findUnique: mocks.userFindUnique, create: mocks.userCreate, update: mocks.userUpdate },
    outletMembership: { findMany: mocks.findMany, findUnique: mocks.membershipFindUnique, findFirst: mocks.membershipFindFirst, upsert: mocks.membershipUpsert, update: mocks.membershipUpdate },
    organizationMembership: { findFirst: mocks.orgFindFirst, count: mocks.orgCount, update: mocks.orgUpdate },
    activityLog: { create: mocks.activityCreate },
  }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { outletMembership: { findMany: mocks.findMany } } }));
vi.mock("@/features/auth/utils/password", () => ({ hashPassword: vi.fn().mockResolvedValue("hashed") }));

describe("outlet membership service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.userFindUnique.mockResolvedValue({ id: "member-1", name: "Member", email: "member@example.test", role: "cashier", lastLoginAt: null });
    mocks.membershipFindUnique.mockResolvedValue(null);
    mocks.membershipFindFirst.mockResolvedValue({ id: "membership-1", userId: "member-1", isActive: true });
    mocks.membershipUpsert.mockResolvedValue({ id: "membership-1", role: "cashier", isActive: true, createdAt: new Date(), updatedAt: new Date() });
    mocks.orgFindFirst.mockResolvedValue(null);
    mocks.orgCount.mockResolvedValue(1);
    mocks.activityCreate.mockResolvedValue({});
  });

  it("lists only memberships at the active outlet", async () => {
    await listOutletMembers();
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: "org-1", outletId: "outlet-1" },
    }));
  });

  it("attaches an existing global identity to the current outlet without changing the identity", async () => {
    await saveOutletMember({ name: "Member", email: "member@example.test", role: "cashier" });
    expect(mocks.membershipUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { outletId_userId: { outletId: "outlet-1", userId: "member-1" } },
      create: expect.objectContaining({ organizationId: "org-1", outletId: "outlet-1", role: "cashier" }),
    }));
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("creates a new global identity with a required password and outlet role", async () => {
    mocks.userFindUnique.mockResolvedValueOnce(null);
    mocks.userCreate.mockResolvedValueOnce({ id: "member-new", name: "New Member", email: "new@example.test", role: "cashier", lastLoginAt: null });
    mocks.membershipUpsert.mockResolvedValueOnce({ id: "membership-new", role: "kitchen", isActive: true, createdAt: new Date(), updatedAt: new Date() });
    await saveOutletMember({ name: "New Member", email: "new@example.test", role: "kitchen", password: "correct-horse-battery-staple" });
    expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: "new@example.test", passwordHash: "hashed" }) }));
    expect(mocks.membershipUpsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ role: "kitchen", outletId: "outlet-1" }) }));
  });

  it("deactivates only the outlet membership, not the global identity", async () => {
    mocks.orgFindFirst.mockResolvedValue(null);
    await deactivateOutletMember("member-1");
    expect(mocks.membershipUpdate).toHaveBeenCalledWith({ where: { id: "membership-1" }, data: { isActive: false } });
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("prevents removing the organization's last active owner", async () => {
    mocks.membershipFindFirst.mockResolvedValue({ id: "membership-1", userId: "member-1", isActive: true });
    mocks.orgFindFirst.mockResolvedValue({ id: "owner-membership-1" });
    mocks.orgCount.mockResolvedValue(1);
    await expect(deactivateOutletMember("member-1")).rejects.toBeInstanceOf(ForbiddenError);
  });
});
