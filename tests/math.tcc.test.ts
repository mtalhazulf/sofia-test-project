import { describe, expect, it } from "vitest";
import { computeTcc, type TccAccountBalance } from "@/lib/math/tcc";

const SPOUSE_1 = "spouse-1";
const SPOUSE_2 = "spouse-2";

const sample = (): TccAccountBalance[] => [
  // Spouse 1: $200k Roth + $300k IRA
  { accountId: "a1", category: "retirement", ownerPersonId: SPOUSE_1, balanceCents: 20_000_000n },
  { accountId: "a2", category: "retirement", ownerPersonId: SPOUSE_1, balanceCents: 30_000_000n },
  // Spouse 2: $150k 401k
  { accountId: "a3", category: "retirement", ownerPersonId: SPOUSE_2, balanceCents: 15_000_000n },
  // Joint brokerage: $400k
  { accountId: "a4", category: "non_retirement", ownerPersonId: null, balanceCents: 40_000_000n },
  // Trust residence: $1.2M
  { accountId: "a5", category: "trust", ownerPersonId: null, balanceCents: 120_000_000n },
  // Mortgage: $500k
  { accountId: "a6", category: "liability", ownerPersonId: null, balanceCents: 50_000_000n },
  // Auto loan: $25k
  { accountId: "a7", category: "liability", ownerPersonId: SPOUSE_1, balanceCents: 2_500_000n },
];

describe("computeTcc", () => {
  it("sums spouse 1 retirement", () => {
    const r = computeTcc({ spouse1Id: SPOUSE_1, spouse2Id: SPOUSE_2, balances: sample() });
    expect(r.spouse1RetirementCents).toBe(50_000_000n);
  });

  it("sums spouse 2 retirement", () => {
    const r = computeTcc({ spouse1Id: SPOUSE_1, spouse2Id: SPOUSE_2, balances: sample() });
    expect(r.spouse2RetirementCents).toBe(15_000_000n);
  });

  it("sums non-retirement (excluding trust)", () => {
    const r = computeTcc({ spouse1Id: SPOUSE_1, spouse2Id: SPOUSE_2, balances: sample() });
    expect(r.nonRetirementCents).toBe(40_000_000n);
  });

  it("sums trust separately from non-retirement", () => {
    const r = computeTcc({ spouse1Id: SPOUSE_1, spouse2Id: SPOUSE_2, balances: sample() });
    expect(r.trustCents).toBe(120_000_000n);
  });

  it("sums liabilities into a SEPARATE total", () => {
    const r = computeTcc({ spouse1Id: SPOUSE_1, spouse2Id: SPOUSE_2, balances: sample() });
    expect(r.liabilitiesTotalCents).toBe(52_500_000n);
  });

  // ── SRS §6.3 callout / FR-405 / AT-7 ────────────────────────────────────
  it("REGRESSION: liabilities are NEVER subtracted from grand total net worth", () => {
    const r = computeTcc({ spouse1Id: SPOUSE_1, spouse2Id: SPOUSE_2, balances: sample() });
    // s1Ret + s2Ret + nonRet + trust = 50M + 15M + 40M + 120M = 225M cents
    expect(r.grandTotalNetWorthCents).toBe(225_000_000n);
    // Liabilities ($52.5M) are not subtracted.
    const subtracted = r.grandTotalNetWorthCents - r.liabilitiesTotalCents;
    expect(subtracted).not.toBe(r.grandTotalNetWorthCents);
    expect(r.grandTotalNetWorthCents).toBeGreaterThan(0n);
  });

  it("single-spouse household: spouse 2 retirement is 0", () => {
    const r = computeTcc({ spouse1Id: SPOUSE_1, balances: sample() });
    expect(r.spouse2RetirementCents).toBe(0n);
    // s2Ret was 15M, so grand total drops by exactly that
    expect(r.grandTotalNetWorthCents).toBe(210_000_000n);
  });

  it("empty balances: all totals are 0", () => {
    const r = computeTcc({ spouse1Id: SPOUSE_1, balances: [] });
    expect(r.spouse1RetirementCents).toBe(0n);
    expect(r.spouse2RetirementCents).toBe(0n);
    expect(r.nonRetirementCents).toBe(0n);
    expect(r.trustCents).toBe(0n);
    expect(r.grandTotalNetWorthCents).toBe(0n);
    expect(r.liabilitiesTotalCents).toBe(0n);
  });

  it("joint retirement bucket is captured (not lost)", () => {
    const r = computeTcc({
      spouse1Id: SPOUSE_1,
      spouse2Id: SPOUSE_2,
      balances: [
        { accountId: "j1", category: "retirement", ownerPersonId: null, balanceCents: 1_000_000n },
      ],
    });
    expect(r.jointRetirementCents).toBe(1_000_000n);
    expect(r.grandTotalNetWorthCents).toBe(1_000_000n);
  });

  it("trust is part of grand total, not the non-retirement total", () => {
    const r = computeTcc({
      spouse1Id: SPOUSE_1,
      balances: [
        { accountId: "t1", category: "trust", ownerPersonId: null, balanceCents: 1_000_000n },
        { accountId: "n1", category: "non_retirement", ownerPersonId: null, balanceCents: 500_000n },
      ],
    });
    expect(r.nonRetirementCents).toBe(500_000n);
    expect(r.trustCents).toBe(1_000_000n);
    expect(r.grandTotalNetWorthCents).toBe(1_500_000n);
  });
});
