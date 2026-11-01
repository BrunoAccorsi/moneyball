export type CategoryMatchInput = {
	merchant: string;
	description: string;
};

export type CategoryRuleLike = {
	id: number;
	categoryId: number;
	pattern: string;
	matchField: string;
	priority: number;
};

export type CategoryMatch = {
	categoryId: number;
	ruleId: number;
	excludedFromBudget: boolean;
};

export function matchCategory(
	input: CategoryMatchInput,
	rules: CategoryRuleLike[],
	transferCategoryIds: Set<number>,
): CategoryMatch | null {
	const sorted = [...rules].sort((a, b) => a.priority - b.priority);

	for (const rule of sorted) {
		const haystack =
			rule.matchField === "description" ? input.description : input.merchant;
		const target =
			rule.matchField === "description"
				? input.description
				: `${input.merchant} ${input.description}`;

		const needle = rule.pattern.toLowerCase();
		if (
			!target.toLowerCase().includes(needle) &&
			!haystack.toLowerCase().includes(needle)
		) {
			continue;
		}

		return {
			categoryId: rule.categoryId,
			ruleId: rule.id,
			excludedFromBudget: transferCategoryIds.has(rule.categoryId),
		};
	}

	return null;
}

export function categorizeMany(
	rows: CategoryMatchInput[],
	rules: CategoryRuleLike[],
	transferCategoryIds: Set<number>,
): Array<CategoryMatch | null> {
	return rows.map((row) => matchCategory(row, rules, transferCategoryIds));
}
