import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TransactionsTable } from "#/components/transactions/TransactionsTable";
import { useTRPC } from "#/integrations/trpc/react";

export const Route = createFileRoute("/transactions")({
	component: TransactionsPage,
});

function TransactionsPage() {
	const trpc = useTRPC();
	const { data = [], isLoading } = useQuery(
		trpc.transactions.list.queryOptions(),
	);

	return (
		<section className="mb-page">
			<header className="mb-section-head">
				<h1 className="mb-title">Transactions</h1>
				<p className="mb-lede">
					Sort, page, and fuzzy-filter by merchant, category, account, or date.
				</p>
			</header>
			{isLoading ? (
				<p className="text-[var(--mb-muted)]">Loading transactions…</p>
			) : (
				<TransactionsTable rows={data} />
			)}
		</section>
	);
}
