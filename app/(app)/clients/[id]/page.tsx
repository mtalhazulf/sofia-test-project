import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClient } from "@/lib/services/clients";
import { formatUSD } from "@/lib/math/money";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/constants";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) notFound();

  const profile = client.staticProfile;
  const deductibles = profile
    ? (JSON.parse(profile.insuranceDeductibles) as Array<{ label: string; amountCents: string }>)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.householdName}</h1>
          <p className="text-sm text-muted-foreground">
            {client.persons.map((p) => `${p.firstName} ${p.lastName}`).join(" & ")}
          </p>
        </div>
        <Button asChild>
          <Link href={`/clients/${client.id}/snapshots/new`}>New Quarterly Snapshot</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Persons</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {client.persons.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    Spouse {p.spouseIndex} · {p.firstName} {p.lastName}
                  </span>
                  <span className="text-muted-foreground">
                    DOB {format(p.dateOfBirth, "PP")} · SSN ****{p.ssnLast4}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Static Financial Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {profile ? (
              <>
                <Row label="Monthly inflow" value={formatUSD(profile.monthlyInflowCents)} />
                <Row label="Monthly outflow" value={formatUSD(profile.monthlyOutflowCents)} />
                <Row label="Floor" value={formatUSD(profile.floorCents)} />
                <div className="pt-2 text-muted-foreground">
                  Deductibles: {deductibles.length === 0 ? "—" : null}
                </div>
                {deductibles.map((d) => (
                  <Row key={d.label} label={d.label} value={formatUSD(BigInt(d.amountCents))} />
                ))}
              </>
            ) : (
              <p className="text-muted-foreground">No profile configured.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts ({client.accounts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left">
              <tr>
                <th className="p-3">Label</th>
                <th className="p-3">Type</th>
                <th className="p-3">Custodian</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Last 4</th>
                <th className="p-3">Rate</th>
              </tr>
            </thead>
            <tbody>
              {client.accounts.map((a) => {
                const owner = client.persons.find((p) => p.id === a.ownerPersonId);
                return (
                  <tr key={a.id} className="border-b last:border-b-0">
                    <td className="p-3">{a.displayLabel}</td>
                    <td className="p-3">{ACCOUNT_TYPE_LABELS[a.type as AccountType]}</td>
                    <td className="p-3 text-muted-foreground">{a.custodian ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {owner ? `Spouse ${owner.spouseIndex}` : "Joint"}
                    </td>
                    <td className="p-3 text-muted-foreground">{a.accountNumberLast4 ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {a.interestRateBps != null ? `${(a.interestRateBps / 100).toFixed(2)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quarterly Snapshots</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left">
              <tr>
                <th className="p-3">Period</th>
                <th className="p-3">Meeting</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reports</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {client.snapshots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No snapshots yet.
                  </td>
                </tr>
              ) : null}
              {client.snapshots.map((s) => (
                <tr key={s.id} className="border-b last:border-b-0">
                  <td className="p-3 font-medium">
                    Q{s.fiscalQuarter} {s.fiscalYear}
                  </td>
                  <td className="p-3 text-muted-foreground">{format(s.meetingDate, "PP")}</td>
                  <td className="p-3">
                    {s.status === "FINALIZED" ? (
                      <Badge variant="success">Finalized</Badge>
                    ) : (
                      <Badge variant="warning">Draft</Badge>
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {s.reports.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex gap-3">
                        {s.reports.map((r) => (
                          <Link
                            key={r.id}
                            href={`/api/reports/${s.id}/${r.kind.toLowerCase()}`}
                            className="text-primary hover:underline"
                          >
                            {r.kind} PDF
                          </Link>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/clients/${client.id}/snapshots/${s.id}`}
                      className="text-primary hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
