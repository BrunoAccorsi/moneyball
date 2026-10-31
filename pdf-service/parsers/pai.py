from .base import ParseOutcome

# TODO: Pai savings statement layout is not implemented. Same rule as Neo
# Everyday: detect the heading, return no transactions, do not invent rows.
PAI_TODO = (
    "TODO: Pai savings PDF layout is not implemented. "
    "No rows were guessed. Fill PaiParser.parse() when a sample statement arrives."
)


class PaiParser:
    source_id = "pai"

    def detect(self, text: str) -> bool:
        # Heading only. A later "transfer to Pai" line on an Everyday statement
        # must not steal the file from the Everyday parser.
        head = text[:600].lower()
        return "pai savings" in head or "pai account" in head

    def parse(self, text: str, page_texts: list[str]) -> ParseOutcome:
        del text, page_texts
        return ParseOutcome(
            source="pai",
            account_key="neo_pai",
            account_name="Pai Savings",
            institution="Neo",
            account_kind="savings",
            transactions=[],
            warnings=[PAI_TODO],
            implemented=False,
        )
