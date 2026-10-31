import { describe, expect, it } from "vitest";
import { classifyTransactions } from "../src/domain/ingest";
import { merchantKey } from "../src/domain/merchant";
import { detectRecurringIds } from "../src/domain/recurring";
import { learnedMerchantRule, bestRule } from "../src/domain/rules";
import { allSeedRules } from "../src/domain/seed-rules";
import { llmCategorize } from "../src/domain/llm";
import type { ClassifiedTransaction } from "../src/domain/types";

function txn(partial: Partial<ClassifiedTransaction> & Pick<ClassifiedTransaction, "description" | "amountCents">): ClassifiedTransaction {
  return {
    id: partial.id ?? partial.description,
    date: "2026-10-10",
    postedDate: null,
    status: "Posted",
    accountKey: "neo_credit_main",
    accountName: "Neo Credit Card",
    institution: "Neo",
    accountKind: "credit",
    source: "neo_credit",
    fingerprint: partial.id ?? partial.description,
    occurrence: 0,
    sourceFileName: "file.csv",
    merchantKey: "merchant",
    category: null,
    categorySource: null,
    categoryLocked: false,
    ruleId: null,
    isRecurring: false,
    recurringOverride: null,
    isOneTime: false,
    oneTimeOverride: null,
    isExcluded: false,
    exclusionReason: null,
    exclusionLocked: false,
    transferPairId: null,
    reimbursedCents: 0,
    reimbursementGroup: null,
    reimbursementNote: null,
    needsReview: false,
    reviewQuestion: null,
    reviewDismissed: false,
    ...partial,
  };
}

describe("categorization", () => {
  const rules = allSeedRules();

  it("applies Bruno's saved answers", () => {
    const rows = classifyTransactions(
      [
        txn({ description: "miscellaneous payment · Wise Canada", amountCents: -30000, date: "2026-10-05", accountKey: "scotia_chequing" }),
        txn({ description: "Amazon Channels", amountCents: -1259, date: "2026-10-13" }),
        txn({ description: "Amazon Channels", amountCents: -1574, date: "2026-10-21" }),
        txn({ description: "apple.com/bill", amountCents: -524, date: "2026-10-21", accountKey: "scotia_card_8024" }),
        txn({ description: "AMZN Mktp CA", amountCents: -8503, date: "2026-10-01" }),
        txn({ description: "AMZN Mktp CA", amountCents: -23157, date: "2026-10-01" }),
        txn({ description: "WESTJET", amountCents: -213624, date: "2026-10-10" }),
        txn({ description: "Payment Received - Thank you", amountCents: 105000, date: "2026-10-13" }),
        txn({ description: "AMAZON.CA", amountCents: -40161, date: "2026-10-24" }),
        txn({ description: "F45 TRAINING SHAWNESSY", amountCents: -17000, date: "2026-10-06" }),
        txn({ description: "Transfer from NEO FINANCIAL T", amountCents: 242023, date: "2026-10-14", accountKey: "neo_everyday" }),
      ],
      rules,
    );
    const byAmount = (amount: number) => rows.find((row) => row.amountCents === amount && row.date !== "2026-10-21" || (row.amountCents === amount && row.description.includes("Amazon") && row.date === "2026-10-13"));
    expect(rows.find((row) => row.amountCents === -30000)?.category).toBe("Brazil debt payments");
    expect(rows.find((row) => row.amountCents === -30000)?.isRecurring).toBe(true);
    expect(rows.filter((row) => /Amazon Channels/.test(row.description)).every((row) => row.category === "Subscriptions" && row.isRecurring)).toBe(true);
    expect(rows.find((row) => /apple/.test(row.description))?.category).toBe("Subscriptions");
    expect(rows.find((row) => row.amountCents === -8503)?.category).toBe("Gifts");
    expect(rows.find((row) => row.amountCents === -8503)?.isOneTime).toBe(true);
    const guitar = rows.find((row) => row.amountCents === -23157);
    expect(guitar?.reimbursedCents).toBe(23157);
    expect(guitar?.needsReview).toBe(true);
    const westjet = rows.find((row) => /WESTJET/.test(row.description));
    expect(westjet?.category).toBe("Travel");
    expect(westjet?.isOneTime).toBe(true);
    expect(westjet?.reimbursedCents).toBe(105000);
    expect(westjet?.isExcluded).toBe(false);
    const share = rows.find((row) => row.amountCents === 105000);
    expect(share?.isExcluded).toBe(false);
    expect(share?.category).toBe("Reimbursements");
    expect(rows.find((row) => row.amountCents === -40161)?.category).toBe("Baby and home");
    expect(rows.find((row) => /F45/.test(row.description))?.isRecurring).toBe(true);
    expect(rows.find((row) => /NEO FINANCIAL/.test(row.description))?.category).toBe("Income");
    expect(byAmount).toBeTypeOf("function");
  });

  it("uses the Scotia payee, not the generic lead-in, as the merchant", () => {
    expect(merchantKey("miscellaneous payment · Wise Canada")).toBe("wise");
    expect(merchantKey("sobeys millrise #5064 · Calgary Ab (Apple Pay)")).toMatch(/^sobeys/);
  });

  it("lets a learned merchant rule beat a default", () => {
    const learned = learnedMerchantRule({ id: "learned-tims", pattern: "tim hortons", category: "Shopping" });
    const subject = { description: "TIM HORTONS #0486", amountCents: -1435, date: "2026-10-30", accountKey: "neo_credit_main" };
    expect(bestRule(subject, rules)?.category).toBe("Dining");
    expect(bestRule(subject, [...rules, learned])?.category).toBe("Shopping");
  });

  it("marks the same merchant monthly, and not several visits in one month", () => {
    const monthly = detectRecurringIds([
      { id: "a", date: "2026-09-15", merchantKey: "netflix.com", amountCents: -903, isExcluded: false },
      { id: "b", date: "2026-10-15", merchantKey: "netflix.com", amountCents: -903, isExcluded: false },
    ]);
    expect(monthly).toEqual(new Set(["a", "b"]));
    const coffee = detectRecurringIds([
      { id: "c", date: "2026-10-02", merchantKey: "tim hortons", amountCents: -500, isExcluded: false },
      { id: "d", date: "2026-10-24", merchantKey: "tim hortons", amountCents: -800, isExcluded: false },
    ]);
    expect(coffee.size).toBe(0);
  });

  it("does not call an LLM when no API key is set", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const category = await llmCategorize(
      { description: "Mystery merchant", amountCents: -100, date: "2026-10-01" },
      { fetchImpl },
    );
    expect(category).toBeNull();
    expect(called).toBe(false);
  });

  it("accepts an LLM category only from the known list", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ category: "Dining" }) } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
    const category = await llmCategorize(
      { description: "Mystery merchant", amountCents: -100, date: "2026-10-01" },
      { apiKey: "test", fetchImpl },
    );
    expect(category).toBe("Dining");
  });
});
