CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"institution" text NOT NULL,
	"kind" text NOT NULL,
	"currency" text DEFAULT 'CAD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text DEFAULT '#334155' NOT NULL,
	"is_transfer" boolean DEFAULT false NOT NULL,
	"is_income" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"pattern" text NOT NULL,
	"match_field" text DEFAULT 'merchant' NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"filename" text NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"skipped_duplicate_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"category_id" integer,
	"transaction_date" text NOT NULL,
	"posted_date" text,
	"status" text,
	"description" text NOT NULL,
	"merchant" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"source_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"excluded_from_budget" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_fingerprint_uidx" ON "transactions" USING btree ("fingerprint");