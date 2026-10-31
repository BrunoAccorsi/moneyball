import { describe, expect, it } from "vitest";
import { pdfPayloadToParseResult } from "../src/domain/pdf";

describe("PDF payload", () => {
  it("drops rows when the layout parser is still a stub", () => {
    const result = pdfPayloadToParseResult({
      source: "neo_everyday",
      accountKey: "neo_everyday",
      accountName: "Neo Everyday",
      institution: "Neo",
      accountKind: "chequing",
      implemented: false,
      warnings: ["TODO: layout unknown"],
      transactions: [
        {
          date: "2026-10-14",
          postedDate: null,
          description: "Transfer from NEO FINANCIAL T",
          amountCents: 242023,
          status: null,
        },
      ],
    });
    expect(result.implemented).toBe(false);
    expect(result.transactions).toEqual([]);
    expect(result.warnings[0]).toMatch(/TODO/);
  });

  it("keeps rows once a parser marks itself implemented", () => {
    const result = pdfPayloadToParseResult({
      source: "neo_everyday",
      accountKey: "neo_everyday",
      accountName: "Neo Everyday",
      institution: "Neo",
      accountKind: "chequing",
      implemented: true,
      warnings: [],
      transactions: [
        {
          date: "2026-10-01",
          postedDate: null,
          description: "Rent 700 Shawnee",
          amountCents: -195000,
          status: null,
        },
      ],
    });
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].amountCents).toBe(-195000);
    expect(result.transactions[0].accountKey).toBe("neo_everyday");
  });
});
