import { CATEGORIES } from "../../../domain/types";
import { loadRules } from "../../../db/repo";
import { Flash } from "../../../components/flash";
import { addRule, removeRule } from "../../../server/actions";

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const params = await searchParams;
  const rules = await loadRules();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Rules</h1>
          <p className="lede">
            Built-in rules include the October 2026 answers and reload when the app starts. A rule you add uses the merchant text and wins over those defaults. Amount-specific answers, such as the stroller or the guitar, stay ahead of a broad merchant rule.
          </p>
        </div>
      </div>
      <Flash notice={params.notice} error={params.error} />
      <form action={addRule} className="panel category-form" style={{ marginBottom: 16 }}>
        <label>
          Merchant contains
          <input type="text" name="pattern" required placeholder="tim hortons" />
        </label>
        <label>
          Category
          <select name="category" required defaultValue="">
            <option value="" disabled>
              Choose
            </option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cadence
          <select name="cadence" defaultValue="auto">
            <option value="auto">Automatic</option>
            <option value="once">One-time</option>
            <option value="recurring">Recurring</option>
          </select>
        </label>
        <button className="primary" type="submit">
          Add rule
        </button>
      </form>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Match</th>
              <th>Category</th>
              <th>Priority</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>
                  {rule.name}
                  {rule.learned ? <span className="sub">Learned</span> : <span className="sub">Built-in</span>}
                  {rule.note ? <span className="sub">{rule.note}</span> : null}
                </td>
                <td>
                  <code>{rule.descriptionPattern}</code>
                  {rule.amountCents !== undefined ? <span className="sub">Amount {rule.amountCents}</span> : null}
                  {rule.date ? <span className="sub">{rule.date}</span> : null}
                </td>
                <td>{rule.category ?? rule.role ?? "—"}</td>
                <td>{rule.priority}</td>
                <td>
                  {rule.learned ? (
                    <form action={removeRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <button className="ghost" type="submit">
                        Delete
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
