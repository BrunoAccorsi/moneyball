import { parseCsvRows } from "./csv";
import { neoCreditCsvStrategy } from "./strategies/neo-credit-csv";
import { neoEverydayPdfStrategy } from "./strategies/neo-everyday-pdf";
import { scotiaChequingCsvStrategy } from "./strategies/scotia-chequing-csv";
import { scotiaCreditCsvStrategy } from "./strategies/scotia-credit-csv";
import type {
	ImportInput,
	ImportParseResult,
	ImportStrategy,
	ParsedTransaction,
} from "./types";

export const importStrategies: ImportStrategy[] = [
	scotiaCreditCsvStrategy,
	scotiaChequingCsvStrategy,
	neoCreditCsvStrategy,
	neoEverydayPdfStrategy,
];

function looksLikePdf(input: ImportInput): boolean {
	if (input.filename.toLowerCase().endsWith(".pdf")) return true;
	if (input.text.startsWith("%PDF")) return true;
	return Boolean(input.bytes && input.bytes[0] === 0x25);
}

export function detectImportStrategy(
	input: ImportInput,
): ImportStrategy | null {
	const headers = looksLikePdf(input) ? [] : parseCsvRows(input.text).headers;

	for (const strategy of importStrategies) {
		if (strategy.canParse({ ...input, headers })) {
			return strategy;
		}
	}

	return null;
}

function normalizeParse(
	strategy: ImportStrategy,
	raw: ParsedTransaction[] | ImportParseResult,
): {
	transactions: ParsedTransaction[];
	accountName: string;
	accountKind: "credit" | "chequing" | "everyday";
} {
	if (Array.isArray(raw)) {
		return {
			transactions: raw,
			accountName: strategy.accountHint.name,
			accountKind: strategy.accountHint.kind,
		};
	}
	return {
		transactions: raw.transactions,
		accountName: raw.accountName ?? strategy.accountHint.name,
		accountKind: raw.accountKind ?? strategy.accountHint.kind,
	};
}

export async function importWithAutoDetect(input: ImportInput): Promise<{
	strategy: ImportStrategy;
	transactions: ParsedTransaction[];
	accountName: string;
	accountKind: "credit" | "chequing" | "everyday";
}> {
	const strategy = detectImportStrategy(input);
	if (!strategy) {
		throw new Error(
			`No import strategy matched file "${input.filename}". Known sources: ${importStrategies.map((s) => s.label).join(", ")}.`,
		);
	}

	const parsed = normalizeParse(strategy, await strategy.parse(input));
	return { strategy, ...parsed };
}

export function dedupeParsedTransactions(transactions: ParsedTransaction[]): {
	unique: ParsedTransaction[];
	duplicateCount: number;
} {
	const seen = new Set<string>();
	const unique: ParsedTransaction[] = [];
	let duplicateCount = 0;

	for (const tx of transactions) {
		if (seen.has(tx.fingerprint)) {
			duplicateCount += 1;
			continue;
		}
		seen.add(tx.fingerprint);
		unique.push(tx);
	}

	return { unique, duplicateCount };
}
