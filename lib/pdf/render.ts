import puppeteer, { Browser } from "puppeteer";

// Singleton browser. Launching Chromium per request adds ~3s of overhead.
const globalForBrowser = globalThis as unknown as { __pdfBrowser?: Browser };

async function getBrowser(): Promise<Browser> {
  if (globalForBrowser.__pdfBrowser) return globalForBrowser.__pdfBrowser;
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });
  globalForBrowser.__pdfBrowser = browser;
  return browser;
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");
    const buf = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0.4in", bottom: "0.4in", left: "0.5in", right: "0.5in" },
    });
    return Buffer.from(buf);
  } finally {
    await page.close();
  }
}
