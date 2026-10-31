import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { getInsights } from "#/server/insights-service";
import { publicProcedure } from "../init";

export const insightsRouter = {
	overview: publicProcedure
		.input(
			z.object({
				month: z.string().regex(/^\d{4}-\d{2}$/),
			}),
		)
		.query(async ({ input }) => getInsights(input.month)),
} satisfies TRPCRouterRecord;
