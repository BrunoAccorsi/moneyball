import { describe, expect, it } from "vitest";
import { cloudAgentCreateBody, DEFAULT_REVIEW_MODEL } from "../cloud-agent";

describe("cloud agent review request", () => {
	it("creates a no-repo agent with composer-2", () => {
		expect(DEFAULT_REVIEW_MODEL).toBe("composer-2");
		const body = cloudAgentCreateBody("review the month");
		expect(body).toEqual({
			name: "Moneyball monthly review",
			prompt: { text: "review the month" },
			model: {
				id: "composer-2",
				params: [{ id: "fast", value: "true" }],
			},
		});
		expect(body).not.toHaveProperty("repos");
	});
});
