import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	dedupeParsedTransactions,
	detectImportStrategy,
	importWithAutoDetect,
} from "../registry";
import {
	neoEverydayPdfStrategy,
	parseNeoStatementText,
} from "../strategies/neo-everyday-pdf";

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

	it("parses Neo credit spending as negative amounts", async () => {
		const { transactions } = await importWithAutoDetect({
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

	it("normalizes Scotia credit Debit purchases to outflows", async () => {
		const { transactions } = await importWithAutoDetect({
			filename: "scotia-credit.csv",
			text: load("scotia-credit.csv"),
		});
		const apple = transactions.find((tx) =>
			tx.description.toLowerCase().includes("apple.com/bill"),
		);
		expect(apple?.amountCents).toBeLessThan(0);
	});

	it("dedupes identical fingerprints within a batch", async () => {
		const { transactions } = await importWithAutoDetect({
			filename: "neo-credit-small.csv",
			text: load("neo-credit-small.csv"),
		});
		const doubled = [...transactions, ...transactions];
		const { unique, duplicateCount } = dedupeParsedTransactions(doubled);
		expect(unique).toHaveLength(transactions.length);
		expect(duplicateCount).toBe(transactions.length);
	});

	it("parses a Neo Chequing statement, including signed debits", () => {
		const text = [
			"Neo Chequing",
			"Sep 23, 2026 - Sep 30, 2026",
			"Date Description Credits Debits Balance",
			"Sep 23 Sep 23 Transfer from Everyday Spending 10,012.35 10,012.35",
			"Sep 25 Sep 25 Transfer to Savings -10,012.35 0.00",
			"Sep 28 Sep 28 Transfer from NEO FINANCIAL T 2,420.23 12,428.08",
		].join("\n");

		const result = parseNeoStatementText(text);
		expect(result.accountName).toBe("Neo Chequing");
		expect(result.transactions).toHaveLength(3);
		expect(result.transactions[0]?.amountCents).toBe(1_001_235);
		expect(result.transactions[1]?.amountCents).toBe(-1_001_235);
		expect(result.transactions[1]?.transactionDate).toBe("2026-09-25");
		expect(result.transactions[2]?.description).toContain("NEO FINANCIAL");
	});

	it("reads that statement layout back out of a PDF", async () => {
		const { PDFDocument, StandardFonts } = await import("pdf-lib");
		const doc = await PDFDocument.create();
		const page = doc.addPage([700, 800]);
		const font = await doc.embedFont(StandardFonts.Helvetica);
		const lines = [
			"Neo Chequing",
			"Sep 23, 2026 - Sep 30, 2026",
			"Date Description Credits Debits Balance",
			"Sep 25 Sep 25 Transfer to Telus Mobility -54.50 -54.50",
			"Sep 30 Sep 30 Interac e-transfer sent from Paula 102.50 12,130.58",
		];
		let y = 740;
		for (const line of lines) {
			page.drawText(line, { x: 40, y, size: 11, font });
			y -= 22;
		}
		const bytes = await doc.save();
		const parsed = await neoEverydayPdfStrategy.parse({
			filename: "statement.pdf",
			text: "",
			bytes,
		});
		const transactions = Array.isArray(parsed) ? parsed : parsed.transactions;
		expect(transactions.map((tx) => tx.amountCents)).toEqual([-5450, 10250]);
	});
});
