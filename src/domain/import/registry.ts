import { parseCsvRows } from "./csv";
import { neoCreditCsvStrategy } from "./strategies/neo-credit-csv";
import { neoEverydayPdfStrategy } from "./strategies/neo-everyday-pdf";
import { scotiaChequingCsvStrategy } from "./strategies/scotia-chequing-csv";
import { scotiaCreditCsvStrategy } from "./strategies/scotia-credit-csv";
import type { ImportInput, ImportStrategy, ParsedTransaction } from "./types";

export const importStrategies: ImportStrategy[] = [
	scotiaCreditCsvStrategy,
	scotiaChequingCsvStrategy,
	neoCreditCsvStrategy,
	neoEverydayPdfStrategy,
];

export function detectImportStrategy(
	input: ImportInput,
): ImportStrategy | null {
	const headers = input.filename.toLowerCase().endsWith(".pdf")
		? []
		: parseCsvRows(input.text).headers;

	for (const strategy of importStrategies) {
		if (strategy.canParse({ ...input, headers })) {
			return strategy;
		}
	}

	return null;
}

export function importWithAutoDetect(input: ImportInput): {
	strategy: ImportStrategy;
	transactions: ParsedTransaction[];
} {
	const strategy = detectImportStrategy(input);
	if (!strategy) {
		throw new Error(
			`No import strategy matched file "${input.filename}". Known sources: ${importStrategies.map((s) => s.label).join(", ")}.`,
		);
	}

	return {
		strategy,
		transactions: strategy.parse(input),
	};
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
