import type { AiInsightsProvider } from "#/domain/insights/ai";
import {
	cloudAgentCreateBody,
	DEFAULT_REVIEW_MODEL,
} from "#/domain/insights/cloud-agent";
import {
	buildReviewPrompt,
	type MonthlyReview,
	parseMonthlyReview,
	type ReviewContext,
} from "#/domain/insights/review";

const AGENTS_URL = "https://api.cursor.com/v1/agents";
const POLL_INTERVAL_MS = 2_000;
const POLL_DEADLINE_MS = 4 * 60 * 1_000;
const TERMINAL = new Set(["FINISHED", "ERROR", "CANCELLED", "EXPIRED"]);

type CreatedAgent = {
	agent?: { id?: string };
	run?: { id?: string };
};

type AgentRun = {
	status?: string;
	result?: string;
};

function publicMessage(message: string, apiKey: string): string {
	if (!message || message.includes(apiKey)) return "";
	return message.slice(0, 240);
}

function authHeader(apiKey: string): string {
	return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

async function cursorRequest(
	apiKey: string,
	url: string,
	init?: RequestInit,
): Promise<unknown> {
	const response = await fetch(url, {
		...init,
		headers: {
			Authorization: authHeader(apiKey),
			"Content-Type": "application/json",
			...(init?.headers ?? {}),
		},
	});
	const text = await response.text();
	let body: unknown = null;
	if (text) {
		try {
			body = JSON.parse(text) as unknown;
		} catch {
			body = text;
		}
	}
	if (!response.ok) {
		const message =
			body && typeof body === "object" && "message" in body
				? String(body.message)
				: "";
		throw new Error(
			publicMessage(message, apiKey) ||
				"Couldn’t write this month’s review. Check CURSOR_API_KEY and try again.",
		);
	}
	return body;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export class CursorSdkAiInsightsProvider implements AiInsightsProvider {
	readonly id = "cursor-cloud-agent";
	readonly configured = true;
	readonly modelId: string;

	constructor(
		private readonly apiKey: string,
		modelId = process.env.CURSOR_MODEL?.trim() || DEFAULT_REVIEW_MODEL,
	) {
		this.modelId = modelId;
	}

	async generateReview(context: ReviewContext): Promise<MonthlyReview> {
		const created = (await cursorRequest(this.apiKey, AGENTS_URL, {
			method: "POST",
			body: JSON.stringify(
				cloudAgentCreateBody(buildReviewPrompt(context), this.modelId),
			),
		})) as CreatedAgent;
		const agentId = created.agent?.id;
		const runId = created.run?.id;
		if (!agentId || !runId) {
			throw new Error("The review did not start. Try again.");
		}

		try {
			const run = await this.waitForRun(agentId, runId);
			if (run.status !== "FINISHED" || !run.result?.trim()) {
				throw new Error("The review did not finish. Try again.");
			}
			return parseMonthlyReview(run.result);
		} finally {
			await cursorRequest(this.apiKey, `${AGENTS_URL}/${agentId}`, {
				method: "DELETE",
			}).catch(() => undefined);
		}
	}

	private async waitForRun(agentId: string, runId: string): Promise<AgentRun> {
		const deadline = Date.now() + POLL_DEADLINE_MS;
		while (Date.now() < deadline) {
			const run = (await cursorRequest(
				this.apiKey,
				`${AGENTS_URL}/${agentId}/runs/${runId}`,
			)) as AgentRun;
			if (run.status && TERMINAL.has(run.status)) return run;
			await sleep(POLL_INTERVAL_MS);
		}
		throw new Error("The review did not finish. Try again.");
	}
}
