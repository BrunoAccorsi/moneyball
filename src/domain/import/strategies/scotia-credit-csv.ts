import { dollarsToCents, normalizeWhitespace } from "../../money";
import { headersMatch, parseCsvRows } from "../csv";
import { buildFingerprint } from "../fingerprint";
import type { ImportStrategy, ParsedTransaction } from "../types";

const HEADERS = [
	"Filter",
	"Date",
	"Description",
	"Sub-description",
	"Status",
	"Type of Transaction",
	"Amount",
	"Associated card number",
] as const;

export const scotiaCreditCsvStrategy: ImportStrategy = {
	id: "scotia-credit-csv",
	label: "Scotiabank credit card CSV",
	accountHint: {
		name: "Scotia Credit",
		institution: "Scotiabank",
		kind: "credit",
	},
	canParse: ({ headers }) => headersMatch(headers, HEADERS),
	parse: ({ text }) => {
		const { rows } = parseCsvRows(text);
		const parsed: ParsedTransaction[] = [];

		for (const row of rows) {
			const description = normalizeWhitespace(row.Description ?? "");
			const sub = normalizeWhitespace(row["Sub-description"] ?? "");
			const combined = normalizeWhitespace(
				[description, sub].filter(Boolean).join(" — "),
			);
			if (!combined) continue;

			const transactionDate = normalizeWhitespace(row.Date ?? "");
			const status = normalizeWhitespace(row.Status ?? "") || null;
			const rawCents = dollarsToCents(row.Amount ?? "0");
			const amountCents = -rawCents;
			const merchant = description;

			parsed.push({
				transactionDate,
				postedDate: transactionDate,
				status,
				description: combined,
				merchant,
				amountCents,
				sourceId: "scotia-credit-csv",
				fingerprint: buildFingerprint({
					sourceId: "scotia-credit-csv",
					transactionDate,
					postedDate: transactionDate,
					description: combined,
					amountCents,
					status,
				}),
			});
		}

		return parsed;
	},
};
