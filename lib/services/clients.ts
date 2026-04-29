import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/math/money";
import { TYPE_TO_CATEGORY, DEFAULT_FLOOR_CENTS } from "@/lib/constants";
import type { CreateClientInput, UpdateClientInput } from "@/lib/validators";
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

  // Audit log outside the tx - SQLite serializes connections.
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

export async function updateClient(
  id: string,
  input: UpdateClientInput,
  actorId: string,
) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.client.findUnique({
      where: { id },
      include: { persons: true, accounts: true, staticProfile: true },
    });
    if (!existing) throw new Error("Client not found");

    await tx.client.update({
      where: { id },
      data: {
        householdName: input.householdName,
        isMarried: input.isMarried,
      },
    });

    // Persons: upsert by spouseIndex; remove any with index not in input.
    const wantedIndices = new Set(input.persons.map((p) => p.spouseIndex));
    for (const existingPerson of existing.persons) {
      if (!wantedIndices.has(existingPerson.spouseIndex as 1 | 2)) {
        // Cannot delete a person if any account references them.
        const owns = await tx.account.count({
          where: { ownerPersonId: existingPerson.id },
        });
        if (owns > 0) {
          throw new Error(
            `Cannot remove Spouse ${existingPerson.spouseIndex}: ${owns} account(s) reference them`,
          );
        }
        await tx.person.delete({ where: { id: existingPerson.id } });
      }
    }
    for (const p of input.persons) {
      const existingPerson = existing.persons.find(
        (e) => e.spouseIndex === p.spouseIndex,
      );
      if (existingPerson) {
        await tx.person.update({
          where: { id: existingPerson.id },
          data: {
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: new Date(p.dateOfBirth),
            ssnLast4: p.ssnLast4,
          },
        });
      } else {
        await tx.person.create({
          data: {
            clientId: id,
            spouseIndex: p.spouseIndex,
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: new Date(p.dateOfBirth),
            ssnLast4: p.ssnLast4,
          },
        });
      }
    }

    // Static profile.
    await tx.staticFinancialProfile.upsert({
      where: { clientId: id },
      create: {
        clientId: id,
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
      update: {
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
    });

    // Edit existing accounts (surface fields only; type/category/owner immutable).
    for (const e of input.accountEdits) {
      const acc = existing.accounts.find((a) => a.id === e.id);
      if (!acc) continue;
      await tx.account.update({
        where: { id: e.id },
        data: {
          displayLabel: e.displayLabel,
          custodian: e.custodian ?? null,
          accountNumberLast4: e.accountNumberLast4 ?? null,
          interestRateBps: e.interestRateBps ?? null,
          propertyAddress: e.propertyAddress ?? null,
          archivedAt: e.archived ? acc.archivedAt ?? new Date() : null,
        },
      });
    }

    // Append-only new accounts.
    if (input.newAccounts.length > 0) {
      const personByIndex = new Map(
        (await tx.person.findMany({ where: { clientId: id } })).map((p) => [
          p.spouseIndex,
          p.id,
        ]),
      );
      for (const a of input.newAccounts) {
        await tx.account.create({
          data: {
            clientId: id,
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
  });

  await writeAudit({
    actorId,
    action: "client.update",
    entityType: "Client",
    entityId: id,
    payload: {
      householdName: input.householdName,
      newAccounts: input.newAccounts.length,
      accountEdits: input.accountEdits.length,
    },
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
