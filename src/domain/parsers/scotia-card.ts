import { collapseSpace, dollarsToCents } from "../format";
import type { ParsedTransaction, ParseResult } from "../types";
import { parseCsv } from "../csv";

/**
 * Scotiabank card exports use the opposite sign of the chequing CSV:
 * purchases are positive Debits (they increase the amount owed) and payments
 * are negative Credits. Moneyball stores cash flow, so purchases are negative.
 * The sample file's payment row is Type "Credit", Amount "-184.34", which
 * becomes +184.34 after this flip and matches the chequing "crd. card bill payment".
 */
export function isScotiaCardCsv(headers: string[]): boolean {
  return headers.includes("Associated card number") && headers.includes("Amount") && headers.includes("Date");
}

export function cardLast4(masked: string): string {
  const digits = masked.replace(/\D/g, "");
  return digits.slice(-4) || "card";
}

export function parseScotiaCardCsv(content: string): ParseResult {
  const { headers, rows } = parseCsv(content);
  if (!isScotiaCardCsv(headers)) {
    throw new Error("Not a Scotiabank credit card CSV");
  }
  const last4 = cardLast4(rows.find((row) => row["Associated card number"])?.["Associated card number"] ?? "");
  const accountKey = `scotia_card_${last4}`;
  const accountName = `Scotiabank Credit Card · ${last4}`;
  const transactions: ParsedTransaction[] = rows.map((row) => {
    const description = collapseSpace(
      [row.Description, row["Sub-description"]].filter((part) => part && part.trim()).join(" · "),
    );
    const raw = dollarsToCents(row.Amount ?? "");
    return {
      date: row.Date,
      postedDate: null,
      description,
      amountCents: -raw,
      status: row.Status || null,
      accountKey,
      accountName,
      institution: "Scotiabank",
      accountKind: "credit",
      source: "scotia_card",
    };
  });
  return {
    source: "scotia_card",
    accountKey,
    accountName,
    institution: "Scotiabank",
    accountKind: "credit",
    transactions,
    warnings: [],
  };
}
