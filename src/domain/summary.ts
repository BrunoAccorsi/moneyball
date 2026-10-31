import type { Category, ClassifiedTransaction } from "./types";

export type CategoryTotal = { category: Category | "Uncategorized"; cents: number };
export type MerchantTotal = { merchant: string; cents: number; count: number };

export type MonthSummary = {
  month: string;
  incomeCents: number;
  spendingCents: number;
  oneTimeCents: number;
  normalCents: number;
  netWithOneOffsCents: number;
  netWithoutOneOffsCents: number;
  rentCents: number;
  reimbursedCents: number;
  statementCreditCents: number;
  householdCents: number;
  byCategory: CategoryTotal[];
  topMerchants: MerchantTotal[];
  recurring: MerchantTotal[];
  reviewCount: number;
};

export type SpendingView = "all" | "normal";

export function netSpend(transaction: ClassifiedTransaction): number {
  if (transaction.isExcluded || transaction.amountCents >= 0) return 0;
  if (
    transaction.category === "Income" ||
    transaction.category === "Household transfers (Bruna)" ||
    transaction.category === "Reimbursements"
  ) {
    return 0;
  }
  return Math.max(0, -transaction.amountCents - transaction.reimbursedCents);
}

export function incomeAmount(transaction: ClassifiedTransaction): number {
  if (transaction.isExcluded || transaction.category !== "Income") return 0;
  return Math.max(0, transaction.amountCents);
}

function addMerchant(map: Map<string, MerchantTotal>, merchant: string, cents: number) {
  const current = map.get(merchant) ?? { merchant, cents: 0, count: 0 };
  current.cents += cents;
  current.count += 1;
  map.set(merchant, current);
}

export function distinctMonths(transactions: { date: string }[]): string[] {
  return [...new Set(transactions.map((transaction) => transaction.date.slice(0, 7)))].sort();
}

export function summarize(transactions: ClassifiedTransaction[], month: string, view: SpendingView = "all"): MonthSummary {
  const inMonth = transactions.filter((transaction) => transaction.date.startsWith(month));
  let incomeCents = 0;
  let spendingCents = 0;
  let oneTimeCents = 0;
  let rentCents = 0;
  let reimbursedCents = 0;
  let statementCreditCents = 0;
  let householdCents = 0;
  let reviewCount = 0;
  const categories = new Map<string, number>();
  const merchants = new Map<string, MerchantTotal>();
  const recurring = new Map<string, MerchantTotal>();

  for (const transaction of inMonth) {
    if (transaction.needsReview) reviewCount += 1;
    if (transaction.exclusionReason === "statement_credit") {
      statementCreditCents += transaction.amountCents;
    }
    if (transaction.category === "Household transfers (Bruna)" && !transaction.isExcluded) {
      householdCents += transaction.amountCents;
    }
    reimbursedCents += transaction.reimbursedCents;
    incomeCents += incomeAmount(transaction);
    const spend = netSpend(transaction);
    spendingCents += spend;
    if (transaction.isOneTime) oneTimeCents += spend;
    if (transaction.category === "Rent") rentCents += spend;
    const includeInView = view === "all" || !transaction.isOneTime;
    if (spend > 0 && includeInView) {
      const category = transaction.category ?? "Uncategorized";
      categories.set(category, (categories.get(category) ?? 0) + spend);
      addMerchant(merchants, transaction.merchantKey, spend);
    }
    if (transaction.isRecurring && spend > 0) {
      addMerchant(recurring, transaction.merchantKey, spend);
    }
  }

  const normalCents = spendingCents - oneTimeCents;
  const byCategory = [...categories.entries()]
    .map(([category, cents]) => ({ category: category as CategoryTotal["category"], cents }))
    .sort((a, b) => b.cents - a.cents);
  const topMerchants = [...merchants.values()].sort((a, b) => b.cents - a.cents).slice(0, 8);
  const recurringList = [...recurring.values()].sort((a, b) => b.cents - a.cents);

  return {
    month,
    incomeCents,
    spendingCents,
    oneTimeCents,
    normalCents,
    netWithOneOffsCents: incomeCents - spendingCents,
    netWithoutOneOffsCents: incomeCents - normalCents,
    rentCents,
    reimbursedCents,
    statementCreditCents,
    householdCents,
    byCategory,
    topMerchants,
    recurring: recurringList,
    reviewCount,
  };
}
