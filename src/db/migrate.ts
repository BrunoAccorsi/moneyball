import { readFileSync, readdirSync } from "fs";
import path from "path";
import { and, eq, notInArray } from "drizzle-orm";
import { allSeedRules } from "../domain/seed-rules";
import type { Rule } from "../domain/types";
import { getDb, getSql } from "./index";
import { rules, settings } from "./schema";

function ruleRow(rule: Rule) {
  return {
    id: rule.id,
    name: rule.name,
    descriptionPattern: rule.descriptionPattern ?? null,
    patternType: rule.patternType,
    amountCents: rule.amountCents ?? null,
    amountDirection: rule.amountDirection ?? null,
    dateExact: rule.date ?? null,
    dateFrom: rule.dateFrom ?? null,
    dateTo: rule.dateTo ?? null,
    accountKey: rule.accountKey ?? null,
    category: rule.category ?? null,
    setOneTime: rule.oneTime ?? null,
    setRecurring: rule.recurring ?? null,
    role: rule.role ?? null,
    reimbursementGroup: rule.reimbursementGroup ?? null,
    reimbursementAmountCents: rule.reimbursementAmountCents ?? null,
    priority: rule.priority,
    learned: rule.learned,
    note: rule.note ?? null,
  };
}

async function seed() {
  const db = getDb();
  const seeded = allSeedRules();
  const ids = seeded.map((rule) => rule.id);
  if (ids.length > 0) {
    await db.delete(rules).where(and(eq(rules.learned, false), notInArray(rules.id, ids)));
  }
  for (const rule of seeded) {
    const row = ruleRow(rule);
    await db
      .insert(rules)
      .values(row)
      .onConflictDoUpdate({
        target: rules.id,
        set: {
          name: row.name,
          descriptionPattern: row.descriptionPattern,
          patternType: row.patternType,
          amountCents: row.amountCents,
          amountDirection: row.amountDirection,
          dateExact: row.dateExact,
          dateFrom: row.dateFrom,
          dateTo: row.dateTo,
          accountKey: row.accountKey,
          category: row.category,
          setOneTime: row.setOneTime,
          setRecurring: row.setRecurring,
          role: row.role,
          reimbursementGroup: row.reimbursementGroup,
          reimbursementAmountCents: row.reimbursementAmountCents,
          priority: row.priority,
          learned: false,
          note: row.note,
        },
      });
  }
  await db.insert(settings).values({ key: "savings_target_cents", value: "70000" }).onConflictDoNothing();
}

export async function migrate(): Promise<void> {
  const sql = getSql();
  await sql`create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())`;
  const dir = path.join(process.cwd(), "drizzle");
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const applied = await sql<{ id: string }[]>`select id from schema_migrations where id = ${file}`;
    if (applied.length > 0) continue;
    const body = readFileSync(path.join(dir, file), "utf8");
    const statements = body
      .split(/;\s*(?:\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await sql.unsafe(statement);
    }
    await sql`insert into schema_migrations (id) values (${file})`;
  }
  await seed();
}

let pending: Promise<void> | null = null;

export function ensureMigrated(): Promise<void> {
  if (!pending) {
    pending = migrate().catch((error: unknown) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}
