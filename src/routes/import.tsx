import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "#/integrations/trpc/react";

export const Route = createFileRoute("/import")({
	component: ImportPage,
});

function ImportPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const strategies = useQuery(trpc.import.strategies.queryOptions());
	const [busy, setBusy] = useState(false);

	const upload = useMutation({
		...trpc.import.upload.mutationOptions(),
		onSuccess: async (result) => {
			toast.success(
				`Imported ${result.importedCount} via ${result.strategy.label} (${result.skippedDuplicateCount} duplicates skipped)`,
			);
			await queryClient.invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	async function onFiles(files: FileList | null) {
		if (!files?.length) return;
		setBusy(true);
		try {
			for (const file of Array.from(files)) {
				const text = await file.text();
				await upload.mutateAsync({ filename: file.name, text });
			}
		} finally {
			setBusy(false);
		}
	}

	return (
		<section className="mb-page">
			<header className="mb-section-head">
				<h1 className="mb-title">Import</h1>
				<p className="mb-lede">
					Drop CSV statements. Moneyball auto-detects the source and dedupes on
					fingerprint.
				</p>
			</header>

			<label className="mb-dropzone">
				<input
					type="file"
					accept=".csv,text/csv,application/pdf"
					multiple
					className="sr-only"
					disabled={busy}
					onChange={(event) => onFiles(event.target.files)}
				/>
				<span className="mb-dropzone-title">
					{busy ? "Importing…" : "Choose CSV or PDF files"}
				</span>
				<span className="mb-dropzone-copy">
					Supported today: Neo credit CSV, Scotia chequing CSV, Scotia credit
					CSV. Neo Everyday PDF is detected but not parsed yet.
				</span>
			</label>

			<div className="mb-panel mt-6">
				<h2 className="mb-panel-title">Strategies</h2>
				<ul className="divide-y divide-[var(--mb-line)]">
					{strategies.data?.map((strategy) => (
						<li
							key={strategy.id}
							className="flex items-center justify-between py-3"
						>
							<div>
								<p className="font-medium">{strategy.label}</p>
								<p className="text-sm text-[var(--mb-muted)]">
									{strategy.accountHint.institution} ·{" "}
									{strategy.accountHint.kind}
								</p>
							</div>
							<code className="text-xs text-[var(--mb-muted)]">
								{strategy.id}
							</code>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
