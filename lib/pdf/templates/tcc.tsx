import "server-only";
import * as React from "react";
import { TccCircle, type TccChartData } from "@/components/charts/TccCircle";
import { formatUSD } from "@/lib/math/money";

export async function renderTccHtml(args: {
  householdName: string;
  period: string;
  preparedDate: string;
  chart: TccChartData;
}): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const body = renderToStaticMarkup(
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>TCC · {args.householdName}</title>
        <style>{CSS}</style>
      </head>
      <body>
        <main>
          <TccCircle data={args.chart} householdName={args.householdName} period={args.period} />
          <section className="legend">
            <div>
              <span className="dot dot-net" /> Grand Total Net Worth ={" "}
              <strong>{formatUSD(args.chart.grandTotalNetWorthCents)}</strong>
            </div>
            <div>
              <span className="dot dot-liab" /> Liabilities (separate) ={" "}
              <strong>{formatUSD(args.chart.liabilitiesTotalCents)}</strong>
            </div>
            <div className="callout">
              Per firm policy, liabilities are shown separately and are <em>not</em> subtracted from the
              Grand Total Net Worth.
            </div>
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
  section.legend {
    margin-top: 12px;
    display: grid;
    gap: 6px;
    font-size: 12px;
    color: #334155;
  }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
  .dot-net { background: #0F172A; }
  .dot-liab { background: #C62828; }
  .callout { padding: 8px 10px; background: #F1F5F9; border-left: 3px solid #1F4E79; font-style: italic; }
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
