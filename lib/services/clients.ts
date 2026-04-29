import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/math/money";
import { TYPE_TO_CATEGORY, DEFAULT_FLOOR_CENTS } from "@/lib/constants";
import type { CreateClientInput } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export async function createClient(input: CreateClientInput, actorId: string) {
  const client = await prisma.$transaction(async (tx) => {
    const created = await tx.client.create({
      data: {
        householdName: input.householdName,
        isMarried: input.isMarried,
        persons: {
          create: input.persons.map((p) => ({
            spouseIndex: p.spouseIndex,
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: new Date(p.dateOfBirth),
            ssnLast4: p.ssnLast4,
          })),
        },
        staticProfile: {
          create: {
            monthlyInflowCents: toCents(input.monthlyInflow),
            monthlyOutflowCents: toCents(input.monthlyOutflow),
            floorCents: input.floor ? toCents(input.floor) : DEFAULT_FLOOR_CENTS,
            insuranceDeductibles: JSON.stringify(
              input.insuranceDeductibles.map((d) => ({
                label: d.label,
                amountCents: toCents(d.amountCents).toString(),
              })),
            ),
          },
        },
      },
      include: { persons: true },
    });

    if (input.accounts.length > 0) {
      const personByIndex = new Map(created.persons.map((p) => [p.spouseIndex, p.id]));
      for (const a of input.accounts) {
        await tx.account.create({
          data: {
            clientId: created.id,
            ownerPersonId:
              a.ownerSpouseIndex === 1 || a.ownerSpouseIndex === 2
                ? personByIndex.get(a.ownerSpouseIndex) ?? null
                : null,
            category: TYPE_TO_CATEGORY[a.type],
            type: a.type,
            custodian: a.custodian ?? null,
            accountNumberLast4: a.accountNumberLast4 ?? null,
            displayLabel: a.displayLabel,
            interestRateBps: a.interestRateBps ?? null,
            propertyAddress: a.propertyAddress ?? null,
          },
        });
      }
    }

    return created;
  });

  // Audit log outside the tx — SQLite serializes connections.
  await writeAudit({
    actorId,
    action: "client.create",
    entityType: "Client",
    entityId: client.id,
    payload: { householdName: client.householdName, accounts: input.accounts.length },
  });

  return client;
}

export async function listClients() {
  return prisma.client.findMany({
    where: { archivedAt: null },
    include: {
      persons: { orderBy: { spouseIndex: "asc" } },
      _count: { select: { snapshots: true, accounts: true } },
      snapshots: {
        orderBy: [{ fiscalYear: "desc" }, { fiscalQuarter: "desc" }],
        take: 1,
      },
    },
    orderBy: { householdName: "asc" },
  });
}

export async function getClient(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      persons: { orderBy: { spouseIndex: "asc" } },
      accounts: { where: { archivedAt: null }, orderBy: { createdAt: "asc" } },
      staticProfile: true,
      snapshots: {
        orderBy: [{ fiscalYear: "desc" }, { fiscalQuarter: "desc" }],
        include: { reports: true },
      },
    },
  });
}
