from __future__ import annotations

import logging
from pathlib import Path
import zipfile
import PyPDF2
from typing import List, Tuple

logger = logging.getLogger(__name__)


def validate_resume(file_path: Path, max_size_mb: float = 5.0) -> Tuple[bool, List[str]]:
    """
    Validate the uploaded resume file for security, format, size, integrity, and text presence.
    
    Returns:
        A tuple of (is_valid: bool, errors: list of strings)
    """
    errors: List[str] = []
    
    # 1. Format/Extension Checks
    ext = file_path.suffix.lower()
    if ext not in ['.pdf', '.docx']:
        errors.append(f"Unsupported file format: '{ext}'. Only PDF and DOCX files are allowed.")
        return False, errors
        
    # 2. File size validation
    try:
        size_bytes = file_path.stat().st_size
        size_mb = size_bytes / (1024 * 1024)
        if size_mb > max_size_mb:
            errors.append(f"File size ({size_mb:.2f} MB) exceeds the limit of {max_size_mb:.2f} MB.")
    except Exception as e:
        errors.append(f"Failed to check file size: {e}")
        return False, errors

    # 3. MIME/Magic bytes check
    try:
        with open(file_path, 'rb') as f:
            header = f.read(4)
            if ext == '.pdf':
                if not header.startswith(b'%PDF'):
                    errors.append("Invalid PDF format. The file is missing the %PDF header signature.")
            elif ext == '.docx':
                if not header.startswith(b'PK\x03\x04'):
                    errors.append("Invalid DOCX format. The file is missing the ZIP/Office header signature.")
    except Exception as e:
        errors.append(f"Failed to verify file signature: {e}")
        return False, errors

    # 4. Integrity and Content Checks
    if ext == '.pdf':
        try:
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                num_pages = len(reader.pages)
                if num_pages == 0:
                    errors.append("PDF is empty (contains 0 pages).")
                elif reader.is_encrypted:
                    errors.append("PDF is password-protected or encrypted. Please upload an unprotected file.")
                else:
                    # Check for image-only PDF
                    extracted_text = ""
                    # Sample first few pages to check for text content
                    for i in range(min(num_pages, 3)):
                        page_text = reader.pages[i].extract_text()
                        if page_text:
                            extracted_text += page_text
                    if len(extracted_text.strip()) < 30:
                        errors.append("PDF appears to be image-only (scanned document without extractable text). Please upload a text-based PDF.")
        except Exception as e:
            errors.append(f"Corrupted or invalid PDF file: {e}")
    elif ext == '.docx':
        try:
            if not zipfile.is_zipfile(file_path):
                errors.append("Invalid DOCX file: not a valid zip archive.")
            else:
                with zipfile.ZipFile(file_path) as zf:
                    namelist = zf.namelist()
                    if 'word/document.xml' not in namelist:
                        errors.append("Invalid DOCX file structure (missing word/document.xml).")
                    
                    # Security checks for macros
                    suspicious = [name for name in namelist if 'vbaProject' in name or 'macro' in name.lower() or name.endswith('.bin')]
                    if suspicious:
                        errors.append(f"Security Warning: File contains suspicious embedded macros: {', '.join(suspicious)}")
        except Exception as e:
            errors.append(f"Corrupted or invalid DOCX file: {e}")

    is_valid = len(errors) == 0
    return is_valid, errors
