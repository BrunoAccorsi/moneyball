import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForSql = globalThis as unknown as { sql?: postgres.Sql };

export function getSql(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!globalForSql.sql) {
    globalForSql.sql = postgres(url, { max: 5 });
  }
  return globalForSql.sql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}
