import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <form action={submit} className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New Quarterly Snapshot</h1>
      <Card>
        <CardHeader>
          <CardTitle>Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="meetingDate">Meeting date</Label>
            <Input id="meetingDate" name="meetingDate" type="date" defaultValue={today.toISOString().slice(0, 10)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="fiscalYear">Fiscal year</Label>
              <Input id="fiscalYear" name="fiscalYear" type="number" defaultValue={year} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fiscalQuarter">Fiscal quarter (1–4)</Label>
              <Input id="fiscalQuarter" name="fiscalQuarter" type="number" min={1} max={4} defaultValue={q} required />
            </div>
          </div>
          <Button type="submit">Create draft snapshot</Button>
        </CardContent>
      </Card>
    </form>
  );
}
