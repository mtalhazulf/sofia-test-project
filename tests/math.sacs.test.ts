import { describe, expect, it } from "vitest";
import { computeSacs } from "@/lib/math/sacs";

const baseInputs = {
  inflowCents: 1_500_000n, // $15,000
  outflowCents: 1_000_000n, // $10,000
  insuranceDeductiblesCents: [100_000n, 200_000n], // $3,000 total
  privateReserveBalanceCents: 3_000_000n,
};

describe("computeSacs", () => {
  it("computes excess as inflow - outflow", () => {
    const r = computeSacs(baseInputs);
    expect(r.excessCents).toBe(500_000n);
  });

  it("computes private reserve target as 6 * outflow + sum(deductibles)", () => {
    const r = computeSacs(baseInputs);
    // 6 * $10,000 + ($1,000 + $2,000) = $63,000
    expect(r.privateReserveTargetCents).toBe(6_300_000n);
  });

  it("computes funded percentage in basis points", () => {
    const r = computeSacs(baseInputs);
    // $30,000 / $63,000 ≈ 47.62%
    expect(r.privateReserveFundedPctBps).toBe(4761);
  });

  it("returns 0 funded% when target is 0", () => {
    const r = computeSacs({
      inflowCents: 0n,
      outflowCents: 0n,
      insuranceDeductiblesCents: [],
      privateReserveBalanceCents: 100n,
    });
    expect(r.privateReserveTargetCents).toBe(0n);
    expect(r.privateReserveFundedPctBps).toBe(0);
  });

  it("handles negative excess (outflow > inflow)", () => {
    const r = computeSacs({
      ...baseInputs,
      inflowCents: 500_000n,
      outflowCents: 1_000_000n,
    });
    expect(r.excessCents).toBe(-500_000n);
    expect(r.annualExcessCents).toBe(-6_000_000n);
  });

  it("annualizes inflow, outflow, and excess by 12", () => {
    const r = computeSacs(baseInputs);
    expect(r.annualInflowCents).toBe(18_000_000n);
    expect(r.annualOutflowCents).toBe(12_000_000n);
    expect(r.annualExcessCents).toBe(6_000_000n);
  });

  it("handles empty deductibles list (target = 6 * outflow)", () => {
    const r = computeSacs({ ...baseInputs, insuranceDeductiblesCents: [] });
    expect(r.privateReserveTargetCents).toBe(6_000_000n);
  });

  it("treats fully-funded reserve as 10000 bps", () => {
    const r = computeSacs({
      inflowCents: 1_000_000n,
      outflowCents: 100_000n,
      insuranceDeductiblesCents: [],
      privateReserveBalanceCents: 600_000n, // 6 * 100,000
    });
    expect(r.privateReserveFundedPctBps).toBe(10000);
  });

  it("handles overfunded reserve (>100%)", () => {
    const r = computeSacs({
      inflowCents: 1_000_000n,
      outflowCents: 100_000n,
      insuranceDeductiblesCents: [],
      privateReserveBalanceCents: 1_200_000n, // 2x target
    });
    expect(r.privateReserveFundedPctBps).toBe(20000);
  });

  it("invariant: excess + outflow === inflow", () => {
    for (const inflow of [0n, 1n, 100n, 12345n, 99_999_999n]) {
      for (const outflow of [0n, 1n, 50n, 88_888n]) {
        const r = computeSacs({
          inflowCents: inflow,
          outflowCents: outflow,
          insuranceDeductiblesCents: [],
          privateReserveBalanceCents: 0n,
        });
        expect(r.excessCents + outflow).toBe(inflow);
      }
    }
  });
});
