import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "#/db";
import { categories, transactions } from "#/db/schema";
import {
	createAiInsightsProvider,
	type InsightContext,
} from "#/domain/insights/ai";

function monthBounds(month: string) {
	const start = `${month}-01`;
	const [year, monthNumber] = month.split("-").map(Number);
	const endDate = new Date(Date.UTC(year, monthNumber, 0));
	const end = endDate.toISOString().slice(0, 10);
	return { start, end };
}

export async function getInsights(month: string) {
	const { start, end } = monthBounds(month);

	const rows = await db
		.select({
			amountCents: transactions.amountCents,
			merchant: transactions.merchant,
			transactionDate: transactions.transactionDate,
			excludedFromBudget: transactions.excludedFromBudget,
			categoryId: transactions.categoryId,
			categoryName: categories.name,
			isIncome: categories.isIncome,
			isTransfer: categories.isTransfer,
		})
		.from(transactions)
		.leftJoin(categories, eq(transactions.categoryId, categories.id))
		.where(
			and(
				gte(transactions.transactionDate, start),
				lte(transactions.transactionDate, end),
			),
		);

	const spendingRows = rows.filter(
		(row) => !row.excludedFromBudget && !row.isTransfer && row.amountCents < 0,
	);
	const incomeRows = rows.filter(
		(row) => row.isIncome || (!row.isTransfer && row.amountCents > 0),
	);

	const totalSpendingCents = spendingRows.reduce(
		(sum, row) => sum + Math.abs(row.amountCents),
		0,
	);
	const totalIncomeCents = incomeRows.reduce(
		(sum, row) => sum + Math.abs(row.amountCents),
		0,
	);
	const moneyOutCents = rows
		.filter((row) => row.amountCents < 0 && !row.isTransfer)
		.reduce((sum, row) => sum + Math.abs(row.amountCents), 0);
	const moneyInCents = rows
		.filter((row) => row.amountCents > 0 && !row.isTransfer)
		.reduce((sum, row) => sum + row.amountCents, 0);

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
		byMerchant.set(
			row.merchant,
			(byMerchant.get(row.merchant) ?? 0) + Math.abs(row.amountCents),
		);
	}

	const monthly = await db
		.select({
			month: sql<string>`substr(${transactions.transactionDate}, 1, 7)`,
			spendingCents: sql<number>`coalesce(sum(case when ${transactions.amountCents} < 0 and ${transactions.excludedFromBudget} = false then abs(${transactions.amountCents}) else 0 end), 0)`,
			incomeCents: sql<number>`coalesce(sum(case when ${transactions.amountCents} > 0 and ${transactions.excludedFromBudget} = false then ${transactions.amountCents} else 0 end), 0)`,
			outCents: sql<number>`coalesce(sum(case when ${transactions.amountCents} < 0 then abs(${transactions.amountCents}) else 0 end), 0)`,
			inCents: sql<number>`coalesce(sum(case when ${transactions.amountCents} > 0 then ${transactions.amountCents} else 0 end), 0)`,
		})
		.from(transactions)
		.groupBy(sql`substr(${transactions.transactionDate}, 1, 7)`)
		.orderBy(sql`substr(${transactions.transactionDate}, 1, 7)`);

	const topCategories = [...byCategory.entries()]
		.map(([name, amountCents]) => ({ name, amountCents }))
		.sort((a, b) => b.amountCents - a.amountCents)
		.slice(0, 8);

	const topMerchants = [...byMerchant.entries()]
		.map(([name, amountCents]) => ({ name, amountCents }))
		.sort((a, b) => b.amountCents - a.amountCents)
		.slice(0, 8);

	const currentIndex = monthly.findIndex((row) => row.month === month);
	const previous = currentIndex > 0 ? monthly[currentIndex - 1] : null;
	const monthOverMonthChangePct =
		previous && previous.spendingCents > 0
			? ((totalSpendingCents - Number(previous.spendingCents)) /
					Number(previous.spendingCents)) *
				100
			: null;

	const context: InsightContext = {
		month,
		totalSpendingCents,
		totalIncomeCents,
		topCategories,
		topMerchants,
		monthOverMonthChangePct,
	};

	const ai = createAiInsightsProvider();
	const aiInsights = ai.enabled ? await ai.generate(context) : [];

	return {
		month,
		totalSpendingCents,
		totalIncomeCents,
		moneyInCents,
		moneyOutCents,
		netCashFlowCents: moneyInCents - moneyOutCents,
		topCategories,
		topMerchants,
		monthly: monthly.map((row) => ({
			month: row.month,
			spendingCents: Number(row.spendingCents),
			incomeCents: Number(row.incomeCents),
			inCents: Number(row.inCents),
			outCents: Number(row.outCents),
		})),
		monthOverMonthChangePct,
		aiInsights,
		aiProvider: { id: ai.id, enabled: ai.enabled },
	};
}
