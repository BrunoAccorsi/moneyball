import { describe, expect, it } from "vitest";
import { matchCategory } from "../engine";
import { SEED_CATEGORIES, SEED_RULES } from "../seed";

function buildRules() {
	const categories = SEED_CATEGORIES.map((category, index) => ({
		...category,
		id: index + 1,
	}));
	const bySlug = new Map(
		categories.map((category) => [category.slug, category]),
	);
	const rules = SEED_RULES.map((rule, index) => {
		const category = bySlug.get(rule.categorySlug);
		if (!category) throw new Error(`Missing category ${rule.categorySlug}`);
		return {
			id: index + 1,
			categoryId: category.id,
			pattern: rule.pattern,
			matchField: rule.matchField ?? "merchant",
			priority: rule.priority ?? 100,
		};
	});
	const transferIds = new Set(
		categories.filter((category) => category.isTransfer).map((c) => c.id),
	);
	return { categories, rules, transferIds };
}

describe("categorization engine", () => {
	it("maps Wise Canada to Brazil debt payments", () => {
		const { categories, rules, transferIds } = buildRules();
		const match = matchCategory(
			{
				merchant: "Wise Canada",
				description: "miscellaneous payment — Wise Canada",
			},
			rules,
			transferIds,
		);
		expect(match?.categoryId).toBe(
			categories.find((c) => c.slug === "brazil-debt")?.id,
		);
		expect(match?.excludedFromBudget).toBe(false);
	});

	it("marks credit card payments as transfers excluded from budget", () => {
		const { categories, rules, transferIds } = buildRules();
		const match = matchCategory(
			{
				merchant: "Payment Received - Thank you",
				description: "Payment Received - Thank you",
			},
			rules,
			transferIds,
		);
		expect(match?.categoryId).toBe(
			categories.find((c) => c.slug === "transfers")?.id,
		);
		expect(match?.excludedFromBudget).toBe(true);
	});

	it("classifies salary deposits as income", () => {
		const { categories, rules, transferIds } = buildRules();
		const match = matchCategory(
			{
				merchant: "Transfer from NEO FINANCIAL T",
				description: "Transfer from NEO FINANCIAL T",
			},
			rules,
			transferIds,
		);
		expect(match?.categoryId).toBe(
			categories.find((c) => c.slug === "salary")?.id,
		);
	});

	it("prefers higher-priority (lower number) rules", () => {
		const { categories, rules, transferIds } = buildRules();
		const match = matchCategory(
			{
				merchant: "WestJet",
				description: "WESTJET FLIGHTS",
			},
			rules,
			transferIds,
		);
		expect(match?.categoryId).toBe(
			categories.find((c) => c.slug === "travel")?.id,
		);
	});
});
