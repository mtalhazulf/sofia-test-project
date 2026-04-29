// SRS §6.2 — SACS calculation engine. Pure, deterministic, integer-only.

export type SacsInputs = {
  inflowCents: bigint;
  outflowCents: bigint;
  insuranceDeductiblesCents: bigint[];
  privateReserveBalanceCents: bigint;
};

export type SacsResults = {
  excessCents: bigint;
  privateReserveTargetCents: bigint;
  /** Funded percentage in basis points (10000 = 100%). Integer math. */
  privateReserveFundedPctBps: number;
  annualInflowCents: bigint;
  annualOutflowCents: bigint;
  annualExcessCents: bigint;
};

export function computeSacs(i: SacsInputs): SacsResults {
  const excess = i.inflowCents - i.outflowCents;
  const deductibleSum = i.insuranceDeductiblesCents.reduce(
    (a, b) => a + b,
    0n,
  );
  const target = 6n * i.outflowCents + deductibleSum;
  const fundedPctBps =
    target === 0n
      ? 0
      : Number((i.privateReserveBalanceCents * 10000n) / target);
  return {
    excessCents: excess,
    privateReserveTargetCents: target,
    privateReserveFundedPctBps: fundedPctBps,
    annualInflowCents: i.inflowCents * 12n,
    annualOutflowCents: i.outflowCents * 12n,
    annualExcessCents: excess * 12n,
  };
}
