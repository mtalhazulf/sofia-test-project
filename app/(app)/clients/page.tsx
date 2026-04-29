import Link from "next/link";
import { listClients } from "@/lib/services/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function ClientsPage() {
  const clients = await listClients();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} household{clients.length === 1 ? "" : "s"} on file
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">New Client</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left">
              <tr>
                <th className="p-4 font-medium">Household</th>
                <th className="p-4 font-medium">Persons</th>
                <th className="p-4 font-medium">Accounts</th>
                <th className="p-4 font-medium">Last meeting</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No clients yet. <Link href="/clients/new" className="text-primary underline">Create your first client.</Link>
                  </td>
                </tr>
              ) : null}
              {clients.map((c) => {
                const last = c.snapshots[0];
                return (
                  <tr key={c.id} className="border-b last:border-b-0">
                    <td className="p-4 font-medium">
                      <Link href={`/clients/${c.id}`} className="hover:underline">
                        {c.householdName}
                      </Link>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {c.persons.map((p) => `${p.firstName} ${p.lastName}`).join(" & ")}
                    </td>
                    <td className="p-4 text-muted-foreground">{c._count.accounts}</td>
                    <td className="p-4 text-muted-foreground">
                      {last ? format(last.meetingDate, "PP") : "—"}
                    </td>
                    <td className="p-4">
                      {last ? (
                        last.status === "FINALIZED" ? (
                          <Badge variant="success">Q{last.fiscalQuarter} {last.fiscalYear} finalized</Badge>
                        ) : (
                          <Badge variant="warning">Q{last.fiscalQuarter} {last.fiscalYear} draft</Badge>
                        )
                      ) : (
                        <Badge variant="outline">No snapshots</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/clients/${c.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
