import path from "path";
import { describe, expect, it } from "vitest";
import { loadOctoberFixture, OCTOBER_REFERENCE } from "../src/domain/october-report";
import { netSpend } from "../src/domain/summary";

describe("October 2026 validation", () => {
  const report = loadOctoberFixture(path.join(process.cwd(), "fixtures/october"));

  it("prints the gap report", () => {
    console.log(`\n${report.text}`);
    expect(report.text).toMatch(/MISSING/);
    expect(report.text).toMatch(/Neo Everyday/);
  });

  it("matches one-time spending and explains the PDF gap", () => {
    expect(report.summary.oneTimeCents).toBe(OCTOBER_REFERENCE.oneTimeCents);
    expect(report.summary.incomeCents).toBe(0);
    expect(report.summary.rentCents).toBe(0);
    expect(report.summary.spendingCents).toBe(487879);
    expect(report.summary.normalCents).toBe(228979);
    expect(report.unexplainedNormalCents).toBe(16272);
    expect(report.spendingGapCents).toBe(OCTOBER_REFERENCE.spendingCents - 487879);

    for (const item of report.pdfItems) {
      expect(item.present).toBe(false);
    }

    const westjet = report.transactions.find((transaction) => /westjet/i.test(transaction.description));
    expect(westjet?.reimbursedCents).toBe(105000);
    expect(netSpend(westjet!)).toBe(108624);

    const guitar = report.transactions.find((transaction) => transaction.amountCents === -23157);
    expect(netSpend(guitar!)).toBe(0);

    const lyft = report.transactions.filter((transaction) => /lyft/i.test(transaction.description));
    expect(lyft.reduce((sum, transaction) => sum + netSpend(transaction), 0)).toBe(8505);
    expect(lyft.every((transaction) => transaction.isOneTime)).toBe(true);

    const rewards = report.transactions.filter((transaction) => transaction.exclusionReason === "statement_credit");
    expect(rewards.reduce((sum, transaction) => sum + transaction.amountCents, 0)).toBe(8308);

    const uncategorized = report.transactions.filter((transaction) => !transaction.category && !transaction.isExcluded);
    expect(uncategorized.map((transaction) => transaction.amountCents)).toEqual([51800]);
    const uncategorizedOutflows = report.transactions.filter(
      (transaction) => transaction.amountCents < 0 && !transaction.category && !transaction.isExcluded,
    );
    expect(uncategorizedOutflows).toEqual([]);
  });
});
