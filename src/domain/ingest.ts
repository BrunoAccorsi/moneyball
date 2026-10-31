import { randomUUID } from "crypto";
import { assignOccurrences, countFingerprints, fingerprintOf } from "./dedupe";
import { formatCad, formatDate } from "./format";
import { merchantKey } from "./merchant";
import { linkReimbursements } from "./reimbursements";
import { detectRecurringIds } from "./recurring";
import { bestRule } from "./rules";
import type { Category, ClassifiedTransaction, ParseResult, Rule } from "./types";
import { matchTransfers } from "./transfers";

export type IngestFile = {
  fileName: string;
  sha256: string;
  parsed: ParseResult;
};

export type IngestResult = {
  transactions: ClassifiedTransaction[];
  newIds: string[];
  imported: {
    fileName: string;
    source: string;
    accountName: string;
    added: number;
    skipped: number;
    warnings: string[];
  }[];
  skippedFiles: { fileName: string; reason: string }[];
};

function blankLocks(): Pick<
  ClassifiedTransaction,
  | "category"
  | "categorySource"
  | "categoryLocked"
  | "ruleId"
  | "isRecurring"
  | "recurringOverride"
  | "isOneTime"
  | "oneTimeOverride"
  | "isExcluded"
  | "exclusionReason"
  | "exclusionLocked"
  | "transferPairId"
  | "reimbursedCents"
  | "reimbursementGroup"
  | "reimbursementNote"
  | "needsReview"
  | "reviewQuestion"
  | "reviewDismissed"
> {
  return {
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
  };
}

export function classifyTransactions(rows: ClassifiedTransaction[], rules: Rule[]): ClassifiedTransaction[] {
  const matched = rows.map((row) => ({ row, rule: bestRule(row, rules) }));
  const decisions = matchTransfers(
    matched.map(({ row, rule }) => ({
      id: row.id,
      date: row.date,
      amountCents: row.amountCents,
      description: row.description,
      accountKey: row.accountKey,
      role: rule?.role,
    })),
  );
  const links = linkReimbursements(
    matched.map(({ row, rule }) => ({ id: row.id, amountCents: row.amountCents, rule })),
  );

  const exclusionById = new Map<string, { excluded: boolean; reason: string | null; pairId: string | null }>();
  for (const { row } of matched) {
    if (row.exclusionLocked) {
      exclusionById.set(row.id, {
        excluded: row.isExcluded,
        reason: row.exclusionReason,
        pairId: row.transferPairId,
      });
      continue;
    }
    const decision = decisions.get(row.id);
    exclusionById.set(row.id, {
      excluded: Boolean(decision),
      reason: decision?.reason ?? null,
      pairId: decision?.pairId ?? null,
    });
  }

  const recurringIds = detectRecurringIds(
    matched.map(({ row }) => ({
      id: row.id,
      date: row.date,
      merchantKey: row.merchantKey,
      amountCents: row.amountCents,
      isExcluded: exclusionById.get(row.id)?.excluded ?? false,
    })),
  );

  return matched.map(({ row, rule }) => {
    const exclusion = exclusionById.get(row.id)!;
    const link = links.get(row.id);
    const category = row.categoryLocked ? row.category : (rule?.category ?? null);
    const categorySource = row.categoryLocked ? row.categorySource : rule?.category ? "rule" : null;
    const isOneTime = row.oneTimeOverride ?? Boolean(rule?.oneTime);
    let isRecurring: boolean;
    if (row.recurringOverride != null) isRecurring = row.recurringOverride;
    else if (isOneTime) isRecurring = false;
    else if (rule?.recurring) isRecurring = true;
    else if (category === "Subscriptions") isRecurring = true;
    else isRecurring = recurringIds.has(row.id);

    let needsReview = false;
    let reviewQuestion: string | null = null;
    if (!row.reviewDismissed) {
      if (link?.missing) {
        needsReview = true;
        reviewQuestion = link.note;
      } else if (!category && !exclusion.excluded) {
        needsReview = true;
        reviewQuestion = `How should “${row.description}” on ${formatDate(row.date)} (${formatCad(row.amountCents)}) be categorized?`;
      }
    }

    return {
      ...row,
      merchantKey: merchantKey(row.description),
      category,
      categorySource,
      ruleId: row.categoryLocked ? row.ruleId : (rule?.id ?? null),
      isOneTime,
      isRecurring,
      isExcluded: exclusion.excluded,
      exclusionReason: exclusion.reason,
      transferPairId: exclusion.pairId,
      reimbursedCents: link?.reimbursedCents ?? 0,
      reimbursementGroup: link?.group ?? rule?.reimbursementGroup ?? null,
      reimbursementNote: link?.note ?? null,
      needsReview,
      reviewQuestion,
    };
  });
}

export function applyLlmCategories(
  transactions: ClassifiedTransaction[],
  suggestions: Map<string, Category>,
): ClassifiedTransaction[] {
  return transactions.map((transaction) => {
    if (transaction.category || transaction.categoryLocked || transaction.isExcluded || transaction.reviewDismissed) {
      return transaction;
    }
    const category = suggestions.get(transaction.id);
    if (!category) return transaction;
    return {
      ...transaction,
      category,
      categorySource: "llm",
      needsReview: false,
      reviewQuestion: null,
    };
  });
}

export function ingest(input: {
  files: IngestFile[];
  existingFileHashes: Set<string>;
  existing: ClassifiedTransaction[];
  rules: Rule[];
}): IngestResult {
  const counts = countFingerprints(input.existing.map((transaction) => transaction.fingerprint));
  const seenHashes = new Set(input.existingFileHashes);
  const created: ClassifiedTransaction[] = [];
  const imported: IngestResult["imported"] = [];
  const skippedFiles: IngestResult["skippedFiles"] = [];

  for (const file of input.files) {
    if (seenHashes.has(file.sha256)) {
      skippedFiles.push({ fileName: file.fileName, reason: "This file was already imported." });
      continue;
    }
    seenHashes.add(file.sha256);
    const assignments = assignOccurrences(
      file.parsed.transactions,
      (transaction) =>
        fingerprintOf({
          accountKey: transaction.accountKey,
          date: transaction.date,
          amountCents: transaction.amountCents,
          description: transaction.description,
        }),
      counts,
    );
    let added = 0;
    let skipped = 0;
    for (const assignment of assignments) {
      if (assignment.skip) {
        skipped += 1;
        continue;
      }
      counts.set(assignment.fingerprint, (counts.get(assignment.fingerprint) ?? 0) + 1);
      const transaction = assignment.item;
      created.push({
        ...transaction,
        ...blankLocks(),
        id: randomUUID(),
        fingerprint: assignment.fingerprint,
        occurrence: assignment.occurrence,
        sourceFileName: file.fileName,
        merchantKey: merchantKey(transaction.description),
      });
      added += 1;
    }
    imported.push({
      fileName: file.fileName,
      source: file.parsed.source,
      accountName: file.parsed.accountName,
      added,
      skipped,
      warnings: file.parsed.warnings,
    });
  }

  const transactions = classifyTransactions([...input.existing, ...created], input.rules);
  return {
    transactions,
    newIds: created.map((transaction) => transaction.id),
    imported,
    skippedFiles,
  };
}
