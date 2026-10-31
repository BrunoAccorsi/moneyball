import { readFileSync } from "fs";
import path from "path";
import { createHash } from "crypto";
import { detectAndParse } from "./parsers";
import { allSeedRules } from "./seed-rules";
import { ingest } from "./ingest";
import { formatCad } from "./format";
import { summarize, type MonthSummary } from "./summary";
import type { ClassifiedTransaction } from "./types";

export const OCTOBER_MONTH = "2026-10";

export const OCTOBER_REFERENCE = {
  incomeCents: 501667,
  spendingCents: 707251,
  oneTimeCents: 258900,
  normalCents: 448351,
  netWithoutOneOffsCents: 53316,
  rentCents: 195000,
};

export type PdfItem = {
  label: string;
  amountCents: number;
  present: boolean;
  why: string;
};

export type OctoberValidation = {
  summary: MonthSummary;
  transactions: ClassifiedTransaction[];
  pdfItems: PdfItem[];
  spendingGapCents: number;
  incomeGapCents: number;
  normalGapCents: number;
  unexplainedNormalCents: number;
  text: string;
};

function has(transactions: ClassifiedTransaction[], predicate: (transaction: ClassifiedTransaction) => boolean): boolean {
  return transactions.some(predicate);
}

export function loadOctoberFixture(fixturesDir: string): OctoberValidation {
  const files = [
    "neo-credit-main.csv",
    "neo-credit-secondary.csv",
    "scotia-chequing.csv",
    "scotia-card-8024.csv",
  ].map((fileName) => {
    const content = readFileSync(path.join(fixturesDir, fileName), "utf8");
    return {
      fileName,
      sha256: createHash("sha256").update(content).digest("hex"),
      parsed: detectAndParse(content, fileName),
    };
  });
  const result = ingest({
    files,
    existingFileHashes: new Set(),
    existing: [],
    rules: allSeedRules(),
  });
  return validateOctober(result.transactions);
}

export function validateOctober(transactions: ClassifiedTransaction[]): OctoberValidation {
  const month = transactions.filter((transaction) => transaction.date.startsWith(OCTOBER_MONTH));
  const summary = summarize(month, OCTOBER_MONTH, "all");
  const pdfItems: PdfItem[] = [
    {
      label: "Salary $2,420.23 on Oct 14 (Transfer from NEO FINANCIAL T)",
      amountCents: 242023,
      present: has(
        month,
        (transaction) =>
          transaction.date === "2026-10-14" &&
          transaction.amountCents === 242023 &&
          /neo financial/i.test(transaction.description),
      ),
      why: "Neo Everyday PDF. It is income in the reference total.",
    },
    {
      label: "Salary $2,420.23 on Oct 29 (Transfer from NEO FINANCIAL T)",
      amountCents: 242023,
      present: has(
        month,
        (transaction) =>
          transaction.date === "2026-10-29" &&
          transaction.amountCents === 242023 &&
          /neo financial/i.test(transaction.description),
      ),
      why: "Neo Everyday PDF. It is income in the reference total.",
    },
    {
      label: "Simply Benefits $176.00",
      amountCents: 17600,
      present: has(month, (transaction) => /simply benefits/i.test(transaction.description)),
      why: "Neo Everyday PDF. It is income in the reference total.",
    },
    {
      label: "Interest $0.21",
      amountCents: 21,
      present: has(
        month,
        (transaction) => transaction.amountCents === 21 && /interest/i.test(transaction.description),
      ),
      why: "Neo Everyday PDF. It is income in the reference total.",
    },
    {
      label: "Rent $1,950.00 to 700 Shawnee on Oct 1",
      amountCents: 195000,
      present: has(month, (transaction) => transaction.category === "Rent" && transaction.amountCents === -195000),
      why: "Neo Everyday PDF (or a transfer that is not in the chequing CSV). It is normal spending in the reference total.",
    },
    {
      label: "Twins, Triplets and More $81.00 on Oct 17",
      amountCents: 8100,
      present: has(month, (transaction) => /twins/i.test(transaction.description)),
      why: "Not in any October CSV. Recurring normal spending. A rule is seeded for when the PDF arrives.",
    },
    {
      label: "Bruna $500.00 e-transfer on Oct 7",
      amountCents: 50000,
      present: has(month, (transaction) => transaction.date === "2026-10-07" && transaction.amountCents === 50000),
      why: "Not in the CSVs. $231.57 of it reimburses the guitar (already netted to zero from the saved answer). The other $268.43 is a household transfer, not spending and not income.",
    },
  ];

  const spendingGapCents = OCTOBER_REFERENCE.spendingCents - summary.spendingCents;
  const incomeGapCents = OCTOBER_REFERENCE.incomeCents - summary.incomeCents;
  const normalGapCents = OCTOBER_REFERENCE.normalCents - summary.normalCents;
  const rentGap = pdfItems.find((item) => item.label.startsWith("Rent"))!;
  const twins = pdfItems.find((item) => item.label.startsWith("Twins"))!;
  const explainedNormal =
    (rentGap.present ? 0 : rentGap.amountCents) + (twins.present ? 0 : twins.amountCents);
  const unexplainedNormalCents = normalGapCents - explainedNormal;

  const rewards = month
    .filter((transaction) => transaction.exclusionReason === "statement_credit")
    .reduce((sum, transaction) => sum + transaction.amountCents, 0);
  const reviewLines = month
    .filter((transaction) => transaction.needsReview)
    .map((transaction) => `  - ${transaction.date} ${formatCad(transaction.amountCents)} ${transaction.description}`);

  const lines = [
    "October 2026 validation",
    "=======================",
    "Sources in this run: Neo credit card (main), Neo credit card (bills & streaming), Scotiabank chequing, Scotiabank credit card · 8024.",
    "Neo Everyday and Pai PDFs were not part of the upload.",
    "",
    "Computed from the CSVs plus saved answers",
    `  Income:                 ${formatCad(summary.incomeCents)}`,
    `  Total spending:         ${formatCad(summary.spendingCents)}`,
    `  One-time:               ${formatCad(summary.oneTimeCents)}`,
    `  Normal spending:        ${formatCad(summary.normalCents)}`,
    `  Net without one-offs:   ${formatCad(summary.netWithoutOneOffsCents)}`,
    `  Net with one-offs:      ${formatCad(summary.netWithOneOffsCents)}`,
    `  Rent:                   ${formatCad(summary.rentCents)}`,
    `  Reimbursements applied: ${formatCad(summary.reimbursedCents)}`,
    `  Reward cash-outs ignored: ${formatCad(rewards)}`,
    "",
    "Spending by category",
    ...summary.byCategory.map((row) => `  ${row.category.padEnd(28)} ${formatCad(row.cents)}`),
    "",
    "Reference (manual analysis)",
    `  Income:                 ${formatCad(OCTOBER_REFERENCE.incomeCents)}`,
    `  Total spending:         ${formatCad(OCTOBER_REFERENCE.spendingCents)}`,
    `  One-time:               ${formatCad(OCTOBER_REFERENCE.oneTimeCents)}`,
    `  Normal spending:        ${formatCad(OCTOBER_REFERENCE.normalCents)}`,
    `  Net without one-offs:   ${formatCad(OCTOBER_REFERENCE.netWithoutOneOffsCents)}`,
    `  Rent:                   ${formatCad(OCTOBER_REFERENCE.rentCents)}`,
    "",
    "Gap",
    `  Income:          ${formatCad(incomeGapCents)} (reference minus computed)`,
    `  Total spending:  ${formatCad(spendingGapCents)}`,
    `  Normal spending: ${formatCad(normalGapCents)}`,
    `  One-time:        ${formatCad(OCTOBER_REFERENCE.oneTimeCents - summary.oneTimeCents)}`,
    "",
    "Reference items that depend on the Neo Everyday / Pai PDFs",
  ];
  for (const item of pdfItems) {
    lines.push(`  [${item.present ? "found" : "MISSING"}] ${item.label}`);
    lines.push(`           ${item.why}`);
  }
  lines.push("");
  lines.push(
    `After removing missing rent (${formatCad(rentGap.present ? 0 : rentGap.amountCents)}) and Twins, Triplets and More (${formatCad(twins.present ? 0 : twins.amountCents)}) from the normal-spending gap, ${formatCad(unexplainedNormalCents)} of normal spending is still only on the PDFs. These CSVs do not say what that remainder is.`,
  );
  lines.push("");
  lines.push("Decisions applied to the CSV totals");
  lines.push("  - One-time matches the reference: WestJet is net of Bruna's $1,050, and the other one-time rows are all on the cards.");
  lines.push("  - The $231.57 guitar is netted to zero even though the $500 Oct 7 e-transfer is missing.");
  lines.push("  - Reward Cashed Out rows are statement credits. They are not income and they do not reduce spending.");
  lines.push("  - Card payments, including unmatched Neo 'Payment Received' rows, are excluded so they are not income.");
  lines.push("  - Wise Canada ($300 + $230) counts as Brazil debt spending.");
  if (reviewLines.length) {
    lines.push("");
    lines.push("Left in the review queue");
    lines.push(...reviewLines);
  }
  lines.push("");

  return {
    summary,
    transactions: month,
    pdfItems,
    spendingGapCents,
    incomeGapCents,
    normalGapCents,
    unexplainedNormalCents,
    text: lines.join("\n"),
  };
}
