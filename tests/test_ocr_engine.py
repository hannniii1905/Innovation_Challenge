"""
Unit tests for the OCR Engine.
"""

import os
import tempfile
from unittest.mock import patch, MagicMock

import pytest

from src.ocr_engine import (
    OCREngine,
    FileNotFoundError,
    InvalidPDFError,
    ExtractionError,
    MIN_TEXT_LENGTH,
)


class TestOCREngineValidation:
    """Tests for file validation logic."""

    def test_raises_file_not_found_for_missing_file(self):
        with pytest.raises(FileNotFoundError, match="PDF file not found"):
            OCREngine("/nonexistent/path/to/file.pdf")

    def test_raises_invalid_pdf_for_non_pdf_extension(self, tmp_path):
        # Create a non-PDF file
        txt_file = tmp_path / "document.txt"
        txt_file.write_text("not a pdf")

        with pytest.raises(InvalidPDFError, match="not a PDF"):
            OCREngine(str(txt_file))

    def test_raises_invalid_pdf_for_no_extension(self, tmp_path):
        no_ext_file = tmp_path / "document"
        no_ext_file.write_text("not a pdf")

        with pytest.raises(InvalidPDFError, match="not a PDF"):
            OCREngine(str(no_ext_file))

    def test_accepts_valid_pdf_path(self, tmp_path):
        # Create a file with .pdf extension (content doesn't matter for validation)
        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(b"%PDF-1.4 fake content")

        # Should not raise during construction
        engine = OCREngine(str(pdf_file))
        assert engine.pdf_path == str(pdf_file)

    def test_case_insensitive_pdf_extension(self, tmp_path):
        pdf_file = tmp_path / "test.PDF"
        pdf_file.write_bytes(b"%PDF-1.4 fake content")

        # Should accept .PDF extension
        engine = OCREngine(str(pdf_file))
        assert engine.pdf_path == str(pdf_file)


class TestOCREngineExtraction:
    """Tests for text extraction logic."""

    def test_extract_returns_list_of_strings(self):
        """Test extraction with a real sample PDF if available."""
        sample_pdf = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "mock_dbs_sme_statement_v2.pdf",
        )
        if not os.path.exists(sample_pdf):
            pytest.skip("Sample DBS PDF not available")

        engine = OCREngine(sample_pdf)
        result = engine.extract()

        assert isinstance(result, list)
        assert len(result) > 0
        assert all(isinstance(page, str) for page in result)

    def test_extract_invalid_pdf_content_raises_error(self, tmp_path):
        """A file with .pdf extension but invalid content should raise InvalidPDFError."""
        bad_pdf = tmp_path / "bad.pdf"
        bad_pdf.write_bytes(b"this is not a real PDF file content")

        engine = OCREngine(str(bad_pdf))
        with pytest.raises((InvalidPDFError, ExtractionError)):
            engine.extract()

    def test_extract_each_page_has_text(self):
        """Verify each page in a sample PDF produces non-empty text."""
        sample_pdf = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "mock_dbs_sme_statement_v2.pdf",
        )
        if not os.path.exists(sample_pdf):
            pytest.skip("Sample DBS PDF not available")

        engine = OCREngine(sample_pdf)
        result = engine.extract()

        for i, page_text in enumerate(result):
            assert len(page_text.strip()) > 0, f"Page {i+1} has no text"


class TestOCREngineFallback:
    """Tests for the OCR fallback mechanism."""

    @patch("src.ocr_engine.OCREngine._ocr_extract_page")
    def test_fallback_triggered_when_pdfplumber_returns_empty(self, mock_ocr, tmp_path):
        """If pdfplumber returns empty text, OCR fallback should be called."""
        # Create a minimal valid PDF (pdfplumber can open it but pages may be empty)
        sample_pdf = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "mock_dbs_sme_statement_v2.pdf",
        )
        if not os.path.exists(sample_pdf):
            pytest.skip("Sample PDF not available")

        mock_ocr.return_value = "OCR extracted text"

        engine = OCREngine(sample_pdf)

        # Mock pdfplumber to return empty text for a page
        mock_page = MagicMock()
        mock_page.extract_text.return_value = ""

        result = engine._extract_page_text(mock_page, 1)
        assert result == "OCR extracted text"
        mock_ocr.assert_called_once_with(1)

    def test_no_fallback_when_pdfplumber_returns_sufficient_text(self):
        """If pdfplumber returns enough text, OCR should not be triggered."""
        sample_pdf = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "mock_dbs_sme_statement_v2.pdf",
        )
        if not os.path.exists(sample_pdf):
            pytest.skip("Sample PDF not available")

        engine = OCREngine(sample_pdf)

        mock_page = MagicMock()
        mock_page.extract_text.return_value = "A" * (MIN_TEXT_LENGTH + 1)

        with patch.object(engine, "_ocr_extract_page") as mock_ocr:
            result = engine._extract_page_text(mock_page, 1)
            mock_ocr.assert_not_called()
            assert len(result) > MIN_TEXT_LENGTH


class TestOCREngineWithSamplePDFs:
    """Integration tests using the actual sample PDFs in the project."""

    SAMPLE_PDFS = [
        "mock_dbs_sme_statement_v2.pdf",
        "mock_ocbc_sme_statement.pdf",
        "mock_maybank_sme_statement.pdf",
        "mock_uob_sme_statement.pdf",
    ]

    @pytest.fixture
    def project_root(self):
        return os.path.dirname(os.path.dirname(__file__))

    @pytest.mark.parametrize("pdf_filename", SAMPLE_PDFS)
    def test_extracts_text_from_sample_pdf(self, project_root, pdf_filename):
        pdf_path = os.path.join(project_root, pdf_filename)
        if not os.path.exists(pdf_path):
            pytest.skip(f"{pdf_filename} not available")

        engine = OCREngine(pdf_path)
        result = engine.extract()

        assert isinstance(result, list)
        assert len(result) >= 1
        # Each page should have some extracted text
        for page_text in result:
            assert isinstance(page_text, str)
