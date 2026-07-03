"""
OCR Engine for PDF text extraction.

Uses pdfplumber as the primary extraction method for embedded-text PDFs,
with pytesseract + pdf2image as a fallback for scanned/image-based PDFs.
"""

import os
from typing import List

import pdfplumber


class OCREngineError(Exception):
    """Base exception for OCR engine errors."""
    pass


class FileNotFoundError(OCREngineError):
    """Raised when the specified PDF file does not exist."""
    pass


class InvalidPDFError(OCREngineError):
    """Raised when the file is not a valid PDF."""
    pass


class ExtractionError(OCREngineError):
    """Raised when text extraction fails."""
    pass


# Minimum character count to consider pdfplumber extraction successful for a page.
# If fewer characters are extracted, we fall back to OCR.
MIN_TEXT_LENGTH = 10


class OCREngine:
    """
    Extracts text from PDF financial statements.

    Uses pdfplumber for embedded-text PDFs. If a page yields insufficient text,
    falls back to pytesseract (via pdf2image) for OCR-based extraction.
    """

    def __init__(self, pdf_path: str) -> None:
        """
        Initialize the OCR engine with a PDF file path.

        Args:
            pdf_path: Path to the PDF file to process.

        Raises:
            FileNotFoundError: If the file does not exist.
            InvalidPDFError: If the file does not have a .pdf extension.
        """
        self.pdf_path = pdf_path
        self._validate_file()

    def _validate_file(self) -> None:
        """
        Validate that the file exists and has a .pdf extension.

        Raises:
            FileNotFoundError: If the file does not exist.
            InvalidPDFError: If the file does not have a .pdf extension.
        """
        if not os.path.exists(self.pdf_path):
            raise FileNotFoundError(
                f"PDF file not found: '{self.pdf_path}'"
            )

        if not self.pdf_path.lower().endswith(".pdf"):
            raise InvalidPDFError(
                f"File is not a PDF (expected .pdf extension): '{self.pdf_path}'"
            )

    def extract(self, progress_callback=None) -> List[str]:
        """
        Extract text from all pages of the PDF.

        Args:
            progress_callback: Optional callable invoked after each page is
                processed as ``progress_callback(current_page, total_pages)``.
                Lets callers report extraction progress (e.g. to a UI).

        Returns:
            A list of strings, one per page, containing the extracted text.

        Raises:
            InvalidPDFError: If the file cannot be opened as a valid PDF.
            ExtractionError: If text extraction fails entirely.
        """
        pages_text: List[str] = []

        try:
            with pdfplumber.open(self.pdf_path) as pdf:
                total_pages = len(pdf.pages)
                for page_number, page in enumerate(pdf.pages, start=1):
                    text = self._extract_page_text(page, page_number)
                    pages_text.append(text)
                    if progress_callback is not None:
                        try:
                            progress_callback(page_number, total_pages)
                        except Exception:
                            # Progress reporting must never break extraction.
                            pass
        except pdfplumber.pdfminer.pdfparser.PDFSyntaxError:
            raise InvalidPDFError(
                f"File is not a valid PDF or is corrupted: '{self.pdf_path}'"
            )
        except Exception as e:
            # If it's already one of our custom exceptions, re-raise it
            if isinstance(e, OCREngineError):
                raise
            raise ExtractionError(
                f"Failed to extract text from '{self.pdf_path}': {e}"
            )

        if not pages_text:
            raise ExtractionError(
                f"PDF contains no pages: '{self.pdf_path}'"
            )

        return pages_text

    def _extract_page_text(self, page, page_number: int) -> str:
        """
        Extract text from a single PDF page.

        Tries pdfplumber first. If insufficient text is extracted,
        falls back to OCR via pytesseract.

        Args:
            page: A pdfplumber page object.
            page_number: The 1-based page number (used for OCR fallback).

        Returns:
            Extracted text for the page.
        """
        # Primary extraction: pdfplumber (embedded text)
        text = page.extract_text() or ""
        print(f"DEBUG: Extracted text length: {len(text) if text else 0}")

        if len(text.strip()) >= MIN_TEXT_LENGTH:
            return text
        print("DEBUG: pdfplumber failed, falling back to OCR")
        # Fallback: OCR extraction using pytesseract + pdf2image
        return self._ocr_extract_page(page_number)

    def _ocr_extract_page(self, page_number: int) -> str:
        """
        Extract text from a specific page using OCR (pytesseract + pdf2image).

        Args:
            page_number: The 1-based page number to extract.

        Returns:
            OCR-extracted text for the page.

        Raises:
            ExtractionError: If OCR extraction fails.
        """
        try:
            from pdf2image import convert_from_path
            import pytesseract
        except ImportError as e:
            raise ExtractionError(
                f"OCR dependencies not available (pytesseract/pdf2image): {e}"
            )

        try:
            # Convert only the specific page to an image
            print(f"DEBUG: Converting page {page_number} to image...")
            images = convert_from_path(
                self.pdf_path,
                first_page=page_number,
                last_page=page_number,
                dpi=300,
            )

            if not images:
                raise ExtractionError(
                    f"Failed to convert page {page_number} to image for OCR."
                )

            # Run OCR on the page image
            print(f"DEBUG: Running Tesseract on image...")
            text = pytesseract.image_to_string(images[0])
            return text or ""

        except ExtractionError:
            raise
        except Exception as e:
            raise ExtractionError(
                f"OCR extraction failed on page {page_number}: {e}"
            )
