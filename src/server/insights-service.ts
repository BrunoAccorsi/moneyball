import { eq } from "drizzle-orm";
import { db } from "#/db";
import { categories, transactions } from "#/db/schema";
import {
	createAiInsightsProvider,
	type InsightContext,
} from "#/domain/insights/ai";
import { buildInsights } from "#/domain/insights/rollup";

export async function getInsights(month: string) {
	const rows = await db
		.select({
			amountCents: transactions.amountCents,
			merchant: transactions.merchant,
			transactionDate: transactions.transactionDate,
			excludedFromBudget: transactions.excludedFromBudget,
			categoryName: categories.name,
			isTransfer: categories.isTransfer,
		})
		.from(transactions)
		.leftJoin(categories, eq(transactions.categoryId, categories.id));

	const rolled = buildInsights(
		rows.map((row) => ({
			amountCents: row.amountCents,
			merchant: row.merchant,
			transactionDate: row.transactionDate,
			excludedFromBudget: row.excludedFromBudget,
			categoryName: row.categoryName,
			isTransfer: row.isTransfer,
		})),
		month,
	);

	const context: InsightContext = {
		month,
		totalSpendingCents: rolled.totalSpendingCents,
		totalIncomeCents: rolled.moneyInCents,
		topCategories: rolled.topCategories,
		topMerchants: rolled.topMerchants,
		monthOverMonthChangePct: rolled.monthOverMonthChangePct,
	};

	const ai = createAiInsightsProvider();
	const aiInsights = ai.enabled ? await ai.generate(context) : [];

	return {
		...rolled,
		aiInsights,
		aiProvider: { id: ai.id, enabled: ai.enabled },
	};
}
