import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getClient } from "@/lib/services/clients";
import { fromCents } from "@/lib/math/money";
import { ClientEditor, type EditorClient } from "@/components/client/ClientEditor";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) notFound();

  const profile = client.staticProfile;
  const deductibles = profile
    ? (JSON.parse(profile.insuranceDeductibles) as Array<{
        label: string;
        amountCents: string;
      }>)
    : [];

  const initial: EditorClient = {
    id: client.id,
    householdName: client.householdName,
    isMarried: client.isMarried,
    persons: client.persons.map((p) => ({
      id: p.id,
      spouseIndex: p.spouseIndex as 1 | 2,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: format(p.dateOfBirth, "yyyy-MM-dd"),
      ssnLast4: p.ssnLast4,
    })),
    monthlyInflow: profile ? fromCents(profile.monthlyInflowCents) : "0",
    monthlyOutflow: profile ? fromCents(profile.monthlyOutflowCents) : "0",
    floor: profile ? fromCents(profile.floorCents) : "1000",
    insuranceDeductibles: deductibles.map((d) => ({
      label: d.label,
      amountCents: fromCents(BigInt(d.amountCents)),
    })),
    accounts: client.accounts.map((a) => ({
      id: a.id,
      type: a.type,
      category: a.category,
      ownerSpouseIndex:
        a.ownerPersonId == null
          ? 0
          : (client.persons.find((p) => p.id === a.ownerPersonId)
              ?.spouseIndex as 1 | 2 | undefined) ?? 0,
      displayLabel: a.displayLabel,
      custodian: a.custodian ?? "",
      accountNumberLast4: a.accountNumberLast4 ?? "",
      interestRateBps: a.interestRateBps ?? null,
      propertyAddress: a.propertyAddress ?? "",
      archived: a.archivedAt != null,
    })),
  };

  return <ClientEditor initial={initial} />;
}
