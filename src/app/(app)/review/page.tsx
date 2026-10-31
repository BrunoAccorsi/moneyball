import { formatCad, formatDate } from "../../../domain/format";
import { loadTransactions } from "../../../db/repo";
import { CategoryForm } from "../../../components/category-form";

export default async function ReviewPage() {
  const waiting = (await loadTransactions()).filter((transaction) => transaction.needsReview);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Review</h1>
          <p className="lede">Answer once. Saving a merchant pattern applies it to later months, ahead of the built-in defaults.</p>
        </div>
      </div>
      {waiting.length === 0 ? (
        <div className="panel">
          <p>Nothing is waiting. New unknowns show up here after the next import.</p>
        </div>
      ) : null}
      {waiting.map((transaction) => (
        <article className="panel review-card" key={transaction.id}>
          <p>
            <strong>{formatDate(transaction.date)}</strong>
            <span className={transaction.amountCents < 0 ? "money out" : "money in"}> {formatCad(transaction.amountCents)}</span>
          </p>
          <p className="desc">{transaction.description}</p>
          <p>{transaction.reviewQuestion}</p>
          <p className="sub">{transaction.accountName}</p>
          <CategoryForm transaction={transaction} next="/review" />
        </article>
      ))}
    </>
  );
}
