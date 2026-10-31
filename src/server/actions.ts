"use server";

import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, verifyPassword } from "../auth/password";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, verifySessionToken } from "../auth/session";
import { dollarsToCents } from "../domain/format";
import { applyLlmCategories, ingest, type IngestFile } from "../domain/ingest";
import { llmCategorize } from "../domain/llm";
import { detectAndParse } from "../domain/parsers";
import { pdfPayloadToParseResult, type PdfParsePayload } from "../domain/pdf";
import { isCategory, type Category } from "../domain/types";
import {
  answerTransaction,
  deleteLearnedRule,
  insertLearnedRule,
  loadFileHashes,
  loadRules,
  loadTransactions,
  saveLedger,
  setCadence as saveCadence,
  setSavingsTargetCents,
} from "../db/repo";

const MAX_BYTES = 10 * 1024 * 1024;

async function requireUser(): Promise<void> {
  const jar = await cookies();
  const ok = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!ok) redirect("/login");
}

function safeNext(value: FormDataEntryValue | null, fallback: string): string {
  const next = String(value ?? "");
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export async function login(formData: FormData): Promise<void> {
  if (!authConfigured()) redirect("/login?error=config");
  const password = String(formData.get("password") ?? "");
  const ok = await verifyPassword(password);
  if (!ok) redirect("/login?error=1");
  const token = await createSessionToken();
  const headerStore = await headers();
  const secure = headerStore.get("x-forwarded-proto") === "https";
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

async function parsePdf(bytes: Uint8Array, fileName: string) {
  const base = (process.env.PDF_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)]), fileName);
  let response: Response;
  try {
    response = await fetch(`${base}/parse`, { method: "POST", body: form });
  } catch {
    throw new Error("The PDF service is not running. CSV files in this upload are still imported.");
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(detail || `PDF service returned ${response.status}`);
  }
  const payload = (await response.json()) as PdfParsePayload;
  return pdfPayloadToParseResult(payload);
}

export async function importFiles(formData: FormData): Promise<void> {
  await requireUser();
  const uploads = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (uploads.length === 0) redirect("/upload?error=Choose%20at%20least%20one%20CSV%20or%20PDF.");

  const files: IngestFile[] = [];
  const notes: string[] = [];
  try {
    for (const upload of uploads) {
      if (upload.size > MAX_BYTES) {
        notes.push(`${upload.name} is larger than 10 MB and was skipped.`);
        continue;
      }
      const bytes = Buffer.from(await upload.arrayBuffer());
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const pdf = upload.name.toLowerCase().endsWith(".pdf") || upload.type === "application/pdf";
      if (pdf) {
        const parsed = await parsePdf(bytes, upload.name);
        if (!parsed.implemented) {
          notes.push(`${upload.name}: ${parsed.warnings.join(" ") || "PDF layout is not implemented yet, so nothing was imported."}`);
          continue;
        }
        files.push({ fileName: upload.name, sha256, parsed });
        notes.push(...parsed.warnings.map((warning) => `${upload.name}: ${warning}`));
        continue;
      }
      const content = bytes.toString("utf8");
      const parsed = detectAndParse(content, upload.name);
      files.push({ fileName: upload.name, sha256, parsed });
      notes.push(...parsed.warnings.map((warning) => `${upload.name}: ${warning}`));
    }

    const existing = await loadTransactions();
    const rules = await loadRules();
    const hashes = await loadFileHashes();
    let result = ingest({ files, existingFileHashes: hashes, existing, rules });
    const apiKey = process.env.CATEGORIZATION_LLM_API_KEY;
    if (apiKey) {
      const suggestions = new Map<string, Category>();
      for (const transaction of result.transactions) {
        if (!result.newIds.includes(transaction.id) || transaction.category || transaction.isExcluded) continue;
        try {
          const category = await llmCategorize(
            {
              description: transaction.description,
              amountCents: transaction.amountCents,
              date: transaction.date,
            },
            {
              apiKey,
              baseUrl: process.env.CATEGORIZATION_LLM_BASE_URL,
              model: process.env.CATEGORIZATION_LLM_MODEL,
            },
          );
          if (category) suggestions.set(transaction.id, category);
        } catch {
          // Leave the row in the review queue.
        }
      }
      result = { ...result, transactions: applyLlmCategories(result.transactions, suggestions) };
    }

    const importedFiles = result.imported.flatMap((item) => {
      const file = files.find((candidate) => candidate.fileName === item.fileName && candidate.sha256);
      if (!file) return [];
      return [{ sha256: file.sha256, fileName: file.fileName, source: item.source }];
    });
    await saveLedger(result.transactions, importedFiles);

    const added = result.newIds.length;
    const skipped = result.skippedFiles.length + result.imported.reduce((sum, file) => sum + file.skipped, 0);
    const summary = [`Imported ${added} transaction${added === 1 ? "" : "s"}.`, skipped ? `Skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.` : ""]
      .filter(Boolean)
      .join(" ");
    const notice = [summary, ...notes].filter(Boolean).join(" ").slice(0, 900);
    redirect(`/upload?notice=${encodeURIComponent(notice)}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : "Import failed.";
    redirect(`/upload?error=${encodeURIComponent(message.slice(0, 400))}`);
  }
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function cadenceOverrides(value: string): { oneTimeOverride: boolean | null; recurringOverride: boolean | null } {
  if (value === "once") return { oneTimeOverride: true, recurringOverride: false };
  if (value === "recurring") return { oneTimeOverride: false, recurringOverride: true };
  return { oneTimeOverride: null, recurringOverride: null };
}

export async function answerReview(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const rawCategory = String(formData.get("category") ?? "");
  const category = rawCategory && isCategory(rawCategory) ? rawCategory : null;
  const cadence = cadenceOverrides(String(formData.get("cadence") ?? "auto"));
  const excluded = formData.get("exclude") === "on";
  await answerTransaction({ id, category, excluded, ...cadence });
  if (formData.get("remember") === "on" && category) {
    const pattern = String(formData.get("pattern") ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 80);
    if (pattern) {
      await insertLearnedRule({
        pattern,
        category,
        oneTime: cadence.oneTimeOverride === true ? true : undefined,
        recurring: cadence.recurringOverride === true ? true : undefined,
      });
    }
  }
  redirect(safeNext(formData.get("next"), "/review"));
}

export async function toggleOneTime(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const cadence = formData.get("cadence") === "once" ? "once" : "normal";
  await saveCadence(id, cadence);
  redirect(safeNext(formData.get("next"), "/transactions"));
}

export async function addRule(formData: FormData): Promise<void> {
  await requireUser();
  const pattern = String(formData.get("pattern") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 80);
  const rawCategory = String(formData.get("category") ?? "");
  if (!pattern || !isCategory(rawCategory)) redirect("/rules?error=Enter%20a%20merchant%20and%20a%20category.");
  const cadence = cadenceOverrides(String(formData.get("cadence") ?? "auto"));
  await insertLearnedRule({
    pattern,
    category: rawCategory,
    oneTime: cadence.oneTimeOverride === true ? true : undefined,
    recurring: cadence.recurringOverride === true ? true : undefined,
  });
  redirect("/rules?notice=Rule%20saved");
}

export async function removeRule(formData: FormData): Promise<void> {
  await requireUser();
  try {
    await deleteLearnedRule(String(formData.get("id") ?? ""));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete that rule.";
    redirect(`/rules?error=${encodeURIComponent(message)}`);
  }
  redirect("/rules?notice=Rule%20deleted");
}

export async function saveTarget(formData: FormData): Promise<void> {
  await requireUser();
  try {
    const cents = dollarsToCents(String(formData.get("dollars") ?? ""));
    if (cents < 0) throw new Error("Target cannot be negative.");
    await setSavingsTargetCents(cents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the target.";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }
  redirect("/settings?notice=Target%20saved");
}
