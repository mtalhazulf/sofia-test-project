import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { listClients } from "@/lib/services/clients";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatGrid, Stat } from "@/components/ui/section";
import { format } from "date-fns";

export default async function ClientsPage() {
  const clients = await listClients();
  const finalized = clients.filter((c) => c.snapshots[0]?.status === "FINALIZED").length;
  const draft = clients.filter((c) => c.snapshots[0]?.status === "DRAFT").length;
  const dormant = clients.filter((c) => c.snapshots.length === 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Households under stewardship and their most recent quarterly snapshot."
        action={
          <Button asChild variant="primary">
            <Link href="/clients/new">
              <Plus className="h-4 w-4" />
              New client
            </Link>
          </Button>
        }
      />

      <StatGrid>
        <Stat label="Total" value={clients.length.toString().padStart(2, "0")} />
        <Stat label="Finalized" value={finalized.toString().padStart(2, "0")} hint="Most recent snapshot" />
        <Stat label="In draft" value={draft.toString().padStart(2, "0")} hint="Awaiting finalization" />
        <Stat label="No snapshot" value={dormant.toString().padStart(2, "0")} hint="Households without a quarter" />
      </StatGrid>

      {clients.length === 0 ? (
        <div className="border border-dashed border-line rounded-md py-16 text-center bg-surface">
          <p className="text-[0.875rem] text-ink-mute">No clients yet.</p>
          <Button asChild variant="primary" size="sm" className="mt-4">
            <Link href="/clients/new">
              <Plus className="h-4 w-4" />
              Create your first client
            </Link>
          </Button>
        </div>
      ) : (
        <div className="border border-line rounded-md bg-surface overflow-hidden animate-fade-up">
          <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-[36%]">Household</th>
                <th>Persons</th>
                <th className="text-right">Accounts</th>
                <th>Last meeting</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const last = c.snapshots[0];
                const personNames = c.persons
                  .map((p) => `${p.firstName} ${p.lastName}`)
                  .join(" & ");
                return (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/clients/${c.id}`}
                        className="block hover:text-brand transition-colors"
                      >
                        <span className="font-medium text-ink">{c.householdName}</span>
                        <span className="block text-[0.75rem] text-ink-mute mt-0.5 num">
                          ID&nbsp;·&nbsp;{c.id.slice(-8).toUpperCase()}
                        </span>
                      </Link>
                    </td>
                    <td className="text-ink-mute">{personNames}</td>
                    <td className="text-right num text-ink">{c._count.accounts}</td>
                    <td className="text-ink-mute num">
                      {last ? format(last.meetingDate, "MMM d, yyyy") : "-"}
                    </td>
                    <td>
                      {last ? (
                        last.status === "FINALIZED" ? (
                          <Badge variant="success">
                            Q{last.fiscalQuarter} {last.fiscalYear} · Final
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            Q{last.fiscalQuarter} {last.fiscalYear} · Draft
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline">No snapshot</Badge>
                      )}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/clients/${c.id}`}
                        className="inline-flex items-center gap-1 text-[0.8125rem] text-ink-mute hover:text-brand transition-colors group"
                      >
                        Open
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}