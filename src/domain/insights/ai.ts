export type InsightContext = {
	month: string;
	totalSpendingCents: number;
	totalIncomeCents: number;
	topCategories: Array<{ name: string; amountCents: number }>;
	topMerchants: Array<{ name: string; amountCents: number }>;
	monthOverMonthChangePct: number | null;
};

export type AiInsight = {
	id: string;
	title: string;
	body: string;
	severity: "info" | "watch" | "positive";
};

export type AiInsightsProvider = {
	readonly id: string;
	readonly enabled: boolean;
	generate: (context: InsightContext) => Promise<AiInsight[]>;
};

export class NullAiInsightsProvider implements AiInsightsProvider {
	readonly id = "null";
	readonly enabled = false;

	async generate(): Promise<AiInsight[]> {
		return [];
	}
}

/**
 * Stub for a future Cursor SDK-backed insights module.
 * Kept behind the interface so wiring does not leak into chart pages.
 */
export class CursorSdkAiInsightsProvider implements AiInsightsProvider {
	readonly id = "cursor-sdk";
	readonly enabled: boolean;

	constructor(enabled = false) {
		this.enabled = enabled;
	}

	async generate(context: InsightContext): Promise<AiInsight[]> {
		if (!this.enabled) return [];

		void context;
		throw new Error(
			"Cursor SDK AI insights are not wired yet. Set AI_INSIGHTS_PROVIDER=null or implement the SDK client.",
		);
	}
}

export function createAiInsightsProvider(
	name = process.env.AI_INSIGHTS_PROVIDER ?? "null",
): AiInsightsProvider {
	switch (name) {
		case "cursor-sdk":
			return new CursorSdkAiInsightsProvider(true);
		default:
			return new NullAiInsightsProvider();
	}
}
