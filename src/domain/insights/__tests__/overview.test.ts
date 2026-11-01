import { describe, expect, it } from "vitest";
import { currentMonth } from "../../../lib/format";
import { buildMonthOverview } from "../overview";
import {
	buildReviewPrompt,
	parseMonthlyReview,
	toReviewContext,
} from "../review";
import type { InsightSourceRow } from "../rollup";

function tx(
	partial: Pick<
		InsightSourceRow,
		"amountCents" | "merchant" | "transactionDate"
	> &
		Partial<InsightSourceRow>,
): InsightSourceRow {
	return {
		excludedFromBudget: false,
		categoryName: "Groceries",
		categorySlug: "groceries",
		isTransfer: false,
		...partial,
	};
}

const options = {
	asOfDate: "2026-10-10",
	savingsTargetCents: 100_000,
};

describe("month overview", () => {
	it("scores income, spending, net, and savings rate without transfers", () => {
		const overview = buildMonthOverview(
			[
				tx({
					amountCents: 200_000,
					merchant: "Transfer from NEO FINANCIAL T",
					transactionDate: "2026-10-15",
					categoryName: "Salary",
					categorySlug: "salary",
				}),
				tx({
					amountCents: -50_000,
					merchant: "SAFEWAY",
					transactionDate: "2026-10-02",
				}),
				tx({
					amountCents: -80_000,
					merchant: "Payment to Credit",
					transactionDate: "2026-10-03",
					excludedFromBudget: true,
					categoryName: "Transfers",
					categorySlug: "transfers",
					isTransfer: true,
				}),
			],
			"2026-10",
			options,
		);

		expect(overview.kpis.incomeCents).toBe(200_000);
		expect(overview.kpis.spendingCents).toBe(50_000);
		expect(overview.kpis.netCents).toBe(150_000);
		expect(overview.kpis.savingsRatePct).toBe(75);
		expect(overview.savings.progressPct).toBe(150);
		expect(overview.moneyInCents).toBe(200_000);
		expect(overview.kpis.incomeDeltaCents).toBeNull();
	});

	it("compares categories with last month and the prior three-month average", () => {
		const groceries = (date: string, amountCents: number) =>
			tx({
				amountCents: -amountCents,
				merchant: "SAFEWAY",
				transactionDate: date,
				categoryName: "Groceries",
			});
		const overview = buildMonthOverview(
			[
				groceries("2026-07-04", 10_000),
				groceries("2026-08-04", 20_000),
				groceries("2026-09-04", 30_000),
				tx({
					amountCents: -50_000,
					merchant: "CAFE",
					transactionDate: "2026-09-08",
					categoryName: "Dining",
					categorySlug: "dining",
				}),
				groceries("2026-10-04", 60_000),
				tx({
					amountCents: -10_000,
					merchant: "CAFE",
					transactionDate: "2026-10-08",
					categoryName: "Dining",
					categorySlug: "dining",
				}),
			],
			"2026-10",
			options,
		);

		const groceriesRow = overview.categories.find(
			(category) => category.name === "Groceries",
		);
		expect(groceriesRow?.previousCents).toBe(30_000);
		expect(groceriesRow?.deltaCents).toBe(30_000);
		expect(groceriesRow?.deltaPct).toBe(100);
		expect(groceriesRow?.threeMonthAvgCents).toBe(20_000);
		expect(groceriesRow?.vsAverageCents).toBe(40_000);
		expect(groceriesRow?.vsAveragePct).toBe(200);
		expect(overview.movers[0]?.name).toBe("Dining");
		expect(overview.movers[0]?.deltaCents).toBe(-40_000);
		expect(overview.kpis.spendingDeltaCents).toBe(-10_000);
		expect(overview.kpis.spendingDeltaPct).toBeCloseTo(-12.5);
	});

	it("lists subscriptions, repeat merchants, new merchants, and unusual spend", () => {
		const overview = buildMonthOverview(
			[
				tx({
					amountCents: -1_599,
					merchant: "NETFLIX.COM",
					transactionDate: "2026-10-02",
					categoryName: "Subscriptions",
					categorySlug: "subscriptions",
				}),
				tx({
					amountCents: -1_099,
					merchant: "SPOTIFY",
					transactionDate: "2026-09-02",
					categoryName: null,
					categorySlug: null,
				}),
				tx({
					amountCents: -1_099,
					merchant: "SPOTIFY",
					transactionDate: "2026-10-02",
					categoryName: null,
					categorySlug: null,
				}),
				tx({
					amountCents: -10_000,
					merchant: "COSTCO",
					transactionDate: "2026-08-12",
				}),
				tx({
					amountCents: -10_000,
					merchant: "COSTCO",
					transactionDate: "2026-09-12",
				}),
				tx({
					amountCents: -40_000,
					merchant: "COSTCO",
					transactionDate: "2026-10-12",
				}),
				tx({
					amountCents: -2_500,
					merchant: "TIM HORTONS #0486 CALGARY CAN",
					transactionDate: "2026-10-06",
					categoryName: "Dining",
					categorySlug: "dining",
				}),
			],
			"2026-10",
			{ ...options, asOfDate: "2026-10-31" },
		);

		expect(overview.recurring.charges.map((charge) => charge.merchant)).toEqual(
			["Netflix.com", "Spotify"],
		);
		expect(overview.recurring.totalCents).toBe(1_599 + 1_099);
		expect(overview.newMerchants.map((merchant) => merchant.merchant)).toEqual([
			"Tim Hortons",
		]);
		expect(overview.unusualMerchants[0]).toMatchObject({
			merchant: "Costco",
			amountCents: 40_000,
			typicalCents: 10_000,
		});
		expect(overview.largestTransactions[0]?.merchant).toBe("Costco");
		expect(overview.largestTransactions[0]).not.toHaveProperty("description");
		expect(overview.topMerchants[0]?.name).toBe("Costco");
		expect(overview.topMerchants[0]?.count).toBe(1);
	});

	it("projects the rest of an open month and closes a finished one", () => {
		const rows = [
			tx({
				amountCents: -1_000,
				merchant: "CAFE",
				transactionDate: "2026-10-01",
				categoryName: "Dining",
				categorySlug: "dining",
			}),
			tx({
				amountCents: -2_100,
				merchant: "CAFE",
				transactionDate: "2026-10-10",
				categoryName: "Dining",
				categorySlug: "dining",
			}),
		];
		const open = buildMonthOverview(rows, "2026-10", options);
		expect(open.pace.daysInMonth).toBe(31);
		expect(open.pace.daysElapsed).toBe(10);
		expect(open.pace.spentToDateCents).toBe(3_100);
		expect(open.pace.projectedCents).toBe(9_610);
		expect(open.trend[0]?.spendingCents).toBe(1_000);
		expect(open.trend[10]?.spendingCents).toBeNull();
		expect(open.pace.closed).toBe(false);

		const closed = buildMonthOverview(rows, "2026-10", {
			...options,
			asOfDate: "2026-11-02",
		});
		expect(closed.pace.closed).toBe(true);
		expect(closed.pace.projectedCents).toBe(3_100);

		const future = buildMonthOverview(rows, "2026-11", options);
		expect(future.pace.daysElapsed).toBe(0);
		expect(future.pace.projectedCents).toBeNull();
	});

	it("leaves the savings rate empty when there is no income", () => {
		const overview = buildMonthOverview(
			[
				tx({
					amountCents: -2_000,
					merchant: "CAFE",
					transactionDate: "2026-10-02",
					categoryName: "Dining",
					categorySlug: "dining",
				}),
			],
			"2026-10",
			{ ...options, savingsTargetCents: 0 },
		);
		expect(overview.kpis.savingsRatePct).toBeNull();
		expect(overview.savings.progressPct).toBeNull();
	});

	it("uses the Edmonton calendar for the current month", () => {
		expect(currentMonth(new Date("2026-11-01T05:30:00Z"))).toBe("2026-10");
	});
});

describe("review payload", () => {
	it("sends merchant names and totals, not raw descriptions", () => {
		const overview = buildMonthOverview(
			[
				tx({
					amountCents: -2_500,
					merchant: "TIM HORTONS #0486 CALGARY CAN",
					transactionDate: "2026-10-06",
					categoryName: "Dining",
					categorySlug: "dining",
				}),
			],
			"2026-10",
			options,
		);
		const context = toReviewContext(overview);
		const encoded = JSON.stringify(context);
		expect(encoded).toContain("Tim Hortons");
		expect(encoded).not.toContain("CALGARY");
		expect(encoded).not.toContain("#0486");
		expect(collectKeys(context)).not.toContain("description");
		expect(buildReviewPrompt(context)).toContain("Canadian dollars");
	});

	it("reads a review wrapped in prose and keeps two or three suggestions", () => {
		const review = parseMonthlyReview(`Here is the review:
{"summary":"Spending rose.","patterns":["Groceries jumped.","Dining fell."],"anomalies":[],"suggestions":["Cut groceries by $40.","Pause one subscription.","Skip a third idea.","Drop the extra."]}
Thanks.`);
		expect(review.summary).toBe("Spending rose.");
		expect(review.suggestions).toHaveLength(3);
		expect(() =>
			parseMonthlyReview(
				'{"summary":"Only one.","patterns":["A"],"anomalies":[],"suggestions":["Just one."]}',
			),
		).toThrow(/unexpected shape/);
	});
});

function collectKeys(value: unknown, found: string[] = []): string[] {
	if (Array.isArray(value)) {
		for (const item of value) collectKeys(item, found);
		return found;
	}
	if (value && typeof value === "object") {
		for (const [key, child] of Object.entries(value)) {
			found.push(key);
			collectKeys(child, found);
		}
	}
	return found;
}
