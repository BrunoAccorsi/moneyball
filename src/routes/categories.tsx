import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useTRPC } from "#/integrations/trpc/react";

export const Route = createFileRoute("/categories")({
	component: CategoriesPage,
});

function CategoriesPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { data } = useQuery(trpc.categories.list.queryOptions());
	const [pattern, setPattern] = useState("");
	const [categoryId, setCategoryId] = useState<number | "">("");

	const createRule = useMutation({
		...trpc.categories.createRule.mutationOptions(),
		onSuccess: async () => {
			toast.success("Rule added");
			setPattern("");
			await queryClient.invalidateQueries();
		},
	});

	const deleteRule = useMutation({
		...trpc.categories.deleteRule.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries();
		},
	});

	return (
		<section className="mb-page">
			<header className="mb-section-head">
				<h1 className="mb-title">Categories</h1>
				<p className="mb-lede">
					Rules are seeded from your household notes. Lower priority numbers
					win.
				</p>
			</header>

			<div className="mb-panel mb-6">
				<h2 className="mb-panel-title">Add rule</h2>
				<div className="mt-3 flex flex-col gap-3 md:flex-row">
					<select
						className="mb-select"
						value={categoryId}
						onChange={(event) =>
							setCategoryId(
								event.target.value ? Number(event.target.value) : "",
							)
						}
					>
						<option value="">Category</option>
						{data?.categories.map((category) => (
							<option key={category.id} value={category.id}>
								{category.name}
							</option>
						))}
					</select>
					<Input
						placeholder="Merchant or description pattern"
						value={pattern}
						onChange={(event) => setPattern(event.target.value)}
					/>
					<Button
						disabled={!categoryId || !pattern.trim()}
						onClick={() =>
							createRule.mutate({
								categoryId: Number(categoryId),
								pattern: pattern.trim(),
							})
						}
					>
						Add
					</Button>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-[240px_1fr]">
				<div className="mb-panel">
					<h2 className="mb-panel-title">Library</h2>
					<ul className="mt-3 space-y-2">
						{data?.categories.map((category) => (
							<li key={category.id} className="flex items-center gap-2 text-sm">
								<span
									className="size-2.5 rounded-full"
									style={{ background: category.color }}
								/>
								{category.name}
							</li>
						))}
					</ul>
				</div>

				<div className="mb-panel overflow-x-auto">
					<h2 className="mb-panel-title">Rules</h2>
					<table className="mt-3 w-full text-left text-sm">
						<thead>
							<tr className="text-[var(--mb-muted)]">
								<th className="py-2 font-medium">Priority</th>
								<th className="py-2 font-medium">Pattern</th>
								<th className="py-2 font-medium">Category</th>
								<th className="py-2 font-medium" />
							</tr>
						</thead>
						<tbody>
							{data?.rules.map((rule) => {
								const category = data.categories.find(
									(item) => item.id === rule.categoryId,
								);
								return (
									<tr
										key={rule.id}
										className="border-t border-[var(--mb-line)]"
									>
										<td className="py-2">{rule.priority}</td>
										<td className="py-2 font-medium">{rule.pattern}</td>
										<td className="py-2">
											{category?.name ?? rule.categoryId}
										</td>
										<td className="py-2 text-right">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => deleteRule.mutate({ id: rule.id })}
											>
												Delete
											</Button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}
