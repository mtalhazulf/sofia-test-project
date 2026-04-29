import { describe, expect, it } from "vitest";
import { formatUSD, fromCents, sumCents, toCents } from "@/lib/math/money";

describe("toCents", () => {
  it("parses plain dollars", () => {
    expect(toCents("100")).toBe(10000n);
  });
  it("parses dollars with two decimals", () => {
    expect(toCents("1234.56")).toBe(123456n);
  });
  it("parses dollars with one decimal as 10x cents", () => {
    expect(toCents("1234.5")).toBe(123450n);
  });
  it("strips $ and commas", () => {
    expect(toCents("$1,234,567.89")).toBe(123456789n);
  });
  it("returns 0 for empty / whitespace", () => {
    expect(toCents("")).toBe(0n);
    expect(toCents("   ")).toBe(0n);
  });
  it("rejects 3+ decimals (no silent rounding)", () => {
    expect(() => toCents("1.234")).toThrow();
  });
  it("rejects letters", () => {
    expect(() => toCents("abc")).toThrow();
    expect(() => toCents("12a")).toThrow();
  });
  it("handles negatives", () => {
    expect(toCents("-100")).toBe(-10000n);
    expect(toCents("-$1,234.56")).toBe(-123456n);
  });
  it("accepts numeric input", () => {
    expect(toCents(100)).toBe(10000n);
    expect(toCents(1234.56)).toBe(123456n);
  });
});

describe("fromCents", () => {
  it("renders cents as decimal string", () => {
    expect(fromCents(123456n)).toBe("1234.56");
    expect(fromCents(0n)).toBe("0.00");
    expect(fromCents(7n)).toBe("0.07");
  });
  it("renders negatives", () => {
    expect(fromCents(-123456n)).toBe("-1234.56");
  });
});

describe("formatUSD", () => {
  it("formats with thousands separators and $", () => {
    expect(formatUSD(123456789n)).toBe("$1,234,567.89");
    expect(formatUSD(99n)).toBe("$0.99");
    expect(formatUSD(0n)).toBe("$0.00");
  });
  it("formats negatives", () => {
    expect(formatUSD(-123456n)).toBe("-$1,234.56");
  });
});

describe("BigInt round-trip", () => {
  it("toCents(fromCents(x)) === x for a range of values", () => {
    for (const v of [0n, 1n, 99n, 100n, 12345n, 1234567890n, -555n]) {
      expect(toCents(fromCents(v))).toBe(v);
    }
  });
});

describe("sumCents", () => {
  it("ignores nulls and undefined", () => {
    expect(sumCents([1n, null, 2n, undefined, 3n])).toBe(6n);
  });
  it("returns 0 for empty", () => {
    expect(sumCents([])).toBe(0n);
  });
});
