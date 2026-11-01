import Fuse from "fuse.js";

export type SearchableTransaction = {
	id: number;
	merchant: string;
	description: string;
	categoryName: string | null;
	accountName: string | null;
	transactionDate: string;
	amountCents: number;
};

export type TransactionFilters = {
	query: string;
	merchant?: string;
	category?: string;
	account?: string;
	from?: string;
	to?: string;
	minAmountCents?: number;
	maxAmountCents?: number;
};

export function filterTransactions(
	rows: SearchableTransaction[],
	filters: TransactionFilters,
): SearchableTransaction[] {
	let result = rows;

	if (filters.merchant) {
		const needle = filters.merchant.toLowerCase();
		result = result.filter((row) =>
			row.merchant.toLowerCase().includes(needle),
		);
	}
	if (filters.category) {
		const needle = filters.category.toLowerCase();
		result = result.filter((row) =>
			(row.categoryName ?? "uncategorized").toLowerCase().includes(needle),
		);
	}
	if (filters.account) {
		const needle = filters.account.toLowerCase();
		result = result.filter((row) =>
			(row.accountName ?? "").toLowerCase().includes(needle),
		);
	}

	const { from, to, minAmountCents, maxAmountCents } = filters;
	if (from) {
		result = result.filter((row) => row.transactionDate >= from);
	}
	if (to) {
		result = result.filter((row) => row.transactionDate <= to);
	}
	if (minAmountCents !== undefined) {
		result = result.filter(
			(row) => Math.abs(row.amountCents) >= minAmountCents,
		);
	}
	if (maxAmountCents !== undefined) {
		result = result.filter(
			(row) => Math.abs(row.amountCents) <= maxAmountCents,
		);
	}

	const query = filters.query.trim();
	if (!query) return result;

	const fuse = new Fuse(result, {
		keys: ["merchant", "description", "categoryName", "accountName"],
		threshold: 0.35,
		ignoreLocation: true,
	});

	return fuse.search(query).map((hit) => hit.item);
}
