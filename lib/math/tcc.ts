// SRS §6.3 - TCC calculation engine.
//
// Critical invariant (SRS §6.3 callout, FR-405, AT-7):
//   Liabilities are NEVER subtracted from grandTotalNetWorthCents.
//   They are returned separately for display.

import type { AccountCategory } from "@/lib/constants";

export type TccAccountBalance = {
  accountId: string;
  category: AccountCategory;
  ownerPersonId: string | null; // null = joint
  balanceCents: bigint;
};

export type TccInputs = {
  spouse1Id: string;
  spouse2Id?: string | null;
  balances: TccAccountBalance[];
};

export type TccResults = {
  spouse1RetirementCents: bigint;
  spouse2RetirementCents: bigint;
  jointRetirementCents: bigint;
  nonRetirementCents: bigint;
  trustCents: bigint;
  /** Sum of the four buckets above. Liabilities NOT subtracted. */
  grandTotalNetWorthCents: bigint;
  /** Reported separately. Never enters grandTotalNetWorthCents. */
  liabilitiesTotalCents: bigint;
};

export function computeTcc(i: TccInputs): TccResults {
  const sumWhere = (pred: (b: TccAccountBalance) => boolean) =>
    i.balances.filter(pred).reduce((a, b) => a + b.balanceCents, 0n);

  const s1Ret = sumWhere(
    (b) => b.category === "retirement" && b.ownerPersonId === i.spouse1Id,
  );
  const s2Ret = i.spouse2Id
    ? sumWhere(
        (b) =>
          b.category === "retirement" && b.ownerPersonId === i.spouse2Id,
      )
    : 0n;
  const jointRet = sumWhere(
    (b) => b.category === "retirement" && b.ownerPersonId === null,
  );
  const nonRet = sumWhere((b) => b.category === "non_retirement");
  const trust = sumWhere((b) => b.category === "trust");
  const liab = sumWhere((b) => b.category === "liability");

  return {
    spouse1RetirementCents: s1Ret,
    spouse2RetirementCents: s2Ret,
    jointRetirementCents: jointRet,
    nonRetirementCents: nonRet,
    trustCents: trust,
    grandTotalNetWorthCents: s1Ret + s2Ret + jointRet + nonRet + trust,
    liabilitiesTotalCents: liab,
  };
}
