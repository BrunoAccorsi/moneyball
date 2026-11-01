/** Model id from the Cloud Agents create example. */
export const DEFAULT_REVIEW_MODEL = "composer-2";

export type CloudAgentCreateBody = {
	name: string;
	prompt: { text: string };
	model: {
		id: string;
		params?: Array<{ id: string; value: string }>;
	};
};

export function cloudAgentCreateBody(
	prompt: string,
	modelId = DEFAULT_REVIEW_MODEL,
): CloudAgentCreateBody {
	return {
		name: "Moneyball monthly review",
		prompt: { text: prompt },
		model:
			modelId === DEFAULT_REVIEW_MODEL
				? { id: modelId, params: [{ id: "fast", value: "true" }] }
				: { id: modelId },
	};
}
