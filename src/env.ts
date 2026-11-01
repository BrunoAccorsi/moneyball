import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().url().optional(),
		CURSOR_API_KEY: z.string().min(1).optional(),
		CURSOR_MODEL: z.string().min(1).optional(),
		SERVER_URL: z.string().url().optional(),
	},
	clientPrefix: "VITE_",
	client: {
		VITE_APP_TITLE: z.string().min(1).optional(),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});
