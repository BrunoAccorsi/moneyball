const TRAILING_PLACES = new Set([
	"ab",
	"bc",
	"ca",
	"can",
	"canada",
	"calgary",
	"edmonton",
	"mb",
	"on",
	"qc",
	"toronto",
	"toron",
	"usa",
	"vancouver",
	"us",
]);

export function displayMerchant(raw: string): string {
	const cleaned = raw
		.replace(/[#*]+\s*\d*/g, " ")
		.replace(/[^\p{L}\p{N}&.'\s-]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();

	const tokens = cleaned.split(" ").filter(Boolean);
	while (tokens.length > 1) {
		const last = tokens[tokens.length - 1]?.toLowerCase() ?? "";
		if (!TRAILING_PLACES.has(last)) break;
		tokens.pop();
	}

	const name = tokens.join(" ");
	if (!name) return raw.trim();

	return name
		.toLowerCase()
		.replace(/(^|[\s.'-])(\p{L})/gu, (_, boundary: string, letter: string) => {
			return `${boundary}${letter.toUpperCase()}`;
		})
		.replace(/\.(Ca|Com|Net)\b/g, (suffix) => suffix.toLowerCase());
}

export function formatMonthTick(month: string): string {
	const [year, monthNumber] = month.split("-").map(Number);
	if (!year || !monthNumber) return month;
	return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleString("en-CA", {
		month: "short",
		timeZone: "UTC",
	});
}

export function formatMonthName(month: string): string {
	const [year, monthNumber] = month.split("-").map(Number);
	if (!year || !monthNumber) return month;
	return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleString("en-CA", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}
