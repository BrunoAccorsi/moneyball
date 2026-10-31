export function formatCents(cents: number, currency = "CAD"): string {
	return new Intl.NumberFormat("en-CA", {
		style: "currency",
		currency,
	}).format(cents / 100);
}

export function currentMonth(): string {
	return new Date().toISOString().slice(0, 7);
}
