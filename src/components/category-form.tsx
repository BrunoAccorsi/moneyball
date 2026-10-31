import { CATEGORIES, type ClassifiedTransaction } from "../domain/types";
import { answerReview } from "../server/actions";

export function CategoryForm({ transaction, next }: { transaction: ClassifiedTransaction; next: string }) {
  const cadence = transaction.isOneTime ? "once" : transaction.isRecurring ? "recurring" : "auto";
  return (
    <form action={answerReview} className="category-form">
      <input type="hidden" name="id" value={transaction.id} />
      <input type="hidden" name="next" value={next} />
      <label>
        Category
        <select name="category" defaultValue={transaction.category ?? ""}>
          <option value="">Uncategorized</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cadence
        <select name="cadence" defaultValue={cadence}>
          <option value="auto">Automatic</option>
          <option value="once">One-time</option>
          <option value="recurring">Recurring</option>
        </select>
      </label>
      <label>
        Merchant pattern
        <input type="text" name="pattern" defaultValue={transaction.merchantKey} />
      </label>
      <label className="check">
        <input type="checkbox" name="remember" />
        Remember for next time
      </label>
      <label className="check">
        <input type="checkbox" name="exclude" defaultChecked={transaction.isExcluded} />
        Transfer, exclude from spending and income
      </label>
      <button className="primary" type="submit">
        Save
      </button>
    </form>
  );
}
