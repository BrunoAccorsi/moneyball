import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "../../auth/session";
import { Nav } from "../../components/nav";
import { countReview } from "../../db/repo";
import { logout } from "../../server/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const ok = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!ok) redirect("/login");
  const reviewCount = await countReview();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <a className="brand" href="/">
            Moneyball
          </a>
          <p className="brand-sub">Household ledger, CAD</p>
        </div>
        <Nav reviewCount={reviewCount} />
        <form action={logout} className="logout">
          <button type="submit">Log out</button>
        </form>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
