import type { MonthlyReview, ReviewContext } from "./review";

export type AiInsightsProvider = {
	readonly id: string;
	readonly configured: boolean;
	readonly modelId?: string;
	generateReview: (context: ReviewContext) => Promise<MonthlyReview>;
};

export class NullAiInsightsProvider implements AiInsightsProvider {
	readonly id = "null";
	readonly configured = false;

	async generateReview(): Promise<MonthlyReview> {
		throw new Error("Monthly reviews are not configured.");
	}
}

export function cursorApiKey(): string | undefined {
	const key = process.env.CURSOR_API_KEY?.trim();
	return key ? key : undefined;
}
