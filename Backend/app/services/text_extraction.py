"""Text extraction used by the CV upload flow (pdfplumber / python-docx).

The resume engine has its own extractor (PyPDF2 + pdfminer + docx2txt) used by the
analyzer routes. Merging the two is planned for phase F2.
"""

from __future__ import annotations

import docx
import pdfplumber


def extract_text_from_pdf(pdf_path: str) -> str:
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text += page_text + "\n"
    return text.strip()


def extract_text_from_docx(docx_path: str) -> str:
    doc = docx.Document(docx_path)
    text = "\n".join([para.text for para in doc.paragraphs])
    return text.strip()
