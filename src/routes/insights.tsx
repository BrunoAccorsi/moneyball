import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Input } from "#/components/ui/input";
import { useTRPC } from "#/integrations/trpc/react";
import { currentMonth, formatCents } from "#/lib/format";

export const Route = createFileRoute("/insights")({
	component: InsightsPage,
});

const CHART_COLORS = [
	"#16774A",
	"#4C7BD9",
	"#E8A23A",
	"#E4664F",
	"#7A8394",
	"#3FB074",
	"#6F96E8",
	"#F0B355",
];

function InsightsPage() {
	const trpc = useTRPC();
	const [month, setMonth] = useState(currentMonth());
	const { data, isLoading } = useQuery(
		trpc.insights.overview.queryOptions({ month }),
	);

	const spendingSeries = useMemo(
		() =>
			(data?.monthly ?? []).map((row) => ({
				month: row.month.slice(5),
				spending: row.spendingCents / 100,
			})),
		[data],
	);

	const cashFlowSeries = useMemo(
		() =>
			(data?.monthly ?? []).map((row) => ({
				month: row.month.slice(5),
				in: row.inCents / 100,
				out: row.outCents / 100,
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
				name: row.name.slice(0, 18),
				amount: row.amountCents / 100,
			})),
		[data],
	);

	return (
		<section className="mb-page">
			<header className="mb-section-head mb-section-head-row">
				<div>
					<h1 className="mb-title">Insights</h1>
					<p className="mb-lede">
						Spending, cash flow, and merchants — charts first, AI later.
					</p>
				</div>
				<Input
					type="month"
					className="w-[160px]"
					value={month}
					onChange={(event) => setMonth(event.target.value)}
				/>
			</header>

			{isLoading || !data ? (
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
							<p className="mb-stat-label">MoM change</p>
							<p className="mb-stat-value">
								{data.monthOverMonthChangePct == null
									? "—"
									: `${data.monthOverMonthChangePct.toFixed(1)}%`}
							</p>
						</div>
					</div>

					<div className="mb-chart-grid">
						<div className="mb-panel">
							<h2 className="mb-panel-title">Monthly spending</h2>
							<div className="h-64">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={spendingSeries}>
										<CartesianGrid stroke="var(--mb-line)" vertical={false} />
										<XAxis dataKey="month" tickLine={false} axisLine={false} />
										<YAxis tickLine={false} axisLine={false} width={48} />
										<Tooltip />
										<Line
											type="monotone"
											dataKey="spending"
											stroke="#16774A"
											strokeWidth={2.5}
											dot={false}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</div>

						<div className="mb-panel">
							<h2 className="mb-panel-title">Cash flow in vs out</h2>
							<div className="h-64">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={cashFlowSeries}>
										<CartesianGrid stroke="var(--mb-line)" vertical={false} />
										<XAxis dataKey="month" tickLine={false} axisLine={false} />
										<YAxis tickLine={false} axisLine={false} width={48} />
										<Tooltip />
										<Legend />
										<Bar dataKey="in" fill="#16774A" radius={[4, 4, 0, 0]} />
										<Bar dataKey="out" fill="#E4664F" radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>

						<div className="mb-panel">
							<h2 className="mb-panel-title">Category breakdown</h2>
							<div className="h-64">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={categorySeries}
											dataKey="value"
											nameKey="name"
											innerRadius={48}
											outerRadius={84}
											paddingAngle={2}
										>
											{categorySeries.map((entry, index) => (
												<Cell
													key={entry.name}
													fill={CHART_COLORS[index % CHART_COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip />
										<Legend />
									</PieChart>
								</ResponsiveContainer>
							</div>
						</div>

						<div className="mb-panel">
							<h2 className="mb-panel-title">Top merchants</h2>
							<div className="h-64">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={merchantSeries} layout="vertical">
										<CartesianGrid stroke="var(--mb-line)" horizontal={false} />
										<XAxis type="number" hide />
										<YAxis
											type="category"
											dataKey="name"
											width={110}
											tickLine={false}
											axisLine={false}
										/>
										<Tooltip />
										<Bar
											dataKey="amount"
											fill="#4C7BD9"
											radius={[0, 4, 4, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>

					<div className="mb-panel mt-6">
						<h2 className="mb-panel-title">AI insights</h2>
						<p className="mt-2 text-sm text-[var(--mb-muted)]">
							Provider: {data.aiProvider.id} (
							{data.aiProvider.enabled ? "enabled" : "off by default"}). Cursor
							SDK can plug into `AiInsightsProvider` later.
						</p>
						{data.aiInsights.length === 0 ? (
							<p className="mt-3 text-sm">No AI insights generated.</p>
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
						)}
					</div>
				</>
			)}
		</section>
	);
}
