import { extractText } from "unpdf";
import { dollarsToCents, normalizeWhitespace } from "../../money";
import { buildFingerprint } from "../fingerprint";
import type {
	ImportInput,
	ImportParseResult,
	ImportStrategy,
	ParsedTransaction,
} from "../types";

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

const ROW =
	/^([A-Za-z]{3,9})\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{1,2})\s+(.+)$/;
const AMOUNT = /-?\d{1,3}(?:,\d{3})*\.\d{2}/g;

function monthNumber(name: string): number | null {
	return MONTHS[name.slice(0, 3).toLowerCase()] ?? null;
}

function isoDate(monthName: string, day: string, year: number): string | null {
	const month = monthNumber(monthName);
	if (!month) return null;
	return `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function statementYears(text: string): {
	startYear: number;
	endYear: number;
	startMonth: number;
} {
	const match =
		/([A-Za-z]{3,9})\s+\d{1,2},\s+(\d{4})\s*[-–]\s*([A-Za-z]{3,9})\s+\d{1,2},\s+(\d{4})/.exec(
			text,
		);
	if (!match) {
		const lone = /\b(20\d{2})\b/.exec(text);
		const year = lone ? Number(lone[1]) : new Date().getUTCFullYear();
		return { startYear: year, endYear: year, startMonth: 1 };
	}
	return {
		startYear: Number(match[2]),
		endYear: Number(match[4]),
		startMonth: monthNumber(match[1] ?? "") ?? 1,
	};
}

function yearForMonth(
	month: number,
	period: { startYear: number; endYear: number; startMonth: number },
): number {
	if (period.startYear === period.endYear) return period.startYear;
	return month >= period.startMonth ? period.startYear : period.endYear;
}

function accountFromText(text: string): {
	accountName: string;
	accountKind: "chequing" | "everyday";
} {
	if (/neo chequing/i.test(text)) {
		return { accountName: "Neo Chequing", accountKind: "chequing" };
	}
	return { accountName: "Neo Everyday", accountKind: "everyday" };
}

export function parseNeoStatementText(text: string): ImportParseResult {
	const period = statementYears(text);
	const account = accountFromText(text);
	const transactions: ParsedTransaction[] = [];

	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		const match = ROW.exec(line);
		if (!match) continue;

		const rest = match[5] ?? "";
		const amounts = [...rest.matchAll(AMOUNT)].map((found) => found[0]);
		if (amounts.length < 2) continue;

		const amountToken = amounts[amounts.length - 2] ?? "";
		const amountCents = dollarsToCents(amountToken);
		const description = normalizeWhitespace(
			rest.slice(0, rest.lastIndexOf(amountToken)).replace(AMOUNT, " "),
		);
		if (!description) continue;

		const txnMonth = monthNumber(match[1] ?? "");
		const postedMonth = monthNumber(match[3] ?? "");
		if (!txnMonth || !postedMonth) continue;

		const transactionDate = isoDate(
			match[1] ?? "",
			match[2] ?? "",
			yearForMonth(txnMonth, period),
		);
		const postedDate = isoDate(
			match[3] ?? "",
			match[4] ?? "",
			yearForMonth(postedMonth, period),
		);
		if (!transactionDate || !postedDate) continue;

		transactions.push({
			transactionDate,
			postedDate,
			status: "Posted",
			description,
			merchant: description,
			amountCents,
			sourceId: "neo-everyday-pdf",
			fingerprint: buildFingerprint({
				sourceId: "neo-everyday-pdf",
				transactionDate,
				postedDate,
				description,
				amountCents,
				status: "Posted",
			}),
		});
	}

	return { transactions, ...account };
}

function isPdf(input: ImportInput): boolean {
	if (input.filename.toLowerCase().endsWith(".pdf")) return true;
	if (input.text.startsWith("%PDF")) return true;
	return Boolean(input.bytes && input.bytes[0] === 0x25);
}

async function statementText(input: ImportInput): Promise<string> {
	if (input.bytes?.length) {
		const extracted = await extractText(input.bytes, { mergePages: true });
		return extracted.text;
	}
	return input.text;
}

export const neoEverydayPdfStrategy: ImportStrategy = {
	id: "neo-everyday-pdf",
	label: "Neo statement PDF",
	accountHint: {
		name: "Neo Everyday",
		institution: "Neo Financial",
		kind: "everyday",
	},
	canParse: (input) => isPdf(input),
	parse: async (input) => {
		const text = await statementText(input);
		const result = parseNeoStatementText(text);
		if (result.transactions.length === 0) {
			throw new Error(
				"No transactions found in this PDF. It needs Neo statement rows with a transaction date, posted date, description, and amount.",
			);
		}
		return result;
	},
};
