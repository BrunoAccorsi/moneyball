import { collapseSpace } from "./format";

export type FingerprintParts = {
  accountKey: string;
  date: string;
  amountCents: number;
  description: string;
};

export function normalizeDescription(description: string): string {
  return collapseSpace(description).toLowerCase();
}

export function fingerprintOf(parts: FingerprintParts): string {
  return [parts.accountKey, parts.date, parts.amountCents, normalizeDescription(parts.description)].join("|");
}

export type OccurrenceAssignment<T> = {
  item: T;
  fingerprint: string;
  occurrence: number;
  skip: boolean;
};

/**
 * Drops transactions already stored for this account.
 * Identical rows inside one file are kept (occurrence 0, 1, ...) so two real
 * charges that share a date, amount, and description are not collapsed.
 * Overlapping exports skip occurrences that are already stored.
 */
export function assignOccurrences<T>(
  incoming: T[],
  fingerprintOfItem: (item: T) => string,
  existingCounts: Map<string, number>,
): OccurrenceAssignment<T>[] {
  const seenInBatch = new Map<string, number>();
  return incoming.map((item) => {
    const fingerprint = fingerprintOfItem(item);
    const indexInBatch = seenInBatch.get(fingerprint) ?? 0;
    seenInBatch.set(fingerprint, indexInBatch + 1);
    const already = existingCounts.get(fingerprint) ?? 0;
    return {
      item,
      fingerprint,
      occurrence: indexInBatch,
      skip: indexInBatch < already,
    };
  });
}

export function countFingerprints(fingerprints: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const fingerprint of fingerprints) {
    counts.set(fingerprint, (counts.get(fingerprint) ?? 0) + 1);
  }
  return counts;
}
