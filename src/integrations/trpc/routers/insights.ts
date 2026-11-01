import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	getMonthlyReview,
	getMonthOverview,
	regenerateMonthlyReview,
	setSavingsTargetCents,
} from "#/server/insights-service";
import { publicProcedure } from "../init";

const monthInput = z.object({
	month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const insightsRouter = {
	overview: publicProcedure
		.input(monthInput)
		.query(async ({ input }) => getMonthOverview(input.month)),

	review: publicProcedure
		.input(monthInput)
		.query(async ({ input }) => getMonthlyReview(input.month)),

	regenerateReview: publicProcedure
		.input(monthInput)
		.mutation(async ({ input }) => {
			try {
				return await regenerateMonthlyReview(input.month);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Couldn’t write this month’s review.";
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message,
				});
			}
		}),

	setSavingsTarget: publicProcedure
		.input(
			z.object({
				targetCents: z.number().int().min(0).max(100_000_000),
			}),
		)
		.mutation(async ({ input }) => {
			await setSavingsTargetCents(input.targetCents);
			return { targetCents: input.targetCents };
		}),
} satisfies TRPCRouterRecord;
