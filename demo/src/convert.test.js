import { describe, expect, it } from "vitest";
import { convert } from "./convert.js";

describe("temperature conversions", () => {
  it("converts 100 Celsius to 212 Fahrenheit", () => {
    expect(convert(100, "Celsius", "Fahrenheit")).toBe(212);
  });
});
