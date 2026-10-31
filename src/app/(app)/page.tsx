import Link from "next/link";
import { formatCad, formatMonth, shiftMonth } from "../../domain/format";
import { distinctMonths, summarize } from "../../domain/summary";
import { getSavingsTargetCents, loadTransactions } from "../../db/repo";

function thisMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function signed(cents: number): string {
  if (cents > 0) return `+${formatCad(cents)}`;
  return formatCad(cents);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const params = await searchParams;
  const transactions = await loadTransactions();
  const months = distinctMonths(transactions);
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : (months.at(-1) ?? thisMonth());
  const view = params.view === "normal" ? "normal" : "all";
  const summary = summarize(transactions, month, view);
  const headline = summarize(transactions, month, "all");
  const previousMonth = shiftMonth(month, -1);
  const previousHeadline = summarize(transactions, previousMonth, "all");
  const currentSpend = view === "normal" ? headline.normalCents : headline.spendingCents;
  const previousSpend = view === "normal" ? previousHeadline.normalCents : previousHeadline.spendingCents;
  const hasPrevious = transactions.some((transaction) => transaction.date.startsWith(previousMonth));
  const target = await getSavingsTargetCents();
  const progress = target > 0 ? Math.max(0, Math.min(100, Math.round((headline.netWithoutOneOffsCents / target) * 100))) : 0;
  const maxCategory = Math.max(...summary.byCategory.map((row) => row.cents), 1);
  const monthChoices = months.includes(month) ? months : [...months, month].sort();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{formatMonth(month)}</h1>
          <p className="lede">Income, spending, and what is left after the month’s ordinary bills.</p>
        </div>
        <div className="month-switch">
          <Link href={`/?month=${shiftMonth(month, -1)}&view=${view}`}>Previous</Link>
          {monthChoices.map((choice) => (
            <Link key={choice} href={`/?month=${choice}&view=${view}`} aria-current={choice === month ? "page" : undefined}>
              {choice}
            </Link>
          ))}
          <Link href={`/?month=${shiftMonth(month, 1)}&view=${view}`}>Next</Link>
        </div>
      </div>

      <div className="toggle" style={{ marginBottom: 16 }}>
        <Link href={`/?month=${month}&view=all`} aria-current={view === "all" ? "true" : undefined}>
          All spending
        </Link>
        <Link href={`/?month=${month}&view=normal`} aria-current={view === "normal" ? "true" : undefined}>
          Normal spending
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="panel">
          <h2>Nothing imported yet</h2>
          <p>Upload a month of CSV exports to see income, spending, and what is waiting for a category.</p>
          <p>
            <Link className="primary" href="/upload" style={{ display: "inline-block" }}>
              Upload statements
            </Link>
          </p>
        </div>
      ) : null}

      {headline.incomeCents === 0 && headline.spendingCents > 0 ? (
        <p className="callout">
          Income is $0.00 in this import. Salary, Simply Benefits, interest, and rent live on the Neo Everyday statement, which is PDF-only and not parsed yet.
        </p>
      ) : null}

      <section className="stats">
        <article className="stat in">
          <span>Income</span>
          <strong>{formatCad(headline.incomeCents)}</strong>
        </article>
        <article className="stat out">
          <span>{view === "normal" ? "Normal spending" : "Total spending"}</span>
          <strong>{formatCad(view === "normal" ? headline.normalCents : headline.spendingCents)}</strong>
          <em>{view === "normal" ? "One-offs hidden" : `Includes ${formatCad(headline.oneTimeCents)} one-time`}</em>
        </article>
        <article className="stat">
          <span>One-time</span>
          <strong>{formatCad(headline.oneTimeCents)}</strong>
        </article>
        <article className={headline.netWithoutOneOffsCents >= 0 ? "stat in" : "stat out"}>
          <span>Net without one-offs</span>
          <strong>{signed(headline.netWithoutOneOffsCents)}</strong>
          <em>With one-offs {signed(headline.netWithOneOffsCents)}</em>
        </article>
      </section>

      <section className="panel">
        <h2>Savings target</h2>
        <p className="lede">
          {formatCad(headline.netWithoutOneOffsCents)} of {formatCad(target)} this month, measured as income minus normal spending.
        </p>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p>{progress}% of the target.</p>
      </section>

      <div className="split">
        <section className="panel">
          <h2>{view === "normal" ? "Normal categories" : "Categories"}</h2>
          {summary.byCategory.length === 0 ? <p className="empty">No spending in this view.</p> : null}
          {summary.byCategory.map((row) => (
            <div className="bar-row" key={row.category}>
              <span>{row.category}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.max(4, (row.cents / maxCategory) * 100)}%` }} />
              </div>
              <b>{formatCad(row.cents)}</b>
            </div>
          ))}
        </section>
        <div className="stack">
          <section className="panel">
            <h2>Recurring</h2>
            {headline.recurring.length === 0 ? <p className="empty">No recurring charges detected this month.</p> : null}
            <ul className="list">
              {headline.recurring.map((row) => (
                <li key={row.merchant}>
                  <span>{row.merchant}</span>
                  <span className="money out">{formatCad(row.cents)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>Top merchants</h2>
            {summary.topMerchants.length === 0 ? <p className="empty">No merchants in this view.</p> : null}
            <ul className="list">
              {summary.topMerchants.map((row) => (
                <li key={row.merchant}>
                  <span>{row.merchant}</span>
                  <span className="money out">{formatCad(row.cents)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="panel" style={{ marginTop: 12 }}>
        <h2>Compared with {formatMonth(previousMonth)}</h2>
        {hasPrevious ? (
          <div className="mom">
            <div>
              <span>Income</span>
              <strong>{signed(headline.incomeCents - previousHeadline.incomeCents)}</strong>
            </div>
            <div>
              <span>{view === "normal" ? "Normal spending" : "Spending"}</span>
              <strong>{signed(currentSpend - previousSpend)}</strong>
            </div>
            <div>
              <span>Net without one-offs</span>
              <strong>{signed(headline.netWithoutOneOffsCents - previousHeadline.netWithoutOneOffsCents)}</strong>
            </div>
          </div>
        ) : (
          <p className="empty">No earlier month is imported yet.</p>
        )}
        <p className="lede">
          Reimbursements applied this month: {formatCad(headline.reimbursedCents)}. Rent in this import: {formatCad(headline.rentCents)}.
          {headline.reviewCount > 0 ? ` ${headline.reviewCount} item${headline.reviewCount === 1 ? "" : "s"} still need an answer.` : ""}
        </p>
      </section>
    </>
  );
}
