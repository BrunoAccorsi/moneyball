import { formatCad } from "../../../domain/format";
import { getSavingsTargetCents } from "../../../db/repo";
import { Flash } from "../../../components/flash";
import { saveTarget } from "../../../server/actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const params = await searchParams;
  const target = await getSavingsTargetCents();
  const dollars = (target / 100).toFixed(2);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="lede">The savings target is income minus normal spending. It starts at {formatCad(70000)}.</p>
        </div>
      </div>
      <Flash notice={params.notice} error={params.error} />
      <form action={saveTarget} className="panel category-form">
        <label>
          Monthly target (CAD)
          <input name="dollars" defaultValue={dollars} inputMode="decimal" required />
        </label>
        <button className="primary" type="submit">
          Save target
        </button>
      </form>
      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Sign-in</h2>
        <p>The password comes from AUTH_PASSWORD or AUTH_PASSWORD_HASH in the environment. It is checked with bcrypt and is not stored in the database. The session is an httpOnly cookie.</p>
      </section>
    </>
  );
}
