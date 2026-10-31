CREATE TABLE "ai_reviews" (
	"month" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"monthly_savings_target_cents" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
