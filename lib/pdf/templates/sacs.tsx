import "server-only";
import * as React from "react";
import { SacsBubble, type SacsChartData } from "@/components/charts/SacsBubble";

export async function renderSacsHtml(args: {
  householdName: string;
  period: string;
  preparedDate: string;
  chart: SacsChartData;
  privateReserveTargetCents: bigint;
  insuranceDeductiblesNote: string;
  schwabInvestmentBalanceText?: string;
}): Promise<string> {
  // Dynamic import: Next.js disallows static `react-dom/server` imports in app code.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const body = renderToStaticMarkup(
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>SACS · {args.householdName}</title>
        <style>{CSS}</style>
      </head>
      <body>
        <main>
          <SacsBubble data={args.chart} householdName={args.householdName} period={args.period} />
          <section className="meta">
            <div className="meta-row">
              <span className="meta-label">Private Reserve Target</span>
              <span className="meta-value">6 × monthly outflow + insurance deductibles</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Deductibles included</span>
              <span className="meta-value">{args.insuranceDeductiblesNote || "-"}</span>
            </div>
            {args.schwabInvestmentBalanceText ? (
              <div className="meta-row">
                <span className="meta-label">Schwab investment balance</span>
                <span className="meta-value">{args.schwabInvestmentBalanceText}</span>
              </div>
            ) : null}
          </section>
          <footer>
            <span>Prepared {args.preparedDate}</span>
            <span> - Windbrook Solutions</span>
            <span className="watermark">
              V1 layout - approximate; pending source-template parity sign-off
            </span>
          </footer>
        </main>
      </body>
    </html>,
  );
  return "<!doctype html>" + body;
}

const CSS = `
  @page { size: Letter; margin: 0.4in 0.5in; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, -apple-system, system-ui, sans-serif; color: #0F172A; }
  main { padding: 16px 24px; }
  section.meta {
    margin-top: 12px;
    border-top: 1px solid #E2E8F0;
    padding-top: 12px;
    display: grid;
    gap: 6px;
  }
  .meta-row { display: flex; justify-content: space-between; font-size: 12px; }
  .meta-label { color: #475569; }
  .meta-value { color: #0F172A; font-weight: 500; }
  footer {
    margin-top: 18px;
    padding-top: 8px;
    border-top: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #94A3B8;
  }
  .watermark { font-style: italic; }
`;
