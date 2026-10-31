import { dollarsToCents, normalizeWhitespace } from "../../money";
import { headersMatch, parseCsvRows } from "../csv";
import { buildFingerprint } from "../fingerprint";
import type { ImportStrategy, ParsedTransaction } from "../types";

const HEADERS = [
	"Filter",
	"Date",
	"Description",
	"Sub-description",
	"Type of Transaction",
	"Amount",
	"Balance",
] as const;

export const scotiaChequingCsvStrategy: ImportStrategy = {
	id: "scotia-chequing-csv",
	label: "Scotiabank chequing CSV",
	accountHint: {
		name: "Scotia Chequing",
		institution: "Scotiabank",
		kind: "chequing",
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
			const status =
				normalizeWhitespace(row["Type of Transaction"] ?? "") || null;
			const amountCents = dollarsToCents(row.Amount ?? "0");
			const merchant = sub || description;

			parsed.push({
				transactionDate,
				postedDate: transactionDate,
				status,
				description: combined,
				merchant,
				amountCents,
				sourceId: "scotia-chequing-csv",
				fingerprint: buildFingerprint({
					sourceId: "scotia-chequing-csv",
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
