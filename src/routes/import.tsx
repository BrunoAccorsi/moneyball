import { useMutation, useQueryClient } from "@tanstack/react-query";
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
	const [busy, setBusy] = useState(false);

	const upload = useMutation({
		...trpc.import.upload.mutationOptions(),
		onSuccess: async (result) => {
			const skipped =
				result.skippedDuplicateCount > 0
					? ` ${result.skippedDuplicateCount} already imported.`
					: "";
			toast.success(`Imported ${result.importedCount} transactions.${skipped}`);
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
					Add a bank statement. Matching rows that are already here are skipped.
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
					Neo credit, Scotiabank chequing, and Scotiabank credit CSV files. Neo
					Everyday PDF is recognized but not read yet.
				</span>
			</label>
		</section>
	);
}
