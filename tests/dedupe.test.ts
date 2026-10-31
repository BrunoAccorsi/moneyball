import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { createHash } from "crypto";
import { assignOccurrences, fingerprintOf } from "../src/domain/dedupe";
import { ingest } from "../src/domain/ingest";
import { detectAndParse } from "../src/domain/parsers";
import { allSeedRules } from "../src/domain/seed-rules";

const content = readFileSync(path.join(process.cwd(), "fixtures/october/neo-credit-secondary.csv"), "utf8");

function file(name: string, body: string) {
  return {
    fileName: name,
    sha256: createHash("sha256").update(body).digest("hex"),
    parsed: detectAndParse(body, name),
  };
}

describe("dedupe", () => {
  it("keeps two identical rows in a single file", () => {
    const incoming = [
      { accountKey: "a", date: "2026-10-01", amountCents: -100, description: "Cafe" },
      { accountKey: "a", date: "2026-10-01", amountCents: -100, description: "Cafe" },
    ];
    const assigned = assignOccurrences(incoming, (item) => fingerprintOf(item), new Map());
    expect(assigned.map((item) => item.skip)).toEqual([false, false]);
    expect(assigned.map((item) => item.occurrence)).toEqual([0, 1]);
  });

  it("skips an exact file on the second import and keeps a new overlapping row", () => {
    const first = ingest({
      files: [file("neo.csv", content)],
      existingFileHashes: new Set(),
      existing: [],
      rules: allSeedRules(),
    });
    expect(first.newIds.length).toBe(first.transactions.length);
    expect(first.transactions.length).toBeGreaterThan(0);

    const again = ingest({
      files: [file("neo.csv", content)],
      existingFileHashes: new Set([file("neo.csv", content).sha256]),
      existing: first.transactions,
      rules: allSeedRules(),
    });
    expect(again.skippedFiles).toHaveLength(1);
    expect(again.newIds).toHaveLength(0);

    const extra = `${content.trim()}\n2026-10-31,2026-10-31,Posted,ENMAX ENERGY           CALGARY       CAN,-12.00\n`;
    const overlap = ingest({
      files: [file("neo-overlap.csv", extra)],
      existingFileHashes: new Set(),
      existing: first.transactions,
      rules: allSeedRules(),
    });
    expect(overlap.newIds).toHaveLength(1);
    const added = overlap.transactions.find((transaction) => overlap.newIds.includes(transaction.id));
    expect(added?.amountCents).toBe(-1200);
    expect(added?.description).toMatch(/ENMAX/i);
  });

  it("does not collapse the two Amazon Channels charges", () => {
    const main = readFileSync(path.join(process.cwd(), "fixtures/october/neo-credit-main.csv"), "utf8");
    const result = ingest({
      files: [file("main.csv", main)],
      existingFileHashes: new Set(),
      existing: [],
      rules: allSeedRules(),
    });
    const channels = result.transactions.filter((transaction) => /amazon channels/i.test(transaction.description));
    expect(channels.map((transaction) => transaction.amountCents).sort((a, b) => a - b)).toEqual([-1574, -1259]);
  });
});
