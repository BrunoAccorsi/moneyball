import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { importStrategies } from "#/domain/import/registry";
import { importStatement } from "#/server/import-service";
import { publicProcedure } from "../init";

export const importRouter = {
	strategies: publicProcedure.query(() =>
		importStrategies.map((strategy) => ({
			id: strategy.id,
			label: strategy.label,
			accountHint: strategy.accountHint,
		})),
	),

	upload: publicProcedure
		.input(
			z.object({
				filename: z.string().min(1),
				text: z.string().min(1),
				accountId: z.number().optional(),
			}),
		)
		.mutation(async ({ input }) => importStatement(input)),
} satisfies TRPCRouterRecord;
