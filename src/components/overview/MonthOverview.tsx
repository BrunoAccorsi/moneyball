import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { Button } from "#/components/ui/button";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#/components/ui/chart";
import { Input } from "#/components/ui/input";
import { formatMonthName } from "#/domain/display";
import type { MonthOverview } from "#/domain/insights/overview";
import type { ReviewStatus } from "#/domain/insights/review";
import { useTRPC } from "#/integrations/trpc/react";
import { formatCents } from "#/lib/format";

const dailyConfig = {
	spending: { label: "Spent", color: "var(--chart-1)" },
	pace: { label: "Daily pace", color: "var(--chart-3)" },
} satisfies ChartConfig;

const merchantConfig = {
	amount: { label: "Spent", color: "var(--chart-2)" },
} satisfies ChartConfig;

function formatPct(value: number | null): string {
	if (value == null || !Number.isFinite(value)) return "";
	const rounded = Math.round(value);
	return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function signedMoney(cents: number): string {
	if (cents === 0) return formatCents(0);
	const sign = cents > 0 ? "+" : "−";
	return `${sign}${formatCents(Math.abs(cents))}`;
}

function deltaClass(cents: number, invert: boolean): string {
	if (cents === 0) return "mb-kpi-delta mb-delta-flat";
	const good = invert ? cents < 0 : cents > 0;
	return good ? "mb-kpi-delta mb-delta-good" : "mb-kpi-delta mb-delta-bad";
}

function DeltaLine({
	cents,
	pct,
	invert = false,
}: {
	cents: number | null;
	pct: number | null;
	invert?: boolean;
}) {
	if (cents == null) {
		return <p className="mb-kpi-delta mb-delta-flat">No prior month</p>;
	}
	if (cents === 0) {
		return <p className="mb-kpi-delta mb-delta-flat">Flat vs last month</p>;
	}
	const pctLabel = formatPct(pct);
	return (
		<p className={deltaClass(cents, invert)}>
			{signedMoney(cents)}
			{pctLabel ? ` (${pctLabel})` : ""} vs last month
		</p>
	);
}

function moneyTooltip(value: unknown) {
	return formatCents(Math.round(Number(value) * 100));
}

function paceCopy(overview: MonthOverview): string {
	if (overview.pace.projectedCents == null)
		return "No spending yet to project.";
	if (overview.pace.closed) {
		return `Month closed at ${formatCents(overview.kpis.spendingCents)}.`;
	}
	return `Through day ${overview.pace.daysElapsed}, on pace for ${formatCents(overview.pace.projectedCents)}.`;
}

function SavingsTarget({
	overview,
	month,
}: {
	overview: MonthOverview;
	month: string;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const targetCents = overview.savings.targetCents;
	const [editing, setEditing] = useState(targetCents === 0);
	const [draft, setDraft] = useState(
		targetCents > 0 ? String(targetCents / 100) : "",
	);
	const save = useMutation(
		trpc.insights.setSavingsTarget.mutationOptions({
			onSuccess: async () => {
				setEditing(false);
				await queryClient.invalidateQueries(
					trpc.insights.overview.queryFilter({ month }),
				);
			},
		}),
	);

	const progress =
		overview.savings.progressPct == null
			? 0
			: Math.min(100, Math.max(0, overview.savings.progressPct));

	return (
		<div className="mb-panel">
			<h2 className="mb-panel-title">Savings target</h2>
			{targetCents > 0 ? (
				<>
					<p className="mb-stat-value mt-2">
						{formatCents(overview.kpis.netCents)}
					</p>
					<p className="mb-meta">
						of {formatCents(targetCents)}
						{overview.savings.progressPct != null
							? ` · ${Math.round(overview.savings.progressPct)}%`
							: ""}
					</p>
					<div
						className="mb-progress"
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round(progress)}
					>
						<span style={{ width: `${progress}%` }} />
					</div>
				</>
			) : (
				<p className="mb-meta mt-2">
					Set a monthly surplus to track. Progress uses income minus spending.
				</p>
			)}
			{editing ? (
				<form
					className="mb-inline-form"
					onSubmit={(event) => {
						event.preventDefault();
						const dollars = Number(draft);
						if (!Number.isFinite(dollars) || dollars < 0) return;
						save.mutate({ targetCents: Math.round(dollars * 100) });
					}}
				>
					<Input
						type="number"
						min={0}
						step="50"
						inputMode="decimal"
						placeholder="2000"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						aria-label="Monthly savings target in dollars"
					/>
					<Button type="submit" size="sm" disabled={save.isPending}>
						Save
					</Button>
				</form>
			) : (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-3"
					onClick={() => {
						setDraft(String(targetCents / 100));
						setEditing(true);
					}}
				>
					Edit target
				</Button>
			)}
		</div>
	);
}

function ReviewCard({ month }: { month: string }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const review = useQuery(trpc.insights.review.queryOptions({ month }));
	const started = useRef(new Set<string>());
	const regenerate = useMutation(
		trpc.insights.regenerateReview.mutationOptions({
			onSuccess: (status, variables) => {
				queryClient.setQueryData(
					trpc.insights.review.queryKey(variables),
					status,
				);
			},
		}),
	);

	useEffect(() => {
		if (review.data?.state !== "missing") return;
		if (started.current.has(month)) return;
		started.current.add(month);
		regenerate.mutate({ month });
	}, [month, regenerate, review.data?.state]);

	const data = review.data;
	const writing = regenerate.isPending;

	return (
		<div className="mb-panel">
			<div className="mb-section-head-row">
				<h2 className="mb-panel-title">Monthly review</h2>
				{data?.state === "ready" ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={writing}
						onClick={() => regenerate.mutate({ month })}
					>
						{writing ? "Writing…" : "Regenerate"}
					</Button>
				) : null}
			</div>
			{review.isError ? (
				<p className="mb-meta mt-3">Couldn’t load the saved review.</p>
			) : !data || review.isLoading ? (
				<p className="mb-meta mt-3">Loading review…</p>
			) : data.state === "unconfigured" ? (
				<p className="mb-meta mt-3">
					Monthly reviews need a Cursor API key on the server. Set{" "}
					<code>CURSOR_API_KEY</code> and restart. Create a key from the Cursor
					dashboard under API Keys. An optional <code>CURSOR_MODEL</code>{" "}
					overrides the default model.
				</p>
			) : data.state === "ready" ? (
				<ReviewBody review={data.review} />
			) : regenerate.isError ? (
				<p className="mb-meta mt-3">This month doesn’t have a review yet.</p>
			) : (
				<p className="mb-meta mt-3">Writing this month’s review…</p>
			)}
			{regenerate.isError ? (
				<p className="mt-3 text-sm text-[var(--mb-out)]">
					{regenerate.error.message}{" "}
					<button
						type="button"
						className="underline"
						onClick={() => regenerate.mutate({ month })}
					>
						Try again
					</button>
				</p>
			) : null}
		</div>
	);
}

function ReviewBody({
	review,
}: {
	review: Extract<ReviewStatus, { state: "ready" }>["review"];
}) {
	return (
		<div className="mt-3 grid gap-4">
			<p>{review.summary}</p>
			<div>
				<h3 className="mb-meta">Patterns</h3>
				<ul className="mb-list">
					{review.patterns.map((pattern) => (
						<li key={pattern}>{pattern}</li>
					))}
				</ul>
			</div>
			{review.anomalies.length > 0 ? (
				<div>
					<h3 className="mb-meta">Anomalies</h3>
					<ul className="mb-list">
						{review.anomalies.map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
				</div>
			) : null}
			<div>
				<h3 className="mb-meta">Ways to save</h3>
				<ul className="mb-list">
					{review.suggestions.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</div>
		</div>
	);
}

export function MonthOverviewView({
	month,
	onMonthChange,
	overview,
}: {
	month: string;
	onMonthChange: (month: string) => void;
	overview: MonthOverview;
}) {
	const maxCategory = Math.max(
		...overview.categories.map((category) => category.amountCents),
		1,
	);
	const daily = overview.trend
		.filter((point) => point.spendingCents != null)
		.map((point) => ({
			day: String(point.day),
			spending: (point.spendingCents ?? 0) / 100,
		}));
	const merchants = overview.topMerchants.map((merchant) => ({
		name: merchant.name,
		amount: merchant.amountCents / 100,
	}));
	const dailyPace =
		overview.pace.projectedCents != null && overview.pace.daysInMonth > 0
			? overview.pace.projectedCents / overview.pace.daysInMonth / 100
			: null;
	const rate = overview.kpis.savingsRatePct;

	return (
		<section className="mb-page">
			<header className="mb-section-head mb-section-head-row">
				<div>
					<p className="mb-eyebrow">Overview</p>
					<h1 className="mb-title">{formatMonthName(month)}</h1>
					<p className="mb-lede">
						What came in, what went out, and how it compares.
					</p>
				</div>
				<Input
					type="month"
					className="w-[180px]"
					value={month}
					onChange={(event) => onMonthChange(event.target.value)}
				/>
			</header>

			<div className="mb-stat-row">
				<div className="mb-stat">
					<p className="mb-stat-label">Income</p>
					<p className="mb-stat-value text-[var(--mb-in)]">
						{formatCents(overview.kpis.incomeCents)}
					</p>
					<DeltaLine
						cents={overview.kpis.incomeDeltaCents}
						pct={overview.kpis.incomeDeltaPct}
					/>
				</div>
				<div className="mb-stat">
					<p className="mb-stat-label">Spending</p>
					<p className="mb-stat-value text-[var(--mb-out)]">
						{formatCents(overview.kpis.spendingCents)}
					</p>
					<DeltaLine
						cents={overview.kpis.spendingDeltaCents}
						pct={overview.kpis.spendingDeltaPct}
						invert
					/>
				</div>
				<div className="mb-stat">
					<p className="mb-stat-label">Net</p>
					<p className="mb-stat-value">{formatCents(overview.kpis.netCents)}</p>
					<DeltaLine
						cents={overview.kpis.netDeltaCents}
						pct={overview.kpis.netDeltaPct}
					/>
				</div>
				<div className="mb-stat">
					<p className="mb-stat-label">Savings rate</p>
					<p className="mb-stat-value">
						{rate == null ? "—" : `${Math.round(rate)}%`}
					</p>
					<p className="mb-kpi-delta mb-delta-flat">
						{overview.kpis.savingsRateDeltaPct == null
							? "Net divided by income"
							: `${formatPct(overview.kpis.savingsRateDeltaPct)} pts vs last month`}
					</p>
				</div>
			</div>

			<div className="mb-overview-grid">
				<SavingsTarget overview={overview} month={month} />
				<ReviewCard month={month} />
			</div>

			<div className="mb-overview-grid">
				<div className="mb-panel">
					<h2 className="mb-panel-title">Daily spending</h2>
					<p className="mb-meta mt-1">{paceCopy(overview)}</p>
					{daily.length === 0 ? (
						<p className="mb-meta mt-4">No spending in this month yet.</p>
					) : (
						<ChartContainer
							config={dailyConfig}
							className="mt-3 aspect-auto h-56"
						>
							<BarChart data={daily}>
								<XAxis
									dataKey="day"
									tickLine={false}
									axisLine={false}
									interval="preserveStartEnd"
								/>
								<YAxis hide />
								<ChartTooltip
									content={
										<ChartTooltipContent
											formatter={(value) => moneyTooltip(value)}
										/>
									}
								/>
								{dailyPace != null ? (
									<ReferenceLine
										y={dailyPace}
										stroke="var(--color-pace)"
										strokeDasharray="4 4"
									/>
								) : null}
								<Bar
									dataKey="spending"
									fill="var(--color-spending)"
									radius={[4, 4, 0, 0]}
									maxBarSize={18}
								/>
							</BarChart>
						</ChartContainer>
					)}
				</div>

				<div className="mb-panel">
					<h2 className="mb-panel-title">Spending by category</h2>
					{overview.categories.length === 0 ? (
						<p className="mb-meta mt-4">No spending in this month yet.</p>
					) : (
						<ul className="mb-list">
							{overview.categories.map((category) => (
								<li key={category.name}>
									<div className="mb-list-row">
										<span>{category.name}</span>
										<span className="mb-amount">
											{formatCents(category.amountCents)}
										</span>
									</div>
									<div className="mb-bar">
										<span
											style={{
												width: `${(category.amountCents / maxCategory) * 100}%`,
											}}
										/>
									</div>
									<p className="mb-compare">
										<span>
											{category.deltaCents == null
												? "No prior month"
												: `${signedMoney(category.deltaCents)} vs last month`}
										</span>
										<span>
											{category.vsAverageCents == null
												? "No 3-month baseline"
												: `${signedMoney(category.vsAverageCents)} vs 3-month avg`}
										</span>
									</p>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className="mb-overview-grid">
				<div className="mb-panel">
					<h2 className="mb-panel-title">Biggest movers</h2>
					{overview.movers.length === 0 ? (
						<p className="mb-meta mt-3">Nothing moved against last month.</p>
					) : (
						<ul className="mb-list">
							{overview.movers.map((category) => (
								<li key={category.name} className="mb-list-row">
									<span>{category.name}</span>
									<span
										className={`mb-amount ${deltaClass(category.deltaCents ?? 0, true)}`}
									>
										{signedMoney(category.deltaCents ?? 0)}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="mb-panel">
					<h2 className="mb-panel-title">
						Recurring · {formatCents(overview.recurring.totalCents)}
					</h2>
					{overview.recurring.charges.length === 0 ? (
						<p className="mb-meta mt-3">No repeating charges this month.</p>
					) : (
						<ul className="mb-list">
							{overview.recurring.charges.map((charge) => (
								<li key={charge.merchant} className="mb-list-row">
									<span>
										{charge.merchant}
										<span className="mb-meta"> · {charge.monthsSeen} mo</span>
									</span>
									<span className="mb-amount">
										{formatCents(charge.amountCents)}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className="mb-overview-grid">
				<div className="mb-panel">
					<h2 className="mb-panel-title">New or unusual</h2>
					{overview.newMerchants.length + overview.unusualMerchants.length ===
					0 ? (
						<p className="mb-meta mt-3">Nothing new stood out.</p>
					) : (
						<ul className="mb-list">
							{overview.newMerchants.map((merchant) => (
								<li key={`new-${merchant.merchant}`} className="mb-list-row">
									<span>
										<span className="mb-pill">New</span>
										{merchant.merchant}
									</span>
									<span className="mb-amount">
										{formatCents(merchant.amountCents)}
									</span>
								</li>
							))}
							{overview.unusualMerchants.map((merchant) => (
								<li key={`odd-${merchant.merchant}`} className="mb-list-row">
									<span>
										<span className="mb-pill">High</span>
										{merchant.merchant}
										{merchant.typicalCents != null ? (
											<span className="mb-meta">
												{" "}
												· typical {formatCents(merchant.typicalCents)}
											</span>
										) : null}
									</span>
									<span className="mb-amount">
										{formatCents(merchant.amountCents)}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="mb-panel">
					<h2 className="mb-panel-title">Largest transactions</h2>
					{overview.largestTransactions.length === 0 ? (
						<p className="mb-meta mt-3">No spending in this month yet.</p>
					) : (
						<ul className="mb-list">
							{overview.largestTransactions.map((transaction) => (
								<li
									key={`${transaction.transactionDate}-${transaction.merchant}-${transaction.amountCents}`}
									className="mb-list-row"
								>
									<span>
										{transaction.merchant}
										<span className="mb-meta">
											{" "}
											· {transaction.categoryName} ·{" "}
											{transaction.transactionDate.slice(8)}
										</span>
									</span>
									<span className="mb-amount">
										{formatCents(transaction.amountCents)}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className="mb-panel mt-4">
				<h2 className="mb-panel-title">Top merchants</h2>
				{merchants.length === 0 ? (
					<p className="mb-meta mt-3">No spending in this month yet.</p>
				) : (
					<ChartContainer
						config={merchantConfig}
						className="mt-3 aspect-auto"
						style={{ height: Math.max(220, merchants.length * 36) }}
					>
						<BarChart
							data={merchants}
							layout="vertical"
							margin={{ left: 8, right: 12 }}
						>
							<XAxis type="number" hide />
							<YAxis
								type="category"
								dataKey="name"
								width={132}
								tickLine={false}
								axisLine={false}
							/>
							<ChartTooltip
								content={
									<ChartTooltipContent
										formatter={(value) => moneyTooltip(value)}
									/>
								}
							/>
							<Bar
								dataKey="amount"
								fill="var(--color-amount)"
								radius={[0, 4, 4, 0]}
								maxBarSize={16}
							/>
						</BarChart>
					</ChartContainer>
				)}
			</div>
		</section>
	);
}
