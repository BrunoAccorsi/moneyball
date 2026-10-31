import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { importStatement } from "#/server/import-service";
import { publicProcedure } from "../init";

export const importRouter = {
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
