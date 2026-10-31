import { collapseSpace, dollarsToCents } from "../format";
import type { ParsedTransaction, ParseResult } from "../types";
import { parseCsv } from "../csv";

const HEADERS = ["Date", "Description", "Sub-description", "Type of Transaction", "Amount", "Balance"];

export function isScotiaChequingCsv(headers: string[]): boolean {
  return (
    HEADERS.every((header) => headers.includes(header)) &&
    !headers.includes("Associated card number") &&
    !headers.includes("Status")
  );
}

export function parseScotiaChequingCsv(content: string): ParseResult {
  const { headers, rows } = parseCsv(content);
  if (!isScotiaChequingCsv(headers)) {
    throw new Error("Not a Scotiabank chequing CSV");
  }
  const transactions: ParsedTransaction[] = rows.map((row) => {
    const description = collapseSpace(
      [row.Description, row["Sub-description"]].filter((part) => part && part.trim()).join(" · "),
    );
    return {
      date: row.Date,
      postedDate: null,
      description,
      amountCents: dollarsToCents(row.Amount ?? ""),
      status: null,
      accountKey: "scotia_chequing",
      accountName: "Scotiabank Chequing",
      institution: "Scotiabank",
      accountKind: "chequing",
      source: "scotia_chequing",
    };
  });
  return {
    source: "scotia_chequing",
    accountKey: "scotia_chequing",
    accountName: "Scotiabank Chequing",
    institution: "Scotiabank",
    accountKind: "chequing",
    transactions,
    warnings: [],
  };
}
