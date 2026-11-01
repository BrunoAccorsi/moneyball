import type { TRPCRouterRecord } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { categories, categoryRules } from "#/db/schema";
import { publicProcedure } from "../init";

export const categoriesRouter = {
	list: publicProcedure.query(async () => {
		const cats = await db
			.select()
			.from(categories)
			.orderBy(asc(categories.name));
		const rules = await db
			.select()
			.from(categoryRules)
			.orderBy(asc(categoryRules.priority));
		return { categories: cats, rules };
	}),

	createRule: publicProcedure
		.input(
			z.object({
				categoryId: z.number(),
				pattern: z.string().min(1),
				matchField: z.enum(["merchant", "description"]).default("merchant"),
				priority: z.number().int().default(100),
				notes: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const [rule] = await db.insert(categoryRules).values(input).returning();
			return rule;
		}),

	deleteRule: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input }) => {
			await db.delete(categoryRules).where(eq(categoryRules.id, input.id));
			return { ok: true };
		}),
} satisfies TRPCRouterRecord;
