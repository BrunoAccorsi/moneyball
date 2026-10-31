import { describe, expect, it } from "vitest";
import { displayMerchant, formatMonthTick } from "../../display";
import { buildInsights } from "../rollup";

describe("insight rollup", () => {
	it("keeps transfers out of spending and cash flow", () => {
		const insights = buildInsights(
			[
				{
					amountCents: -213624,
					merchant: "WESTJET CALGARY CAN",
					transactionDate: "2026-10-10",
					excludedFromBudget: false,
					categoryName: "Travel",
					isTransfer: false,
				},
				{
					amountCents: 160066,
					merchant: "Payment Received - Thank you",
					transactionDate: "2026-10-29",
					excludedFromBudget: true,
					categoryName: "Transfers",
					isTransfer: true,
				},
				{
					amountCents: 60108,
					merchant: "Bruna e-transfer",
					transactionDate: "2026-10-07",
					excludedFromBudget: false,
					categoryName: null,
					isTransfer: false,
				},
			],
			"2026-10",
		);

		expect(insights.totalSpendingCents).toBe(213624);
		expect(insights.moneyOutCents).toBe(213624);
		expect(insights.moneyInCents).toBe(60108);
		expect(insights.monthly[0]?.inCents).toBe(60108);
		expect(insights.monthly[0]?.outCents).toBe(213624);
		expect(insights.topMerchants[0]?.name).toBe("Westjet");
	});

	it("labels months as names, not numeric fragments", () => {
		expect(formatMonthTick("2026-10")).toBe("Oct");
	});

	it("cleans statement merchant noise", () => {
		expect(displayMerchant("TIM HORTONS #0486 CALGARY CAN")).toBe(
			"Tim Hortons",
		);
		expect(displayMerchant("AMAZON.CA VANCOUVER CAN")).toBe("Amazon.ca");
	});
});
