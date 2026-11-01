import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.warn(
		"DATABASE_URL is not set. Database calls will fail until it is configured.",
	);
}

export const db = drizzle(databaseUrl ?? "postgresql://invalid", { schema });
