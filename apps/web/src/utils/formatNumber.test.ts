import { describe, expect, it } from "vitest";
import { formatChartNumber, formatFixed, formatNumber } from "./formatNumber";

describe("formatNumber", () => {
  it("groups thousands for integers", () => {
    expect(formatNumber(12500)).toBe("12,500");
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(999)).toBe("999");
  });

  it("handles zero and negatives", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(-12500)).toBe("-12,500");
  });

  it("preserves significant decimals with grouping", () => {
    expect(formatNumber(12345.6)).toBe("12,345.6");
    expect(formatNumber(1000.25)).toBe("1,000.25");
  });

  it("returns an em dash for nullish or NaN", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber(Number.NaN)).toBe("—");
  });
});

describe("formatFixed", () => {
  it("keeps fixed fraction digits with grouping", () => {
    expect(formatFixed(60, 1)).toBe("60.0");
    expect(formatFixed(12345.678, 1)).toBe("12,345.7");
    expect(formatFixed(1000.2, 1)).toBe("1,000.2");
  });
});

describe("formatChartNumber", () => {
  it("formats numeric chart values and blanks non-numbers", () => {
    expect(formatChartNumber(12500)).toBe("12,500");
    expect(formatChartNumber("12500")).toBe("");
    expect(formatChartNumber(null)).toBe("");
  });
});
