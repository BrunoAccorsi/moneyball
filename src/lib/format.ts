export const BUDGET_TIME_ZONE = "America/Edmonton";

export function formatCents(cents: number, currency = "CAD"): string {
	return new Intl.NumberFormat("en-CA", {
		style: "currency",
		currency,
	}).format(cents / 100);
}

export function calendarDate(
	now = new Date(),
	timeZone = BUDGET_TIME_ZONE,
): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);
}

export function currentMonth(now = new Date()): string {
	return calendarDate(now).slice(0, 7);
}
