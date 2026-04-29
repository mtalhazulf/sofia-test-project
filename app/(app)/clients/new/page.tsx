import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/services/clients";
import { createClientSchema } from "@/lib/validators";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from "@/lib/constants";

export default function NewClientPage() {
  async function submit(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/login");

    const isMarried = formData.get("isMarried") === "on";
    const persons: Array<{
      spouseIndex: 1 | 2;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      ssnLast4: string;
    }> = [
      {
        spouseIndex: 1,
        firstName: String(formData.get("p1_firstName") ?? ""),
        lastName: String(formData.get("p1_lastName") ?? ""),
        dateOfBirth: String(formData.get("p1_dob") ?? ""),
        ssnLast4: String(formData.get("p1_ssn") ?? ""),
      },
    ];
    if (isMarried) {
      persons.push({
        spouseIndex: 2,
        firstName: String(formData.get("p2_firstName") ?? ""),
        lastName: String(formData.get("p2_lastName") ?? ""),
        dateOfBirth: String(formData.get("p2_dob") ?? ""),
        ssnLast4: String(formData.get("p2_ssn") ?? ""),
      });
    }

    const accounts: any[] = [];
    for (let i = 0; i < 6; i++) {
      const type = formData.get(`acct${i}_type`);
      if (!type) continue;
      const owner = Number(formData.get(`acct${i}_owner`) ?? 0);
      accounts.push({
        type,
        displayLabel: String(formData.get(`acct${i}_label`) ?? ACCOUNT_TYPE_LABELS[type as keyof typeof ACCOUNT_TYPE_LABELS]),
        custodian: String(formData.get(`acct${i}_custodian`) ?? "") || null,
        accountNumberLast4: String(formData.get(`acct${i}_last4`) ?? "") || null,
        ownerSpouseIndex: owner === 0 ? 0 : owner === 1 ? 1 : 2,
        interestRateBps: formData.get(`acct${i}_rate`) ? Number(formData.get(`acct${i}_rate`)) : null,
        propertyAddress: String(formData.get(`acct${i}_address`) ?? "") || null,
      });
    }

    const deductibles: any[] = [];
    for (let i = 0; i < 4; i++) {
      const label = formData.get(`ded${i}_label`);
      const amount = formData.get(`ded${i}_amount`);
      if (label && amount) {
        deductibles.push({ label: String(label), amountCents: String(amount) });
      }
    }

    const parsed = createClientSchema.safeParse({
      householdName: String(formData.get("householdName") ?? ""),
      isMarried,
      persons,
      monthlyInflow: String(formData.get("monthlyInflow") ?? "0"),
      monthlyOutflow: String(formData.get("monthlyOutflow") ?? "0"),
      floor: String(formData.get("floor") ?? "1000"),
      insuranceDeductibles: deductibles,
      accounts,
    });
    if (!parsed.success) {
      throw new Error("Invalid form: " + JSON.stringify(parsed.error.flatten()));
    }
    const u = session.user as { id?: string };
    const c = await createClient(parsed.data, u.id ?? "");
    redirect(`/clients/${c.id}`);
  }

  return (
    <form action={submit} className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">New Client</h1>

      <Card>
        <CardHeader>
          <CardTitle>Household</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Household name" name="householdName" placeholder="The Smith Family" required />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isMarried" defaultChecked />
            Married (two-spouse household)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Persons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PersonFields prefix="p1" title="Spouse 1" />
          <PersonFields prefix="p2" title="Spouse 2 (leave blank if single)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Static Financial Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Field label="Monthly inflow ($)" name="monthlyInflow" defaultValue="15000" />
          <Field label="Monthly outflow ($)" name="monthlyOutflow" defaultValue="10000" />
          <Field label="Floor ($)" name="floor" defaultValue="1000" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="contents">
              <Field label={`Deductible ${i + 1} label`} name={`ded${i}_label`} defaultValue={i === 0 ? "Auto" : ""} />
              <Field label={`Deductible ${i + 1} amount ($)`} name={`ded${i}_amount`} defaultValue={i === 0 ? "1000" : ""} />
              <div />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <AccountRow key={i} index={i} />
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit">Create client</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} type={type} />
    </div>
  );
}

function PersonFields({ prefix, title }: { prefix: string; title: string }) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" name={`${prefix}_firstName`} />
        <Field label="Last name" name={`${prefix}_lastName`} />
        <Field label="Date of birth (YYYY-MM-DD)" name={`${prefix}_dob`} placeholder="1975-04-12" />
        <Field label="SSN (last 4)" name={`${prefix}_ssn`} placeholder="1234" />
      </div>
    </div>
  );
}

function AccountRow({ index }: { index: number }) {
  return (
    <div className="grid grid-cols-6 gap-3 items-end border-t pt-3">
      <div className="col-span-2 space-y-1">
        <Label>Type</Label>
        <select name={`acct${index}_type`} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">— None —</option>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <Field label="Display label" name={`acct${index}_label`} placeholder="Roth IRA — Spouse 1" />
      <Field label="Custodian" name={`acct${index}_custodian`} placeholder="Schwab" />
      <Field label="Acct # last 4" name={`acct${index}_last4`} placeholder="1234" />
      <div className="space-y-1">
        <Label>Owner</Label>
        <select name={`acct${index}_owner`} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="1">Spouse 1</option>
          <option value="2">Spouse 2</option>
          <option value="0">Joint</option>
        </select>
      </div>
      <Field label="Rate (bps, liabilities)" name={`acct${index}_rate`} placeholder="525" />
      <div className="col-span-3">
        <Field label="Property address (trust only)" name={`acct${index}_address`} placeholder="1 Peachtree St, Atlanta GA" />
      </div>
    </div>
  );
}
