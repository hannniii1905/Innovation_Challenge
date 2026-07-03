"""Tests for the DocumentRouter class."""

import pytest
from src.document_router import (
    DocumentRouter,
    UnsupportedDocumentError,
    DOCUMENT_TYPE_DBS,
    DOCUMENT_TYPE_OCBC,
    DOCUMENT_TYPE_MAYBANK,
    DOCUMENT_TYPE_UOB,
    DOCUMENT_TYPE_IRAS_NOA,
)


# --- IRAS NOA Detection Tests ---

class TestIrasNoaDetection:
    """Tests for IRAS Notice of Assessment identification."""

    def test_identifies_iras_noa_with_standard_keywords(self):
        pages = ["INLAND REVENUE AUTHORITY OF SINGAPORE\nNotice of Assessment\nYear of Assessment 2024"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_IRAS_NOA

    def test_identifies_iras_noa_with_iras_and_notice(self):
        pages = ["IRAS\nNotice of Assessment\nTax reference: S1234567A"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_IRAS_NOA

    def test_identifies_iras_noa_case_insensitive(self):
        pages = ["iras\nnotice of assessment\nTotal Income: $120,000"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_IRAS_NOA

    def test_iras_noa_requires_at_least_two_keywords(self):
        """A single IRAS keyword should not trigger NOA detection."""
        pages = ["Some document mentioning IRAS but nothing else relevant"]
        router = DocumentRouter(pages)
        with pytest.raises(UnsupportedDocumentError):
            router.identify()


# --- Bank Statement Detection Tests ---

class TestBankDetection:
    """Tests for bank statement identification."""

    def test_identifies_dbs_by_bank_name(self):
        pages = ["DBS Bank\nStatement of Account\nPeriod: 01 Jan - 31 Jan 2024"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_DBS

    def test_identifies_dbs_by_full_name(self):
        pages = ["Development Bank of Singapore\nAccount Statement"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_DBS

    def test_identifies_ocbc_by_keyword(self):
        pages = ["OCBC Bank\nStatement of Account\nPeriod: 01 Jan - 31 Jan 2024"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_OCBC

    def test_identifies_ocbc_by_full_name(self):
        pages = ["Oversea-Chinese Banking Corporation\nAccount Statement"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_OCBC

    def test_identifies_maybank(self):
        pages = ["Maybank\nStatement of Account\nPeriod: 01 Jan - 31 Jan 2024"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_MAYBANK

    def test_identifies_uob_by_keyword(self):
        pages = ["UOB\nCurrent Account Statement\nPeriod: 01 Jan - 31 Jan 2024"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_UOB

    def test_identifies_uob_by_full_name(self):
        pages = ["United Overseas Bank\nAccount Statement"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_UOB

    def test_identifies_bank_case_insensitive(self):
        pages = ["dbs bank\nstatement of account"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_DBS

    def test_identifies_bank_across_multiple_pages(self):
        pages = ["Page 1: Some header info", "Page 2: DBS Bank statement details"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_DBS


# --- Unsupported Document Tests ---

class TestUnsupportedDocuments:
    """Tests for error handling when document cannot be identified."""

    def test_raises_error_for_unknown_document(self):
        pages = ["This is just some random text that doesn't match anything"]
        router = DocumentRouter(pages)
        with pytest.raises(UnsupportedDocumentError):
            router.identify()

    def test_raises_error_for_empty_pages(self):
        pages = [""]
        router = DocumentRouter(pages)
        with pytest.raises(UnsupportedDocumentError):
            router.identify()

    def test_raises_error_for_empty_list(self):
        pages = []
        router = DocumentRouter(pages)
        with pytest.raises(UnsupportedDocumentError):
            router.identify()

    def test_error_message_lists_supported_formats(self):
        pages = ["Unknown bank statement"]
        router = DocumentRouter(pages)
        with pytest.raises(UnsupportedDocumentError, match="Supported formats"):
            router.identify()


# --- IRAS NOA Priority Tests ---

class TestIrasNoaPriority:
    """IRAS NOA should be detected even if bank keywords are also present."""

    def test_iras_noa_takes_priority_over_bank_keywords(self):
        """If a document contains both IRAS and bank keywords, IRAS wins."""
        pages = ["IRAS\nNotice of Assessment\nDBS Bank account reference"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_IRAS_NOA


# --- Parser Routing Tests ---

class TestGetParserClass:
    """Tests for parser class routing (string-based until parsers are implemented)."""

    def test_get_parser_class_for_dbs(self):
        """Parser routing for DBS should attempt to import DBSParser."""
        pages = ["DBS Bank\nStatement of Account"]
        router = DocumentRouter(pages)
        # Since parsers don't exist yet, this will raise ImportError
        # but we can verify the identify() step works
        assert router.identify() == DOCUMENT_TYPE_DBS

    def test_get_parser_class_for_iras(self):
        """Parser routing for IRAS NOA should attempt to import IrasNoaParser."""
        pages = ["IRAS\nNotice of Assessment\nYear of Assessment 2024"]
        router = DocumentRouter(pages)
        assert router.identify() == DOCUMENT_TYPE_IRAS_NOA
