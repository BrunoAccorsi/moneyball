import { displayMerchant } from "../display";

export type InsightSourceRow = {
	amountCents: number;
	merchant: string;
	transactionDate: string;
	excludedFromBudget: boolean;
	categoryName: string | null;
	isTransfer: boolean | null;
};

export type MonthlyPoint = {
	month: string;
	spendingCents: number;
	inCents: number;
	outCents: number;
};

function countsInBudget(row: InsightSourceRow): boolean {
	return !row.excludedFromBudget && !row.isTransfer;
}

function monthKey(date: string): string {
	return date.slice(0, 7);
}

export function buildInsights(rows: InsightSourceRow[], month: string) {
	const monthRows = rows.filter(
		(row) => monthKey(row.transactionDate) === month,
	);
	const spendingRows = monthRows.filter(
		(row) => countsInBudget(row) && row.amountCents < 0,
	);
	const inflowRows = monthRows.filter(
		(row) => countsInBudget(row) && row.amountCents > 0,
	);

	const totalSpendingCents = spendingRows.reduce(
		(sum, row) => sum + Math.abs(row.amountCents),
		0,
	);
	const moneyInCents = inflowRows.reduce(
		(sum, row) => sum + row.amountCents,
		0,
	);
	const moneyOutCents = totalSpendingCents;

	const byCategory = new Map<string, number>();
	for (const row of spendingRows) {
		const name = row.categoryName ?? "Uncategorized";
		byCategory.set(
			name,
			(byCategory.get(name) ?? 0) + Math.abs(row.amountCents),
		);
	}

	const byMerchant = new Map<string, number>();
	for (const row of spendingRows) {
		const name = displayMerchant(row.merchant);
		byMerchant.set(
			name,
			(byMerchant.get(name) ?? 0) + Math.abs(row.amountCents),
		);
	}

	const monthlyMap = new Map<string, MonthlyPoint>();
	for (const row of rows) {
		if (!countsInBudget(row)) continue;
		const key = monthKey(row.transactionDate);
		const point = monthlyMap.get(key) ?? {
			month: key,
			spendingCents: 0,
			inCents: 0,
			outCents: 0,
		};
		if (row.amountCents < 0) {
			const abs = Math.abs(row.amountCents);
			point.spendingCents += abs;
			point.outCents += abs;
		} else if (row.amountCents > 0) {
			point.inCents += row.amountCents;
		}
		monthlyMap.set(key, point);
	}

	const monthly = [...monthlyMap.values()].sort((a, b) =>
		a.month.localeCompare(b.month),
	);
	const currentIndex = monthly.findIndex((point) => point.month === month);
	const previous = currentIndex > 0 ? monthly[currentIndex - 1] : null;
	const monthOverMonthChangePct =
		previous && previous.spendingCents > 0
			? ((totalSpendingCents - previous.spendingCents) /
					previous.spendingCents) *
				100
			: null;

	const topCategories = [...byCategory.entries()]
		.map(([name, amountCents]) => ({ name, amountCents }))
		.sort((a, b) => b.amountCents - a.amountCents)
		.slice(0, 8);

	const topMerchants = [...byMerchant.entries()]
		.map(([name, amountCents]) => ({ name, amountCents }))
		.sort((a, b) => b.amountCents - a.amountCents)
		.slice(0, 8);

	return {
		month,
		totalSpendingCents,
		moneyInCents,
		moneyOutCents,
		netCashFlowCents: moneyInCents - moneyOutCents,
		topCategories,
		topMerchants,
		monthly,
		monthOverMonthChangePct,
	};
}
