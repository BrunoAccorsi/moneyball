import { Agent } from "@cursor/sdk";
import type { AiInsightsProvider } from "#/domain/insights/ai";
import {
	buildReviewPrompt,
	type MonthlyReview,
	parseMonthlyReview,
	type ReviewContext,
} from "#/domain/insights/review";

const DEFAULT_MODEL = "composer-2.5";

function publicMessage(message: string, apiKey: string): string {
	if (!message || message.includes(apiKey)) return "";
	return message.slice(0, 240);
}

export class CursorSdkAiInsightsProvider implements AiInsightsProvider {
	readonly id = "cursor-sdk";
	readonly configured = true;
	readonly modelId: string;

	constructor(
		private readonly apiKey: string,
		modelId = process.env.CURSOR_MODEL?.trim() || DEFAULT_MODEL,
	) {
		this.modelId = modelId;
	}

	async generateReview(context: ReviewContext): Promise<MonthlyReview> {
		let result: Awaited<ReturnType<typeof Agent.prompt>>;
		try {
			result = await Agent.prompt(buildReviewPrompt(context), {
				apiKey: this.apiKey,
				model: { id: this.modelId },
				cloud: { repos: [] },
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "";
			throw new Error(
				publicMessage(message, this.apiKey) ||
					"Couldn’t write this month’s review. Check CURSOR_API_KEY and try again.",
			);
		}

		if (result.status !== "finished" || !result.result?.trim()) {
			const detail = publicMessage(result.error?.message ?? "", this.apiKey);
			throw new Error(detail || "The review did not finish. Try again.");
		}

		return parseMonthlyReview(result.result);
	}
}
