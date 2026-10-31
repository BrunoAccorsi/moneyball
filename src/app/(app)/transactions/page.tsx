import Link from "next/link";
import { formatCad, formatDate, formatMonth, shiftMonth } from "../../../domain/format";
import { distinctMonths } from "../../../domain/summary";
import { loadTransactions } from "../../../db/repo";
import { CategoryForm } from "../../../components/category-form";
import { toggleOneTime } from "../../../server/actions";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; show?: string }>;
}) {
  const params = await searchParams;
  const transactions = await loadTransactions();
  const months = distinctMonths(transactions);
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : (months.at(-1) ?? "");
  const show = params.show === "transfers" ? "transfers" : params.show === "review" ? "review" : "all";
  const next = `/transactions?month=${month}&show=${show}`;
  const rows = transactions.filter((transaction) => {
    if (month && !transaction.date.startsWith(month)) return false;
    if (show === "transfers") return transaction.isExcluded;
    if (show === "review") return transaction.needsReview;
    return true;
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Transactions</h1>
          <p className="lede">{month ? formatMonth(month) : "No months yet"}.</p>
        </div>
        <div className="month-switch">
          {month ? <Link href={`/transactions?month=${shiftMonth(month, -1)}&show=${show}`}>Previous</Link> : null}
          {months.map((choice) => (
            <Link key={choice} href={`/transactions?month=${choice}&show=${show}`} aria-current={choice === month ? "page" : undefined}>
              {choice}
            </Link>
          ))}
          {month ? <Link href={`/transactions?month=${shiftMonth(month, 1)}&show=${show}`}>Next</Link> : null}
        </div>
      </div>
      <div className="toggle" style={{ marginBottom: 16 }}>
        <Link href={`/transactions?month=${month}&show=all`} aria-current={show === "all" ? "true" : undefined}>
          All
        </Link>
        <Link href={`/transactions?month=${month}&show=transfers`} aria-current={show === "transfers" ? "true" : undefined}>
          Transfers
        </Link>
        <Link href={`/transactions?month=${month}&show=review`} aria-current={show === "review" ? "true" : undefined}>
          Needs review
        </Link>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Account</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((transaction) => (
              <tr key={transaction.id} className={transaction.isExcluded ? "dim" : undefined}>
                <td>{formatDate(transaction.date)}</td>
                <td>
                  <span className="desc">{transaction.description}</span>
                  {transaction.reimbursementNote ? <span className="sub">{transaction.reimbursementNote}</span> : null}
                  {transaction.isExcluded && transaction.exclusionReason ? <span className="sub">{transaction.exclusionReason.replaceAll("_", " ")}</span> : null}
                </td>
                <td>{transaction.accountName}</td>
                <td className={transaction.amountCents < 0 ? "money out" : "money in"}>{formatCad(transaction.amountCents)}</td>
                <td>
                  {transaction.category ?? "—"}
                  <details>
                    <summary>Change</summary>
                    <CategoryForm transaction={transaction} next={next} />
                  </details>
                </td>
                <td>
                  <form action={toggleOneTime}>
                    <input type="hidden" name="id" value={transaction.id} />
                    <input type="hidden" name="cadence" value={transaction.isOneTime ? "normal" : "once"} />
                    <input type="hidden" name="next" value={next} />
                    <button className={transaction.isOneTime ? "pill on" : "pill"} type="submit">
                      {transaction.isOneTime ? "One-time" : "Normal"}
                    </button>
                  </form>
                  {transaction.isRecurring ? <span className="sub">Recurring</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="empty">No transactions in this view.</p> : null}
      </div>
    </>
  );
}
