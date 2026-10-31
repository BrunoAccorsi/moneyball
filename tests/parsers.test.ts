import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/domain/csv";
import { dollarsToCents } from "../src/domain/format";
import { detectAndParse } from "../src/domain/parsers";
import { isNeoSecondaryCard } from "../src/domain/parsers/neo-credit";

const fixtures = path.join(process.cwd(), "fixtures/october");

function read(name: string): string {
  return readFileSync(path.join(fixtures, name), "utf8");
}

describe("amounts and csv", () => {
  it("reads signed dollar strings as cents", () => {
    expect(dollarsToCents("77.90")).toBe(7790);
    expect(dollarsToCents("-184.34")).toBe(-18434);
    expect(dollarsToCents("4.19")).toBe(419);
    expect(dollarsToCents("(12.00)")).toBe(-1200);
  });

  it("keeps quoted commas inside the Scotia filter preamble", () => {
    const table = parseCsv(read("scotia-chequing.csv"));
    expect(table.headers).toContain("Balance");
    expect(table.rows[0].Date).toBe("2026-10-28");
    expect(table.rows[0].Description).toBe("crd. card bill payment");
    expect(table.rows).toHaveLength(5);
  });
});

describe("source detection", () => {
  it("identifies each October file", () => {
    const main = detectAndParse(read("neo-credit-main.csv"), "neo-credit-main.csv");
    const secondary = detectAndParse(read("neo-credit-secondary.csv"), "neo-credit-secondary.csv");
    const chequing = detectAndParse(read("scotia-chequing.csv"), "scotia-chequing.csv");
    const card = detectAndParse(read("scotia-card-8024.csv"), "scotia-card-8024.csv");

    expect(main.source).toBe("neo_credit");
    expect(main.accountKey).toBe("neo_credit_main");
    expect(secondary.source).toBe("neo_credit");
    expect(secondary.accountKey).toBe("neo_credit_secondary");
    expect(secondary.warnings[0]).toMatch(/no card number/i);
    expect(chequing.source).toBe("scotia_chequing");
    expect(chequing.accountKey).toBe("scotia_chequing");
    expect(card.source).toBe("scotia_card");
    expect(card.accountKey).toBe("scotia_card_8024");
    expect(card.accountName).toContain("8024");
  });

  it("flips Scotiabank card signs so purchases are outflows", () => {
    const card = detectAndParse(read("scotia-card-8024.csv"), "scotia-card-8024.csv");
    const apple = card.transactions.find((transaction) => /apple\.com\/bill/i.test(transaction.description));
    const payment = card.transactions.find((transaction) => /scotiabank transit/i.test(transaction.description));
    expect(apple?.amountCents).toBe(-419);
    expect(payment?.amountCents).toBe(18434);
  });

  it("keeps Neo and chequing signs as cash flow", () => {
    const neo = detectAndParse(read("neo-credit-secondary.csv"), "neo-credit-secondary.csv");
    const enmax = neo.transactions.find((transaction) => /enmax/i.test(transaction.description));
    expect(enmax?.amountCents).toBe(-7790);
    const chequing = detectAndParse(read("scotia-chequing.csv"), "scotia-chequing.csv");
    const wise = chequing.transactions.filter((transaction) => /wise canada/i.test(transaction.description));
    expect(wise.map((transaction) => transaction.amountCents).sort((a, b) => a - b)).toEqual([-30000, -23000]);
  });

  it("does not call the main card secondary just because a file contains Disney", () => {
    expect(isNeoSecondaryCard(["DISNEY PLUS", "WESTJET CALGARY"])).toBe(false);
    expect(isNeoSecondaryCard(["ENMAX ENERGY", "Kindle Unltd", "Payment Received - Thank you"])).toBe(true);
  });

  it("joins Scotia sub-descriptions into the description", () => {
    const chequing = detectAndParse(read("scotia-chequing.csv"), "scotia-chequing.csv");
    expect(chequing.transactions.some((transaction) => transaction.description === "miscellaneous payment · Wise Canada")).toBe(
      true,
    );
  });
});
