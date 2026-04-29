import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AW Client Report Portal",
  description: "Quarterly SACS & TCC report generation for HNW clients",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
