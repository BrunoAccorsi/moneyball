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

	it("reads a Neo Everyday PDF statement", async () => {
		const { PDFDocument, StandardFonts } = await import("pdf-lib");
		const doc = await PDFDocument.create();
		const page = doc.addPage([700, 800]);
		const font = await doc.embedFont(StandardFonts.Helvetica);
		const rows = [
			["Date", "Description", "Money out", "Money in", "Balance"],
			["Oct 5, 2026", "Wise Canada", "$300.00", "", "$900.00"],
			[
				"Oct 13, 2026",
				"Transfer from NEO FINANCIAL T",
				"",
				"$2,420.23",
				"$3,320.23",
			],
			["Oct 31, 2026", "Tim Hortons", "$14.35", "", "$3,305.88"],
		];
		const xs = [48, 160, 380, 470, 560];
		let y = 700;
		page.drawText("Neo Everyday", { x: 48, y: 750, size: 16, font });
		for (const row of rows) {
			row.forEach((cell, index) => {
				if (!cell) return;
				page.drawText(cell, { x: xs[index] ?? 48, y, size: 11, font });
			});
			y -= 24;
		}

		const bytes = await doc.save();
		expect(
			neoEverydayPdfStrategy.canParse({
				filename: "statement.pdf",
				text: "",
				bytes,
				headers: [],
			}),
		).toBe(true);

		const transactions = await neoEverydayPdfStrategy.parse({
			filename: "statement.pdf",
			text: "",
			bytes,
		});
		const wise = transactions.find((tx) => tx.description.includes("Wise"));
		const pay = transactions.find((tx) =>
			tx.description.includes("NEO FINANCIAL"),
		);
		expect(wise?.amountCents).toBe(-30000);
		expect(pay?.amountCents).toBe(242023);
		expect(transactions).toHaveLength(3);
	});
});
