export const CATEGORIES = [
  "Rent",
  "Groceries",
  "Dining",
  "Transport/Car",
  "Transit and rideshare",
  "Utilities and phone",
  "Subscriptions",
  "Health and fitness",
  "Baby and home",
  "Shopping",
  "Travel",
  "Brazil debt payments",
  "Gifts",
  "Fees and interest",
  "Income",
  "Household transfers (Bruna)",
  "Reimbursements",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export type AccountKind = "credit" | "chequing" | "savings";

export type RuleRole =
  | "reimbursement_inflow"
  | "reimbursement_outflow"
  | "transfer_exclude"
  | "statement_credit";

export type Rule = {
  id: string;
  name: string;
  descriptionPattern?: string;
  patternType: "regex" | "contains";
  amountCents?: number;
  amountDirection?: "inflow" | "outflow";
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  accountKey?: string;
  category?: Category;
  oneTime?: boolean;
  recurring?: boolean;
  role?: RuleRole;
  reimbursementGroup?: string;
  reimbursementAmountCents?: number;
  priority: number;
  learned: boolean;
  note?: string;
};

export type ParsedTransaction = {
  date: string;
  postedDate: string | null;
  description: string;
  amountCents: number;
  status: string | null;
  accountKey: string;
  accountName: string;
  institution: string;
  accountKind: AccountKind;
  source: string;
};

export type CategorySource = "rule" | "llm" | "manual";

export type ClassifiedTransaction = ParsedTransaction & {
  id: string;
  fingerprint: string;
  occurrence: number;
  sourceFileName: string;
  merchantKey: string;
  category: Category | null;
  categorySource: CategorySource | null;
  categoryLocked: boolean;
  ruleId: string | null;
  isRecurring: boolean;
  recurringOverride: boolean | null;
  isOneTime: boolean;
  oneTimeOverride: boolean | null;
  isExcluded: boolean;
  exclusionReason: string | null;
  exclusionLocked: boolean;
  transferPairId: string | null;
  reimbursedCents: number;
  reimbursementGroup: string | null;
  reimbursementNote: string | null;
  needsReview: boolean;
  reviewQuestion: string | null;
  reviewDismissed: boolean;
};

export type ExistingTransaction = ClassifiedTransaction;

export type ParseResult = {
  source: string;
  accountKey: string;
  accountName: string;
  institution: string;
  accountKind: AccountKind;
  transactions: ParsedTransaction[];
  warnings: string[];
};
