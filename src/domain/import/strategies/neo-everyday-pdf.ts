import { extractTextItems } from "unpdf";
import { dollarsToCents, normalizeWhitespace } from "../../money";
import { buildFingerprint } from "../fingerprint";
import type { ImportInput, ImportStrategy, ParsedTransaction } from "../types";

type TextItem = { str: string; x: number; y: number };
type PlacedCell = { text: string; x: number };

const MONTHS: Record<string, number> = {
	jan: 1,
	feb: 2,
	mar: 3,
	apr: 4,
	may: 5,
	jun: 6,
	jul: 7,
	aug: 8,
	sep: 9,
	oct: 10,
	nov: 11,
	dec: 12,
};

function parseDate(value: string): string | null {
	const trimmed = value.trim();
	const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

	const monthFirst = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(trimmed);
	if (monthFirst) {
		const month = MONTHS[monthFirst[1]?.slice(0, 3).toLowerCase() ?? ""];
		if (!month) return null;
		return `${monthFirst[3]}-${String(month).padStart(2, "0")}-${String(monthFirst[2]).padStart(2, "0")}`;
	}

	const dayFirst = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(trimmed);
	if (dayFirst) {
		const month = MONTHS[dayFirst[2]?.slice(0, 3).toLowerCase() ?? ""];
		if (!month) return null;
		return `${dayFirst[3]}-${String(month).padStart(2, "0")}-${String(dayFirst[1]).padStart(2, "0")}`;
	}

	return null;
}

function parseMoney(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed || trimmed === "-" || trimmed === "—") return null;
	const negative =
		/^\(.*\)$/.test(trimmed) ||
		trimmed.startsWith("-") ||
		trimmed.endsWith("-");
	const numeric = trimmed.replace(/[$,()\s]/g, "").replace(/-$/, "");
	if (!numeric) return null;
	const amount = Number(numeric);
	if (!Number.isFinite(amount)) return null;
	const cents = dollarsToCents(amount);
	return negative ? -Math.abs(cents) : Math.abs(cents);
}

type ColumnRole =
	| "date"
	| "description"
	| "out"
	| "in"
	| "amount"
	| "balance"
	| "ignore";

function columnRole(header: string): ColumnRole {
	const value = header.toLowerCase();
	if (value.includes("balance")) return "balance";
	if (value.includes("date")) return "date";
	if (
		value.includes("money out") ||
		value.includes("withdrawal") ||
		value.includes("debit")
	) {
		return "out";
	}
	if (
		value.includes("money in") ||
		value.includes("deposit") ||
		value.includes("credit")
	) {
		return "in";
	}
	if (value.includes("amount")) return "amount";
	if (
		value.includes("description") ||
		value.includes("merchant") ||
		value.includes("details")
	) {
		return "description";
	}
	return "ignore";
}

function isHeader(cells: string[]): boolean {
	const joined = cells.join(" ").toLowerCase();
	return (
		joined.includes("date") &&
		(joined.includes("description") ||
			joined.includes("merchant") ||
			joined.includes("money out") ||
			joined.includes("money in"))
	);
}

function groupLines(items: TextItem[]): PlacedCell[][] {
	const sorted = items
		.filter((item) => item.str.trim())
		.sort((a, b) => b.y - a.y || a.x - b.x);
	const lines: { y: number; cells: PlacedCell[] }[] = [];

	for (const item of sorted) {
		const line = lines.find((candidate) => Math.abs(candidate.y - item.y) < 3);
		const cell = { text: item.str.trim(), x: item.x };
		if (line) line.cells.push(cell);
		else lines.push({ y: item.y, cells: [cell] });
	}

	return lines.map((line) => line.cells.sort((a, b) => a.x - b.x));
}

function assignColumns(cells: PlacedCell[], headers: PlacedCell[]): string[] {
	const values = headers.map(() => "");
	for (const cell of cells) {
		let index = 0;
		let distance = Number.POSITIVE_INFINITY;
		headers.forEach((header, headerIndex) => {
			const next = Math.abs(cell.x - header.x);
			if (next < distance) {
				distance = next;
				index = headerIndex;
			}
		});
		values[index] = values[index] ? `${values[index]} ${cell.text}` : cell.text;
	}
	return values;
}

export function transactionsFromLines(
	lines: PlacedCell[][],
): ParsedTransaction[] {
	const headerIndex = lines.findIndex((line) =>
		isHeader(line.map((cell) => cell.text)),
	);
	if (headerIndex < 0) return [];

	const headers = lines[headerIndex] ?? [];
	const roles = headers.map((cell) => columnRole(cell.text));
	const parsed: ParsedTransaction[] = [];
	let current: ParsedTransaction | null = null;

	for (const line of lines.slice(headerIndex + 1)) {
		const values = assignColumns(line, headers);
		const date = values.find((_, index) => roles[index] === "date") ?? "";
		const description = normalizeWhitespace(
			values.filter((_, index) => roles[index] === "description").join(" "),
		);
		const transactionDate = parseDate(date);

		if (!transactionDate) {
			const previous = current;
			if (previous && description && !isHeader(values)) {
				const nextDescription = normalizeWhitespace(
					`${previous.description} ${description}`,
				);
				const updated: ParsedTransaction = {
					transactionDate: previous.transactionDate,
					postedDate: previous.postedDate,
					status: previous.status,
					description: nextDescription,
					merchant: nextDescription,
					amountCents: previous.amountCents,
					sourceId: previous.sourceId,
					fingerprint: buildFingerprint({
						sourceId: "neo-everyday-pdf",
						transactionDate: previous.transactionDate,
						postedDate: previous.postedDate,
						description: nextDescription,
						amountCents: previous.amountCents,
						status: previous.status,
					}),
				};
				current = updated;
				parsed[parsed.length - 1] = updated;
			}
			continue;
		}

		if (/opening balance|closing balance/i.test(description)) continue;

		const outValue = values.find((_, index) => roles[index] === "out");
		const inValue = values.find((_, index) => roles[index] === "in");
		const amountValue = values.find((_, index) => roles[index] === "amount");
		const moneyOut = outValue ? parseMoney(outValue) : null;
		const moneyIn = inValue ? parseMoney(inValue) : null;
		const signed = amountValue ? parseMoney(amountValue) : null;
		const amountCents =
			moneyOut != null
				? -Math.abs(moneyOut)
				: moneyIn != null
					? Math.abs(moneyIn)
					: signed;

		if (amountCents == null || !description) continue;

		current = {
			transactionDate,
			postedDate: transactionDate,
			status: "Posted",
			description,
			merchant: description,
			amountCents,
			sourceId: "neo-everyday-pdf",
			fingerprint: buildFingerprint({
				sourceId: "neo-everyday-pdf",
				transactionDate,
				postedDate: transactionDate,
				description,
				amountCents,
				status: "Posted",
			}),
		};
		parsed.push(current);
	}

	return parsed;
}

async function linesFromPdf(bytes: Uint8Array): Promise<PlacedCell[][]> {
	const extracted = await extractTextItems(bytes);
	const lines: PlacedCell[][] = [];
	for (const page of extracted.items) {
		lines.push(
			...groupLines(
				page.map((item) => ({ str: item.str, x: item.x, y: item.y })),
			),
		);
	}
	return lines;
}

function isPdf(input: ImportInput): boolean {
	if (input.filename.toLowerCase().endsWith(".pdf")) return true;
	if (input.text.startsWith("%PDF")) return true;
	return Boolean(input.bytes && input.bytes[0] === 0x25);
}

export const neoEverydayPdfStrategy: ImportStrategy = {
	id: "neo-everyday-pdf",
	label: "Neo Everyday PDF",
	accountHint: {
		name: "Neo Everyday",
		institution: "Neo Financial",
		kind: "everyday",
	},
	canParse: (input) => isPdf(input),
	parse: async (input) => {
		const lines = input.bytes?.length ? await linesFromPdf(input.bytes) : [];
		const transactions = transactionsFromLines(lines);
		if (transactions.length === 0) {
			throw new Error(
				"No transactions found in this PDF. Use a Neo Everyday statement with a date, description, and money in or money out.",
			);
		}
		return transactions;
	},
};
