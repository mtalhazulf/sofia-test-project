import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Section } from "@/components/ui/section";
import { createSnapshot } from "@/lib/services/snapshots";
import { createSnapshotSchema } from "@/lib/validators";

export default function NewSnapshotPage({ params }: { params: { id: string } }) {
  async function submit(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/login");
    const u = session.user as { id?: string };
    const parsed = createSnapshotSchema.safeParse({
      clientId: params.id,
      meetingDate: String(formData.get("meetingDate") ?? ""),
      fiscalYear: String(formData.get("fiscalYear") ?? ""),
      fiscalQuarter: String(formData.get("fiscalQuarter") ?? ""),
    });
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error.flatten()));
    const s = await createSnapshot(parsed.data, u.id ?? "");
    redirect(`/clients/${params.id}/snapshots/${s.id}`);
  }

  const today = new Date();
  const year = today.getFullYear();
  const q = Math.floor(today.getMonth() / 3) + 1;

  return (
    <form action={submit} className="space-y-8 max-w-2xl">
      <PageHeader
        breadcrumb={
          <span className="inline-flex items-center gap-1.5">
            <Link href="/clients" className="hover:text-ink transition-colors">
              Clients
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />
            <Link
              href={`/clients/${params.id}`}
              className="hover:text-ink transition-colors"
            >
              File
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />
            <span className="text-ink">New snapshot</span>
          </span>
        }
        title="New quarterly snapshot"
        description="Open a draft snapshot, then enter balances, valuations, and cash-flow figures."
      />

      <Section title="Period">
        <div className="border border-line rounded-md bg-surface px-4 sm:px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="meetingDate">Meeting date</Label>
            <Input
              id="meetingDate"
              name="meetingDate"
              type="date"
              defaultValue={today.toISOString().slice(0, 10)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fiscalYear">Fiscal year</Label>
              <Input id="fiscalYear" name="fiscalYear" type="number" defaultValue={year} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fiscalQuarter">Fiscal quarter</Label>
              <Input
                id="fiscalQuarter"
                name="fiscalQuarter"
                type="number"
                min={1}
                max={4}
                defaultValue={q}
                required
              />
            </div>
          </div>
        </div>
      </Section>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button type="submit" variant="primary" className="w-full sm:w-auto">
          Create draft snapshot
        </Button>
        <Button asChild variant="ghost" className="w-full sm:w-auto">
          <Link href={`/clients/${params.id}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
