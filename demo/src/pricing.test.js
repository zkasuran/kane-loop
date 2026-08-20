import { describe, it, expect } from "vitest";
import { priceOrder } from "./pricing.js";

describe("order pricing", () => {
  it("applies SAVE25 to two units, tax charged after the discount", () => {
    const p = priceOrder(2, "SAVE25");
    expect(p.subtotal).toBe(80);
    expect(p.discount).toBe(20);
    expect(p.total).toBeCloseTo(66);
  });

  it("no promo means subtotal plus tax", () => {
    const p = priceOrder(1, "");
    expect(p.total).toBeCloseTo(44);
  });
});
