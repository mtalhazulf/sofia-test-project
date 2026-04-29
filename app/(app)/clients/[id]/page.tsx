import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight, ChevronRight, Plus, FileDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatGrid, Stat, Section, DataRow } from "@/components/ui/section";
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

  const lastSnap = client.snapshots[0];
  const finalizedCount = client.snapshots.filter((s) => s.status === "FINALIZED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={
          <span className="inline-flex items-center gap-1.5">
            <Link href="/clients" className="hover:text-ink transition-colors">
              Clients
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />
            <span className="text-ink">{client.householdName}</span>
          </span>
        }
        title={client.householdName}
        description={
          <>
            {client.persons.map((p) => `${p.firstName} ${p.lastName}`).join(" & ")}
            {lastSnap ? (
              <span className="text-ink-faint">
                {" "}· last reviewed {format(lastSnap.meetingDate, "MMM d, yyyy")}
              </span>
            ) : null}
          </>
        }
        action={
          <>
            <Button asChild variant="outline">
              <Link href={`/clients/${client.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button asChild variant="primary">
              <Link href={`/clients/${client.id}/snapshots/new`}>
                <Plus className="h-4 w-4" />
                New snapshot
              </Link>
            </Button>
          </>
        }
      />

      <StatGrid>
        <Stat label="Accounts" value={client.accounts.length.toString().padStart(2, "0")} />
        <Stat
          label="Snapshots"
          value={client.snapshots.length.toString().padStart(2, "0")}
          hint={`${finalizedCount} finalized`}
        />
        <Stat label="Persons" value={client.persons.length.toString().padStart(2, "0")} />
        <Stat
          label="File ID"
          value={<span className="text-[1rem]">{client.id.slice(-8).toUpperCase()}</span>}
        />
      </StatGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Persons" description="Members of the household.">
          <div className="border border-line rounded-md bg-surface divide-y divide-line">
            {client.persons.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5"
              >
                <div className="h-8 w-8 rounded-full bg-elevated text-ink-mute grid place-items-center text-[0.75rem] font-medium num">
                  {p.spouseIndex.toString().padStart(2, "0")}
                </div>
                <div>
                  <div className="text-[0.875rem] font-medium text-ink">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-[0.75rem] text-ink-mute">
                    Spouse {p.spouseIndex} · DOB {format(p.dateOfBirth, "MMM d, yyyy")}
                  </div>
                </div>
                <div className="num text-[0.75rem] text-ink-mute">
                  ····&nbsp;{p.ssnLast4}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Static financial profile" description="Standing inflow, outflow, and reserves.">
          {profile ? (
            <div className="border border-line rounded-md bg-surface px-4 sm:px-5 py-4">
              <DataRow label="Monthly inflow" value={formatUSD(profile.monthlyInflowCents)} />
              <DataRow label="Monthly outflow" value={formatUSD(profile.monthlyOutflowCents)} />
              <DataRow label="Floor" value={formatUSD(profile.floorCents)} />
              <div className="pt-3 mt-3 border-t border-line-soft">
                <div className="eyebrow mb-2">Insurance deductibles</div>
                {deductibles.length === 0 ? (
                  <p className="text-[0.8125rem] text-ink-mute">None on file.</p>
                ) : (
                  deductibles.map((d) => (
                    <DataRow
                      key={d.label}
                      label={d.label}
                      value={formatUSD(BigInt(d.amountCents))}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-line rounded-md bg-surface px-4 sm:px-5 py-8 text-center text-[0.8125rem] text-ink-mute">
              No profile configured.
            </div>
          )}
        </Section>
      </div>

      <Section
        title="Accounts"
        description={`${client.accounts.length} on file.`}
      >
        {client.accounts.length === 0 ? (
          <div className="border border-dashed border-line rounded-md bg-surface py-12 text-center text-[0.8125rem] text-ink-mute">
            No accounts on file.
          </div>
        ) : (
          <div className="border border-line rounded-md bg-surface overflow-hidden">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Type</th>
                    <th>Custodian</th>
                    <th>Owner</th>
                    <th>Last 4</th>
                    <th className="text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {client.accounts.map((a) => {
                    const owner = client.persons.find((p) => p.id === a.ownerPersonId);
                    return (
                      <tr key={a.id}>
                        <td className="font-medium text-ink">{a.displayLabel}</td>
                        <td className="text-ink-mute">
                          {ACCOUNT_TYPE_LABELS[a.type as AccountType]}
                        </td>
                        <td className="text-ink-mute">{a.custodian ?? "-"}</td>
                        <td className="text-ink-mute">
                          {owner ? `Spouse ${owner.spouseIndex}` : "Joint"}
                        </td>
                        <td className="num text-ink-mute">
                          {a.accountNumberLast4 ? `····${a.accountNumberLast4}` : "-"}
                        </td>
                        <td className="text-right num text-ink">
                          {a.interestRateBps != null
                            ? `${(a.interestRateBps / 100).toFixed(2)}%`
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Quarterly snapshots"
        description={`${client.snapshots.length} period${client.snapshots.length === 1 ? "" : "s"} on record.`}
      >
        {client.snapshots.length === 0 ? (
          <div className="border border-dashed border-line rounded-md bg-surface py-12 text-center text-[0.8125rem] text-ink-mute">
            No snapshots yet.
          </div>
        ) : (
          <div className="border border-line rounded-md bg-surface overflow-hidden">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Meeting</th>
                    <th>Status</th>
                    <th>Reports</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {client.snapshots.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium text-ink">
                        Q{s.fiscalQuarter} <span className="num">{s.fiscalYear}</span>
                      </td>
                      <td className="text-ink-mute num">
                        {format(s.meetingDate, "MMM d, yyyy")}
                      </td>
                      <td>
                        {s.status === "FINALIZED" ? (
                          <Badge variant="success">Finalized</Badge>
                        ) : (
                          <Badge variant="warning">Draft</Badge>
                        )}
                      </td>
                      <td>
                        {s.reports.length === 0 ? (
                          <span className="text-ink-faint">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {s.reports.map((r) => (
                              <Link
                                key={r.id}
                                href={`/api/reports/${s.id}/${r.kind.toLowerCase()}`}
                                className="inline-flex items-center gap-1 text-[0.8125rem] text-brand hover:underline underline-offset-2"
                              >
                                <FileDown className="h-3.5 w-3.5" />
                                {r.kind}
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/clients/${client.id}/snapshots/${s.id}`}
                          className="inline-flex items-center gap-1 text-[0.8125rem] text-ink-mute hover:text-brand transition-colors group"
                        >
                          Open
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
