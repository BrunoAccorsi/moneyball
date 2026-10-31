import { displayMerchant } from "../display";
import { buildInsights, type InsightSourceRow } from "./rollup";

export type MonthOverviewOptions = {
	asOfDate: string;
	savingsTargetCents: number;
};

export type CategoryComparison = {
	name: string;
	amountCents: number;
	previousCents: number;
	deltaCents: number | null;
	deltaPct: number | null;
	threeMonthAvgCents: number;
	vsAverageCents: number | null;
	vsAveragePct: number | null;
};

export type MerchantSpend = {
	name: string;
	amountCents: number;
	count: number;
};

export type RecurringCharge = {
	merchant: string;
	amountCents: number;
	monthsSeen: number;
};

export type NotableMerchant = {
	merchant: string;
	amountCents: number;
	typicalCents: number | null;
};

export type LargestTransaction = {
	merchant: string;
	amountCents: number;
	transactionDate: string;
	categoryName: string;
};

export type DailySpendPoint = {
	date: string;
	day: number;
	spendingCents: number | null;
	cumulativeCents: number | null;
	paceCents: number | null;
};

const SUBSCRIPTION_SLUG = "subscriptions";
const RECURRING_WINDOW_MONTHS = 6;
const UNUSUAL_RATIO = 2;
const UNUSUAL_MIN_DELTA_CENTS = 2_000;

function monthKey(date: string): string {
	return date.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
	const [year, monthNumber] = month.split("-").map(Number);
	const date = new Date(
		Date.UTC(year ?? 1970, (monthNumber ?? 1) - 1 + delta, 1),
	);
	const nextYear = date.getUTCFullYear();
	const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
	return `${nextYear}-${nextMonth}`;
}

export function daysInMonth(month: string): number {
	const [year, monthNumber] = month.split("-").map(Number);
	return new Date(Date.UTC(year ?? 1970, monthNumber ?? 1, 0)).getUTCDate();
}

function countsInBudget(row: InsightSourceRow): boolean {
	return !row.excludedFromBudget && !row.isTransfer;
}

function stableRepeat(amounts: number[]): boolean {
	if (amounts.length < 2) return false;
	const min = Math.min(...amounts);
	const max = Math.max(...amounts);
	return min > 0 && max / min <= 1.5;
}

function percentChange(current: number, previous: number): number | null {
	if (previous === 0) return null;
	return ((current - previous) / previous) * 100;
}

export function savingsRatePct(
	netCents: number,
	incomeCents: number,
): number | null {
	if (incomeCents <= 0) return null;
	return (netCents / incomeCents) * 100;
}

type MonthBucket = {
	incomeCents: number;
	spendingCents: number;
	categories: Map<string, number>;
};

function emptyBucket(): MonthBucket {
	return { incomeCents: 0, spendingCents: 0, categories: new Map() };
}

function elapsedDays(month: string, asOfDate: string) {
	const total = daysInMonth(month);
	const asOfMonth = asOfDate.slice(0, 7);
	if (asOfMonth < month) {
		return { daysInMonth: total, daysElapsed: 0, closed: false };
	}
	if (asOfMonth > month) {
		return { daysInMonth: total, daysElapsed: total, closed: true };
	}
	const day = Number(asOfDate.slice(8, 10));
	const daysElapsed = Number.isFinite(day)
		? Math.min(total, Math.max(0, day))
		: 0;
	return {
		daysInMonth: total,
		daysElapsed,
		closed: daysElapsed >= total,
	};
}

export function buildMonthOverview(
	rows: InsightSourceRow[],
	month: string,
	options: MonthOverviewOptions,
) {
	const base = buildInsights(rows, month);
	const buckets = new Map<string, MonthBucket>();
	const activeMonths = new Set<string>();
	const merchantMonths = new Map<string, Map<string, number>>();
	const merchantCounts = new Map<string, number>();
	const merchantSlugs = new Map<string, Set<string>>();
	const largest: LargestTransaction[] = [];
	const spendByDay = new Map<number, number>();

	const ensureBucket = (key: string) => {
		const existing = buckets.get(key);
		if (existing) return existing;
		const created = emptyBucket();
		buckets.set(key, created);
		return created;
	};

	for (const row of rows) {
		if (!countsInBudget(row)) continue;
		const key = monthKey(row.transactionDate);
		activeMonths.add(key);
		const bucket = ensureBucket(key);
		if (row.amountCents > 0) {
			bucket.incomeCents += row.amountCents;
			continue;
		}
		if (row.amountCents === 0) continue;

		const spent = Math.abs(row.amountCents);
		bucket.spendingCents += spent;
		const category = row.categoryName ?? "Uncategorized";
		bucket.categories.set(
			category,
			(bucket.categories.get(category) ?? 0) + spent,
		);

		const merchant = displayMerchant(row.merchant);
		const history = merchantMonths.get(merchant) ?? new Map<string, number>();
		history.set(key, (history.get(key) ?? 0) + spent);
		merchantMonths.set(merchant, history);

		if (key !== month) continue;

		merchantCounts.set(merchant, (merchantCounts.get(merchant) ?? 0) + 1);
		if (row.categorySlug) {
			const slugs = merchantSlugs.get(merchant) ?? new Set<string>();
			slugs.add(row.categorySlug);
			merchantSlugs.set(merchant, slugs);
		}
		largest.push({
			merchant,
			amountCents: spent,
			transactionDate: row.transactionDate,
			categoryName: category,
		});
		if (row.transactionDate <= options.asOfDate) {
			const day = Number(row.transactionDate.slice(8, 10));
			if (Number.isFinite(day)) {
				spendByDay.set(day, (spendByDay.get(day) ?? 0) + spent);
			}
		}
	}

	const current = buckets.get(month) ?? emptyBucket();
	const previousMonth = shiftMonth(month, -1);
	const hasPrevious = activeMonths.has(previousMonth);
	const previous = buckets.get(previousMonth) ?? emptyBucket();
	const incomeCents = current.incomeCents;
	const spendingCents = current.spendingCents;
	const netCents = incomeCents - spendingCents;
	const previousNet = previous.incomeCents - previous.spendingCents;
	const rate = savingsRatePct(netCents, incomeCents);
	const previousRate = hasPrevious
		? savingsRatePct(previousNet, previous.incomeCents)
		: null;

	const baselineMonths = [1, 2, 3].map((offset) => shiftMonth(month, -offset));
	const hasBaseline = baselineMonths.some((key) => activeMonths.has(key));

	const categoryNames = new Set<string>([
		...current.categories.keys(),
		...(hasPrevious ? previous.categories.keys() : []),
	]);

	const compared: CategoryComparison[] = [...categoryNames].map((name) => {
		const amountCents = current.categories.get(name) ?? 0;
		const previousCents = previous.categories.get(name) ?? 0;
		const baselineTotal = baselineMonths.reduce((sum, key) => {
			return sum + (buckets.get(key)?.categories.get(name) ?? 0);
		}, 0);
		const threeMonthAvgCents = Math.round(baselineTotal / 3);
		return {
			name,
			amountCents,
			previousCents,
			deltaCents: hasPrevious ? amountCents - previousCents : null,
			deltaPct: hasPrevious ? percentChange(amountCents, previousCents) : null,
			threeMonthAvgCents,
			vsAverageCents: hasBaseline ? amountCents - threeMonthAvgCents : null,
			vsAveragePct: hasBaseline
				? percentChange(amountCents, threeMonthAvgCents)
				: null,
		};
	});

	const categories = compared
		.filter((category) => category.amountCents > 0)
		.sort((a, b) => b.amountCents - a.amountCents);

	const moverList = hasPrevious
		? compared
				.filter((category) => (category.deltaCents ?? 0) !== 0)
				.sort(
					(a, b) => Math.abs(b.deltaCents ?? 0) - Math.abs(a.deltaCents ?? 0),
				)
				.slice(0, 5)
		: [];

	const recurring: RecurringCharge[] = [];
	const fresh: NotableMerchant[] = [];
	const unusual: NotableMerchant[] = [];
	const hasHistory = [...activeMonths].some((key) => key < month);

	for (const [merchant] of merchantCounts) {
		const history = merchantMonths.get(merchant) ?? new Map<string, number>();
		const amountCents = history.get(month) ?? 0;
		const windowAmounts: number[] = [];
		for (let offset = 0; offset < RECURRING_WINDOW_MONTHS; offset += 1) {
			const value = history.get(shiftMonth(month, -offset)) ?? 0;
			if (value > 0) windowAmounts.push(value);
		}
		const subscription =
			merchantSlugs.get(merchant)?.has(SUBSCRIPTION_SLUG) ?? false;
		if (subscription || stableRepeat(windowAmounts)) {
			recurring.push({
				merchant,
				amountCents,
				monthsSeen: windowAmounts.length,
			});
		}

		const prior = [...history.entries()].filter(([key]) => key < month);
		if (prior.length === 0 && hasHistory && !subscription) {
			fresh.push({ merchant, amountCents, typicalCents: null });
			continue;
		}
		if (prior.length < 2) continue;
		const typicalCents = Math.round(
			prior.reduce((sum, [, value]) => sum + value, 0) / prior.length,
		);
		if (
			typicalCents > 0 &&
			amountCents >= typicalCents * UNUSUAL_RATIO &&
			amountCents - typicalCents >= UNUSUAL_MIN_DELTA_CENTS
		) {
			unusual.push({ merchant, amountCents, typicalCents });
		}
	}

	recurring.sort((a, b) => b.amountCents - a.amountCents);
	fresh.sort((a, b) => b.amountCents - a.amountCents);
	unusual.sort(
		(a, b) =>
			b.amountCents -
			(b.typicalCents ?? 0) -
			(a.amountCents - (a.typicalCents ?? 0)),
	);

	const {
		daysInMonth: monthLength,
		daysElapsed,
		closed,
	} = elapsedDays(month, options.asOfDate);
	let spentToDateCents = 0;
	for (const amount of spendByDay.values()) spentToDateCents += amount;
	const projectedCents =
		daysElapsed > 0
			? Math.round((spentToDateCents * monthLength) / daysElapsed)
			: null;

	const trend: DailySpendPoint[] = [];
	let cumulative = 0;
	for (let day = 1; day <= monthLength; day += 1) {
		const date = `${month}-${String(day).padStart(2, "0")}`;
		if (day <= daysElapsed) {
			const spending = spendByDay.get(day) ?? 0;
			cumulative += spending;
			trend.push({
				date,
				day,
				spendingCents: spending,
				cumulativeCents: cumulative,
				paceCents:
					projectedCents == null
						? null
						: Math.round((projectedCents * day) / monthLength),
			});
		} else {
			trend.push({
				date,
				day,
				spendingCents: null,
				cumulativeCents: null,
				paceCents:
					projectedCents == null
						? null
						: Math.round((projectedCents * day) / monthLength),
			});
		}
	}

	const topMerchants: MerchantSpend[] = [...merchantCounts.entries()]
		.map(([name, count]) => ({
			name,
			count,
			amountCents: merchantMonths.get(name)?.get(month) ?? 0,
		}))
		.sort((a, b) => b.amountCents - a.amountCents)
		.slice(0, 8);

	largest.sort(
		(a, b) =>
			b.amountCents - a.amountCents ||
			b.transactionDate.localeCompare(a.transactionDate),
	);

	const incomeDelta = hasPrevious ? incomeCents - previous.incomeCents : null;
	const spendingDelta = hasPrevious
		? spendingCents - previous.spendingCents
		: null;
	const netDelta = hasPrevious ? netCents - previousNet : null;

	return {
		month,
		totalSpendingCents: spendingCents,
		moneyInCents: incomeCents,
		moneyOutCents: spendingCents,
		netCashFlowCents: netCents,
		monthOverMonthChangePct: hasPrevious
			? percentChange(spendingCents, previous.spendingCents)
			: null,
		monthly: base.monthly,
		topCategories: categories.slice(0, 8).map((category) => ({
			name: category.name,
			amountCents: category.amountCents,
		})),
		topMerchants,
		kpis: {
			incomeCents,
			spendingCents,
			netCents,
			savingsRatePct: rate,
			previousIncomeCents: hasPrevious ? previous.incomeCents : null,
			previousSpendingCents: hasPrevious ? previous.spendingCents : null,
			previousNetCents: hasPrevious ? previousNet : null,
			previousSavingsRatePct: previousRate,
			incomeDeltaCents: incomeDelta,
			spendingDeltaCents: spendingDelta,
			netDeltaCents: netDelta,
			incomeDeltaPct: hasPrevious
				? percentChange(incomeCents, previous.incomeCents)
				: null,
			spendingDeltaPct: hasPrevious
				? percentChange(spendingCents, previous.spendingCents)
				: null,
			netDeltaPct: hasPrevious ? percentChange(netCents, previousNet) : null,
			savingsRateDeltaPct:
				rate != null && previousRate != null ? rate - previousRate : null,
		},
		savings: {
			targetCents: options.savingsTargetCents,
			netCents,
			progressPct:
				options.savingsTargetCents > 0
					? (netCents / options.savingsTargetCents) * 100
					: null,
		},
		categories,
		movers: moverList,
		recurring: {
			totalCents: recurring.reduce(
				(sum, charge) => sum + charge.amountCents,
				0,
			),
			charges: recurring.slice(0, 12),
		},
		newMerchants: fresh.slice(0, 8),
		unusualMerchants: unusual.slice(0, 8),
		largestTransactions: largest.slice(0, 8),
		trend,
		pace: {
			daysInMonth: monthLength,
			daysElapsed,
			closed,
			spentToDateCents,
			projectedCents,
		},
		comparedToAverage: hasBaseline,
	};
}

export type MonthOverview = ReturnType<typeof buildMonthOverview>;
