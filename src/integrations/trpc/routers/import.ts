import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { importStatement } from "#/server/import-service";
import { publicProcedure } from "../init";

export const importRouter = {
	upload: publicProcedure
		.input(
			z
				.object({
					filename: z.string().min(1),
					text: z.string().default(""),
					bytesBase64: z.string().optional(),
					accountId: z.number().optional(),
				})
				.refine(
					(value) => value.text.length > 0 || Boolean(value.bytesBase64),
					{
						message: "File is empty",
					},
				),
		)
		.mutation(async ({ input }) =>
			importStatement({
				filename: input.filename,
				text: input.text,
				accountId: input.accountId,
				bytes: input.bytesBase64
					? Uint8Array.from(Buffer.from(input.bytesBase64, "base64"))
					: undefined,
			}),
		),
} satisfies TRPCRouterRecord;
