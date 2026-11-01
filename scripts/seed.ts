import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { accounts, categories, categoryRules } from "../src/db/schema";
import { SEED_CATEGORIES, SEED_RULES } from "../src/domain/categories/seed";

async function main() {
	for (const category of SEED_CATEGORIES) {
		const existing = await db
			.select()
			.from(categories)
			.where(eq(categories.slug, category.slug))
			.limit(1);

		if (existing[0]) continue;

		await db.insert(categories).values({
			name: category.name,
			slug: category.slug,
			color: category.color,
			isTransfer: category.isTransfer ?? false,
			isIncome: category.isIncome ?? false,
		});
	}

	const allCategories = await db.select().from(categories);
	const bySlug = new Map(
		allCategories.map((category) => [category.slug, category]),
	);

	const existingRules = await db.select().from(categoryRules);
	if (existingRules.length === 0) {
		for (const rule of SEED_RULES) {
			const category = bySlug.get(rule.categorySlug);
			if (!category) continue;
			await db.insert(categoryRules).values({
				categoryId: category.id,
				pattern: rule.pattern,
				matchField: rule.matchField ?? "merchant",
				priority: rule.priority ?? 100,
				notes: rule.notes,
			});
		}
	}

	const defaultAccounts = [
		{
			name: "Neo Credit",
			institution: "Neo Financial",
			kind: "credit",
		},
		{
			name: "Scotia Chequing",
			institution: "Scotiabank",
			kind: "chequing",
		},
		{
			name: "Scotia Credit",
			institution: "Scotiabank",
			kind: "credit",
		},
		{
			name: "Neo Everyday",
			institution: "Neo Financial",
			kind: "everyday",
		},
	];

	for (const account of defaultAccounts) {
		const existing = await db
			.select()
			.from(accounts)
			.where(eq(accounts.name, account.name))
			.limit(1);
		if (existing[0]) continue;
		await db.insert(accounts).values(account);
	}

	console.log("Seed complete");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
