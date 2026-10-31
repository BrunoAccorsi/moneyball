import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { useTRPC } from "#/integrations/trpc/react";
import { currentMonth, formatCents } from "#/lib/format";

export const Route = createFileRoute("/")({
	component: OverviewPage,
});

function OverviewPage() {
	const trpc = useTRPC();
	const summary = useQuery(trpc.transactions.summary.queryOptions());
	const insights = useQuery(
		trpc.insights.overview.queryOptions({ month: currentMonth() }),
	);

	return (
		<section className="mb-page">
			<div className="mb-hero">
				<img
					src="/brand/logo.svg"
					alt="Moneyball"
					className="mb-hero-logo dark:hidden"
				/>
				<img
					src="/brand/logo-dark.svg"
					alt="Moneyball"
					className="mb-hero-logo hidden dark:block"
				/>
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
					<p className="mb-stat-value">{summary.data?.count ?? "—"}</p>
				</div>
				<div className="mb-stat">
					<p className="mb-stat-label">Spending in view</p>
					<p className="mb-stat-value">
						{summary.data ? formatCents(summary.data.spendingCents) : "—"}
					</p>
				</div>
				<div className="mb-stat">
					<p className="mb-stat-label">
						{insights.data?.month ?? currentMonth()} net
					</p>
					<p className="mb-stat-value">
						{insights.data ? formatCents(insights.data.netCashFlowCents) : "—"}
					</p>
				</div>
			</div>
		</section>
	);
}
