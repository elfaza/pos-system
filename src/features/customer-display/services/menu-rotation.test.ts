import { describe, expect, it } from "vitest";
import { getNextCategoryIndex } from "./menu-rotation";

describe("customer display menu rotation", () => {
  it("advances through categories and wraps to the first", () => {
    expect(getNextCategoryIndex(0, 3)).toBe(1);
    expect(getNextCategoryIndex(2, 3)).toBe(0);
  });

  it("returns the first index when the current selection is stale", () => {
    expect(getNextCategoryIndex(4, 2)).toBe(0);
    expect(getNextCategoryIndex(0, 0)).toBe(0);
  });
});
