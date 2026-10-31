import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { ingest } from "../src/domain/ingest";
import { detectAndParse } from "../src/domain/parsers";
import { allSeedRules } from "../src/domain/seed-rules";
import { matchTransfers, type TransferItem } from "../src/domain/transfers";

function item(partial: Partial<TransferItem> & Pick<TransferItem, "id" | "amountCents" | "description">): TransferItem {
  return {
    date: "2026-10-10",
    accountKey: "neo_everyday",
    ...partial,
  };
}

describe("transfer matching", () => {
  it("pairs a bank card payment with the card credit and excludes both", () => {
    const decisions = matchTransfers([
      item({ id: "bank", amountCents: -18434, description: "crd. card bill payment", date: "2026-10-28", accountKey: "scotia_chequing" }),
      item({
        id: "card",
        amountCents: 18434,
        description: "scotiabank transit 92619",
        date: "2026-10-28",
        accountKey: "scotia_card_8024",
      }),
      item({ id: "wise", amountCents: -30000, description: "Wise Canada", accountKey: "scotia_chequing" }),
    ]);
    expect(decisions.get("bank")?.reason).toBe("card_payment");
    expect(decisions.get("card")?.reason).toBe("card_payment");
    expect(decisions.get("bank")?.pairId).toBe(decisions.get("card")?.pairId);
    expect(decisions.has("wise")).toBe(false);
  });

  it("excludes Pai moves, auto refills, and e-transfers to Bruno", () => {
    const decisions = matchTransfers([
      item({ id: "pai", amountCents: -5000, description: "Transfer to Pai Savings" }),
      item({ id: "refill", amountCents: -2500, description: "Auto-refill from Everyday" }),
      item({ id: "self", amountCents: 8000, description: "Interac e-Transfer from Bruno Accorsi Bergoli" }),
      item({ id: "wise-own", amountCents: -1000, description: "Wise to my Neo", role: "transfer_exclude" }),
    ]);
    expect(decisions.get("pai")?.reason).toBe("own_account");
    expect(decisions.get("refill")?.reason).toBe("own_account");
    expect(decisions.get("self")?.reason).toBe("own_account");
    expect(decisions.get("wise-own")?.reason).toBe("own_account");
  });

  it("leaves a reimbursement inflow out of the card-payment bucket", () => {
    const decisions = matchTransfers([
      item({
        id: "bruna",
        amountCents: 105000,
        description: "Payment Received - Thank you",
        date: "2026-10-13",
        role: "reimbursement_inflow",
        accountKey: "neo_credit_main",
      }),
    ]);
    expect(decisions.has("bruna")).toBe(false);
  });

  it("excludes unmatched Neo card payments so they are not income", () => {
    const decisions = matchTransfers([
      item({
        id: "pay",
        amountCents: 160066,
        description: "Payment Received - Thank you",
        accountKey: "neo_credit_main",
      }),
    ]);
    expect(decisions.get("pay")?.reason).toBe("card_payment_unmatched");
  });

  it("pairs the real October Scotia payment and keeps Wise as spending", () => {
    const dir = path.join(process.cwd(), "fixtures/october");
    const files = ["scotia-chequing.csv", "scotia-card-8024.csv"].map((fileName) => {
      const body = readFileSync(path.join(dir, fileName), "utf8");
      return {
        fileName,
        sha256: createHash("sha256").update(body).digest("hex"),
        parsed: detectAndParse(body, fileName),
      };
    });
    const result = ingest({ files, existingFileHashes: new Set(), existing: [], rules: allSeedRules() });
    const payment = result.transactions.find((transaction) => /crd\. card bill payment/i.test(transaction.description));
    const credit = result.transactions.find((transaction) => /scotiabank transit/i.test(transaction.description));
    const wise = result.transactions.filter((transaction) => /wise canada/i.test(transaction.description));
    expect(payment?.isExcluded).toBe(true);
    expect(credit?.isExcluded).toBe(true);
    expect(payment?.transferPairId).toBeTruthy();
    expect(payment?.transferPairId).toBe(credit?.transferPairId);
    expect(wise.every((transaction) => !transaction.isExcluded)).toBe(true);
    expect(wise.every((transaction) => transaction.category === "Brazil debt payments")).toBe(true);
  });
});
