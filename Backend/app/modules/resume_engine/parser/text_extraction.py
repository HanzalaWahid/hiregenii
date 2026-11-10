from __future__ import annotations

import logging
from pathlib import Path
import PyPDF2
import docx2txt

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: Path) -> str:
    """Extract raw text from a PDF file."""
    text = ""
    try:
        with open(file_path, "rb") as fh:
            reader = PyPDF2.PdfReader(fh)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error("PyPDF2 extraction failed: %s. Trying pdfminer fallback.", e)
        try:
            from pdfminer.high_level import extract_text as pdfminer_extract
            text = pdfminer_extract(str(file_path))
        except Exception as ex:
            logger.error("pdfminer fallback extraction failed: %s", ex)
    return text


def extract_text_from_docx(file_path: Path) -> str:
    """Extract raw text from a DOCX file."""
    try:
        return docx2txt.process(str(file_path))
    except Exception as e:
        logger.error("docx2txt extraction failed: %s", e)
        return ""


def extract_text(file_path: Path) -> str:
    """Orchestrate text extraction depending on the file extension."""
    ext = file_path.suffix.lower()
    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext == '.docx':
        return extract_text_from_docx(file_path)
    return ""
