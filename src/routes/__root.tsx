import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { AppShell } from "#/components/AppShell";
import { Toaster } from "#/components/ui/sonner";
import TanStackQueryDevtools from "#/integrations/tanstack-query/devtools";
import type { TRPCRouter } from "#/integrations/trpc/router";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
	trpc: TRPCOptionsProxy<TRPCRouter>;
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);}catch(e){}})();`;

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{ title: "Moneyball" },
			{
				name: "description",
				content:
					"Personal budget app for importing statements, categorizing spending, and reading cash flow.",
			},
			{ name: "theme-color", content: "#16774A" },
			{ property: "og:type", content: "website" },
			{ property: "og:title", content: "Moneyball" },
			{
				property: "og:description",
				content:
					"Personal budget app for importing statements, categorizing spending, and reading cash flow.",
			},
			{ property: "og:image", content: "/og-image.png" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "Moneyball" },
			{ name: "twitter:image", content: "/og-image.png" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap",
			},
			{ rel: "icon", href: "/favicon.ico", sizes: "any" },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="font-sans antialiased">
				<AppShell>{children}</AppShell>
				<Toaster />
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
