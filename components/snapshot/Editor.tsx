"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SacsBubble } from "@/components/charts/SacsBubble";
import { TccCircle, type TccAccountDisplay } from "@/components/charts/TccCircle";
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
};

export type EditorPerson = {
  id: string;
  spouseIndex: number;
  firstName: string;
  lastName: string;
};

export type EditorInitial = {
  inflowCents: string;
  outflowCents: string;
  privateReserveBalanceCents: string;
  schwabInvestmentBalanceCents: string;
  balances: Record<string, { balance: string; cashBalance?: string }>;
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
};

function safeCents(s: string): bigint {
  try {
    return toCents(s || "0");
  } catch {
    return 0n;
  }
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

  const accountDisplay = (a: EditorAccount, balanceCents: bigint): TccAccountDisplay => ({
    label: a.displayLabel || ACCOUNT_TYPE_LABELS[a.type],
    last4: a.accountNumberLast4,
    balanceCents,
    rateBps: a.interestRateBps,
  });

  const tccChart = {
    spouse1: {
      name: `${spouse1.firstName} ${spouse1.lastName}`,
      retirementCents: tcc.spouse1RetirementCents,
      accounts: props.accounts
        .filter((a) => a.category === "retirement" && a.ownerPersonId === spouse1.id)
        .map((a) => accountDisplay(a, tccBalanceList.find((b) => b.accountId === a.id)?.balanceCents ?? 0n)),
    },
    spouse2: spouse2
      ? {
          name: `${spouse2.firstName} ${spouse2.lastName}`,
          retirementCents: tcc.spouse2RetirementCents,
          accounts: props.accounts
            .filter((a) => a.category === "retirement" && a.ownerPersonId === spouse2.id)
            .map((a) => accountDisplay(a, tccBalanceList.find((b) => b.accountId === a.id)?.balanceCents ?? 0n)),
        }
      : undefined,
    nonRetirementCents: tcc.nonRetirementCents,
    nonRetirementAccounts: props.accounts
      .filter((a) => a.category === "non_retirement")
      .map((a) => accountDisplay(a, tccBalanceList.find((b) => b.accountId === a.id)?.balanceCents ?? 0n)),
    trustCents: tcc.trustCents,
    trustAccounts: props.accounts
      .filter((a) => a.category === "trust")
      .map((a) => accountDisplay(a, tccBalanceList.find((b) => b.accountId === a.id)?.balanceCents ?? 0n)),
    liabilitiesTotalCents: tcc.liabilitiesTotalCents,
    liabilities: props.accounts
      .filter((a) => a.category === "liability")
      .map((a) => accountDisplay(a, tccBalanceList.find((b) => b.accountId === a.id)?.balanceCents ?? 0n)),
    grandTotalNetWorthCents: tcc.grandTotalNetWorthCents,
  };

  async function save(): Promise<boolean> {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{props.householdName}</h1>
          <p className="text-sm text-muted-foreground">
            {props.period} ·{" "}
            {props.status === "FINALIZED" ? (
              <Badge variant="success">Finalized (read-only)</Badge>
            ) : (
              <Badge variant="warning">Draft</Badge>
            )}
          </p>
        </div>
        <Link
          href={`/clients/${props.clientId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to client
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cashflow (SACS inputs)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <MoneyField label="Monthly inflow" value={inflow} onChange={setInflow} disabled={readOnly} />
              <MoneyField label="Monthly outflow" value={outflow} onChange={setOutflow} disabled={readOnly} />
              <MoneyField label="Private Reserve balance" value={reserve} onChange={setReserve} disabled={readOnly} />
              <MoneyField label="Schwab investment balance" value={schwab} onChange={setSchwab} disabled={readOnly} />
            </CardContent>
          </Card>

          {props.accounts.filter((a) => a.category !== "trust").length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Account Balances (TCC inputs)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {props.accounts
                  .filter((a) => a.category !== "trust")
                  .map((a) => (
                    <div key={a.id} className="grid grid-cols-3 gap-3 items-end">
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
                          setBalances((b) => ({ ...b, [a.id]: { ...b[a.id], balance: v } }))
                        }
                        disabled={readOnly}
                      />
                      <MoneyField
                        label={a.category === "non_retirement" ? "Cash sub-balance" : ""}
                        value={balances[a.id]?.cashBalance ?? ""}
                        onChange={(v) =>
                          setBalances((b) => ({ ...b, [a.id]: { ...b[a.id], balance: b[a.id]?.balance ?? "", cashBalance: v } }))
                        }
                        disabled={readOnly}
                      />
                    </div>
                  ))}
              </CardContent>
            </Card>
          ) : null}

          {props.accounts.filter((a) => a.category === "trust").length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Trust Values (Zillow lookups)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {props.accounts
                  .filter((a) => a.category === "trust")
                  .map((a) => (
                    <div key={a.id} className="grid grid-cols-2 gap-3 items-end">
                      <div>
                        <Label className="text-xs">{a.displayLabel}</Label>
                      </div>
                      <MoneyField
                        label="Zillow value"
                        value={trustValues[a.id] ?? ""}
                        onChange={(v) => setTrustValues((t) => ({ ...t, [a.id]: v }))}
                        disabled={readOnly}
                      />
                    </div>
                  ))}
              </CardContent>
            </Card>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!readOnly ? (
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={save} disabled={!!busy}>
                {busy === "save" ? "Saving…" : "Save Draft"}
              </Button>
              <Button type="button" onClick={finalize} disabled={!!busy}>
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
              <div className="grid grid-cols-3 gap-2 text-xs mt-2">
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
              <TccCircle data={tccChart} householdName={props.householdName} period={props.period} />
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  let parsed = "";
  if (value) {
    try {
      parsed = formatUSD(toCents(value));
    } catch {
      parsed = "invalid";
    }
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="$0.00"
        disabled={disabled}
        inputMode="decimal"
      />
      <p className="text-[10px] text-muted-foreground tabular-nums">{parsed === "invalid" ? "—" : parsed}</p>
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
