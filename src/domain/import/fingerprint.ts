import { createHash } from "node:crypto";
import type { ImportSourceId } from "./types";

export function buildFingerprint(input: {
	sourceId: ImportSourceId;
	transactionDate: string;
	postedDate: string | null;
	description: string;
	amountCents: number;
	status: string | null;
}): string {
	const payload = [
		input.sourceId,
		input.transactionDate,
		input.postedDate ?? "",
		input.description.trim().toLowerCase(),
		String(input.amountCents),
		input.status ?? "",
	].join("|");

	return createHash("sha256").update(payload).digest("hex");
}
