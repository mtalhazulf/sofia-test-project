import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSnapshot } from "@/lib/services/snapshots";
import { fromCents } from "@/lib/math/money";
import { SnapshotEditor, type EditorAccount } from "@/components/snapshot/Editor";
import type { AccountCategory, AccountType } from "@/lib/constants";

type SnapshotPageParams = { id: string; snapId: string };

export default async function SnapshotPage({ params }: { params: SnapshotPageParams }) {
  const snap = await getSnapshot(params.snapId);
  if (!snap || snap.clientId !== params.id) notFound();

  const profile = snap.client.staticProfile;
  const deductibles = profile
    ? (JSON.parse(profile.insuranceDeductibles) as Array<{ amountCents: string }>)
    : [];

  const editorAccounts: EditorAccount[] = snap.client.accounts.map((a) => ({
    id: a.id,
    category: a.category as AccountCategory,
    type: a.type as AccountType,
    displayLabel: a.displayLabel,
    ownerPersonId: a.ownerPersonId ?? null,
    accountNumberLast4: a.accountNumberLast4,
    interestRateBps: a.interestRateBps,
  }));

  const balances: Record<string, { balance: string; cashBalance?: string }> = {};
  for (const b of snap.balances) {
    balances[b.accountId] = {
      balance: fromCents(b.balanceCents),
      cashBalance: b.cashBalanceCents != null ? fromCents(b.cashBalanceCents) : undefined,
    };
  }
  const trustValues: Record<string, string> = {};
  for (const t of snap.trustValues) trustValues[t.accountId] = fromCents(t.zillowValueCents);

  const cashflow = snap.cashflow;
  const initial = {
    inflowCents: cashflow ? fromCents(cashflow.inflowCents) : fromCents(profile?.monthlyInflowCents ?? 0n),
    outflowCents: cashflow ? fromCents(cashflow.outflowCents) : fromCents(profile?.monthlyOutflowCents ?? 0n),
    privateReserveBalanceCents: cashflow ? fromCents(cashflow.privateReserveBalanceCents) : "",
    schwabInvestmentBalanceCents: cashflow?.schwabInvestmentBalanceCents
      ? fromCents(cashflow.schwabInvestmentBalanceCents)
      : "",
    balances,
    trustValues,
  };

  return (
    <div className="space-y-6">
      {snap.status === "FINALIZED" && snap.reports.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {snap.reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/api/reports/${snap.id}/${r.kind.toLowerCase()}`}
                  className="text-primary hover:underline"
                >
                  Download {r.kind} PDF
                </Link>
              ))}
              <Badge variant="success">Finalized</Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <SnapshotEditor
        snapshotId={snap.id}
        clientId={snap.clientId}
        status={snap.status as "DRAFT" | "FINALIZED"}
        householdName={snap.client.householdName}
        period={`Q${snap.fiscalQuarter} ${snap.fiscalYear}`}
        persons={snap.client.persons.map((p) => ({
          id: p.id,
          spouseIndex: p.spouseIndex,
          firstName: p.firstName,
          lastName: p.lastName,
        }))}
        accounts={editorAccounts}
        deductibleCents={deductibles.map((d) => d.amountCents)}
        initial={initial}
      />
    </div>
  );
}
