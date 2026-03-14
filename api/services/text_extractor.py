import pymupdf
from pathlib import Path


def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract and concatenate plain text from every page of a PDF."""
    doc = pymupdf.open(pdf_path)
    try:
        parts: list[str] = []
        for page in doc:
            parts.append(page.get_text("text"))
        return "\n".join(parts).strip()
    finally:
        doc.close()
