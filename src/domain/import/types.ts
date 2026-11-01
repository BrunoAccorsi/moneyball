export const IMPORT_SOURCE_IDS = [
	"neo-credit-csv",
	"scotia-chequing-csv",
	"scotia-credit-csv",
	"neo-everyday-pdf",
] as const;

export type ImportSourceId = (typeof IMPORT_SOURCE_IDS)[number];

export type ParsedTransaction = {
	transactionDate: string;
	postedDate: string | null;
	status: string | null;
	description: string;
	merchant: string;
	amountCents: number;
	sourceId: ImportSourceId;
	fingerprint: string;
};

export type ImportInput = {
	filename: string;
	text: string;
	bytes?: Uint8Array;
};

export type ImportParseResult = {
	transactions: ParsedTransaction[];
	accountName?: string;
	accountKind?: "credit" | "chequing" | "everyday";
};

export type ImportStrategy = {
	readonly id: ImportSourceId;
	readonly label: string;
	readonly accountHint: {
		name: string;
		institution: string;
		kind: "credit" | "chequing" | "everyday";
	};
	canParse: (input: ImportInput & { headers: string[] }) => boolean;
	parse: (
		input: ImportInput,
	) =>
		| ParsedTransaction[]
		| ImportParseResult
		| Promise<ParsedTransaction[] | ImportParseResult>;
};
