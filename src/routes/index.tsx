import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { formatMonthName } from "#/domain/display";
import { useTRPC } from "#/integrations/trpc/react";
import { currentMonth, formatCents } from "#/lib/format";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		const month = currentMonth();
		await Promise.all([
			context.queryClient.prefetchQuery(
				context.trpc.transactions.summary.queryOptions(),
			),
			context.queryClient.prefetchQuery(
				context.trpc.insights.overview.queryOptions({ month }),
			),
		]);
	},
	component: OverviewPage,
});

function OverviewPage() {
	const trpc = useTRPC();
	const month = currentMonth();
	const summary = useQuery(trpc.transactions.summary.queryOptions());
	const insights = useQuery(trpc.insights.overview.queryOptions({ month }));

	const summaryValue = summary.isError
		? "Unavailable"
		: summary.data
			? String(summary.data.count)
			: "…";
	const spendingValue = summary.isError
		? "Unavailable"
		: summary.data
			? formatCents(summary.data.spendingCents)
			: "…";
	const netValue = insights.isError
		? "Unavailable"
		: insights.data
			? formatCents(insights.data.netCashFlowCents)
			: "…";

	return (
		<section className="mb-page">
			<div className="mb-hero">
				<p className="mb-eyebrow">Personal budget</p>
				<h1 className="mb-title">Keep score of your money</h1>
				<p className="mb-lede">
					Import statements, categorize spending, and read cash flow without the
					noise of a bank app.
				</p>
				<div className="mb-cta-row">
					<Button asChild>
						<Link to="/import">Import statements</Link>
					</Button>
					<Button asChild variant="outline">
						<Link to="/insights">Open insights</Link>
					</Button>
				</div>
			</div>

			<div className="mb-stat-row">
				<div className="mb-stat">
					<p className="mb-stat-label">Tracked transactions</p>
					<p className="mb-stat-value">{summaryValue}</p>
				</div>
				<div className="mb-stat">
					<p className="mb-stat-label">Spending in view</p>
					<p className="mb-stat-value">{spendingValue}</p>
				</div>
				<div className="mb-stat">
					<p className="mb-stat-label">{formatMonthName(month)} net</p>
					<p className="mb-stat-value">{netValue}</p>
				</div>
			</div>
		</section>
	);
}
