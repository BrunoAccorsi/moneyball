import { eq } from "drizzle-orm";
import { db } from "#/db";
import {
	aiReviews,
	budgetSettings,
	categories,
	transactions,
} from "#/db/schema";
import {
	type AiInsightsProvider,
	cursorApiKey,
	NullAiInsightsProvider,
} from "#/domain/insights/ai";
import { DEFAULT_REVIEW_MODEL } from "#/domain/insights/cloud-agent";
import { buildMonthOverview } from "#/domain/insights/overview";
import {
	parseMonthlyReview,
	type ReviewStatus,
	toReviewContext,
} from "#/domain/insights/review";
import { calendarDate } from "#/lib/format";

async function loadRows() {
	const rows = await db
		.select({
			amountCents: transactions.amountCents,
			merchant: transactions.merchant,
			transactionDate: transactions.transactionDate,
			excludedFromBudget: transactions.excludedFromBudget,
			categoryName: categories.name,
			categorySlug: categories.slug,
			isTransfer: categories.isTransfer,
		})
		.from(transactions)
		.leftJoin(categories, eq(transactions.categoryId, categories.id));

	return rows.map((row) => ({
		amountCents: row.amountCents,
		merchant: row.merchant,
		transactionDate: row.transactionDate,
		excludedFromBudget: row.excludedFromBudget,
		categoryName: row.categoryName,
		categorySlug: row.categorySlug,
		isTransfer: row.isTransfer,
	}));
}

function postgresCode(error: unknown): string | undefined {
	let current: unknown = error;
	for (
		let depth = 0;
		depth < 5 && current && typeof current === "object";
		depth += 1
	) {
		if ("code" in current && typeof current.code === "string")
			return current.code;
		current = "cause" in current ? current.cause : undefined;
	}
	return undefined;
}

export async function getSavingsTargetCents(): Promise<number> {
	try {
		const [row] = await db
			.select()
			.from(budgetSettings)
			.where(eq(budgetSettings.id, 1))
			.limit(1);
		return row?.monthlySavingsTargetCents ?? 0;
	} catch (error) {
		if (postgresCode(error) === "42P01") return 0;
		throw error;
	}
}

export async function setSavingsTargetCents(targetCents: number) {
	await db
		.insert(budgetSettings)
		.values({ id: 1, monthlySavingsTargetCents: targetCents })
		.onConflictDoUpdate({
			target: budgetSettings.id,
			set: {
				monthlySavingsTargetCents: targetCents,
				updatedAt: new Date(),
			},
		});
}

export async function getMonthOverview(month: string) {
	const [rows, savingsTargetCents] = await Promise.all([
		loadRows(),
		getSavingsTargetCents(),
	]);
	return buildMonthOverview(rows, month, {
		asOfDate: calendarDate(),
		savingsTargetCents,
	});
}

async function createAiInsightsProvider(): Promise<AiInsightsProvider> {
	const apiKey = cursorApiKey();
	if (!apiKey) return new NullAiInsightsProvider();
	const { CursorSdkAiInsightsProvider } = await import("./cursor-sdk-insights");
	return new CursorSdkAiInsightsProvider(apiKey);
}

function cachedStatus(row: {
	payload: unknown;
	model: string;
	createdAt: Date;
}): ReviewStatus {
	const review = parseMonthlyReview(JSON.stringify(row.payload));
	return {
		state: "ready",
		review,
		model: row.model,
		generatedAt: row.createdAt.toISOString(),
	};
}

export async function getMonthlyReview(month: string): Promise<ReviewStatus> {
	if (!cursorApiKey()) return { state: "unconfigured" };
	let row: { payload: unknown; model: string; createdAt: Date } | undefined;
	try {
		const [found] = await db
			.select()
			.from(aiReviews)
			.where(eq(aiReviews.month, month))
			.limit(1);
		row = found;
	} catch (error) {
		if (postgresCode(error) === "42P01") return { state: "missing" };
		throw error;
	}
	if (!row) return { state: "missing" };
	try {
		return cachedStatus(row);
	} catch {
		return { state: "missing" };
	}
}

const inflight = new Map<string, Promise<ReviewStatus>>();

async function writeReview(month: string): Promise<ReviewStatus> {
	const provider = await createAiInsightsProvider();
	if (!provider.configured) return { state: "unconfigured" };
	const overview = await getMonthOverview(month);
	const review = await provider.generateReview(toReviewContext(overview));
	const model = provider.modelId ?? DEFAULT_REVIEW_MODEL;
	const createdAt = new Date();
	await db
		.insert(aiReviews)
		.values({ month, payload: review, model, createdAt })
		.onConflictDoUpdate({
			target: aiReviews.month,
			set: { payload: review, model, createdAt },
		});
	return {
		state: "ready",
		review,
		model,
		generatedAt: createdAt.toISOString(),
	};
}

export function regenerateMonthlyReview(month: string): Promise<ReviewStatus> {
	const current = inflight.get(month);
	if (current) return current;
	const promise = writeReview(month).finally(() => {
		inflight.delete(month);
	});
	inflight.set(month, promise);
	return promise;
}
