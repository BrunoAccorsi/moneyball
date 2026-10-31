from .base import ParseOutcome

# TODO: Neo Everyday statement layout is not implemented.
# Bruno's October 2026 Everyday / Pai PDFs were not available when this
# service was written. detect() only checks for distinctive headings.
# parse() returns no transactions on purpose — do not guess columns,
# running balances, or which amount is a debit.
# When a sample PDF arrives:
#   1. Drop it in pdf-service/fixtures/
#   2. Fill NeoEverydayParser.parse() from the real text/tables
#   3. Replace the stub test with one that locks date, description, and signed cents
# Expected rows from the manual October analysis (for that future test, not guesses):
#   - 2026-10-14 and 2026-10-29 salary "Transfer from NEO FINANCIAL T" +2420.23
#   - Simply Benefits +176.00
#   - interest +0.21
#   - rent to 700 Shawnee -1950.00 on 2026-10-01
#   - Twins, Triplets and More -81.00 on 2026-10-17
#   - Bruna e-transfer +500.00 on 2026-10-07
NEO_EVERYDAY_TODO = (
    "TODO: Neo Everyday PDF layout is not implemented. "
    "A sample statement was not available, so no rows were guessed. "
    "Fill NeoEverydayParser.parse() and add a fixture test when a PDF arrives."
)


class NeoEverydayParser:
    source_id = "neo_everyday"

    def detect(self, text: str) -> bool:
        lowered = text.lower()
        return "neo everyday" in lowered or ("everyday account" in lowered and "neo" in lowered)

    def parse(self, text: str, page_texts: list[str]) -> ParseOutcome:
        del text, page_texts
        return ParseOutcome(
            source="neo_everyday",
            account_key="neo_everyday",
            account_name="Neo Everyday",
            institution="Neo",
            account_kind="chequing",
            transactions=[],
            warnings=[NEO_EVERYDAY_TODO],
            implemented=False,
        )
