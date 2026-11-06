import { describe, it, expect } from "vitest";
describe("Payment", () => {
  it("uses INR paise conversion", () => {
    expect(Math.round(125.50 * 100)).toBe(12550);
  });
});
