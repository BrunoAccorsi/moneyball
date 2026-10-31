import type { ImportStrategy } from "../types";

/**
 * Skeleton for Neo Everyday PDF statements.
 * Detection is filename/content hint based until a PDF extractor is wired.
 */
export const neoEverydayPdfStrategy: ImportStrategy = {
	id: "neo-everyday-pdf",
	label: "Neo Everyday PDF (skeleton)",
	accountHint: {
		name: "Neo Everyday",
		institution: "Neo Financial",
		kind: "everyday",
	},
	canParse: ({ filename, text }) => {
		const lower = filename.toLowerCase();
		if (!lower.endsWith(".pdf")) return false;
		return /neo|everyday/i.test(filename) || /neo\s+everyday/i.test(text);
	},
	parse: () => {
		throw new Error(
			"Neo Everyday PDF import is not implemented yet. Convert the statement to CSV or wire a PDF extractor.",
		);
	},
};
