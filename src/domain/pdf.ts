import type { AccountKind, ParseResult } from "./types";

/**
 * Contract with the pdfplumber service. `implemented: false` means the layout
 * parser is still a stub (Neo Everyday / Pai). Callers must not import rows
 * from a stub, even if a future bug put guessed transactions in the payload.
 */
export type PdfParsePayload = {
  source: string;
  accountKey: string;
  accountName: string;
  institution: string;
  accountKind: AccountKind;
  transactions: {
    date: string;
    postedDate: string | null;
    description: string;
    amountCents: number;
    status: string | null;
  }[];
  warnings: string[];
  implemented: boolean;
};

export function pdfPayloadToParseResult(payload: PdfParsePayload): ParseResult & { implemented: boolean } {
  const transactions = payload.implemented
    ? payload.transactions.map((transaction) => ({
        date: transaction.date,
        postedDate: transaction.postedDate,
        description: transaction.description,
        amountCents: transaction.amountCents,
        status: transaction.status,
        accountKey: payload.accountKey,
        accountName: payload.accountName,
        institution: payload.institution,
        accountKind: payload.accountKind,
        source: payload.source,
      }))
    : [];
  return {
    source: payload.source,
    accountKey: payload.accountKey,
    accountName: payload.accountName,
    institution: payload.institution,
    accountKind: payload.accountKind,
    transactions,
    warnings: payload.warnings,
    implemented: payload.implemented,
  };
}
