"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Dashboard"],
  ["/upload", "Upload"],
  ["/review", "Review"],
  ["/transactions", "Transactions"],
  ["/rules", "Rules"],
  ["/settings", "Settings"],
];

export function Nav({ reviewCount }: { reviewCount: number }) {
  const pathname = usePathname();
  return (
    <nav className="nav">
      {LINKS.map(([href, label]) => {
        const current = href === "/" ? pathname === "/" : pathname.startsWith(href);
        const text = href === "/review" && reviewCount > 0 ? `${label} (${reviewCount})` : label;
        return (
          <Link key={href} href={href} aria-current={current ? "page" : undefined}>
            {text}
          </Link>
        );
      })}
    </nav>
  );
}
