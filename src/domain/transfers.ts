export type TransferItem = {
  id: string;
  date: string;
  amountCents: number;
  description: string;
  accountKey: string;
  role?: string;
};

export type TransferDecision = {
  reason: string;
  pairId: string | null;
};

const CARD_PAYMENT_WINDOW_DAYS = 5;

function daysApart(left: string, right: string): number {
  const ms = Math.abs(Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`));
  return Math.round(ms / 86_400_000);
}

export function isOwnAccountMove(description: string): boolean {
  if (/bruno accorsi bergoli/i.test(description)) return true;
  if (/auto[\s-]?refill/i.test(description)) return true;
  if (/\bpai\b/i.test(description) && /\b(transfer|savings|move|everyday)\b/i.test(description)) return true;
  if (/\b(transfer|move)\b/i.test(description) && /\bpai\b/i.test(description)) return true;
  return false;
}

export function isBankCardPayment(description: string, amountCents: number): boolean {
  if (amountCents >= 0) return false;
  return /payment to credit|crd\.?\s*card bill payment|credit card (bill )?payment/i.test(description);
}

export function isCardPaymentInflow(item: TransferItem): boolean {
  if (item.amountCents <= 0) return false;
  if (item.role === "reimbursement_inflow") return false;
  if (/payment received/i.test(item.description)) return true;
  if (/scotiabank transit/i.test(item.description)) return true;
  return false;
}

/**
 * Marks own-account moves and credit-card payments so card purchases are not
 * also counted when the payment lands. Wise is not an own-account move unless
 * a rule gives it role "transfer_exclude" (Bruno's Wise Canada payments are
 * Brazil debt, not transfers).
 * Card-side "Payment Received" rows with no matching bank row are still
 * excluded: the funding account is often the Neo Everyday PDF, which is not
 * parsed yet. Reimbursement inflows (Bruna's WestJet share) are left alone.
 */
export function matchTransfers(items: TransferItem[]): Map<string, TransferDecision> {
  const decisions = new Map<string, TransferDecision>();
  const used = new Set<string>();

  for (const item of items) {
    if (item.role === "statement_credit") {
      decisions.set(item.id, { reason: "statement_credit", pairId: null });
      used.add(item.id);
      continue;
    }
    // Bank-side card payments still go through amount/date matching so the
    // card-side credit is paired instead of being left as income.
    if (item.role === "transfer_exclude" && !isBankCardPayment(item.description, item.amountCents)) {
      decisions.set(item.id, { reason: "own_account", pairId: null });
      used.add(item.id);
    }
  }

  for (const item of items) {
    if (used.has(item.id) || item.role === "reimbursement_inflow") continue;
    if (isOwnAccountMove(item.description)) {
      decisions.set(item.id, { reason: "own_account", pairId: null });
      used.add(item.id);
    }
  }

  const bankPayments = items.filter((item) => !used.has(item.id) && isBankCardPayment(item.description, item.amountCents));
  const cardPayments = items.filter((item) => !used.has(item.id) && isCardPaymentInflow(item));

  for (const bank of bankPayments) {
    const match = cardPayments.find(
      (card) =>
        !used.has(card.id) &&
        card.amountCents === -bank.amountCents &&
        daysApart(card.date, bank.date) <= CARD_PAYMENT_WINDOW_DAYS,
    );
    const pairId = match ? `pair:${bank.id}:${match.id}` : null;
    decisions.set(bank.id, { reason: "card_payment", pairId });
    used.add(bank.id);
    if (match) {
      decisions.set(match.id, { reason: "card_payment", pairId });
      used.add(match.id);
    }
  }

  for (const card of cardPayments) {
    if (used.has(card.id)) continue;
    decisions.set(card.id, { reason: "card_payment_unmatched", pairId: null });
    used.add(card.id);
  }

  return decisions;
}
