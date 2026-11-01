import { createTRPCRouter } from "./init";
import { accountsRouter } from "./routers/accounts";
import { categoriesRouter } from "./routers/categories";
import { importRouter } from "./routers/import";
import { insightsRouter } from "./routers/insights";
import { transactionsRouter } from "./routers/transactions";

export const trpcRouter = createTRPCRouter({
	accounts: accountsRouter,
	categories: categoriesRouter,
	import: importRouter,
	insights: insightsRouter,
	transactions: transactionsRouter,
});

export type TRPCRouter = typeof trpcRouter;
