from .base import ParseOutcome
from .neo_everyday import NeoEverydayParser
from .pai import PaiParser

PARSERS = (PaiParser(), NeoEverydayParser())


def parse_statement(text: str, page_texts: list[str]) -> ParseOutcome:
    for parser in PARSERS:
        if parser.detect(text):
            return parser.parse(text, page_texts)
    return ParseOutcome(
        source="unknown",
        account_key="unknown",
        account_name="Unrecognized statement",
        institution="Unknown",
        account_kind="chequing",
        transactions=[],
        warnings=["Unrecognized PDF. No transactions were imported."],
        implemented=False,
    )
