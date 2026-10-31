export type SeedCategory = {
	name: string;
	slug: string;
	color: string;
	isTransfer?: boolean;
	isIncome?: boolean;
};

export type SeedRule = {
	categorySlug: string;
	pattern: string;
	matchField?: "merchant" | "description";
	priority?: number;
	notes?: string;
};

export const SEED_CATEGORIES: SeedCategory[] = [
	{ name: "Salary", slug: "salary", color: "#0f766e", isIncome: true },
	{ name: "Transfers", slug: "transfers", color: "#64748b", isTransfer: true },
	{ name: "Rent", slug: "rent", color: "#1e3a5f" },
	{ name: "Brazil debt payments", slug: "brazil-debt", color: "#9a3412" },
	{ name: "Subscriptions", slug: "subscriptions", color: "#7c3aed" },
	{ name: "Gifts", slug: "gifts", color: "#be185d" },
	{ name: "Travel", slug: "travel", color: "#0369a1" },
	{ name: "Baby and home", slug: "baby-home", color: "#a16207" },
	{ name: "Home", slug: "home", color: "#854d0e" },
	{ name: "Health", slug: "health", color: "#0e7490" },
	{ name: "Auto", slug: "auto", color: "#334155" },
	{ name: "Rideshare", slug: "rideshare", color: "#475569" },
	{ name: "Dining", slug: "dining", color: "#c2410c" },
	{ name: "Groceries", slug: "groceries", color: "#15803d" },
	{ name: "Fuel", slug: "fuel", color: "#57534e" },
	{ name: "Parking", slug: "parking", color: "#57534e" },
	{ name: "Shopping", slug: "shopping", color: "#6d28d9" },
	{ name: "Fitness", slug: "fitness", color: "#b45309" },
	{ name: "Utilities", slug: "utilities", color: "#1d4ed8" },
	{ name: "Uncategorized", slug: "uncategorized", color: "#94a3b8" },
];

/**
 * Seeded from Bruno's categorization answers (Oct 2026) in rules.md,
 * plus common merchant patterns from the sample statements.
 */
export const SEED_RULES: SeedRule[] = [
	{
		categorySlug: "salary",
		pattern: "Transfer from NEO FINANCIAL T",
		priority: 10,
		notes: "Biweekly salary deposit",
	},
	{
		categorySlug: "transfers",
		pattern: "Payment Received - Thank you",
		priority: 10,
		notes: "Credit card payment / own-account move",
	},
	{
		categorySlug: "transfers",
		pattern: "Payment to Credit",
		priority: 10,
	},
	{
		categorySlug: "transfers",
		pattern: "crd. card bill payment",
		priority: 10,
	},
	{
		categorySlug: "transfers",
		pattern: "scotiabank transit",
		priority: 10,
	},
	{
		categorySlug: "transfers",
		pattern: "Bruno Accorsi Bergoli",
		priority: 10,
		notes: "Self e-transfers",
	},
	{
		categorySlug: "transfers",
		pattern: "Bruna",
		priority: 20,
		notes: "Household transfers, not income",
	},
	{
		categorySlug: "rent",
		pattern: "700 Shawnee",
		priority: 10,
		notes: "$1,950/month rent",
	},
	{
		categorySlug: "brazil-debt",
		pattern: "Wise Canada",
		priority: 10,
		notes: "Brazil credit card / debt payments",
	},
	{
		categorySlug: "subscriptions",
		pattern: "Amazon Channels",
		priority: 20,
	},
	{
		categorySlug: "subscriptions",
		pattern: "Kindle Unltd",
		priority: 20,
	},
	{
		categorySlug: "subscriptions",
		pattern: "apple.com/bill",
		priority: 20,
		notes: "AppleCare+ / iCloud",
	},
	{
		categorySlug: "subscriptions",
		pattern: "OPENAI",
		priority: 20,
	},
	{
		categorySlug: "subscriptions",
		pattern: "GROK XAI",
		priority: 20,
	},
	{
		categorySlug: "subscriptions",
		pattern: "netflix",
		priority: 20,
	},
	{
		categorySlug: "gifts",
		pattern: "AMAZON MARKETPLACE",
		priority: 40,
	},
	{
		categorySlug: "travel",
		pattern: "WestJet",
		priority: 15,
	},
	{
		categorySlug: "travel",
		pattern: "Archibald",
		priority: 40,
	},
	{
		categorySlug: "baby-home",
		pattern: "AMAZON.CA",
		priority: 50,
		notes: "Often baby/home purchases; refine with notes",
	},
	{
		categorySlug: "home",
		pattern: "The Brick",
		priority: 20,
	},
	{
		categorySlug: "home",
		pattern: "BK BRICK",
		priority: 20,
	},
	{
		categorySlug: "health",
		pattern: "Olive Branch Psychology",
		priority: 20,
	},
	{
		categorySlug: "health",
		pattern: "ULTIMA DENTAL",
		priority: 20,
	},
	{
		categorySlug: "auto",
		pattern: "KAL TIRE",
		priority: 20,
	},
	{
		categorySlug: "rideshare",
		pattern: "Lyft",
		priority: 20,
	},
	{
		categorySlug: "fitness",
		pattern: "F45",
		priority: 20,
	},
	{
		categorySlug: "fitness",
		pattern: "Twins, Triplets and More",
		priority: 20,
	},
	{
		categorySlug: "groceries",
		pattern: "SUPERSTORE",
		priority: 30,
	},
	{
		categorySlug: "groceries",
		pattern: "WAL-MART",
		priority: 30,
	},
	{
		categorySlug: "groceries",
		pattern: "SOBEYS",
		priority: 30,
	},
	{
		categorySlug: "groceries",
		pattern: "BULK BARN",
		priority: 30,
	},
	{
		categorySlug: "dining",
		pattern: "TIM HORTONS",
		priority: 40,
	},
	{
		categorySlug: "dining",
		pattern: "MCDONALD",
		priority: 40,
	},
	{
		categorySlug: "dining",
		pattern: "STARBUCKS",
		priority: 40,
	},
	{
		categorySlug: "dining",
		pattern: "CAFFE",
		priority: 40,
	},
	{
		categorySlug: "dining",
		pattern: "COFFEE",
		priority: 50,
	},
	{
		categorySlug: "dining",
		pattern: "BURGER",
		priority: 50,
	},
	{
		categorySlug: "dining",
		pattern: "FOOD",
		priority: 60,
	},
	{
		categorySlug: "fuel",
		pattern: "MOBIL",
		priority: 30,
	},
	{
		categorySlug: "parking",
		pattern: "PARK",
		priority: 50,
	},
	{
		categorySlug: "parking",
		pattern: "PARKING",
		priority: 30,
	},
	{
		categorySlug: "utilities",
		pattern: "ENMAX",
		priority: 20,
	},
	{
		categorySlug: "shopping",
		pattern: "Amazon",
		priority: 80,
	},
];
