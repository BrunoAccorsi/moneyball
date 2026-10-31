import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moneyball",
  description: "A self-hosted ledger for one household.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
