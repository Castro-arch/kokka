import { describe, expect, it, vi } from "vitest";
import { withUniqueSlug } from "./events";

function uniqueViolation(constraint: string) {
  const driverError = Object.assign(new Error("duplicate key"), {
    code: "23505",
    constraint_name: constraint,
  });
  return new Error("Failed query", { cause: driverError });
}

describe("withUniqueSlug", () => {
  it("retries with a new slug when the slug is taken", async () => {
    const slugs = ["aaaaaa", "bbbbbb"];
    const attempt = vi
      .fn<(slug: string) => Promise<string>>()
      .mockRejectedValueOnce(uniqueViolation("events_slug_idx"))
      .mockImplementation((slug) => Promise.resolve(slug));

    await expect(withUniqueSlug(attempt, () => slugs.shift() ?? "")).resolves.toBe("bbbbbb");
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("rethrows other errors without retrying", async () => {
    const attempt = vi.fn().mockRejectedValue(uniqueViolation("other_idx"));
    await expect(withUniqueSlug(attempt)).rejects.toThrow("Failed query");
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("gives up after a few collisions", async () => {
    const attempt = vi.fn().mockRejectedValue(uniqueViolation("events_slug_idx"));
    await expect(withUniqueSlug(attempt)).rejects.toThrow();
    expect(attempt).toHaveBeenCalledTimes(5);
  });
});
