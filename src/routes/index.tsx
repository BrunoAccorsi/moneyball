import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MonthOverviewView } from "#/components/overview/MonthOverview";
import { useTRPC } from "#/integrations/trpc/react";
import { currentMonth } from "#/lib/format";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		const month = currentMonth();
		await Promise.all([
			context.queryClient.prefetchQuery(
				context.trpc.insights.overview.queryOptions({ month }),
			),
			context.queryClient.prefetchQuery(
				context.trpc.insights.review.queryOptions({ month }),
			),
		]);
	},
	component: OverviewPage,
});

function OverviewPage() {
	const trpc = useTRPC();
	const [month, setMonth] = useState(currentMonth());
	const overview = useQuery(trpc.insights.overview.queryOptions({ month }));

	if (overview.isError) {
		return (
			<section className="mb-page">
				<h1 className="mb-title">Overview</h1>
				<p className="mt-3 text-[var(--mb-out)]">Couldn’t load this month.</p>
			</section>
		);
	}

	if (!overview.data) {
		return (
			<section className="mb-page">
				<h1 className="mb-title">Overview</h1>
				<p className="mb-meta mt-3">Loading {month}…</p>
			</section>
		);
	}

	return (
		<MonthOverviewView
			month={month}
			onMonthChange={setMonth}
			overview={overview.data}
		/>
	);
}
