import * as React from "react";
import { formatUSD } from "@/lib/math/money";

export type SacsChartData = {
  inflowCents: bigint;
  outflowCents: bigint;
  excessCents: bigint;
  privateReserveBalanceCents: bigint;
  privateReserveTargetCents: bigint;
  privateReserveFundedPctBps: number;
};

// Fixed viewBox so on-screen preview and PDF render are visually identical.
// SRS §7.3 layout-stability rule.
const VB_W = 1100;
const VB_H = 600;

export function SacsBubble({ data, householdName, period }: {
  data: SacsChartData;
  householdName: string;
  period: string;
}) {
  const negativeExcess = data.excessCents < 0n;
  const fundedPct = (data.privateReserveFundedPctBps / 100).toFixed(1);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="#FFFFFF" />

      {/* Header */}
      <text x={VB_W / 2} y={48} textAnchor="middle" fontSize={28} fontWeight={600} fill="#1F4E79">
        {householdName}
      </text>
      <text x={VB_W / 2} y={78} textAnchor="middle" fontSize={16} fill="#64748B">
        Simple Automated Cash Flow · {period}
      </text>

      {/* Arrows */}
      <defs>
        <marker id="arrowGreen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#2E7D32" />
        </marker>
        <marker id="arrowRed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#C62828" />
        </marker>
        <marker id="arrowBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#1565C0" />
        </marker>
      </defs>

      {/* Inflow → Outflow arrow */}
      <line x1={290} y1={250} x2={770} y2={250} stroke="#C62828" strokeWidth={5} markerEnd="url(#arrowRed)" />
      <text x={530} y={235} textAnchor="middle" fontSize={14} fill="#C62828" fontWeight={600}>
        Outflow {formatUSD(data.outflowCents)}/mo
      </text>

      {/* Inflow → Private Reserve (excess) */}
      <path
        d={`M 230 320 Q 350 480, 530 480`}
        stroke={negativeExcess ? "#C62828" : "#2E7D32"}
        strokeWidth={5}
        fill="none"
        markerEnd={negativeExcess ? "url(#arrowRed)" : "url(#arrowGreen)"}
      />
      <text
        x={360}
        y={500}
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        fill={negativeExcess ? "#C62828" : "#2E7D32"}
      >
        Excess {formatUSD(data.excessCents)}/mo
      </text>

      {/* Inflow bubble */}
      <Bubble
        cx={200}
        cy={250}
        r={120}
        fill="#2E7D32"
        title="Monthly Inflow"
        value={formatUSD(data.inflowCents)}
      />

      {/* Outflow bubble */}
      <Bubble
        cx={840}
        cy={250}
        r={120}
        fill="#C62828"
        title="Monthly Outflow"
        value={formatUSD(data.outflowCents)}
      />

      {/* Private Reserve bubble */}
      <Bubble
        cx={550}
        cy={500}
        r={90}
        fill="#1565C0"
        title="Private Reserve"
        value={formatUSD(data.privateReserveBalanceCents)}
      />
      <text x={550} y={605} textAnchor="middle" fontSize={13} fill="#1565C0" fontWeight={600}>
        Funded {fundedPct}% of {formatUSD(data.privateReserveTargetCents)} target
      </text>
    </svg>
  );
}

function Bubble({
  cx,
  cy,
  r,
  fill,
  title,
  value,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  title: string;
  value: string;
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} opacity={0.92} />
      <text x={cx} y={cy - 18} textAnchor="middle" fontSize={16} fill="#FFFFFF" fontWeight={500}>
        {title}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize={20} fill="#FFFFFF" fontWeight={700}>
        {value}
      </text>
    </g>
  );
}
