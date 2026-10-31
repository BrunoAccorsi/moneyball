export function dollarsToCents(value: string | number): number {
	const n =
		typeof value === "number" ? value : Number(value.replace(/,/g, "").trim());
	if (!Number.isFinite(n)) {
		throw new Error(`Invalid money value: ${value}`);
	}
	return Math.round(n * 100);
}

export function formatCents(cents: number, currency = "CAD"): string {
	return new Intl.NumberFormat("en-CA", {
		style: "currency",
		currency,
	}).format(cents / 100);
}

export function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}
