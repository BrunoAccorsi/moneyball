import { collapseSpace, dollarsToCents } from "../format";
import type { ParsedTransaction, ParseResult } from "../types";
import { parseCsv } from "../csv";

const NEO_HEADERS = ["Transaction Date", "Posted Date", "Status", "Description", "Amount"];

/**
 * The secondary Neo card in the October 2026 export has no card number in the CSV.
 * Both Neo card files share one header. Until a card id shows up in the file, a
 * statement is the bills/streaming card only when every purchase is one of the
 * merchants Bruno identified for that card: Enmax, Disney Plus, Kindle, Audible.
 * A new merchant on that card would be filed on the main card — see README.
 */
const SECONDARY_PURCHASE = [/enmax/i, /kindle/i, /audible/i, /disney\s*plus/i];
const NOT_A_PURCHASE = /payment received|reward cashed out/i;

export function isNeoCreditCsv(headers: string[]): boolean {
  return NEO_HEADERS.every((header) => headers.includes(header)) && !headers.includes("Associated card number");
}

export function isNeoSecondaryCard(descriptions: string[]): boolean {
  const purchases = descriptions.filter((description) => !NOT_A_PURCHASE.test(description));
  if (purchases.length === 0) return false;
  return purchases.every((description) => SECONDARY_PURCHASE.some((pattern) => pattern.test(description)));
}

export function parseNeoCreditCsv(content: string): ParseResult {
  const { headers, rows } = parseCsv(content);
  if (!isNeoCreditCsv(headers)) {
    throw new Error("Not a Neo credit card CSV");
  }
  const descriptions = rows.map((row) => collapseSpace(row.Description ?? ""));
  const secondary = isNeoSecondaryCard(descriptions);
  const accountKey = secondary ? "neo_credit_secondary" : "neo_credit_main";
  const accountName = secondary ? "Neo Credit Card (bills & streaming)" : "Neo Credit Card";
  const transactions: ParsedTransaction[] = rows.map((row) => ({
    date: row["Transaction Date"],
    postedDate: row["Posted Date"] || null,
    description: collapseSpace(row.Description ?? ""),
    amountCents: dollarsToCents(row.Amount ?? ""),
    status: row.Status || null,
    accountKey,
    accountName,
    institution: "Neo",
    accountKind: "credit",
    source: "neo_credit",
  }));
  const warnings = secondary
    ? [
        "Neo CSV has no card number. Filed as the bills & streaming card because every purchase is Enmax, Disney Plus, Kindle, or Audible.",
      ]
    : [];
  return {
    source: "neo_credit",
    accountKey,
    accountName,
    institution: "Neo",
    accountKind: "credit",
    transactions,
    warnings,
  };
}
