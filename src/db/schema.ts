import {
	boolean,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
	id: serial().primaryKey(),
	name: text().notNull(),
	institution: text().notNull(),
	kind: text().notNull(),
	currency: text().notNull().default("CAD"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
	id: serial().primaryKey(),
	name: text().notNull().unique(),
	slug: text().notNull().unique(),
	color: text().notNull().default("#334155"),
	isTransfer: boolean("is_transfer").notNull().default(false),
	isIncome: boolean("is_income").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categoryRules = pgTable("category_rules", {
	id: serial().primaryKey(),
	categoryId: integer("category_id")
		.notNull()
		.references(() => categories.id, { onDelete: "cascade" }),
	pattern: text().notNull(),
	matchField: text("match_field").notNull().default("merchant"),
	priority: integer().notNull().default(100),
	notes: text(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable(
	"transactions",
	{
		id: serial().primaryKey(),
		accountId: integer("account_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		categoryId: integer("category_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		transactionDate: text("transaction_date").notNull(),
		postedDate: text("posted_date"),
		status: text(),
		description: text().notNull(),
		merchant: text().notNull(),
		amountCents: integer("amount_cents").notNull(),
		sourceId: text("source_id").notNull(),
		fingerprint: text().notNull(),
		excludedFromBudget: boolean("excluded_from_budget")
			.notNull()
			.default(false),
		notes: text(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("transactions_fingerprint_uidx").on(table.fingerprint),
	],
);

export const budgetSettings = pgTable("budget_settings", {
	id: integer().primaryKey(),
	monthlySavingsTargetCents: integer("monthly_savings_target_cents")
		.notNull()
		.default(0),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiReviews = pgTable("ai_reviews", {
	month: text().primaryKey(),
	payload: jsonb().notNull(),
	model: text().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const importBatches = pgTable("import_batches", {
	id: serial().primaryKey(),
	sourceId: text("source_id").notNull(),
	filename: text().notNull(),
	importedCount: integer("imported_count").notNull().default(0),
	skippedDuplicateCount: integer("skipped_duplicate_count")
		.notNull()
		.default(0),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type CategoryRule = typeof categoryRules.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type ImportBatch = typeof importBatches.$inferSelect;
export type BudgetSettings = typeof budgetSettings.$inferSelect;
export type AiReviewRow = typeof aiReviews.$inferSelect;
