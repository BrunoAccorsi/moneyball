import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "#/lib/utils";

const nav = [
	{ to: "/", label: "Overview" },
	{ to: "/transactions", label: "Transactions" },
	{ to: "/insights", label: "Insights" },
	{ to: "/categories", label: "Categories" },
	{ to: "/import", label: "Import" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	return (
		<div className="mb-shell min-h-screen">
			<div className="mb-atmosphere" aria-hidden />
			<header className="mb-topbar">
				<div className="mb-topbar-inner">
					<Link to="/" className="mb-brand" aria-label="Moneyball home">
						<img
							src="/brand/logo.svg"
							alt="Moneyball"
							className="mb-wordmark mb-for-light"
						/>
						<img
							src="/brand/logo-dark.svg"
							alt=""
							className="mb-wordmark mb-for-dark"
						/>
						<img
							src="/brand/mark.svg"
							alt=""
							className="mb-mark mb-for-light"
						/>
						<img
							src="/brand/mark-dark.svg"
							alt=""
							className="mb-mark mb-for-dark"
						/>
					</Link>
					<nav className="mb-nav" aria-label="Primary">
						{nav.map((item) => {
							const active =
								item.to === "/"
									? pathname === "/"
									: pathname.startsWith(item.to);
							return (
								<Link
									key={item.to}
									to={item.to}
									className={cn("mb-nav-link", active && "mb-nav-link-active")}
								>
									{item.label}
								</Link>
							);
						})}
					</nav>
				</div>
			</header>
			<main className="mb-main">{children}</main>
		</div>
	);
}
