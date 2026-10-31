import { dollarsToCents, normalizeWhitespace } from "../../money";
import { headersMatch, parseCsvRows } from "../csv";
import { buildFingerprint } from "../fingerprint";
import type { ImportStrategy, ParsedTransaction } from "../types";

const HEADERS = [
	"Transaction Date",
	"Posted Date",
	"Status",
	"Description",
	"Amount",
] as const;

function extractMerchant(description: string): string {
	const trimmed = normalizeWhitespace(description);
	const withoutLocation = trimmed
		.replace(/\s+[A-Z]{2,}\s*$/i, "")
		.replace(/\s+#\d+\s*/g, " ");
	return normalizeWhitespace(withoutLocation) || trimmed;
}

export const neoCreditCsvStrategy: ImportStrategy = {
	id: "neo-credit-csv",
	label: "Neo credit card CSV",
	accountHint: {
		name: "Neo Credit",
		institution: "Neo Financial",
		kind: "credit",
	},
	canParse: ({ headers }) => headersMatch(headers, HEADERS),
	parse: ({ text }) => {
		const { rows } = parseCsvRows(text);
		const parsed: ParsedTransaction[] = [];

		for (const row of rows) {
			const description = normalizeWhitespace(row.Description ?? "");
			if (!description) continue;

			const transactionDate = normalizeWhitespace(
				row["Transaction Date"] ?? "",
			);
			const postedDate = normalizeWhitespace(row["Posted Date"] ?? "") || null;
			const status = normalizeWhitespace(row.Status ?? "") || null;
			const amountCents = dollarsToCents(row.Amount ?? "0");

			parsed.push({
				transactionDate,
				postedDate,
				status,
				description,
				merchant: extractMerchant(description),
				amountCents,
				sourceId: "neo-credit-csv",
				fingerprint: buildFingerprint({
					sourceId: "neo-credit-csv",
					transactionDate,
					postedDate,
					description,
					amountCents,
					status,
				}),
			});
		}

		return parsed;
	},
};
