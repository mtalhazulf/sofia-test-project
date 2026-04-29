import * as React from "react";
import { formatUSD } from "@/lib/math/money";

export type TccChartData = {
  spouse1: { name: string; retirementCents: bigint; accounts: TccAccountDisplay[] };
  spouse2?: { name: string; retirementCents: bigint; accounts: TccAccountDisplay[] };
  nonRetirementCents: bigint;
  nonRetirementAccounts: TccAccountDisplay[];
  trustCents: bigint;
  trustAccounts: TccAccountDisplay[];
  liabilitiesTotalCents: bigint;
  liabilities: TccAccountDisplay[];
  grandTotalNetWorthCents: bigint;
};

export type TccAccountDisplay = {
  label: string;
  last4?: string | null;
  balanceCents: bigint;
  rateBps?: number | null;
};

const VB_W = 1100;
const VB_H = 850;

export function TccCircle({
  data,
  householdName,
  period,
}: {
  data: TccChartData;
  householdName: string;
  period: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="#FFFFFF" />

      <text x={VB_W / 2} y={42} textAnchor="middle" fontSize={26} fontWeight={600} fill="#1F4E79">
        {householdName}
      </text>
      <text x={VB_W / 2} y={70} textAnchor="middle" fontSize={15} fill="#64748B">
        Total Client Chart · {period}
      </text>

      {/* Three primary buckets */}
      <Bucket
        cx={250}
        cy={240}
        r={110}
        fill="#1F4E79"
        title={data.spouse1.name + " Retirement"}
        value={formatUSD(data.spouse1.retirementCents)}
        accounts={data.spouse1.accounts}
      />
      {data.spouse2 ? (
        <Bucket
          cx={850}
          cy={240}
          r={110}
          fill="#1565C0"
          title={data.spouse2.name + " Retirement"}
          value={formatUSD(data.spouse2.retirementCents)}
          accounts={data.spouse2.accounts}
        />
      ) : null}
      <Bucket
        cx={550}
        cy={500}
        r={110}
        fill="#2E7D32"
        title="Non-Retirement"
        value={formatUSD(data.nonRetirementCents)}
        accounts={data.nonRetirementAccounts}
      />

      {/* Trust */}
      <Bucket
        cx={250}
        cy={500}
        r={90}
        fill="#6B8E23"
        title="Trust"
        value={formatUSD(data.trustCents)}
        accounts={data.trustAccounts}
      />

      {/* Grand total banner */}
      <rect x={310} y={680} width={480} height={70} rx={8} fill="#0F172A" />
      <text x={550} y={710} textAnchor="middle" fontSize={16} fill="#94A3B8">
        Grand Total Net Worth
      </text>
      <text x={550} y={738} textAnchor="middle" fontSize={28} fontWeight={700} fill="#FFFFFF">
        {formatUSD(data.grandTotalNetWorthCents)}
      </text>

      {/* Liabilities (separate; per SRS, never subtracted from net worth) */}
      <text x={840} y={580} textAnchor="middle" fontSize={14} fontWeight={600} fill="#C62828">
        Liabilities (displayed separately)
      </text>
      <text x={840} y={605} textAnchor="middle" fontSize={20} fontWeight={700} fill="#C62828">
        {formatUSD(data.liabilitiesTotalCents)}
      </text>
      {data.liabilities.slice(0, 4).map((l, i) => (
        <text key={i} x={840} y={630 + i * 18} textAnchor="middle" fontSize={11} fill="#475569">
          {l.label}
          {l.rateBps != null ? ` (${(l.rateBps / 100).toFixed(2)}%)` : ""}
          {" · "}
          {formatUSD(l.balanceCents)}
        </text>
      ))}
    </svg>
  );
}

function Bucket({
  cx,
  cy,
  r,
  fill,
  title,
  value,
  accounts,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  title: string;
  value: string;
  accounts: TccAccountDisplay[];
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} opacity={0.9} />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={14} fill="#FFFFFF" fontWeight={500}>
        {title}
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize={20} fill="#FFFFFF" fontWeight={700}>
        {value}
      </text>
      {accounts.slice(0, 4).map((a, i) => (
        <text
          key={i}
          x={cx}
          y={cy + r + 22 + i * 16}
          textAnchor="middle"
          fontSize={11}
          fill="#1F2937"
        >
          {a.label}
          {a.last4 ? ` ····${a.last4}` : ""}
          {" — "}
          {formatUSD(a.balanceCents)}
        </text>
      ))}
    </g>
  );
}
