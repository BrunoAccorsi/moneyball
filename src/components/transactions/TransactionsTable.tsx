import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { displayMerchant } from "#/domain/display";
import { formatCents } from "#/lib/format";
import {
	filterTransactions,
	type SearchableTransaction,
} from "#/lib/transaction-search";

const columnHelper = createColumnHelper<SearchableTransaction>();

const columns = [
	columnHelper.accessor("transactionDate", {
		header: "Date",
		cell: (info) => info.getValue(),
	}),
	columnHelper.accessor("merchant", {
		header: "Merchant",
		cell: (info) => (
			<div>
				<div className="font-medium text-[var(--mb-ink)]">
					{displayMerchant(info.getValue())}
				</div>
				<div className="text-xs text-[var(--mb-muted)]">
					{info.row.original.description}
				</div>
			</div>
		),
	}),
	columnHelper.accessor("categoryName", {
		header: "Category",
		cell: (info) => info.getValue() ?? "Uncategorized",
	}),
	columnHelper.accessor("accountName", {
		header: "Account",
		cell: (info) => info.getValue() ?? "—",
	}),
	columnHelper.accessor("amountCents", {
		header: "Amount",
		cell: (info) => {
			const value = info.getValue();
			return (
				<span
					className={`mb-amount font-semibold ${value < 0 ? "text-[var(--mb-out)]" : "text-[var(--mb-in)]"}`}
				>
					{formatCents(value)}
				</span>
			);
		},
	}),
];

export function TransactionsTable({ rows }: { rows: SearchableTransaction[] }) {
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "transactionDate", desc: true },
	]);
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState("");
	const [account, setAccount] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");

	const filtered = useMemo(
		() =>
			filterTransactions(rows, {
				query,
				category: category || undefined,
				account: account || undefined,
				from: from || undefined,
				to: to || undefined,
			}),
		[rows, query, category, account, from, to],
	);

	const table = useReactTable({
		data: filtered,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: { pagination: { pageSize: 20 } },
	});

	return (
		<div className="space-y-4">
			<div className="mb-filter-grid">
				<Input
					placeholder="Fuzzy search merchant, category, account…"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
				<Input
					placeholder="Category"
					value={category}
					onChange={(event) => setCategory(event.target.value)}
				/>
				<Input
					placeholder="Account"
					value={account}
					onChange={(event) => setAccount(event.target.value)}
				/>
				<Input
					type="date"
					value={from}
					onChange={(event) => setFrom(event.target.value)}
				/>
				<Input
					type="date"
					value={to}
					onChange={(event) => setTo(event.target.value)}
				/>
			</div>

			<div className="mb-panel overflow-hidden">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className="cursor-pointer select-none"
										onClick={header.column.getToggleSortingHandler()}
									>
										{flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
										{{
											asc: " ↑",
											desc: " ↓",
										}[header.column.getIsSorted() as string] ?? null}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No transactions match these filters.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-between gap-3">
				<p className="text-sm text-[var(--mb-muted)]">
					{filtered.length} result{filtered.length === 1 ? "" : "s"}
				</p>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
