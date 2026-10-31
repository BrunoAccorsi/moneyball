import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured } from "../../auth/password";
import { SESSION_COOKIE, verifySessionToken } from "../../auth/session";
import { login } from "../../server/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const jar = await cookies();
  if (await verifySessionToken(jar.get(SESSION_COOKIE)?.value)) redirect("/");
  const params = await searchParams;
  const configured = authConfigured();
  return (
    <div className="login-wrap">
      <div className="login-card panel">
        <h1>Moneyball</h1>
        <p className="lede">One household. Sign in to open the ledger.</p>
        {!configured ? <p className="banner error">Set AUTH_PASSWORD or AUTH_PASSWORD_HASH before signing in.</p> : null}
        {params.error === "1" ? <p className="banner error">That password does not match.</p> : null}
        {params.error === "config" ? <p className="banner error">Password is not configured.</p> : null}
        <form action={login}>
          <label>
            Password
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button className="primary" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
