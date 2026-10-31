import { z } from "zod";
import type { MonthOverview } from "./overview";

export type MonthlyReview = {
	summary: string;
	patterns: string[];
	anomalies: string[];
	suggestions: string[];
};

export type ReviewStatus =
	| { state: "unconfigured" }
	| { state: "missing" }
	| {
			state: "ready";
			review: MonthlyReview;
			model: string;
			generatedAt: string;
	  };

export type ReviewContext = {
	month: string;
	currency: "CAD";
	income: number;
	spending: number;
	net: number;
	savingsRatePct: number | null;
	savingsTarget: number | null;
	vsLastMonth: {
		income: number | null;
		spending: number | null;
		net: number | null;
	};
	categories: Array<{
		name: string;
		spending: number;
		vsLastMonth: number | null;
		vsThreeMonthAverage: number | null;
	}>;
	topMerchants: Array<{ name: string; spending: number; transactions: number }>;
	recurring: {
		total: number;
		charges: Array<{ name: string; spending: number }>;
	};
	newMerchants: Array<{ name: string; spending: number }>;
	unusualMerchants: Array<{
		name: string;
		spending: number;
		typicalMonth: number;
	}>;
	largestTransactions: Array<{
		merchant: string;
		amount: number;
		category: string;
		date: string;
	}>;
	pace: {
		spentToDate: number;
		projectedMonth: number | null;
		daysElapsed: number;
		daysInMonth: number;
	};
};

const monthlyReviewSchema = z.object({
	summary: z.string().trim().min(1),
	patterns: z.array(z.string().trim().min(1)).min(1).max(6),
	anomalies: z.array(z.string().trim().min(1)).max(6),
	suggestions: z.array(z.string().trim().min(1)).min(2).max(6),
});

function dollars(cents: number): number {
	return Math.round(cents) / 100;
}

function dollarsOrNull(cents: number | null): number | null {
	return cents == null ? null : dollars(cents);
}

export function toReviewContext(overview: MonthOverview): ReviewContext {
	return {
		month: overview.month,
		currency: "CAD",
		income: dollars(overview.kpis.incomeCents),
		spending: dollars(overview.kpis.spendingCents),
		net: dollars(overview.kpis.netCents),
		savingsRatePct:
			overview.kpis.savingsRatePct == null
				? null
				: Math.round(overview.kpis.savingsRatePct * 10) / 10,
		savingsTarget:
			overview.savings.targetCents > 0
				? dollars(overview.savings.targetCents)
				: null,
		vsLastMonth: {
			income: dollarsOrNull(overview.kpis.incomeDeltaCents),
			spending: dollarsOrNull(overview.kpis.spendingDeltaCents),
			net: dollarsOrNull(overview.kpis.netDeltaCents),
		},
		categories: overview.categories.slice(0, 12).map((category) => ({
			name: category.name,
			spending: dollars(category.amountCents),
			vsLastMonth: dollarsOrNull(category.deltaCents),
			vsThreeMonthAverage: dollarsOrNull(category.vsAverageCents),
		})),
		topMerchants: overview.topMerchants.map((merchant) => ({
			name: merchant.name,
			spending: dollars(merchant.amountCents),
			transactions: merchant.count,
		})),
		recurring: {
			total: dollars(overview.recurring.totalCents),
			charges: overview.recurring.charges.map((charge) => ({
				name: charge.merchant,
				spending: dollars(charge.amountCents),
			})),
		},
		newMerchants: overview.newMerchants.map((merchant) => ({
			name: merchant.merchant,
			spending: dollars(merchant.amountCents),
		})),
		unusualMerchants: overview.unusualMerchants.flatMap((merchant) =>
			merchant.typicalCents == null
				? []
				: [
						{
							name: merchant.merchant,
							spending: dollars(merchant.amountCents),
							typicalMonth: dollars(merchant.typicalCents),
						},
					],
		),
		largestTransactions: overview.largestTransactions.map((transaction) => ({
			merchant: transaction.merchant,
			amount: dollars(transaction.amountCents),
			category: transaction.categoryName,
			date: transaction.transactionDate,
		})),
		pace: {
			spentToDate: dollars(overview.pace.spentToDateCents),
			projectedMonth: dollarsOrNull(overview.pace.projectedCents),
			daysElapsed: overview.pace.daysElapsed,
			daysInMonth: overview.pace.daysInMonth,
		},
	};
}

export function buildReviewPrompt(context: ReviewContext): string {
	return [
		"You write a monthly budget review for one household.",
		"Reply with one JSON object and no markdown.",
		'{"summary": string, "patterns": string[], "anomalies": string[], "suggestions": string[]}',
		"summary: 2 or 3 sentences on the month.",
		"patterns: 2 to 4 notable patterns that are visible in the data.",
		"anomalies: up to 3 unusual items, or an empty array when nothing stands out.",
		"suggestions: 2 or 3 concrete ways to save money. Name a category or merchant from the data and a dollar figure grounded in these amounts.",
		"Amounts are Canadian dollars. Do not invent merchants, income, or transactions.",
		"Do not use tools, browse, or edit files.",
		"",
		JSON.stringify(context),
	].join("\n");
}

export function parseMonthlyReview(text: string): MonthlyReview {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start < 0 || end <= start) {
		throw new Error("The review came back in an unexpected shape. Try again.");
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(text.slice(start, end + 1));
	} catch {
		throw new Error("The review came back in an unexpected shape. Try again.");
	}

	const result = monthlyReviewSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error("The review came back in an unexpected shape. Try again.");
	}

	return {
		summary: result.data.summary,
		patterns: result.data.patterns.slice(0, 4),
		anomalies: result.data.anomalies.slice(0, 3),
		suggestions: result.data.suggestions.slice(0, 3),
	};
}
