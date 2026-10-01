import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

const models = Prisma.dmmf.datamodel.models;
const enums = Prisma.dmmf.datamodel.enums;

function model(name: string) {
  const found = models.find((candidate) => candidate.name === name);
  expect(found, `Prisma model ${name} should exist`).toBeDefined();
  return found!;
}

function hasUnique(modelName: string, fields: string[]) {
  const target = fields.join(",");
  const metadata = model(modelName);
  return (
    metadata.uniqueFields.some((key) => key.join(",") === target) ||
    metadata.uniqueIndexes.some((key) => key.fields.join(",") === target)
    || (fields.length === 1 && metadata.fields.some((field) => field.name === fields[0] && field.isUnique))
  );
}

describe("tenant membership schema", () => {
  it("defines organization and outlet role enums", () => {
    expect(enums.find((candidate) => candidate.name === "OrganizationRole")?.values.map(({ name }) => name)).toEqual([
      "owner",
      "admin",
    ]);
    expect(enums.find((candidate) => candidate.name === "OutletRole")?.values.map(({ name }) => name)).toEqual([
      "admin",
      "cashier",
      "kitchen",
      "queue",
      "customer_facing_display",
    ]);
  });

  it("uniquely identifies organizations and outlets within their organization", () => {
    expect(hasUnique("Organization", ["slug"])).toBe(true);
    expect(hasUnique("Outlet", ["organizationId", "slug"])).toBe(true);
  });

  it("allows one organization membership and one outlet membership per user", () => {
    expect(hasUnique("OrganizationMembership", ["organizationId", "userId"])).toBe(true);
    expect(hasUnique("OutletMembership", ["outletId", "userId"])).toBe(true);
  });

  it("constrains an outlet membership to an outlet in the same organization", () => {
    const outletRelation = model("OutletMembership").fields.find(
      (field) => field.name === "outlet",
    );

    expect(outletRelation?.relationFromFields).toEqual(["organizationId", "outletId"]);
    expect(outletRelation?.relationToFields).toEqual(["organizationId", "id"]);
    expect(hasUnique("Outlet", ["organizationId", "id"])).toBe(true);
  });

  it("keeps legacy global roles and stores nullable active tenant session keys", () => {
    expect(model("User").fields.some((field) => field.name === "role")).toBe(true);
    expect(model("Session").fields.find((field) => field.name === "activeOrganizationId")).toMatchObject({
      isRequired: false,
    });
    expect(model("Session").fields.find((field) => field.name === "activeOutletId")).toMatchObject({
      isRequired: false,
    });
  });
});
