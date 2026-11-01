import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "#/integrations/trpc/react";

export const Route = createFileRoute("/import")({
	component: ImportPage,
});

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	const size = 0x8000;
	for (let index = 0; index < bytes.length; index += size) {
		binary += String.fromCharCode(...bytes.subarray(index, index + size));
	}
	return btoa(binary);
}

function ImportPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [busy, setBusy] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const dragDepth = useRef(0);

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

	async function onFiles(files: FileList | File[] | null) {
		if (!files?.length) return;
		setBusy(true);
		try {
			for (const file of Array.from(files)) {
				const isPdf =
					file.type === "application/pdf" ||
					file.name.toLowerCase().endsWith(".pdf");
				if (isPdf) {
					const bytes = new Uint8Array(await file.arrayBuffer());
					await upload.mutateAsync({
						filename: file.name,
						text: "",
						bytesBase64: bytesToBase64(bytes),
					});
				} else {
					await upload.mutateAsync({
						filename: file.name,
						text: await file.text(),
					});
				}
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

			<label
				className={dragOver ? "mb-dropzone mb-dropzone-active" : "mb-dropzone"}
				onDragEnter={(event) => {
					event.preventDefault();
					dragDepth.current += 1;
					setDragOver(true);
				}}
				onDragOver={(event) => event.preventDefault()}
				onDragLeave={() => {
					dragDepth.current -= 1;
					if (dragDepth.current <= 0) {
						dragDepth.current = 0;
						setDragOver(false);
					}
				}}
				onDrop={(event) => {
					event.preventDefault();
					dragDepth.current = 0;
					setDragOver(false);
					void onFiles(event.dataTransfer.files);
				}}
			>
				<input
					type="file"
					accept=".csv,text/csv,application/pdf"
					multiple
					className="sr-only"
					disabled={busy}
					onChange={(event) => {
						void onFiles(event.target.files);
						event.target.value = "";
					}}
				/>
				<span className="mb-dropzone-title">
					{busy ? "Importing…" : "Drop a statement here"}
				</span>
				<span className="mb-dropzone-copy">
					Or click to choose. CSV from Neo credit, Scotiabank chequing, and
					Scotiabank credit. PDF statements from Neo Chequing or Everyday.
				</span>
			</label>
		</section>
	);
}
