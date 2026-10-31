import os
import tempfile

from fpdf import FPDF

from app import parse_upload
from parsers.neo_everyday import NeoEverydayParser
from parsers.pai import PaiParser


def pdf_bytes(text: str) -> bytes:
    document = FPDF()
    document.add_page()
    document.set_font("Helvetica", size=12)
    document.multi_cell(0, 8, text)
    return bytes(document.output())


def test_neo_everyday_is_detected_and_not_guessed():
    # A line that looks like the October salary must not become a transaction.
    payload = parse_upload(
        pdf_bytes("Neo Everyday Account Statement\n2026-10-14 Transfer from NEO FINANCIAL T 2420.23\n"),
        "everyday.pdf",
    )
    assert payload["source"] == "neo_everyday"
    assert payload["implemented"] is False
    assert payload["transactions"] == []
    assert "TODO" in payload["warnings"][0]
    assert "not" in payload["warnings"][0].lower()


def test_pai_wins_over_neo_everyday():
    payload = parse_upload(pdf_bytes("Neo Financial\nPai Savings statement\n2026-10-02 Transfer 50.00"), "pai.pdf")
    assert payload["source"] == "pai"
    assert payload["accountKey"] == "neo_pai"
    assert payload["transactions"] == []
    assert payload["implemented"] is False


def test_unknown_pdf_imports_nothing():
    payload = parse_upload(pdf_bytes("Scotiabank personal statement\nNo layout here"), "other.pdf")
    assert payload["source"] == "unknown"
    assert payload["transactions"] == []
    assert payload["implemented"] is False


def test_raw_upload_is_deleted(monkeypatch):
    created: list[str] = []
    real = tempfile.mkstemp

    def tracking(*args, **kwargs):
        fd, path = real(*args, **kwargs)
        created.append(path)
        return fd, path

    monkeypatch.setattr(tempfile, "mkstemp", tracking)
    parse_upload(pdf_bytes("Neo Everyday Account Statement"), "everyday.pdf")
    assert created
    assert not os.path.exists(created[0])


def test_detect_helpers_do_not_claim_unrelated_text():
    assert NeoEverydayParser().detect("just a receipt") is False
    assert PaiParser().detect("grocery store") is False
