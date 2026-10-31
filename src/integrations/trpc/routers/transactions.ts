import type { TRPCRouterRecord } from "@trpc/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { accounts, categories, transactions } from "#/db/schema";
import { publicProcedure } from "../init";

export const transactionsRouter = {
	list: publicProcedure
		.input(
			z
				.object({
					from: z.string().optional(),
					to: z.string().optional(),
					accountId: z.number().optional(),
					categoryId: z.number().optional(),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const filters = [];
			if (input?.from) {
				filters.push(gte(transactions.transactionDate, input.from));
			}
			if (input?.to) {
				filters.push(lte(transactions.transactionDate, input.to));
			}
			if (input?.accountId) {
				filters.push(eq(transactions.accountId, input.accountId));
			}
			if (input?.categoryId) {
				filters.push(eq(transactions.categoryId, input.categoryId));
			}

			return db
				.select({
					id: transactions.id,
					transactionDate: transactions.transactionDate,
					postedDate: transactions.postedDate,
					status: transactions.status,
					description: transactions.description,
					merchant: transactions.merchant,
					amountCents: transactions.amountCents,
					sourceId: transactions.sourceId,
					excludedFromBudget: transactions.excludedFromBudget,
					notes: transactions.notes,
					accountId: transactions.accountId,
					accountName: accounts.name,
					categoryId: transactions.categoryId,
					categoryName: categories.name,
					categoryColor: categories.color,
				})
				.from(transactions)
				.leftJoin(accounts, eq(transactions.accountId, accounts.id))
				.leftJoin(categories, eq(transactions.categoryId, categories.id))
				.where(filters.length ? and(...filters) : undefined)
				.orderBy(desc(transactions.transactionDate), desc(transactions.id));
		}),

	updateCategory: publicProcedure
		.input(
			z.object({
				id: z.number(),
				categoryId: z.number().nullable(),
				excludedFromBudget: z.boolean().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const [updated] = await db
				.update(transactions)
				.set({
					categoryId: input.categoryId,
					excludedFromBudget: input.excludedFromBudget,
				})
				.where(eq(transactions.id, input.id))
				.returning();
			return updated;
		}),

	summary: publicProcedure.query(async () => {
		const [row] = await db
			.select({
				count: sql<number>`count(*)`,
				spendingCents: sql<number>`coalesce(sum(case when amount_cents < 0 and excluded_from_budget = false then abs(amount_cents) else 0 end), 0)`,
			})
			.from(transactions);
		return {
			count: Number(row?.count ?? 0),
			spendingCents: Number(row?.spendingCents ?? 0),
		};
	}),
} satisfies TRPCRouterRecord;
