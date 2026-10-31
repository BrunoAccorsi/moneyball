import { boolean, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  institution: text("institution").notNull(),
  kind: text("kind").notNull(),
});

export const importFiles = pgTable("import_files", {
  sha256: text("sha256").primaryKey(),
  fileName: text("file_name").notNull(),
  source: text("source").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    accountKey: text("account_key").notNull(),
    date: text("date").notNull(),
    postedDate: text("posted_date"),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status"),
    source: text("source").notNull(),
    sourceFileName: text("source_file_name").notNull(),
    fingerprint: text("fingerprint").notNull(),
    occurrence: integer("occurrence").notNull(),
    merchantKey: text("merchant_key").notNull(),
    category: text("category"),
    categorySource: text("category_source"),
    categoryLocked: boolean("category_locked").notNull().default(false),
    ruleId: text("rule_id"),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurringOverride: boolean("recurring_override"),
    isOneTime: boolean("is_one_time").notNull().default(false),
    oneTimeOverride: boolean("one_time_override"),
    isExcluded: boolean("is_excluded").notNull().default(false),
    exclusionReason: text("exclusion_reason"),
    exclusionLocked: boolean("exclusion_locked").notNull().default(false),
    transferPairId: text("transfer_pair_id"),
    reimbursedCents: integer("reimbursed_cents").notNull().default(0),
    reimbursementGroup: text("reimbursement_group"),
    reimbursementNote: text("reimbursement_note"),
    needsReview: boolean("needs_review").notNull().default(false),
    reviewQuestion: text("review_question"),
    reviewDismissed: boolean("review_dismissed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("transactions_fingerprint_occurrence").on(table.fingerprint, table.occurrence),
    index("transactions_date_idx").on(table.date),
    index("transactions_review_idx").on(table.needsReview),
  ],
);

export const rules = pgTable("rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  descriptionPattern: text("description_pattern"),
  patternType: text("pattern_type").notNull(),
  amountCents: integer("amount_cents"),
  amountDirection: text("amount_direction"),
  dateExact: text("date_exact"),
  dateFrom: text("date_from"),
  dateTo: text("date_to"),
  accountKey: text("account_key"),
  category: text("category"),
  setOneTime: boolean("set_one_time"),
  setRecurring: boolean("set_recurring"),
  role: text("role"),
  reimbursementGroup: text("reimbursement_group"),
  reimbursementAmountCents: integer("reimbursement_amount_cents"),
  priority: integer("priority").notNull(),
  learned: boolean("learned").notNull().default(false),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
