"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Section } from "@/components/ui/section";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/constants";

export type EditorClient = {
  id: string;
  householdName: string;
  isMarried: boolean;
  persons: Array<{
    id: string;
    spouseIndex: 1 | 2;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    ssnLast4: string;
  }>;
  monthlyInflow: string;
  monthlyOutflow: string;
  floor: string;
  insuranceDeductibles: Array<{ label: string; amountCents: string }>;
  accounts: Array<{
    id: string;
    type: string;
    category: string;
    ownerSpouseIndex: 0 | 1 | 2;
    displayLabel: string;
    custodian: string;
    accountNumberLast4: string;
    interestRateBps: number | null;
    propertyAddress: string;
    archived: boolean;
  }>;
};

type NewAccount = {
  key: string;
  type: AccountType | "";
  ownerSpouseIndex: 0 | 1 | 2;
  displayLabel: string;
  custodian: string;
  accountNumberLast4: string;
  interestRateBps: string;
  propertyAddress: string;
};

export function ClientEditor({ initial }: { initial: EditorClient }) {
  const router = useRouter();
  const [householdName, setHouseholdName] = React.useState(initial.householdName);
  const [isMarried, setIsMarried] = React.useState(initial.isMarried);
  const [persons, setPersons] = React.useState(initial.persons);
  const [monthlyInflow, setMonthlyInflow] = React.useState(initial.monthlyInflow);
  const [monthlyOutflow, setMonthlyOutflow] = React.useState(initial.monthlyOutflow);
  const [floor, setFloor] = React.useState(initial.floor);
  const [deductibles, setDeductibles] = React.useState(
    initial.insuranceDeductibles.length > 0
      ? initial.insuranceDeductibles
      : [{ label: "", amountCents: "" }],
  );
  const [accounts, setAccounts] = React.useState(initial.accounts);
  const [newAccounts, setNewAccounts] = React.useState<NewAccount[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isMarried && persons.length === 1) {
      setPersons((ps) => [
        ...ps,
        {
          id: "new-spouse-2",
          spouseIndex: 2,
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          ssnLast4: "",
        },
      ]);
    }
    if (!isMarried && persons.length === 2) {
      setPersons((ps) => ps.filter((p) => p.spouseIndex === 1));
    }
  }, [isMarried, persons.length]);

  function patchPerson(idx: number, partial: Partial<EditorClient["persons"][number]>) {
    setPersons((ps) => ps.map((p, i) => (i === idx ? { ...p, ...partial } : p)));
  }

  function addDeductible() {
    setDeductibles((d) => [...d, { label: "", amountCents: "" }]);
  }
  function removeDeductible(i: number) {
    setDeductibles((d) => d.filter((_, j) => j !== i));
  }
  function patchDeductible(i: number, partial: Partial<{ label: string; amountCents: string }>) {
    setDeductibles((d) => d.map((x, j) => (j === i ? { ...x, ...partial } : x)));
  }

  function addNewAccount() {
    setNewAccounts((xs) => [
      ...xs,
      {
        key: `new-${Date.now()}-${xs.length}`,
        type: "",
        ownerSpouseIndex: 1,
        displayLabel: "",
        custodian: "",
        accountNumberLast4: "",
        interestRateBps: "",
        propertyAddress: "",
      },
    ]);
  }
  function removeNewAccount(i: number) {
    setNewAccounts((xs) => xs.filter((_, j) => j !== i));
  }
  function patchNewAccount(i: number, partial: Partial<NewAccount>) {
    setNewAccounts((xs) => xs.map((x, j) => (j === i ? { ...x, ...partial } : x)));
  }

  async function save() {
    setBusy(true);
    setError(null);
    const body = {
      householdName,
      isMarried,
      persons: persons.map((p) => ({
        spouseIndex: p.spouseIndex,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth,
        ssnLast4: p.ssnLast4,
      })),
      monthlyInflow,
      monthlyOutflow,
      floor,
      insuranceDeductibles: deductibles
        .filter((d) => d.label.trim() && d.amountCents.trim())
        .map((d) => ({ label: d.label.trim(), amountCents: d.amountCents })),
      accountEdits: accounts.map((a) => ({
        id: a.id,
        displayLabel: a.displayLabel,
        custodian: a.custodian || null,
        accountNumberLast4: a.accountNumberLast4 || null,
        interestRateBps:
          a.interestRateBps == null || Number.isNaN(a.interestRateBps)
            ? null
            : a.interestRateBps,
        propertyAddress: a.propertyAddress || null,
        archived: a.archived,
      })),
      newAccounts: newAccounts
        .filter((a) => a.type)
        .map((a) => ({
          type: a.type,
          ownerSpouseIndex: a.ownerSpouseIndex,
          displayLabel:
            a.displayLabel || ACCOUNT_TYPE_LABELS[a.type as AccountType],
          custodian: a.custodian || null,
          accountNumberLast4: a.accountNumberLast4 || null,
          interestRateBps: a.interestRateBps ? Number(a.interestRateBps) : null,
          propertyAddress: a.propertyAddress || null,
        })),
    };
    const res = await fetch(`/api/clients/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || `Save failed (${res.status})`);
      return;
    }
    router.refresh();
    router.push(`/clients/${initial.id}`);
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        breadcrumb={
          <span className="inline-flex items-center gap-1.5">
            <Link href="/clients" className="hover:text-ink transition-colors">
              Clients
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />
            <Link
              href={`/clients/${initial.id}`}
              className="hover:text-ink transition-colors"
            >
              {initial.householdName}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />
            <span className="text-ink">Edit</span>
          </span>
        }
        title="Edit client"
        description="Update household, persons, financial profile, and accounts."
      />

      <Section title="Household">
        <div className="border border-line rounded-md bg-surface px-4 sm:px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="householdName">Household name</Label>
            <Input
              id="householdName"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-[0.875rem] text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={isMarried}
              onChange={(e) => setIsMarried(e.target.checked)}
              className="h-4 w-4 accent-brand border-line rounded-sm"
            />
            Two-spouse household
          </label>
        </div>
      </Section>

      <Section title="Persons">
        <div className="border border-line rounded-md bg-surface divide-y divide-line">
          {persons.map((p, i) => (
            <div key={p.id} className="px-4 sm:px-5 py-5 space-y-4">
              <h3 className="text-[0.8125rem] font-medium text-ink">
                Spouse {p.spouseIndex}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First name</Label>
                  <Input
                    value={p.firstName}
                    onChange={(e) => patchPerson(i, { firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last name</Label>
                  <Input
                    value={p.lastName}
                    onChange={(e) => patchPerson(i, { lastName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date of birth</Label>
                  <Input
                    type="date"
                    value={p.dateOfBirth}
                    onChange={(e) => patchPerson(i, { dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>SSN (last 4)</Label>
                  <Input
                    value={p.ssnLast4}
                    onChange={(e) => patchPerson(i, { ssnLast4: e.target.value })}
                    maxLength={4}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Static financial profile"
        description="Standing values used until overridden in a snapshot."
      >
        <div className="border border-line rounded-md bg-surface px-4 sm:px-5 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Monthly inflow ($)</Label>
              <Input
                value={monthlyInflow}
                onChange={(e) => setMonthlyInflow(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly outflow ($)</Label>
              <Input
                value={monthlyOutflow}
                onChange={(e) => setMonthlyOutflow(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Floor ($)</Label>
              <Input value={floor} onChange={(e) => setFloor(e.target.value)} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="eyebrow">Insurance deductibles</div>
              <Button type="button" variant="ghost" size="sm" onClick={addDeductible}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {deductibles.map((d, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 sm:items-end">
                  <div className="space-y-1.5">
                    <Label>Label</Label>
                    <Input
                      value={d.label}
                      onChange={(e) => patchDeductible(i, { label: e.target.value })}
                      placeholder="Auto"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount ($)</Label>
                    <Input
                      value={d.amountCents}
                      onChange={(e) => patchDeductible(i, { amountCents: e.target.value })}
                      placeholder="1000"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDeductible(i)}
                    aria-label="Remove deductible"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Existing accounts"
        description="Type, category, and owner are immutable once snapshots reference an account. Archive instead of deleting."
      >
        {accounts.length === 0 ? (
          <div className="border border-dashed border-line rounded-md bg-surface px-4 sm:px-5 py-8 text-center text-[0.8125rem] text-ink-mute">
            No accounts on file.
          </div>
        ) : (
          <div className="border border-line rounded-md bg-surface divide-y divide-line">
            {accounts.map((a, i) => (
              <div key={a.id} className="px-4 sm:px-5 py-5 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[0.8125rem] font-medium text-ink">
                    {ACCOUNT_TYPE_LABELS[a.type as AccountType] ?? a.type}
                  </span>
                  <span className="text-[0.6875rem] text-ink-mute uppercase tracking-wider">
                    {a.category}
                  </span>
                  <span className="text-[0.6875rem] text-ink-mute">
                    {a.ownerSpouseIndex === 0
                      ? "Joint"
                      : `Spouse ${a.ownerSpouseIndex}`}
                  </span>
                  <label className="ml-auto inline-flex items-center gap-1.5 text-[0.75rem] text-ink-mute cursor-pointer">
                    <input
                      type="checkbox"
                      checked={a.archived}
                      onChange={(e) =>
                        setAccounts((xs) =>
                          xs.map((x, j) =>
                            j === i ? { ...x, archived: e.target.checked } : x,
                          ),
                        )
                      }
                      className="h-3.5 w-3.5 accent-brand border-line rounded-sm"
                    />
                    Archived
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Display label</Label>
                    <Input
                      value={a.displayLabel}
                      onChange={(e) =>
                        setAccounts((xs) =>
                          xs.map((x, j) =>
                            j === i ? { ...x, displayLabel: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Custodian</Label>
                    <Input
                      value={a.custodian}
                      onChange={(e) =>
                        setAccounts((xs) =>
                          xs.map((x, j) =>
                            j === i ? { ...x, custodian: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Acct # last 4</Label>
                    <Input
                      value={a.accountNumberLast4}
                      onChange={(e) =>
                        setAccounts((xs) =>
                          xs.map((x, j) =>
                            j === i
                              ? { ...x, accountNumberLast4: e.target.value }
                              : x,
                          ),
                        )
                      }
                      maxLength={4}
                      inputMode="numeric"
                    />
                  </div>
                  {a.category === "liability" ? (
                    <div className="space-y-1.5">
                      <Label>Interest rate (bps)</Label>
                      <Input
                        value={a.interestRateBps ?? ""}
                        onChange={(e) =>
                          setAccounts((xs) =>
                            xs.map((x, j) =>
                              j === i
                                ? {
                                    ...x,
                                    interestRateBps: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  }
                                : x,
                            ),
                          )
                        }
                        inputMode="numeric"
                      />
                    </div>
                  ) : null}
                  {a.type === "trust_residence" ? (
                    <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                      <Label>Property address</Label>
                      <Input
                        value={a.propertyAddress}
                        onChange={(e) =>
                          setAccounts((xs) =>
                            xs.map((x, j) =>
                              j === i
                                ? { ...x, propertyAddress: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Add accounts"
        action={
          <Button type="button" variant="outline" size="sm" onClick={addNewAccount}>
            <Plus className="h-3.5 w-3.5" /> Add account
          </Button>
        }
      >
        {newAccounts.length === 0 ? (
          <div className="border border-dashed border-line rounded-md bg-surface px-4 sm:px-5 py-6 text-center text-[0.8125rem] text-ink-mute">
            None pending.
          </div>
        ) : (
          <div className="border border-line rounded-md bg-surface divide-y divide-line">
            {newAccounts.map((a, i) => (
              <div key={a.key} className="px-4 sm:px-5 py-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="num text-[0.6875rem] text-ink-mute font-medium">
                    NEW № {(i + 1).toString().padStart(2, "0")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeNewAccount(i)}
                    aria-label="Remove pending account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <select
                      value={a.type}
                      onChange={(e) =>
                        patchNewAccount(i, { type: e.target.value as AccountType })
                      }
                      className="flex h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/15"
                    >
                      <option value="">- Select -</option>
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {ACCOUNT_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Owner</Label>
                    <select
                      value={a.ownerSpouseIndex}
                      onChange={(e) =>
                        patchNewAccount(i, {
                          ownerSpouseIndex: Number(e.target.value) as 0 | 1 | 2,
                        })
                      }
                      className="flex h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/15"
                    >
                      <option value={1}>Spouse 1</option>
                      {isMarried ? <option value={2}>Spouse 2</option> : null}
                      <option value={0}>Joint</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Display label</Label>
                    <Input
                      value={a.displayLabel}
                      onChange={(e) =>
                        patchNewAccount(i, { displayLabel: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Custodian</Label>
                    <Input
                      value={a.custodian}
                      onChange={(e) => patchNewAccount(i, { custodian: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Acct # last 4</Label>
                    <Input
                      value={a.accountNumberLast4}
                      onChange={(e) =>
                        patchNewAccount(i, { accountNumberLast4: e.target.value })
                      }
                      maxLength={4}
                      inputMode="numeric"
                    />
                  </div>
                  {a.type.startsWith("liability_") ? (
                    <div className="space-y-1.5">
                      <Label>Interest rate (bps)</Label>
                      <Input
                        value={a.interestRateBps}
                        onChange={(e) =>
                          patchNewAccount(i, { interestRateBps: e.target.value })
                        }
                        inputMode="numeric"
                      />
                    </div>
                  ) : null}
                  {a.type === "trust_residence" ? (
                    <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                      <Label>Property address</Label>
                      <Input
                        value={a.propertyAddress}
                        onChange={(e) =>
                          patchNewAccount(i, { propertyAddress: e.target.value })
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
        <Button
          type="button"
          variant="primary"
          onClick={save}
          disabled={busy}
          className="w-full sm:w-auto"
        >
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Button asChild variant="ghost" className="w-full sm:w-auto">
          <Link href={`/clients/${initial.id}`}>Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
