export type RecurringCandidate = {
  id: string;
  date: string;
  merchantKey: string;
  amountCents: number;
  isExcluded: boolean;
};

function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

/**
 * Same merchant in two different months, charged within 5 days of the same
 * day-of-month. One month of Tim Hortons visits does not qualify.
 */
export function detectRecurringIds(transactions: RecurringCandidate[]): Set<string> {
  const groups = new Map<string, RecurringCandidate[]>();
  for (const transaction of transactions) {
    if (transaction.isExcluded || transaction.amountCents >= 0 || !transaction.merchantKey) continue;
    const list = groups.get(transaction.merchantKey) ?? [];
    list.push(transaction);
    groups.set(transaction.merchantKey, list);
  }

  const ids = new Set<string>();
  for (const list of groups.values()) {
    let monthly = false;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].date.slice(0, 7) === list[j].date.slice(0, 7)) continue;
        if (Math.abs(dayOfMonth(list[i].date) - dayOfMonth(list[j].date)) <= 5) {
          monthly = true;
        }
      }
    }
    if (monthly) {
      for (const transaction of list) ids.add(transaction.id);
    }
  }
  return ids;
}
