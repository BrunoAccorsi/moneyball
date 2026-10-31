import { getSql } from "../../../db";
import { ensureMigrated } from "../../../db/migrate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    await ensureMigrated();
    await getSql()`select 1 as ok`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
