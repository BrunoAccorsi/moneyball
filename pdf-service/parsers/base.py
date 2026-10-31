from dataclasses import dataclass, field


@dataclass
class ParsedTransaction:
    date: str
    posted_date: str | None
    description: str
    amount_cents: int
    status: str | None = None


@dataclass
class ParseOutcome:
    source: str
    account_key: str
    account_name: str
    institution: str
    account_kind: str
    transactions: list[ParsedTransaction] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    implemented: bool = False

    def as_dict(self) -> dict:
        return {
            "source": self.source,
            "accountKey": self.account_key,
            "accountName": self.account_name,
            "institution": self.institution,
            "accountKind": self.account_kind,
            "transactions": [
                {
                    "date": transaction.date,
                    "postedDate": transaction.posted_date,
                    "description": transaction.description,
                    "amountCents": transaction.amount_cents,
                    "status": transaction.status,
                }
                for transaction in self.transactions
            ],
            "warnings": self.warnings,
            "implemented": self.implemented,
        }
