import type { TRPCRouterRecord } from "@trpc/server";
import { asc } from "drizzle-orm";
import { db } from "#/db";
import { accounts } from "#/db/schema";
import { publicProcedure } from "../init";

export const accountsRouter = {
	list: publicProcedure.query(async () =>
		db.select().from(accounts).orderBy(asc(accounts.name)),
	),
} satisfies TRPCRouterRecord;
