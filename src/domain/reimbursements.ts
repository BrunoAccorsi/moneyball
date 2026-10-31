import { formatCad } from "./format";
import type { Rule } from "./types";

export type ReimbursementSubject = {
  id: string;
  amountCents: number;
  rule: Rule | null;
};

export type ReimbursementLink = {
  reimbursedCents: number;
  missing: boolean;
  note: string | null;
  group: string;
};

export function linkReimbursements(items: ReimbursementSubject[]): Map<string, ReimbursementLink> {
  const groups = new Map<string, { outflows: ReimbursementSubject[]; inflows: ReimbursementSubject[] }>();
  for (const item of items) {
    const group = item.rule?.reimbursementGroup;
    if (!group || !item.rule) continue;
    const bucket = groups.get(group) ?? { outflows: [], inflows: [] };
    if (item.rule.role === "reimbursement_inflow") bucket.inflows.push(item);
    if (item.rule.role === "reimbursement_outflow") bucket.outflows.push(item);
    groups.set(group, bucket);
  }

  const links = new Map<string, ReimbursementLink>();
  for (const [group, bucket] of groups) {
    const inflowPortion = bucket.inflows.reduce(
      (sum, inflow) => sum + (inflow.rule?.reimbursementAmountCents ?? Math.max(0, inflow.amountCents)),
      0,
    );
    let pool = inflowPortion;
    const missingInflow = bucket.inflows.length === 0;
    for (const outflow of bucket.outflows) {
      const gross = Math.max(0, -outflow.amountCents);
      const declared = outflow.rule?.reimbursementAmountCents ?? gross;
      const take = missingInflow ? Math.min(gross, declared) : Math.min(gross, pool);
      if (!missingInflow) pool -= take;
      const missing = missingInflow && take > 0;
      const note = missing
        ? (outflow.rule?.note ?? `The offsetting deposit for ${group} was not in this upload.`)
        : take > 0
          ? `Reimbursed ${formatCad(take)}`
          : null;
      links.set(outflow.id, { reimbursedCents: take, missing, note, group });
    }
  }
  return links;
}
