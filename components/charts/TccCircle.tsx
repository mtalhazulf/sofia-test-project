import * as React from "react";
import { formatUSD } from "@/lib/math/money";

export type TccPersonInfo = {
  name: string;
  dateOfBirthIso?: string | null;
  age?: number | null;
  ssnLast4?: string | null;
};

export type TccChartData = {
  spouse1: {
    info: TccPersonInfo;
    retirementCents: bigint;
    accounts: TccAccountDisplay[];
  };
  spouse2?: {
    info: TccPersonInfo;
    retirementCents: bigint;
    accounts: TccAccountDisplay[];
  };
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
  cashBalanceCents?: bigint | null;
  rateBps?: number | null;
  propertyAddress?: string | null;
};

const VB_W = 1100;
const VB_H = 880;

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

      {/* Spouse retirement buckets */}
      <Bucket
        cx={250}
        cy={250}
        r={110}
        fill="#1F4E79"
        info={data.spouse1.info}
        sectionTitle="Retirement"
        value={formatUSD(data.spouse1.retirementCents)}
        accounts={data.spouse1.accounts}
      />
      {data.spouse2 ? (
        <Bucket
          cx={850}
          cy={250}
          r={110}
          fill="#1565C0"
          info={data.spouse2.info}
          sectionTitle="Retirement"
          value={formatUSD(data.spouse2.retirementCents)}
          accounts={data.spouse2.accounts}
        />
      ) : null}

      {/* Non-retirement (joint, bottom) */}
      <Bucket
        cx={550}
        cy={530}
        r={110}
        fill="#2E7D32"
        sectionTitle="Non-Retirement"
        value={formatUSD(data.nonRetirementCents)}
        accounts={data.nonRetirementAccounts}
      />

      {/* Trust (center-left) */}
      <Bucket
        cx={250}
        cy={530}
        r={90}
        fill="#6B8E23"
        sectionTitle="Trust"
        value={formatUSD(data.trustCents)}
        accounts={data.trustAccounts}
        showAddress
      />

      {/* Grand total banner */}
      <rect x={310} y={730} width={480} height={70} rx={8} fill="#0F172A" />
      <text x={550} y={760} textAnchor="middle" fontSize={16} fill="#94A3B8">
        Grand Total Net Worth
      </text>
      <text x={550} y={788} textAnchor="middle" fontSize={28} fontWeight={700} fill="#FFFFFF">
        {formatUSD(data.grandTotalNetWorthCents)}
      </text>

      {/* Liabilities (separate; per SRS, never subtracted from net worth) */}
      <text x={870} y={580} textAnchor="middle" fontSize={14} fontWeight={600} fill="#C62828">
        Liabilities (displayed separately)
      </text>
      <text x={870} y={605} textAnchor="middle" fontSize={20} fontWeight={700} fill="#C62828">
        {formatUSD(data.liabilitiesTotalCents)}
      </text>
      {data.liabilities.slice(0, 4).map((l, i) => (
        <text key={i} x={870} y={630 + i * 18} textAnchor="middle" fontSize={11} fill="#475569">
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
  info,
  sectionTitle,
  value,
  accounts,
  showAddress,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  info?: TccPersonInfo;
  sectionTitle: string;
  value: string;
  accounts: TccAccountDisplay[];
  showAddress?: boolean;
}) {
  const dobShort = info?.dateOfBirthIso
    ? formatDob(info.dateOfBirthIso)
    : null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} opacity={0.92} />
      {info ? (
        <>
          <text x={cx} y={cy - 28} textAnchor="middle" fontSize={15} fill="#FFFFFF" fontWeight={600}>
            {info.name}
          </text>
          <text x={cx} y={cy - 10} textAnchor="middle" fontSize={10} fill="#FFFFFFCC">
            {[
              info.age != null ? `Age ${info.age}` : null,
              dobShort ? `DOB ${dobShort}` : null,
              info.ssnLast4 ? `SSN ····${info.ssnLast4}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </text>
          <text x={cx} y={cy + 8} textAnchor="middle" fontSize={11} fill="#FFFFFFCC">
            {sectionTitle}
          </text>
          <text x={cx} y={cy + 30} textAnchor="middle" fontSize={20} fill="#FFFFFF" fontWeight={700}>
            {value}
          </text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize={14} fill="#FFFFFF" fontWeight={500}>
            {sectionTitle}
          </text>
          <text x={cx} y={cy + 22} textAnchor="middle" fontSize={20} fill="#FFFFFF" fontWeight={700}>
            {value}
          </text>
        </>
      )}
      {accounts.slice(0, 4).map((a, i) => {
        const lines: string[] = [];
        const head = `${a.label}${a.last4 ? ` ····${a.last4}` : ""} - ${formatUSD(a.balanceCents)}`;
        lines.push(head);
        if (a.cashBalanceCents != null) {
          lines.push(`cash: ${formatUSD(a.cashBalanceCents)}`);
        }
        if (showAddress && a.propertyAddress) {
          lines.push(a.propertyAddress);
        }
        return (
          <g key={i}>
            {lines.map((line, k) => (
              <text
                key={k}
                x={cx}
                y={cy + r + 22 + i * 28 + k * 12}
                textAnchor="middle"
                fontSize={k === 0 ? 11 : 10}
                fill={k === 0 ? "#1F2937" : "#475569"}
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
}

function formatDob(iso: string): string {
  // "yyyy-MM-dd" or full ISO -> "MMM yyyy"
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
