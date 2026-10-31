import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	dedupeParsedTransactions,
	detectImportStrategy,
	importWithAutoDetect,
} from "../registry";
import { neoEverydayPdfStrategy } from "../strategies/neo-everyday-pdf";

const root = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../../../fixtures",
);

function load(name: string) {
	return readFileSync(join(root, name), "utf8");
}

describe("import strategies", () => {
	it("detects Neo credit CSV from headers", () => {
		const text = load("neo-credit.csv");
		const strategy = detectImportStrategy({
			filename: "neo-credit.csv",
			text,
		});
		expect(strategy?.id).toBe("neo-credit-csv");
	});

	it("detects Scotiabank chequing CSV from headers", () => {
		const text = load("scotia-chequing.csv");
		const strategy = detectImportStrategy({
			filename: "scotia-chequing.csv",
			text,
		});
		expect(strategy?.id).toBe("scotia-chequing-csv");
	});

	it("detects Scotiabank credit CSV from headers", () => {
		const text = load("scotia-credit.csv");
		const strategy = detectImportStrategy({
			filename: "scotia-credit.csv",
			text,
		});
		expect(strategy?.id).toBe("scotia-credit-csv");
	});

	it("parses Neo credit spending as negative amounts", () => {
		const { transactions } = importWithAutoDetect({
			filename: "neo-credit-small.csv",
			text: load("neo-credit-small.csv"),
		});
		const enmax = transactions.find((tx) =>
			tx.description.includes("ENMAX ENERGY"),
		);
		expect(enmax?.amountCents).toBe(-7790);
		const payment = transactions.find((tx) =>
			tx.description.includes("Payment Received"),
		);
		expect(payment?.amountCents).toBe(7790);
	});

	it("normalizes Scotia credit Debit purchases to outflows", () => {
		const { transactions } = importWithAutoDetect({
			filename: "scotia-credit.csv",
			text: load("scotia-credit.csv"),
		});
		const apple = transactions.find((tx) =>
			tx.description.toLowerCase().includes("apple.com/bill"),
		);
		expect(apple?.amountCents).toBeLessThan(0);
	});

	it("dedupes identical fingerprints within a batch", () => {
		const { transactions } = importWithAutoDetect({
			filename: "neo-credit-small.csv",
			text: load("neo-credit-small.csv"),
		});
		const doubled = [...transactions, ...transactions];
		const { unique, duplicateCount } = dedupeParsedTransactions(doubled);
		expect(unique).toHaveLength(transactions.length);
		expect(duplicateCount).toBe(transactions.length);
	});

	it("keeps Neo Everyday PDF as a detectable skeleton", () => {
		expect(
			neoEverydayPdfStrategy.canParse({
				filename: "neo-everyday-oct.pdf",
				text: "%PDF Neo Everyday statement",
				headers: [],
			}),
		).toBe(true);
		expect(() =>
			neoEverydayPdfStrategy.parse({
				filename: "neo-everyday-oct.pdf",
				text: "%PDF",
			}),
		).toThrow(/not implemented/i);
	});
});
