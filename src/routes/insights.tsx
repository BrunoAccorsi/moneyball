import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Input } from "#/components/ui/input";
import { formatMonthName, formatMonthTick } from "#/domain/display";
import { useTRPC } from "#/integrations/trpc/react";
import { currentMonth, formatCents } from "#/lib/format";

export const Route = createFileRoute("/insights")({
	loader: async ({ context }) => {
		await context.queryClient.prefetchQuery(
			context.trpc.insights.overview.queryOptions({ month: currentMonth() }),
		);
	},
	component: InsightsPage,
});

const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

const tick = {
	fill: "var(--muted-foreground)",
	fontSize: 12,
	fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif",
};

function moneyTick(value: number) {
	return new Intl.NumberFormat("en-CA", {
		style: "currency",
		currency: "CAD",
		maximumFractionDigits: 0,
	}).format(value);
}

function ChartTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: Array<{ name?: string; value?: number; color?: string }>;
	label?: string;
}) {
	if (!active || !payload?.length) return null;
	return (
		<div className="mb-tooltip">
			<p className="mb-tooltip-label">{label}</p>
			{payload.map((item) => (
				<p key={item.name} className="mb-amount">
					<span
						className="mb-tooltip-swatch"
						style={{ background: item.color }}
					/>
					{item.name} {formatCents(Math.round(Number(item.value) * 100))}
				</p>
			))}
		</div>
	);
}

function InsightsPage() {
	const trpc = useTRPC();
	const [month, setMonth] = useState(currentMonth());
	const { data, isLoading, isError } = useQuery(
		trpc.insights.overview.queryOptions({ month }),
	);

	const spendingSeries = useMemo(
		() =>
			(data?.monthly ?? []).map((row) => ({
				month: formatMonthTick(row.month),
				Spending: row.spendingCents / 100,
			})),
		[data],
	);

	const cashFlowSeries = useMemo(
		() =>
			(data?.monthly ?? []).map((row) => ({
				month: formatMonthTick(row.month),
				In: row.inCents / 100,
				Out: row.outCents / 100,
			})),
		[data],
	);

	const categorySeries = useMemo(
		() =>
			(data?.topCategories ?? []).map((row) => ({
				name: row.name,
				value: row.amountCents / 100,
			})),
		[data],
	);

	const merchantSeries = useMemo(
		() =>
			(data?.topMerchants ?? []).map((row) => ({
				name: row.name,
				Amount: row.amountCents / 100,
			})),
		[data],
	);

	return (
		<section className="mb-page">
			<header className="mb-section-head mb-section-head-row">
				<div>
					<h1 className="mb-title">Insights</h1>
					<p className="mb-lede">
						Where the money went, and what came in, for the month you pick.
					</p>
				</div>
				<Input
					type="month"
					className="w-[180px]"
					value={month}
					onChange={(event) => setMonth(event.target.value)}
				/>
			</header>

			{isError ? (
				<p className="text-[var(--mb-out)]">Couldn’t load insights.</p>
			) : isLoading || !data ? (
				<p className="text-[var(--mb-muted)]">Loading insights…</p>
			) : (
				<>
					<div className="mb-stat-row">
						<div className="mb-stat">
							<p className="mb-stat-label">Total spending</p>
							<p className="mb-stat-value">
								{formatCents(data.totalSpendingCents)}
							</p>
						</div>
						<div className="mb-stat">
							<p className="mb-stat-label">Money in</p>
							<p className="mb-stat-value text-[var(--mb-in)]">
								{formatCents(data.moneyInCents)}
							</p>
						</div>
						<div className="mb-stat">
							<p className="mb-stat-label">Money out</p>
							<p className="mb-stat-value text-[var(--mb-out)]">
								{formatCents(data.moneyOutCents)}
							</p>
						</div>
						<div className="mb-stat">
							<p className="mb-stat-label">Vs last month</p>
							<p className="mb-stat-value">
								{data.monthOverMonthChangePct == null
									? "No prior month"
									: `${data.monthOverMonthChangePct.toFixed(1)}%`}
							</p>
						</div>
					</div>

					<div className="mb-chart-grid">
						<div className="mb-panel">
							<h2 className="mb-panel-title">Monthly spending</h2>
							<div className="mt-3 h-64">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={spendingSeries}>
										<CartesianGrid stroke="var(--border)" vertical={false} />
										<XAxis
											dataKey="month"
											type="category"
											tickLine={false}
											axisLine={false}
											tick={tick}
										/>
										<YAxis
											tickLine={false}
											axisLine={false}
											width={72}
											tick={tick}
											tickFormatter={moneyTick}
										/>
										<Tooltip
											content={<ChartTooltip />}
											cursor={{ fill: "var(--accent)" }}
										/>
										<Bar
											dataKey="Spending"
											fill="var(--chart-1)"
											radius={[6, 6, 0, 0]}
											maxBarSize={48}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>

						<div className="mb-panel">
							<h2 className="mb-panel-title">Cash flow in vs out</h2>
							<div className="mt-3 h-64">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={cashFlowSeries}>
										<CartesianGrid stroke="var(--border)" vertical={false} />
										<XAxis
											dataKey="month"
											type="category"
											tickLine={false}
											axisLine={false}
											tick={tick}
										/>
										<YAxis
											tickLine={false}
											axisLine={false}
											width={72}
											tick={tick}
											tickFormatter={moneyTick}
										/>
										<Tooltip
											content={<ChartTooltip />}
											cursor={{ fill: "var(--accent)" }}
										/>
										<Bar
											dataKey="In"
											fill="var(--chart-1)"
											radius={[6, 6, 0, 0]}
											maxBarSize={36}
										/>
										<Bar
											dataKey="Out"
											fill="var(--chart-4)"
											radius={[6, 6, 0, 0]}
											maxBarSize={36}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>

						<div className="mb-panel">
							<h2 className="mb-panel-title">
								Categories · {formatMonthName(month)}
							</h2>
							<div className="mb-donut">
								<div className="h-52 min-w-0 flex-1">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={categorySeries}
												dataKey="value"
												nameKey="name"
												innerRadius={52}
												outerRadius={78}
												paddingAngle={2}
												stroke="transparent"
											>
												{categorySeries.map((entry, index) => (
													<Cell
														key={entry.name}
														fill={CHART_COLORS[index % CHART_COLORS.length]}
													/>
												))}
											</Pie>
											<Tooltip content={<ChartTooltip />} />
										</PieChart>
									</ResponsiveContainer>
								</div>
								<ul className="mb-legend">
									{categorySeries.map((entry, index) => (
										<li key={entry.name}>
											<span
												className="mb-tooltip-swatch"
												style={{
													background: CHART_COLORS[index % CHART_COLORS.length],
												}}
											/>
											<span className="mb-legend-name">{entry.name}</span>
											<span className="mb-amount mb-legend-value">
												{formatCents(Math.round(entry.value * 100))}
											</span>
										</li>
									))}
								</ul>
							</div>
						</div>

						<div className="mb-panel">
							<h2 className="mb-panel-title">Top merchants</h2>
							<div
								className="mt-3"
								style={{
									height: Math.max(220, merchantSeries.length * 36),
								}}
							>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={merchantSeries}
										layout="vertical"
										margin={{ left: 8, right: 12 }}
									>
										<CartesianGrid stroke="var(--border)" horizontal={false} />
										<XAxis type="number" hide tickFormatter={moneyTick} />
										<YAxis
											type="category"
											dataKey="name"
											width={132}
											tickLine={false}
											axisLine={false}
											tick={tick}
										/>
										<Tooltip
											content={<ChartTooltip />}
											cursor={{ fill: "var(--accent)" }}
										/>
										<Bar
											dataKey="Amount"
											fill="var(--chart-2)"
											radius={[0, 6, 6, 0]}
											maxBarSize={18}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>

					<div className="mb-panel mt-6">
						<h2 className="mb-panel-title">AI insights</h2>
						{data.aiProvider.enabled ? (
							data.aiInsights.length === 0 ? (
								<p className="mt-2 text-sm text-[var(--mb-muted)]">
									Nothing to add for this month.
								</p>
							) : (
								<ul className="mt-3 space-y-2">
									{data.aiInsights.map((insight) => (
										<li key={insight.id}>
											<p className="font-medium">{insight.title}</p>
											<p className="text-sm text-[var(--mb-muted)]">
												{insight.body}
											</p>
										</li>
									))}
								</ul>
							)
						) : (
							<p className="mt-2 text-sm text-[var(--mb-muted)]">
								Turned off. A later provider can write these without changing
								the charts.
							</p>
						)}
					</div>
				</>
			)}
		</section>
	);
}
