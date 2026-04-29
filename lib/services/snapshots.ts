import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/math/money";
import { writeAudit } from "@/lib/audit";
import type {
  CreateSnapshotInput,
  UpdateSnapshotInput,
} from "@/lib/validators";

export class SnapshotImmutableError extends Error {
  constructor() {
    super("Snapshot is finalized and cannot be modified");
    this.name = "SnapshotImmutableError";
  }
}

async function assertDraft(snapshotId: string) {
  const s = await prisma.quarterlySnapshot.findUnique({
    where: { id: snapshotId },
    select: { status: true },
  });
  if (!s) throw new Error("Snapshot not found");
  if (s.status === "FINALIZED") throw new SnapshotImmutableError();
}

export async function createSnapshot(input: CreateSnapshotInput, actorId: string) {
  const snap = await prisma.quarterlySnapshot.create({
    data: {
      clientId: input.clientId,
      meetingDate: new Date(input.meetingDate),
      fiscalYear: input.fiscalYear,
      fiscalQuarter: input.fiscalQuarter,
      status: "DRAFT",
    },
  });
  await writeAudit({
    actorId,
    action: "snapshot.create",
    entityType: "QuarterlySnapshot",
    entityId: snap.id,
    payload: {
      clientId: input.clientId,
      fiscalYear: input.fiscalYear,
      fiscalQuarter: input.fiscalQuarter,
    },
  });
  return snap;
}

export async function getSnapshot(id: string) {
  return prisma.quarterlySnapshot.findUnique({
    where: { id },
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
      reports: true,
    },
  });
}

/**
 * Returns the most recent FINALIZED snapshot strictly before this one
 * (by fiscalYear, fiscalQuarter), for use as "last quarter" reference values.
 * Falls back to the latest non-self snapshot if no finalized prior exists.
 */
export async function getPriorSnapshot(currentSnapshotId: string) {
  const current = await prisma.quarterlySnapshot.findUnique({
    where: { id: currentSnapshotId },
    select: { clientId: true, fiscalYear: true, fiscalQuarter: true },
  });
  if (!current) return null;

  const candidates = await prisma.quarterlySnapshot.findMany({
    where: {
      clientId: current.clientId,
      id: { not: currentSnapshotId },
      OR: [
        { fiscalYear: { lt: current.fiscalYear } },
        {
          fiscalYear: current.fiscalYear,
          fiscalQuarter: { lt: current.fiscalQuarter },
        },
      ],
    },
    orderBy: [{ fiscalYear: "desc" }, { fiscalQuarter: "desc" }],
    take: 5,
    include: { cashflow: true, balances: true, trustValues: true },
  });
  // Prefer the most recent finalized one; fall back to most recent draft.
  return (
    candidates.find((s) => s.status === "FINALIZED") ?? candidates[0] ?? null
  );
}

export async function updateSnapshot(
  id: string,
  input: UpdateSnapshotInput,
  actorId: string,
) {
  await assertDraft(id);

  return prisma.$transaction(
    async (tx) => {
      await tx.snapshotCashflow.upsert({
        where: { snapshotId: id },
        create: {
          snapshotId: id,
          inflowCents: toCents(input.inflow),
          outflowCents: toCents(input.outflow),
          privateReserveBalanceCents: toCents(input.privateReserveBalance),
          schwabInvestmentBalanceCents: input.schwabInvestmentBalance
            ? toCents(input.schwabInvestmentBalance)
            : null,
        },
        update: {
          inflowCents: toCents(input.inflow),
          outflowCents: toCents(input.outflow),
          privateReserveBalanceCents: toCents(input.privateReserveBalance),
          schwabInvestmentBalanceCents: input.schwabInvestmentBalance
            ? toCents(input.schwabInvestmentBalance)
            : null,
        },
      });

      // Replace strategy: simpler than diffing, safe because rows have no FKs in.
      await tx.snapshotAccountBalance.deleteMany({ where: { snapshotId: id } });
      if (input.balances.length > 0) {
        await tx.snapshotAccountBalance.createMany({
          data: input.balances.map((b) => ({
            snapshotId: id,
            accountId: b.accountId,
            balanceCents: toCents(b.balance),
            cashBalanceCents: b.cashBalance ? toCents(b.cashBalance) : null,
          })),
        });
      }

      await tx.snapshotTrustValue.deleteMany({ where: { snapshotId: id } });
      if (input.trustValues.length > 0) {
        await tx.snapshotTrustValue.createMany({
          data: input.trustValues.map((t) => ({
            snapshotId: id,
            accountId: t.accountId,
            zillowValueCents: toCents(t.zillowValue),
            zillowPulledAt: new Date(),
          })),
        });
      }

    },
    { timeout: 30_000, maxWait: 30_000 },
  ).then(async () => {
    // Audit log written outside the tx - SQLite serializes connections, so a
    // second client.create() inside an open interactive tx self-deadlocks.
    await writeAudit({
      actorId,
      action: "snapshot.update",
      entityType: "QuarterlySnapshot",
      entityId: id,
    });
  });
}

export async function finalizeSnapshot(id: string, actorId: string) {
  await assertDraft(id);
  const updated = await prisma.quarterlySnapshot.update({
    where: { id },
    data: { status: "FINALIZED", finalizedAt: new Date(), finalizedById: actorId },
  });
  await writeAudit({
    actorId,
    action: "snapshot.finalize",
    entityType: "QuarterlySnapshot",
    entityId: id,
  });
  return updated;
}
