import { prisma } from "@/lib/prisma";
import { computeSacs } from "@/lib/math/sacs";
import { computeTcc, type TccAccountBalance } from "@/lib/math/tcc";
import { renderHtmlToPdf } from "@/lib/pdf/render";
import { renderSacsHtml } from "@/lib/pdf/templates/sacs";
import { renderTccHtml } from "@/lib/pdf/templates/tcc";
import { reportPath, storage } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";
import { formatUSD } from "@/lib/math/money";
import { ACCOUNT_TYPE_LABELS, type AccountCategory, type AccountType } from "@/lib/constants";
import type { TccAccountDisplay } from "@/components/charts/TccCircle";

type DeductibleJSON = { label: string; amountCents: string };

export async function generateReportsForSnapshot(snapshotId: string, actorId: string) {
  const snap = await prisma.quarterlySnapshot.findUnique({
    where: { id: snapshotId },
    include: {
      client: {
        include: {
          persons: { orderBy: { spouseIndex: "asc" } },
          accounts: { where: { archivedAt: null } },
          staticProfile: true,
        },
      },
      cashflow: true,
      balances: true,
      trustValues: true,
    },
  });
  if (!snap) throw new Error("Snapshot not found");
  if (!snap.cashflow) throw new Error("Snapshot has no cashflow data; fill the form first");
  const profile = snap.client.staticProfile;
  if (!profile) throw new Error("Client has no static financial profile");

  const deductibles = (JSON.parse(profile.insuranceDeductibles) as DeductibleJSON[]) ?? [];
  const deductibleCents = deductibles.map((d) => BigInt(d.amountCents));

  // ── SACS math ────────────────────────────────────────────────────────────
  const sacs = computeSacs({
    inflowCents: snap.cashflow.inflowCents,
    outflowCents: snap.cashflow.outflowCents,
    insuranceDeductiblesCents: deductibleCents,
    privateReserveBalanceCents: snap.cashflow.privateReserveBalanceCents,
  });

  // ── TCC math ─────────────────────────────────────────────────────────────
  const accountById = new Map(snap.client.accounts.map((a) => [a.id, a]));
  const trustOverrides = new Map(snap.trustValues.map((t) => [t.accountId, t.zillowValueCents]));

  const tccBalances: TccAccountBalance[] = snap.balances.map((b) => {
    const acct = accountById.get(b.accountId);
    if (!acct) throw new Error(`Account ${b.accountId} missing from client`);
    const cents =
      acct.category === "trust" && trustOverrides.has(b.accountId)
        ? (trustOverrides.get(b.accountId) as bigint)
        : b.balanceCents;
    return {
      accountId: b.accountId,
      category: acct.category as AccountCategory,
      ownerPersonId: acct.ownerPersonId ?? null,
      balanceCents: cents,
    };
  });
  // Trust-only accounts may have no balance entry - pull purely from snapshot_trust_value
  for (const t of snap.trustValues) {
    if (snap.balances.find((b) => b.accountId === t.accountId)) continue;
    const acct = accountById.get(t.accountId);
    if (!acct) continue;
    tccBalances.push({
      accountId: t.accountId,
      category: acct.category as AccountCategory,
      ownerPersonId: acct.ownerPersonId ?? null,
      balanceCents: t.zillowValueCents,
    });
  }

  const spouse1 = snap.client.persons.find((p) => p.spouseIndex === 1);
  const spouse2 = snap.client.persons.find((p) => p.spouseIndex === 2);
  if (!spouse1) throw new Error("Client has no spouse 1");

  const tcc = computeTcc({
    spouse1Id: spouse1.id,
    spouse2Id: spouse2?.id ?? null,
    balances: tccBalances,
  });

  // ── Build chart inputs ───────────────────────────────────────────────────
  const householdName = snap.client.householdName;
  const period = `Q${snap.fiscalQuarter} ${snap.fiscalYear}`;
  const preparedDate = new Date().toISOString().slice(0, 10);

  const cashByAccount = new Map(
    snap.balances.map((b) => [b.accountId, b.cashBalanceCents]),
  );
  const accountDisplay = (accountId: string, balanceCents: bigint): TccAccountDisplay => {
    const a = accountById.get(accountId)!;
    return {
      label: a.displayLabel || ACCOUNT_TYPE_LABELS[a.type as AccountType],
      last4: a.accountNumberLast4,
      balanceCents,
      cashBalanceCents: cashByAccount.get(accountId) ?? null,
      rateBps: a.interestRateBps,
      propertyAddress: a.propertyAddress ?? null,
    };
  };

  const ageOf = (dob: Date) => {
    const now = new Date();
    let age = now.getUTCFullYear() - dob.getUTCFullYear();
    const m = now.getUTCMonth() - dob.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
    return age;
  };
  const personInfo = (p: { firstName: string; lastName: string; dateOfBirth: Date; ssnLast4: string }) => ({
    name: `${p.firstName} ${p.lastName}`,
    dateOfBirthIso: p.dateOfBirth.toISOString().slice(0, 10),
    age: ageOf(p.dateOfBirth),
    ssnLast4: p.ssnLast4,
  });

  const spouseAccounts = (personId: string) =>
    tccBalances
      .filter((b) => b.category === "retirement" && b.ownerPersonId === personId)
      .map((b) => accountDisplay(b.accountId, b.balanceCents));

  const liabilities = snap.balances
    .filter((b) => accountById.get(b.accountId)?.category === "liability")
    .map((b) => accountDisplay(b.accountId, b.balanceCents));

  const sacsHtml = await renderSacsHtml({
    householdName,
    period,
    preparedDate,
    chart: {
      inflowCents: snap.cashflow.inflowCents,
      outflowCents: snap.cashflow.outflowCents,
      excessCents: sacs.excessCents,
      privateReserveBalanceCents: snap.cashflow.privateReserveBalanceCents,
      privateReserveTargetCents: sacs.privateReserveTargetCents,
      privateReserveFundedPctBps: sacs.privateReserveFundedPctBps,
    },
    privateReserveTargetCents: sacs.privateReserveTargetCents,
    insuranceDeductiblesNote: deductibles.map((d) => `${d.label} ${formatUSD(BigInt(d.amountCents))}`).join(", "),
    schwabInvestmentBalanceText: snap.cashflow.schwabInvestmentBalanceCents
      ? formatUSD(snap.cashflow.schwabInvestmentBalanceCents)
      : undefined,
  });

  const tccHtml = await renderTccHtml({
    householdName,
    period,
    preparedDate,
    chart: {
      spouse1: {
        info: personInfo(spouse1),
        retirementCents: tcc.spouse1RetirementCents,
        accounts: spouseAccounts(spouse1.id),
      },
      spouse2: spouse2
        ? {
            info: personInfo(spouse2),
            retirementCents: tcc.spouse2RetirementCents,
            accounts: spouseAccounts(spouse2.id),
          }
        : undefined,
      nonRetirementCents: tcc.nonRetirementCents,
      nonRetirementAccounts: tccBalances
        .filter((b) => b.category === "non_retirement")
        .map((b) => accountDisplay(b.accountId, b.balanceCents)),
      trustCents: tcc.trustCents,
      trustAccounts: tccBalances
        .filter((b) => b.category === "trust")
        .map((b) => accountDisplay(b.accountId, b.balanceCents)),
      liabilitiesTotalCents: tcc.liabilitiesTotalCents,
      liabilities,
      grandTotalNetWorthCents: tcc.grandTotalNetWorthCents,
    },
  });

  const sacsPdf = await renderHtmlToPdf(sacsHtml);
  const tccPdf = await renderHtmlToPdf(tccHtml);

  const sacsRel = reportPath(snap.clientId, snap.id, "SACS");
  const tccRel = reportPath(snap.clientId, snap.id, "TCC");
  await storage.put(sacsRel, sacsPdf);
  await storage.put(tccRel, tccPdf);

  // SRS §7.7: persist the math results for audit reproducibility.
  const computedTotals = JSON.stringify({
    sacs: {
      excessCents: sacs.excessCents.toString(),
      privateReserveTargetCents: sacs.privateReserveTargetCents.toString(),
      privateReserveFundedPctBps: sacs.privateReserveFundedPctBps,
      annualInflowCents: sacs.annualInflowCents.toString(),
      annualOutflowCents: sacs.annualOutflowCents.toString(),
      annualExcessCents: sacs.annualExcessCents.toString(),
    },
    tcc: {
      spouse1RetirementCents: tcc.spouse1RetirementCents.toString(),
      spouse2RetirementCents: tcc.spouse2RetirementCents.toString(),
      nonRetirementCents: tcc.nonRetirementCents.toString(),
      trustCents: tcc.trustCents.toString(),
      grandTotalNetWorthCents: tcc.grandTotalNetWorthCents.toString(),
      liabilitiesTotalCents: tcc.liabilitiesTotalCents.toString(),
    },
  });

  const reports = await prisma.$transaction([
    prisma.report.upsert({
      where: { snapshotId_kind: { snapshotId: snap.id, kind: "SACS" } },
      create: {
        snapshotId: snap.id,
        kind: "SACS",
        storagePath: sacsRel,
        generatedById: actorId,
        computedTotals,
      },
      update: { storagePath: sacsRel, generatedAt: new Date(), generatedById: actorId, computedTotals },
    }),
    prisma.report.upsert({
      where: { snapshotId_kind: { snapshotId: snap.id, kind: "TCC" } },
      create: {
        snapshotId: snap.id,
        kind: "TCC",
        storagePath: tccRel,
        generatedById: actorId,
        computedTotals,
      },
      update: { storagePath: tccRel, generatedAt: new Date(), generatedById: actorId, computedTotals },
    }),
  ]);

  await writeAudit({
    actorId,
    action: "report.generate",
    entityType: "QuarterlySnapshot",
    entityId: snap.id,
    payload: { kinds: ["SACS", "TCC"] },
  });

  return reports;
}
