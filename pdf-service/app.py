"""PDF statement extraction. Raw uploads are written to a temp file and deleted."""

import os
import tempfile

import pdfplumber
from fastapi import FastAPI, File, HTTPException, UploadFile

from parsers import parse_statement

app = FastAPI(title="Moneyball PDF")
MAX_BYTES = 10 * 1024 * 1024


@app.get("/health")
def health() -> dict:
    return {"ok": True}


def parse_path(path: str) -> dict:
    pages: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return parse_statement("\n".join(pages), pages).as_dict()


def parse_upload(data: bytes, filename: str) -> dict:
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="PDF is larger than 10 MB")
    if not data.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Not a PDF")
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    try:
        with open(path, "wb") as handle:
            handle.write(data)
        return parse_path(path)
    except HTTPException:
        raise
    except Exception as error:  # pdfplumber raises its own parser errors
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {error}") from error
    finally:
        if os.path.exists(path):
            os.remove(path)


@app.post("/parse")
async def parse(file: UploadFile = File(...)) -> dict:
    data = await file.read()
    return parse_upload(data, file.filename or "statement.pdf")
