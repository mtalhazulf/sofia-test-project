import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Section } from "@/components/ui/section";
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
    <form action={submit} className="space-y-8 max-w-4xl">
      <PageHeader
        breadcrumb={
          <span className="inline-flex items-center gap-1.5">
            <Link href="/clients" className="hover:text-ink transition-colors">
              Clients
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />
            <span className="text-ink">New client</span>
          </span>
        }
        title="New client"
        description="Establish the household, persons, financial profile, and accounts."
      />

      <Section title="Household">
        <div className="border border-line rounded-md bg-surface px-4 sm:px-5 py-5 space-y-4">
          <Field
            label="Household name"
            name="householdName"
            placeholder="The Smith Family"
            required
          />
          <label className="flex items-center gap-2 text-[0.875rem] text-ink cursor-pointer">
            <input
              type="checkbox"
              name="isMarried"
              defaultChecked
              className="h-4 w-4 accent-brand border-line rounded-sm"
            />
            Two-spouse household
          </label>
        </div>
      </Section>

      <Section title="Persons">
        <div className="border border-line rounded-md bg-surface divide-y divide-line">
          <PersonFields prefix="p1" title="Spouse 1" />
          <PersonFields prefix="p2" title="Spouse 2 (optional)" />
        </div>
      </Section>

      <Section title="Static financial profile" description="Standing values used until overridden in a snapshot.">
        <div className="border border-line rounded-md bg-surface px-4 sm:px-5 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Monthly inflow ($)" name="monthlyInflow" defaultValue="15000" />
            <Field label="Monthly outflow ($)" name="monthlyOutflow" defaultValue="10000" />
            <Field label="Floor ($)" name="floor" defaultValue="1000" />
          </div>
          <div>
            <div className="eyebrow mb-2">Insurance deductibles</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="contents">
                  <Field
                    label={`Deductible ${i + 1} · label`}
                    name={`ded${i}_label`}
                    defaultValue={i === 0 ? "Auto" : ""}
                  />
                  <Field
                    label={`Amount ($)`}
                    name={`ded${i}_amount`}
                    defaultValue={i === 0 ? "1000" : ""}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Accounts" description="Up to six. Leave type empty to skip.">
        <div className="border border-line rounded-md bg-surface divide-y divide-line">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <AccountRow key={i} index={i} />
          ))}
        </div>
      </Section>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
        <Button type="submit" variant="primary" className="w-full sm:w-auto">
          Create client
        </Button>
        <Button asChild variant="ghost" className="w-full sm:w-auto">
          <Link href="/clients">Cancel</Link>
        </Button>
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
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </div>
  );
}

function PersonFields({ prefix, title }: { prefix: string; title: string }) {
  return (
    <div className="px-4 sm:px-5 py-5 space-y-4">
      <h3 className="text-[0.8125rem] font-medium text-ink">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First name" name={`${prefix}_firstName`} />
        <Field label="Last name" name={`${prefix}_lastName`} />
        <Field
          label="Date of birth"
          name={`${prefix}_dob`}
          placeholder="1975-04-12"
        />
        <Field label="SSN (last 4)" name={`${prefix}_ssn`} placeholder="1234" />
      </div>
    </div>
  );
}

function AccountRow({ index }: { index: number }) {
  return (
    <div className="px-4 sm:px-5 py-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="num text-[0.6875rem] text-ink-mute font-medium">
          № {(index + 1).toString().padStart(2, "0")}
        </span>
        <span className="h-px flex-1 bg-line-soft" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="sm:col-span-2 lg:col-span-2 space-y-1.5">
          <Label>Type</Label>
          <select
            name={`acct${index}_type`}
            className="flex h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink hover:border-line-strong focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/15"
          >
            <option value="">- None -</option>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <Field label="Display label" name={`acct${index}_label`} placeholder="Roth IRA - Spouse 1" />
        <Field label="Custodian" name={`acct${index}_custodian`} placeholder="Schwab" />
        <Field label="Acct # last 4" name={`acct${index}_last4`} placeholder="1234" />
        <div className="space-y-1.5">
          <Label>Owner</Label>
          <select
            name={`acct${index}_owner`}
            className="flex h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink hover:border-line-strong focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/15"
          >
            <option value="1">Spouse 1</option>
            <option value="2">Spouse 2</option>
            <option value="0">Joint</option>
          </select>
        </div>
        <Field label="Rate (bps · liabilities)" name={`acct${index}_rate`} placeholder="525" />
        <div className="sm:col-span-2 lg:col-span-3">
          <Field
            label="Property address (trust only)"
            name={`acct${index}_address`}
            placeholder="1 Peachtree St, Atlanta GA"
          />
        </div>
      </div>
    </div>
  );
}
