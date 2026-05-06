import { describe, expect, it, vi } from "vitest";
import { getNextQueueNumber, getQueueBusinessDate } from "./queue-number";

describe("queue number service", () => {
  it("formats the business date in the store timezone", () => {
    expect(getQueueBusinessDate(new Date("2026-04-28T18:00:00.000Z"))).toBe(
      "2026-04-29",
    );
  });

  it("uses the configured business day start time", () => {
    expect(
      getQueueBusinessDate(
        new Date("2026-04-29T20:30:00.000Z"),
        "Asia/Jakarta",
        "04:00",
      ),
    ).toBe("2026-04-29");
    expect(
      getQueueBusinessDate(
        new Date("2026-04-29T22:00:00.000Z"),
        "Asia/Jakarta",
        "04:00",
      ),
    ).toBe("2026-04-30");
  });

  it("increments from the latest queue number for the business date", async () => {
    const tx = {
      order: {
        aggregate: vi.fn().mockResolvedValue({ _max: { queueNumber: 12 } }),
      },
    };

    await expect(getNextQueueNumber(tx as never, "2026-04-29")).resolves.toBe(13);
    expect(tx.order.aggregate).toHaveBeenCalledWith({
      where: { queueBusinessDate: "2026-04-29" },
      _max: { queueNumber: true },
    });
  });
});
