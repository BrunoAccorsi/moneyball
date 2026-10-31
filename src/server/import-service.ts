import { eq } from "drizzle-orm";
import { db } from "#/db";
import {
	accounts,
	categories,
	categoryRules,
	importBatches,
	transactions,
} from "#/db/schema";
import { matchCategory } from "#/domain/categories/engine";
import {
	dedupeParsedTransactions,
	importWithAutoDetect,
} from "#/domain/import/registry";

export async function importStatement(input: {
	filename: string;
	text: string;
	accountId?: number;
}) {
	const { strategy, transactions: parsed } = importWithAutoDetect(input);
	const { unique, duplicateCount: batchDupes } =
		dedupeParsedTransactions(parsed);

	let accountId = input.accountId;
	if (!accountId) {
		const existing = await db
			.select()
			.from(accounts)
			.where(eq(accounts.name, strategy.accountHint.name))
			.limit(1);

		if (existing[0]) {
			accountId = existing[0].id;
		} else {
			const [created] = await db
				.insert(accounts)
				.values({
					name: strategy.accountHint.name,
					institution: strategy.accountHint.institution,
					kind: strategy.accountHint.kind,
				})
				.returning();
			accountId = created.id;
		}
	}
	const resolvedAccountId = accountId;

	const rules = await db.select().from(categoryRules);
	const allCategories = await db.select().from(categories);
	const transferIds = new Set(
		allCategories.filter((category) => category.isTransfer).map((c) => c.id),
	);

	const fingerprints = unique.map((tx) => tx.fingerprint);
	const existing =
		fingerprints.length === 0
			? []
			: await db
					.select({ fingerprint: transactions.fingerprint })
					.from(transactions);

	const existingSet = new Set(existing.map((row) => row.fingerprint));
	const toInsert = unique.filter((tx) => !existingSet.has(tx.fingerprint));
	const skippedDuplicateCount = batchDupes + (unique.length - toInsert.length);

	if (toInsert.length > 0) {
		await db.insert(transactions).values(
			toInsert.map((tx) => {
				const match = matchCategory(
					{ merchant: tx.merchant, description: tx.description },
					rules,
					transferIds,
				);
				return {
					accountId: resolvedAccountId,
					categoryId: match?.categoryId ?? null,
					transactionDate: tx.transactionDate,
					postedDate: tx.postedDate,
					status: tx.status,
					description: tx.description,
					merchant: tx.merchant,
					amountCents: tx.amountCents,
					sourceId: tx.sourceId,
					fingerprint: tx.fingerprint,
					excludedFromBudget: match?.excludedFromBudget ?? false,
				};
			}),
		);
	}

	const [batch] = await db
		.insert(importBatches)
		.values({
			sourceId: strategy.id,
			filename: input.filename,
			importedCount: toInsert.length,
			skippedDuplicateCount,
		})
		.returning();

	return {
		batch,
		strategy: { id: strategy.id, label: strategy.label },
		importedCount: toInsert.length,
		skippedDuplicateCount,
	};
}
