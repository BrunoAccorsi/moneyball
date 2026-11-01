import Papa from "papaparse";
import { normalizeWhitespace } from "../money";

export function parseCsvRows(text: string): {
	headers: string[];
	rows: Record<string, string>[];
} {
	const cleaned = text.replace(/^\uFEFF/, "");
	const result = Papa.parse<Record<string, string>>(cleaned, {
		header: true,
		skipEmptyLines: true,
		transformHeader: (header) => normalizeWhitespace(header),
	});

	if (result.errors.length > 0) {
		const fatal = result.errors.find((error) => error.type === "FieldMismatch");
		if (fatal) {
			throw new Error(`CSV parse failed: ${fatal.message}`);
		}
	}

	const headers = (result.meta.fields ?? []).map((field) =>
		normalizeWhitespace(field),
	);
	const rows = result.data.map((row) => {
		const next: Record<string, string> = {};
		for (const [key, value] of Object.entries(row)) {
			next[normalizeWhitespace(key)] = typeof value === "string" ? value : "";
		}
		return next;
	});

	return { headers, rows };
}

export function headersMatch(
	actual: string[],
	expected: readonly string[],
): boolean {
	if (actual.length < expected.length) return false;
	return expected.every((header, index) => actual[index] === header);
}
