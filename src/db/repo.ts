import { randomUUID } from "crypto";
import { desc, eq, sql } from "drizzle-orm";
import { ensureMigrated } from "./migrate";
import { getDb } from "./index";
import { accounts, importFiles, rules, settings, transactions } from "./schema";
import type {
  AccountKind,
  Category,
  CategorySource,
  ClassifiedTransaction,
  Rule,
  RuleRole,
} from "../domain/types";
import { isCategory } from "../domain/types";

const ROLES: readonly RuleRole[] = ["reimbursement_inflow", "reimbursement_outflow", "transfer_exclude", "statement_credit"];
const KINDS: readonly AccountKind[] = ["credit", "chequing", "savings"];
const SOURCES: readonly CategorySource[] = ["rule", "llm", "manual"];

function asRole(value: string | null): RuleRole | undefined {
  return ROLES.find((role) => role === value);
}

function asKind(value: string | null | undefined): AccountKind {
  return KINDS.find((kind) => kind === value) ?? "credit";
}

function asSource(value: string | null): CategorySource | null {
  return SOURCES.find((source) => source === value) ?? null;
}

function mapRule(row: typeof rules.$inferSelect): Rule {
  return {
    id: row.id,
    name: row.name,
    descriptionPattern: row.descriptionPattern ?? undefined,
    patternType: row.patternType === "contains" ? "contains" : "regex",
    amountCents: row.amountCents ?? undefined,
    amountDirection: row.amountDirection === "inflow" || row.amountDirection === "outflow" ? row.amountDirection : undefined,
    date: row.dateExact ?? undefined,
    dateFrom: row.dateFrom ?? undefined,
    dateTo: row.dateTo ?? undefined,
    accountKey: row.accountKey ?? undefined,
    category: row.category && isCategory(row.category) ? row.category : undefined,
    oneTime: row.setOneTime ?? undefined,
    recurring: row.setRecurring ?? undefined,
    role: asRole(row.role),
    reimbursementGroup: row.reimbursementGroup ?? undefined,
    reimbursementAmountCents: row.reimbursementAmountCents ?? undefined,
    priority: row.priority,
    learned: row.learned,
    note: row.note ?? undefined,
  };
}

export async function loadRules(): Promise<Rule[]> {
  await ensureMigrated();
  const rows = await getDb().select().from(rules).orderBy(desc(rules.priority), rules.name);
  return rows.map(mapRule);
}

export async function loadTransactions(): Promise<ClassifiedTransaction[]> {
  await ensureMigrated();
  const rows = await getDb()
    .select({
      transaction: transactions,
      accountName: accounts.name,
      institution: accounts.institution,
      kind: accounts.kind,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountKey, accounts.key))
    .orderBy(transactions.date, transactions.description);
  return rows.map((row) => {
    const transaction = row.transaction;
    const category = transaction.category && isCategory(transaction.category) ? transaction.category : null;
    return {
      id: transaction.id,
      date: transaction.date,
      postedDate: transaction.postedDate,
      description: transaction.description,
      amountCents: transaction.amountCents,
      status: transaction.status,
      accountKey: transaction.accountKey,
      accountName: row.accountName ?? transaction.accountKey,
      institution: row.institution ?? "",
      accountKind: asKind(row.kind),
      source: transaction.source,
      fingerprint: transaction.fingerprint,
      occurrence: transaction.occurrence,
      sourceFileName: transaction.sourceFileName,
      merchantKey: transaction.merchantKey,
      category,
      categorySource: asSource(transaction.categorySource),
      categoryLocked: transaction.categoryLocked,
      ruleId: transaction.ruleId,
      isRecurring: transaction.isRecurring,
      recurringOverride: transaction.recurringOverride,
      isOneTime: transaction.isOneTime,
      oneTimeOverride: transaction.oneTimeOverride,
      isExcluded: transaction.isExcluded,
      exclusionReason: transaction.exclusionReason,
      exclusionLocked: transaction.exclusionLocked,
      transferPairId: transaction.transferPairId,
      reimbursedCents: transaction.reimbursedCents,
      reimbursementGroup: transaction.reimbursementGroup,
      reimbursementNote: transaction.reimbursementNote,
      needsReview: transaction.needsReview,
      reviewQuestion: transaction.reviewQuestion,
      reviewDismissed: transaction.reviewDismissed,
    };
  });
}

export async function loadFileHashes(): Promise<Set<string>> {
  await ensureMigrated();
  const rows = await getDb().select({ sha256: importFiles.sha256 }).from(importFiles);
  return new Set(rows.map((row) => row.sha256));
}

export async function countReview(): Promise<number> {
  await ensureMigrated();
  const rows = await getDb().select({ id: transactions.id }).from(transactions).where(eq(transactions.needsReview, true));
  return rows.length;
}

export async function getSavingsTargetCents(): Promise<number> {
  await ensureMigrated();
  const rows = await getDb().select().from(settings).where(eq(settings.key, "savings_target_cents"));
  const parsed = Number(rows[0]?.value ?? "70000");
  return Number.isFinite(parsed) ? parsed : 70000;
}

export async function setSavingsTargetCents(cents: number): Promise<void> {
  await ensureMigrated();
  await getDb()
    .insert(settings)
    .values({ key: "savings_target_cents", value: String(cents) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(cents) } });
}

const transactionUpdate = {
  accountKey: sql`excluded.account_key`,
  date: sql`excluded.date`,
  postedDate: sql`excluded.posted_date`,
  description: sql`excluded.description`,
  amountCents: sql`excluded.amount_cents`,
  status: sql`excluded.status`,
  source: sql`excluded.source`,
  sourceFileName: sql`excluded.source_file_name`,
  fingerprint: sql`excluded.fingerprint`,
  occurrence: sql`excluded.occurrence`,
  merchantKey: sql`excluded.merchant_key`,
  category: sql`excluded.category`,
  categorySource: sql`excluded.category_source`,
  categoryLocked: sql`excluded.category_locked`,
  ruleId: sql`excluded.rule_id`,
  isRecurring: sql`excluded.is_recurring`,
  recurringOverride: sql`excluded.recurring_override`,
  isOneTime: sql`excluded.is_one_time`,
  oneTimeOverride: sql`excluded.one_time_override`,
  isExcluded: sql`excluded.is_excluded`,
  exclusionReason: sql`excluded.exclusion_reason`,
  exclusionLocked: sql`excluded.exclusion_locked`,
  transferPairId: sql`excluded.transfer_pair_id`,
  reimbursedCents: sql`excluded.reimbursed_cents`,
  reimbursementGroup: sql`excluded.reimbursement_group`,
  reimbursementNote: sql`excluded.reimbursement_note`,
  needsReview: sql`excluded.needs_review`,
  reviewQuestion: sql`excluded.review_question`,
  reviewDismissed: sql`excluded.review_dismissed`,
};

export async function saveLedger(
  rows: ClassifiedTransaction[],
  files: { sha256: string; fileName: string; source: string }[],
): Promise<void> {
  await ensureMigrated();
  const db = getDb();
  const accountRows = new Map<string, { key: string; name: string; institution: string; kind: string }>();
  for (const row of rows) {
    accountRows.set(row.accountKey, {
      key: row.accountKey,
      name: row.accountName,
      institution: row.institution,
      kind: row.accountKind,
    });
  }
  if (accountRows.size > 0) {
    await db
      .insert(accounts)
      .values([...accountRows.values()])
      .onConflictDoUpdate({
        target: accounts.key,
        set: {
          name: sql`excluded.name`,
          institution: sql`excluded.institution`,
          kind: sql`excluded.kind`,
        },
      });
  }
  for (let index = 0; index < rows.length; index += 100) {
    const chunk = rows.slice(index, index + 100).map((row) => ({
      id: row.id,
      accountKey: row.accountKey,
      date: row.date,
      postedDate: row.postedDate,
      description: row.description,
      amountCents: row.amountCents,
      status: row.status,
      source: row.source,
      sourceFileName: row.sourceFileName,
      fingerprint: row.fingerprint,
      occurrence: row.occurrence,
      merchantKey: row.merchantKey,
      category: row.category,
      categorySource: row.categorySource,
      categoryLocked: row.categoryLocked,
      ruleId: row.ruleId,
      isRecurring: row.isRecurring,
      recurringOverride: row.recurringOverride,
      isOneTime: row.isOneTime,
      oneTimeOverride: row.oneTimeOverride,
      isExcluded: row.isExcluded,
      exclusionReason: row.exclusionReason,
      exclusionLocked: row.exclusionLocked,
      transferPairId: row.transferPairId,
      reimbursedCents: row.reimbursedCents,
      reimbursementGroup: row.reimbursementGroup,
      reimbursementNote: row.reimbursementNote,
      needsReview: row.needsReview,
      reviewQuestion: row.reviewQuestion,
      reviewDismissed: row.reviewDismissed,
    }));
    if (chunk.length === 0) continue;
    await db.insert(transactions).values(chunk).onConflictDoUpdate({
      target: transactions.id,
      set: transactionUpdate,
    });
  }
  for (const file of files) {
    await db.insert(importFiles).values(file).onConflictDoNothing();
  }
}

export async function reclassifyAll(): Promise<void> {
  const { ingest } = await import("../domain/ingest");
  const existing = await loadTransactions();
  const ruleRows = await loadRules();
  const hashes = await loadFileHashes();
  const result = ingest({ files: [], existingFileHashes: hashes, existing, rules: ruleRows });
  await saveLedger(result.transactions, []);
}

export async function answerTransaction(input: {
  id: string;
  category: Category | null;
  oneTimeOverride: boolean | null;
  recurringOverride: boolean | null;
  excluded: boolean;
}): Promise<void> {
  await ensureMigrated();
  await getDb()
    .update(transactions)
    .set({
      category: input.category,
      categorySource: input.category ? "manual" : null,
      categoryLocked: true,
      oneTimeOverride: input.oneTimeOverride,
      recurringOverride: input.recurringOverride,
      isExcluded: input.excluded,
      exclusionReason: input.excluded ? "manual" : null,
      exclusionLocked: true,
      needsReview: false,
      reviewQuestion: null,
      reviewDismissed: true,
    })
    .where(eq(transactions.id, input.id));
  await reclassifyAll();
}

export async function setCadence(id: string, cadence: "once" | "normal"): Promise<void> {
  await ensureMigrated();
  const oneTime = cadence === "once";
  await getDb()
    .update(transactions)
    .set({
      oneTimeOverride: oneTime,
      isOneTime: oneTime,
      recurringOverride: oneTime ? false : null,
      isRecurring: false,
    })
    .where(eq(transactions.id, id));
  await reclassifyAll();
}

export async function insertLearnedRule(input: {
  pattern: string;
  category: Category;
  oneTime?: boolean;
  recurring?: boolean;
}): Promise<void> {
  await ensureMigrated();
  await getDb().insert(rules).values({
    id: `learned-${randomUUID()}`,
    name: input.pattern,
    descriptionPattern: input.pattern,
    patternType: "contains",
    category: input.category,
    setOneTime: input.oneTime ?? null,
    setRecurring: input.recurring ?? null,
    priority: 50,
    learned: true,
  });
  await reclassifyAll();
}

export async function deleteLearnedRule(id: string): Promise<void> {
  await ensureMigrated();
  const db = getDb();
  const existing = await db.select().from(rules).where(eq(rules.id, id));
  if (!existing[0]?.learned) throw new Error("Built-in rules are part of the app and are not deleted here.");
  await db.delete(rules).where(eq(rules.id, id));
  await reclassifyAll();
}
