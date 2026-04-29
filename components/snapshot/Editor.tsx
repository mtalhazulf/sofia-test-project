"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SacsBubble } from "@/components/charts/SacsBubble";
import {
  TccCircle,
  type TccAccountDisplay,
  type TccChartData,
} from "@/components/charts/TccCircle";
import { computeSacs } from "@/lib/math/sacs";
import { computeTcc, type TccAccountBalance } from "@/lib/math/tcc";
import { formatUSD, fromCents, toCents } from "@/lib/math/money";
import { ACCOUNT_TYPE_LABELS, type AccountCategory, type AccountType } from "@/lib/constants";

export type EditorAccount = {
  id: string;
  category: AccountCategory;
  type: AccountType;
  displayLabel: string;
  ownerPersonId: string | null;
  accountNumberLast4: string | null;
  interestRateBps: number | null;
  propertyAddress?: string | null;
};

export type EditorPerson = {
  id: string;
  spouseIndex: number;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  ssnLast4?: string;
};

export type EditorInitial = {
  inflowCents: string;
  outflowCents: string;
  privateReserveBalanceCents: string;
  schwabInvestmentBalanceCents: string;
  balances: Record<string, { balance: string; cashBalance?: string }>;
  trustValues: Record<string, string>;
};

export type EditorPrevious = {
  period: string;
  inflowCents: string | null;
  outflowCents: string | null;
  privateReserveBalanceCents: string | null;
  schwabInvestmentBalanceCents: string | null;
  balances: Record<string, { balance: string; cashBalance: string | null }>;
  trustValues: Record<string, string>;
};

export type EditorProps = {
  snapshotId: string;
  clientId: string;
  status: "DRAFT" | "FINALIZED";
  householdName: string;
  period: string;
  persons: EditorPerson[];
  accounts: EditorAccount[];
  deductibleCents: string[];
  initial: EditorInitial;
  previous?: EditorPrevious | null;
};

function safeCents(s: string): bigint {
  try {
    return toCents(s || "0");
  } catch {
    return 0n;
  }
}

function isBlank(s: string | undefined | null) {
  return !s || !s.trim();
}

function ageFromIso(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

export function SnapshotEditor(props: EditorProps) {
  const router = useRouter();
  const readOnly = props.status === "FINALIZED";
  const [inflow, setInflow] = React.useState(props.initial.inflowCents);
  const [outflow, setOutflow] = React.useState(props.initial.outflowCents);
  const [reserve, setReserve] = React.useState(props.initial.privateReserveBalanceCents);
  const [schwab, setSchwab] = React.useState(props.initial.schwabInvestmentBalanceCents);
  const [balances, setBalances] = React.useState(props.initial.balances);
  const [trustValues, setTrustValues] = React.useState(props.initial.trustValues);
  const [busy, setBusy] = React.useState<"save" | "finalize" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // True after the user has tried to save/finalize once — drives missing-field highlights.
  const [showRequired, setShowRequired] = React.useState(false);

  const prev = props.previous ?? null;

  const inflowCents = safeCents(inflow);
  const outflowCents = safeCents(outflow);
  const reserveCents = safeCents(reserve);

  const sacs = computeSacs({
    inflowCents,
    outflowCents,
    insuranceDeductiblesCents: props.deductibleCents.map((s) => BigInt(s)),
    privateReserveBalanceCents: reserveCents,
  });

  const tccBalanceList: TccAccountBalance[] = props.accounts.map((a) => {
    const inputBalance = balances[a.id]?.balance ?? "0";
    const trust = trustValues[a.id];
    const cents =
      a.category === "trust" && trust
        ? safeCents(trust)
        : safeCents(inputBalance);
    return {
      accountId: a.id,
      category: a.category,
      ownerPersonId: a.ownerPersonId,
      balanceCents: cents,
    };
  });

  const spouse1 = props.persons.find((p) => p.spouseIndex === 1)!;
  const spouse2 = props.persons.find((p) => p.spouseIndex === 2);
  const tcc = computeTcc({
    spouse1Id: spouse1.id,
    spouse2Id: spouse2?.id ?? null,
    balances: tccBalanceList,
  });

  const accountDisplay = (
    a: EditorAccount,
    balanceCents: bigint,
  ): TccAccountDisplay => {
    const cashRaw = balances[a.id]?.cashBalance;
    return {
      label: a.displayLabel || ACCOUNT_TYPE_LABELS[a.type],
      last4: a.accountNumberLast4,
      balanceCents,
      cashBalanceCents: cashRaw && cashRaw.trim() ? safeCents(cashRaw) : null,
      rateBps: a.interestRateBps,
      propertyAddress: a.propertyAddress ?? null,
    };
  };

  const personInfo = (p: EditorPerson) => ({
    name: `${p.firstName} ${p.lastName}`,
    dateOfBirthIso: p.dateOfBirth ?? null,
    age: ageFromIso(p.dateOfBirth),
    ssnLast4: p.ssnLast4 ?? null,
  });

  const tccChart: TccChartData = {
    spouse1: {
      info: personInfo(spouse1),
      retirementCents: tcc.spouse1RetirementCents,
      accounts: props.accounts
        .filter((a) => a.category === "retirement" && a.ownerPersonId === spouse1.id)
        .map((a) =>
          accountDisplay(a, tccBalanceList.find((b) => b.accountId === a.id)?.balanceCents ?? 0n),
        ),
    },
    spouse2: spouse2
      ? {
          info: personInfo(spouse2),
          retirementCents: tcc.spouse2RetirementCents,
          accounts: props.accounts
            .filter((a) => a.category === "retirement" && a.ownerPersonId === spouse2.id)
            .map((a) =>
              accountDisplay(a, tccBalanceList.find((b) => b.accountId === a.id)?.balanceCents ?? 0n),
            ),
        }
      : undefined,
    nonRetirementCents: tcc.nonRetirementCents,
    nonRetirementAccounts: props.accounts
      .filter((a) => a.category === "non_retirement")
      .map((a) =>
        accountDisplay(a, tccBalanceList.find((b) => b.accountId === a.id)?.balanceCents ?? 0n),
      ),
    trustCents: tcc.trustCents,
    trustAccounts: props.accounts
      .filter((a) => a.category === "trust")
      .map((a) =>
        accountDisplay(a, tccBalanceList.find((b) => b.accountId === a.id)?.balanceCents ?? 0n),
      ),
    liabilitiesTotalCents: tcc.liabilitiesTotalCents,
    liabilities: props.accounts
      .filter((a) => a.category === "liability")
      .map((a) =>
        accountDisplay(a, tccBalanceList.find((b) => b.accountId === a.id)?.balanceCents ?? 0n),
      ),
    grandTotalNetWorthCents: tcc.grandTotalNetWorthCents,
  };

  // Required-field check — every non-trust account needs a balance, every trust
  // account needs a Zillow value, plus the cashflow trio.
  const missingFields: string[] = [];
  if (isBlank(inflow)) missingFields.push("Monthly inflow");
  if (isBlank(outflow)) missingFields.push("Monthly outflow");
  if (isBlank(reserve)) missingFields.push("Private Reserve balance");
  for (const a of props.accounts) {
    if (a.category === "trust") {
      if (isBlank(trustValues[a.id])) missingFields.push(`Trust value: ${a.displayLabel}`);
    } else {
      if (isBlank(balances[a.id]?.balance)) missingFields.push(`Balance: ${a.displayLabel}`);
    }
  }

  async function save(): Promise<boolean> {
    setShowRequired(true);
    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.length} item(s) flagged below.`);
      return false;
    }
    setBusy("save");
    setError(null);
    const body = {
      inflow,
      outflow,
      privateReserveBalance: reserve,
      schwabInvestmentBalance: schwab || undefined,
      balances: props.accounts
        .filter((a) => a.category !== "trust" || balances[a.id]?.balance)
        .map((a) => ({
          accountId: a.id,
          balance: balances[a.id]?.balance ?? "0",
          cashBalance: balances[a.id]?.cashBalance,
        })),
      trustValues: props.accounts
        .filter((a) => a.category === "trust" && trustValues[a.id])
        .map((a) => ({ accountId: a.id, zillowValue: trustValues[a.id]! })),
    };
    const res = await fetch(`/api/snapshots/${props.snapshotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || `Save failed (${res.status})`);
      return false;
    }
    router.refresh();
    return true;
  }

  async function finalize() {
    if (!(await save())) return;
    setBusy("finalize");
    setError(null);
    const res = await fetch(`/api/snapshots/${props.snapshotId}/finalize`, {
      method: "POST",
    });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || `Finalize failed (${res.status})`);
      return;
    }
    router.refresh();
    router.push(`/clients/${props.clientId}/snapshots/${props.snapshotId}`);
  }

  function useLast<T extends string>(target: (v: T) => void, value: T | null | undefined) {
    if (value == null) return null;
    return (
      <button
        type="button"
        onClick={() => target(value)}
        className="text-[0.6875rem] font-medium text-brand hover:underline underline-offset-2"
      >
        Use last
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
            {props.householdName}
          </h1>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-1.5">
            <span>{props.period} ·</span>
            {props.status === "FINALIZED" ? (
              <Badge variant="success">Finalized (read-only)</Badge>
            ) : (
              <Badge variant="warning">Draft</Badge>
            )}
            {prev ? (
              <span className="text-ink-mute">· prior: {prev.period}</span>
            ) : null}
          </p>
        </div>
        <Link
          href={`/clients/${props.clientId}`}
          className="text-sm text-muted-foreground hover:text-foreground shrink-0"
        >
          ← Back to client
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cashflow (SACS inputs)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MoneyField
                label="Monthly inflow"
                value={inflow}
                onChange={setInflow}
                disabled={readOnly}
                required
                showRequired={showRequired}
                priorValue={prev?.inflowCents ?? null}
                priorLabel={prev?.period}
                useLast={useLast}
                applyLast={(v) => setInflow(v)}
              />
              <MoneyField
                label="Monthly outflow"
                value={outflow}
                onChange={setOutflow}
                disabled={readOnly}
                required
                showRequired={showRequired}
                priorValue={prev?.outflowCents ?? null}
                priorLabel={prev?.period}
                useLast={useLast}
                applyLast={(v) => setOutflow(v)}
              />
              <MoneyField
                label="Private Reserve balance"
                value={reserve}
                onChange={setReserve}
                disabled={readOnly}
                required
                showRequired={showRequired}
                priorValue={prev?.privateReserveBalanceCents ?? null}
                priorLabel={prev?.period}
                useLast={useLast}
                applyLast={(v) => setReserve(v)}
              />
              <MoneyField
                label="Schwab investment balance"
                value={schwab}
                onChange={setSchwab}
                disabled={readOnly}
                priorValue={prev?.schwabInvestmentBalanceCents ?? null}
                priorLabel={prev?.period}
                useLast={useLast}
                applyLast={(v) => setSchwab(v)}
              />
            </CardContent>
          </Card>

          {props.accounts.filter((a) => a.category !== "trust").length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Account Balances (TCC inputs)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-3">
                {props.accounts
                  .filter((a) => a.category !== "trust")
                  .map((a) => {
                    const priorBal = prev?.balances[a.id]?.balance ?? null;
                    const priorCash = prev?.balances[a.id]?.cashBalance ?? null;
                    return (
                      <div
                        key={a.id}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:items-end pb-3 sm:pb-0 border-b border-line-soft sm:border-b-0 last:border-b-0 last:pb-0"
                      >
                        <div>
                          <Label className="text-xs">{a.displayLabel}</Label>
                          <p className="text-xs text-muted-foreground">
                            {ACCOUNT_TYPE_LABELS[a.type]}
                            {a.accountNumberLast4 ? ` · ····${a.accountNumberLast4}` : ""}
                          </p>
                        </div>
                        <MoneyField
                          label="Balance"
                          value={balances[a.id]?.balance ?? ""}
                          onChange={(v) =>
                            setBalances((b) => ({
                              ...b,
                              [a.id]: { ...b[a.id], balance: v },
                            }))
                          }
                          disabled={readOnly}
                          required
                          showRequired={showRequired}
                          priorValue={priorBal}
                          priorLabel={prev?.period}
                          useLast={useLast}
                          applyLast={(v) =>
                            setBalances((b) => ({
                              ...b,
                              [a.id]: { ...b[a.id], balance: v },
                            }))
                          }
                        />
                        <MoneyField
                          label={a.category === "non_retirement" ? "Cash sub-balance" : ""}
                          value={balances[a.id]?.cashBalance ?? ""}
                          onChange={(v) =>
                            setBalances((b) => ({
                              ...b,
                              [a.id]: {
                                ...b[a.id],
                                balance: b[a.id]?.balance ?? "",
                                cashBalance: v,
                              },
                            }))
                          }
                          disabled={readOnly}
                          priorValue={priorCash}
                          priorLabel={prev?.period}
                          useLast={useLast}
                          applyLast={(v) =>
                            setBalances((b) => ({
                              ...b,
                              [a.id]: {
                                ...b[a.id],
                                balance: b[a.id]?.balance ?? "",
                                cashBalance: v,
                              },
                            }))
                          }
                        />
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          ) : null}

          {props.accounts.filter((a) => a.category === "trust").length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Trust Values (Zillow lookups)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-3">
                {props.accounts
                  .filter((a) => a.category === "trust")
                  .map((a) => {
                    const priorVal = prev?.trustValues[a.id] ?? null;
                    return (
                      <div
                        key={a.id}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:items-end"
                      >
                        <div>
                          <Label className="text-xs">{a.displayLabel}</Label>
                          {a.propertyAddress ? (
                            <p className="text-xs text-muted-foreground">
                              {a.propertyAddress}
                            </p>
                          ) : null}
                        </div>
                        <MoneyField
                          label="Zillow value"
                          value={trustValues[a.id] ?? ""}
                          onChange={(v) =>
                            setTrustValues((t) => ({ ...t, [a.id]: v }))
                          }
                          disabled={readOnly}
                          required
                          showRequired={showRequired}
                          priorValue={priorVal}
                          priorLabel={prev?.period}
                          useLast={useLast}
                          applyLast={(v) =>
                            setTrustValues((t) => ({ ...t, [a.id]: v }))
                          }
                        />
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {showRequired && missingFields.length > 0 ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-[0.8125rem] text-destructive">
              <div className="font-medium mb-1">
                {missingFields.length} required field
                {missingFields.length === 1 ? "" : "s"} missing
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {missingFields.slice(0, 6).map((f) => (
                  <li key={f}>{f}</li>
                ))}
                {missingFields.length > 6 ? (
                  <li>… and {missingFields.length - 6} more</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {!readOnly ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={save}
                disabled={!!busy}
                className="w-full sm:w-auto"
              >
                {busy === "save" ? "Saving…" : "Save Draft"}
              </Button>
              <Button
                type="button"
                onClick={finalize}
                disabled={!!busy}
                className="w-full sm:w-auto"
              >
                {busy === "finalize" ? "Finalizing & generating PDFs…" : "Finalize & Generate PDFs"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview · SACS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <SacsBubble
                  data={{
                    inflowCents,
                    outflowCents,
                    excessCents: sacs.excessCents,
                    privateReserveBalanceCents: reserveCents,
                    privateReserveTargetCents: sacs.privateReserveTargetCents,
                    privateReserveFundedPctBps: sacs.privateReserveFundedPctBps,
                  }}
                  householdName={props.householdName}
                  period={props.period}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-2">
                <Stat label="Excess" value={formatUSD(sacs.excessCents)} negative={sacs.excessCents < 0n} />
                <Stat label="Reserve target" value={formatUSD(sacs.privateReserveTargetCents)} />
                <Stat
                  label="Funded %"
                  value={`${(sacs.privateReserveFundedPctBps / 100).toFixed(1)}%`}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live Preview · TCC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <TccCircle data={tccChart} householdName={props.householdName} period={props.period} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-2">
                <Stat label="Grand Total" value={formatUSD(tcc.grandTotalNetWorthCents)} />
                <Stat label="Liabilities (separate)" value={formatUSD(tcc.liabilitiesTotalCents)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  disabled,
  required,
  showRequired,
  priorValue,
  priorLabel,
  useLast,
  applyLast,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  showRequired?: boolean;
  priorValue?: string | null;
  priorLabel?: string;
  useLast?: (
    target: (v: string) => void,
    value: string | null | undefined,
  ) => React.ReactNode;
  applyLast?: (v: string) => void;
}) {
  let parsed = "";
  if (value) {
    try {
      parsed = formatUSD(toCents(value));
    } catch {
      parsed = "invalid";
    }
  }
  const isMissing = required && showRequired && (!value || !value.trim());
  const useLastNode =
    useLast && applyLast && priorValue ? useLast(applyLast, priorValue) : null;
  const formattedPrior = (() => {
    if (!priorValue) return null;
    try {
      return formatUSD(toCents(priorValue));
    } catch {
      return priorValue;
    }
  })();

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="$0.00"
        disabled={disabled}
        inputMode="decimal"
        className={cn(
          isMissing &&
            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
        )}
        aria-invalid={isMissing || undefined}
      />
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground tabular-nums min-h-[14px]">
        <span>{parsed === "invalid" ? "-" : parsed}</span>
        {formattedPrior ? (
          <span className="flex items-center gap-1.5 text-ink-mute">
            <span>
              {priorLabel ? `${priorLabel}: ` : "Last: "}
              {formattedPrior}
            </span>
            {!disabled ? useLastNode : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="rounded border p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className={`font-semibold ${negative ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

// re-export type used by the page
export type { TccAccountDisplay };
// silence "unused" lint for the imported helper
export const __noop = fromCents;
