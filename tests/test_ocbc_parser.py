"""Tests for the OCBC bank statement parser."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.parsers.ocbc_parser import OCBCParser
from src.parsers.base_parser import Transaction


class TestOCBCParserCompanyName:
    """Tests for extract_company_name method."""

    def test_extract_company_name_from_standard_header(self):
        """Company name is extracted from standard OCBC statement header."""
        text = (
            "XOCBC\n"
            "BUSINESS INTERNET BANKING\n"
            "BUSINESS ACCOUNT STATEMENT Statement Period: 01 May 2026 to 31 May 2026\n"
            "TECH INNOVATION PTE. LTD. Account Number : 501-884921-001\n"
            "8 MARINA BOULEVARD Account Type : Business Growth Account\n"
        )
        parser = OCBCParser()
        result = parser.extract_company_name(text)
        assert result is not None
        assert "TECH INNOVATION PTE. LTD." in result

    def test_extract_company_name_returns_none_when_missing(self):
        """Returns None when company name cannot be identified."""
        text = "Some random text without expected OCBC header format.\n"
        parser = OCBCParser()
        assert parser.extract_company_name(text) is None

    def test_extract_company_name_handles_different_companies(self):
        """Works with different company name formats."""
        text = (
            "XOCBC\n"
            "BUSINESS INTERNET BANKING\n"
            "BUSINESS ACCOUNT STATEMENT Statement Period: 01 Jan 2025 to 31 Jan 2025\n"
            "ABC TRADING (S) PTE LTD Account Number : 501-123456-001\n"
            "10 ORCHARD ROAD Account Type : Business Current Account\n"
        )
        parser = OCBCParser()
        result = parser.extract_company_name(text)
        assert result is not None
        assert "ABC TRADING (S) PTE LTD" in result


class TestOCBCParserStatementPeriod:
    """Tests for identify_statement_period method."""

    def test_extract_statement_period(self):
        """Statement period is extracted from header."""
        text = "BUSINESS ACCOUNT STATEMENT Statement Period: 01 May 2026 to 31 May 2026\n"
        parser = OCBCParser()
        result = parser.identify_statement_period(text)
        assert result is not None
        assert "01 May 2026" in result
        assert "31 May 2026" in result
        assert "to" in result

    def test_extract_statement_period_different_month(self):
        """Works with different months."""
        text = "BUSINESS ACCOUNT STATEMENT Statement Period: 01 Jan 2025 to 31 Jan 2025\n"
        parser = OCBCParser()
        result = parser.identify_statement_period(text)
        assert result is not None
        assert "01 Jan 2025" in result
        assert "31 Jan 2025" in result

    def test_returns_none_when_period_not_found(self):
        """Returns None when statement period is not present."""
        text = "Some random text without a statement period.\n"
        parser = OCBCParser()
        assert parser.identify_statement_period(text) is None


class TestOCBCParserTransactions:
    """Tests for extract_transactions method."""

    def test_extract_single_debit_transaction(self):
        """Parses a single debit transaction correctly."""
        text = (
            "ACCOUNT SUMMARY\n"
            "Opening Balance Total Total Debits (-) Total Credits (+) Closing Balance\n"
            "SGD 500,000.00 SGD 18,500.00 SGD 0.00 SGD 481,500.00\n"
            "TRANSACTION DETAILS\n"
            "Transaction\n"
            "Transaction Description Reference No. Debits (-) Credits (+) Balance\n"
            "Date\n"
            "04 MAY 2026 GIRO - SALARY BCH-SAL-0021 18,500.00 481,500.00\n"
            "*** END OF STATEMENT ***\n"
        )
        parser = OCBCParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 1
        assert transactions[0].date == "04 MAY 2026"
        assert transactions[0].amount == 18500.00
        assert transactions[0].transaction_type == "debit"
        assert "GIRO" in transactions[0].description

    def test_extract_single_credit_transaction(self):
        """Parses a single credit transaction correctly."""
        text = (
            "ACCOUNT SUMMARY\n"
            "Opening Balance Total Total Debits (-) Total Credits (+) Closing Balance\n"
            "SGD 500,000.00 SGD 0.00 SGD 42,350.00 SGD 542,350.00\n"
            "TRANSACTION DETAILS\n"
            "Transaction\n"
            "Transaction Description Reference No. Debits (-) Credits (+) Balance\n"
            "Date\n"
            "06 MAY 2026 GIRO INWARD - ACME CORP FT261260192 42,350.00 542,350.00\n"
            "*** END OF STATEMENT ***\n"
        )
        parser = OCBCParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 1
        assert transactions[0].date == "06 MAY 2026"
        assert transactions[0].amount == 42350.00
        assert transactions[0].transaction_type == "credit"

    def test_extract_multiple_transactions(self):
        """Parses multiple transactions with correct types."""
        text = (
            "ACCOUNT SUMMARY\n"
            "Opening Balance Total Total Debits (-) Total Credits (+) Closing Balance\n"
            "SGD 500,000.00 SGD 18,535.00 SGD 42,350.00 SGD 523,815.00\n"
            "TRANSACTION DETAILS\n"
            "Transaction\n"
            "Transaction Description Reference No. Debits (-) Credits (+) Balance\n"
            "Date\n"
            "04 MAY 2026 GIRO - SALARY BCH-SAL-0021 18,500.00 481,500.00\n"
            "06 MAY 2026 GIRO INWARD - ACME CORP FT261260192 42,350.00 523,850.00\n"
            "08 MAY 2026 CABLE CHARGE CHG20260508 35.00 523,815.00\n"
            "*** END OF STATEMENT ***\n"
        )
        parser = OCBCParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 3
        assert transactions[0].transaction_type == "debit"
        assert transactions[1].transaction_type == "credit"
        assert transactions[2].transaction_type == "debit"

    def test_handles_comma_formatted_amounts(self):
        """Parses amounts with commas correctly (e.g., '65,000.00')."""
        text = (
            "ACCOUNT SUMMARY\n"
            "Opening Balance Total Total Debits (-) Total Credits (+) Closing Balance\n"
            "SGD 500,000.00 SGD 65,000.00 SGD 0.00 SGD 435,000.00\n"
            "TRANSACTION DETAILS\n"
            "Transaction\n"
            "Transaction Description Reference No. Debits (-) Credits (+) Balance\n"
            "Date\n"
            "08 MAY 2026 OUTWARD TELEGRAPHIC TRF TT-662810-OS 65,000.00 435,000.00\n"
            "*** END OF STATEMENT ***\n"
        )
        parser = OCBCParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 1
        assert transactions[0].amount == 65000.00

    def test_returns_empty_list_when_no_transactions(self):
        """Returns empty list when no transaction section found."""
        text = "Random text without any transaction section.\n"
        parser = OCBCParser()
        transactions = parser.extract_transactions(text)
        assert transactions == []


class TestOCBCParserAmountParsing:
    """Tests for OCBC-specific amount formatting."""

    def test_parse_amount_with_commas(self):
        """Parses amounts with comma separators."""
        parser = OCBCParser()
        assert parser._parse_amount("1,234.56") == 1234.56
        assert parser._parse_amount("65,000.00") == 65000.00
        assert parser._parse_amount("500,000.00") == 500000.00

    def test_parse_amount_without_commas(self):
        """Parses amounts without comma separators."""
        parser = OCBCParser()
        assert parser._parse_amount("35.00") == 35.00
        assert parser._parse_amount("100.50") == 100.50

    def test_parse_amount_large_numbers(self):
        """Parses large amounts with multiple comma separators."""
        parser = OCBCParser()
        assert parser._parse_amount("1,234,567.89") == 1234567.89


class TestOCBCParserIntegration:
    """Integration tests using the actual mock OCBC PDF."""

    def test_full_extraction_from_mock_pdf(self):
        """Full end-to-end test against mock_ocbc_sme_statement.pdf."""
        from src.ocr_engine import OCREngine

        pdf_path = os.path.join(
            os.path.dirname(__file__), "..", "mock_ocbc_sme_statement.pdf"
        )

        if not os.path.exists(pdf_path):
            return  # Skip if PDF not available

        engine = OCREngine(pdf_path)
        pages = engine.extract()
        full_text = "\n".join(pages)

        parser = OCBCParser()

        # Test company name
        company = parser.extract_company_name(full_text)
        assert company is not None
        assert "TECH INNOVATION PTE. LTD." in company

        # Test statement period
        period = parser.identify_statement_period(full_text)
        assert period is not None
        assert "01 May 2026" in period
        assert "31 May 2026" in period

        # Test transactions
        transactions = parser.extract_transactions(full_text)
        assert len(transactions) == 12

        # Verify totals match the statement summary
        # From the ACCOUNT SUMMARY: Total Debits SGD 116,135.00, Total Credits SGD 98,250.00
        total_credits = sum(
            tx.amount for tx in transactions if tx.transaction_type == "credit"
        )
        total_debits = sum(
            tx.amount for tx in transactions if tx.transaction_type == "debit"
        )
        assert total_credits == 98250.00
        assert total_debits == 116135.00

        # Verify specific transactions
        # First transaction: salary payment (debit)
        assert transactions[0].transaction_type == "debit"
        assert transactions[0].amount == 18500.00
        assert "GIRO" in transactions[0].description
        assert "SALARY" in transactions[0].description

        # Second transaction: inward giro (credit)
        assert transactions[1].transaction_type == "credit"
        assert transactions[1].amount == 42350.00
        assert "ACME" in transactions[1].description

        # Loan repayment transaction
        loan_txns = [tx for tx in transactions if "LOAN" in tx.description.upper()]
        assert len(loan_txns) >= 1

        # All transactions should have valid dates in May 2026
        for tx in transactions:
            assert tx.date
            assert "MAY 2026" in tx.date
