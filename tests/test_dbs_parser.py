"""Tests for the DBS bank statement parser."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.parsers.dbs_parser import DBSParser
from src.parsers.base_parser import Transaction


class TestDBSParserCompanyName:
    """Tests for extract_company_name method."""

    def test_extract_company_name_from_standard_header(self):
        """Company name is extracted from standard DBS statement header."""
        text = (
            "XDBS ACCOUNT STATEMENT\n"
            "STATEMENT PERIOD: 01 MAY 2026 - 31 MAY 2026\n"
            "IDEAL CORPORATE NETBANKING GENERATED ON: 01 JUN 2026 09:15:32 SGT\n"
            "TECH INNOVATION PTE. LTD.\n"
            "Account Number: 003-992184-02\n"
        )
        parser = DBSParser()
        assert parser.extract_company_name(text) == "TECH INNOVATION PTE. LTD."

    def test_extract_company_name_returns_none_when_missing(self):
        """Returns None when company name cannot be identified."""
        text = "Some random text without expected DBS header format.\n"
        parser = DBSParser()
        assert parser.extract_company_name(text) is None

    def test_extract_company_name_handles_different_company_names(self):
        """Works with different company name formats."""
        text = (
            "XDBS ACCOUNT STATEMENT\n"
            "STATEMENT PERIOD: 01 JAN 2025 - 31 JAN 2025\n"
            "IDEAL CORPORATE NETBANKING GENERATED ON: 01 FEB 2025\n"
            "ABC TRADING (S) PTE LTD\n"
            "Account Number: 001-123456-01\n"
        )
        parser = DBSParser()
        assert parser.extract_company_name(text) == "ABC TRADING (S) PTE LTD"


class TestDBSParserStatementPeriod:
    """Tests for identify_statement_period method."""

    def test_extract_statement_period(self):
        """Statement period is extracted from header."""
        text = "STATEMENT PERIOD: 01 MAY 2026 - 31 MAY 2026\n"
        parser = DBSParser()
        assert parser.identify_statement_period(text) == "01 MAY 2026 - 31 MAY 2026"

    def test_extract_statement_period_different_month(self):
        """Works with different months."""
        text = "STATEMENT PERIOD: 01 JAN 2025 - 31 JAN 2025\n"
        parser = DBSParser()
        assert parser.identify_statement_period(text) == "01 JAN 2025 - 31 JAN 2025"

    def test_returns_none_when_period_not_found(self):
        """Returns None when statement period is not present."""
        text = "Some random text without a statement period.\n"
        parser = DBSParser()
        assert parser.identify_statement_period(text) is None


class TestDBSParserTransactions:
    """Tests for extract_transactions method."""

    def test_extract_single_debit_transaction(self):
        """Parses a single debit transaction correctly."""
        text = (
            "ACCOUNT SUMMARY\n"
            "Opening Balance Total Withdrawals (-) Total Deposits (+) Closing Balance\n"
            "SGD 100,000.00 SGD 18,500.00 SGD 0.00 SGD 81,500.00\n"
            "TRANSACTION DETAILS\n"
            "Transaction\n"
            "Description Reference Number Withdrawals (-) Deposits (+) Balance\n"
            "Date\n"
            "04 MAY 2026 GIRO-SALARY VIA IDEAL REFSAL20260504 18,500.00 81,500.00\n"
            "IMPORTANT NOTICE:\n"
        )
        parser = DBSParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 1
        assert transactions[0].date == "04 MAY 2026"
        assert transactions[0].amount == 18500.00
        assert transactions[0].transaction_type == "debit"
        assert "GIRO-SALARY" in transactions[0].description

    def test_extract_single_credit_transaction(self):
        """Parses a single credit transaction correctly."""
        text = (
            "ACCOUNT SUMMARY\n"
            "Opening Balance Total Withdrawals (-) Total Deposits (+) Closing Balance\n"
            "SGD 100,000.00 SGD 0.00 SGD 42,350.00 SGD 142,350.00\n"
            "TRANSACTION DETAILS\n"
            "Transaction\n"
            "Description Reference Number Withdrawals (-) Deposits (+) Balance\n"
            "Date\n"
            "06 MAY 2026 INWARD GIRO - ACME CORP INV-99210 42,350.00 142,350.00\n"
            "IMPORTANT NOTICE:\n"
        )
        parser = DBSParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 1
        assert transactions[0].date == "06 MAY 2026"
        assert transactions[0].amount == 42350.00
        assert transactions[0].transaction_type == "credit"

    def test_extract_multiple_transactions(self):
        """Parses multiple transactions with correct types."""
        text = (
            "ACCOUNT SUMMARY\n"
            "Opening Balance Total Withdrawals (-) Total Deposits (+) Closing Balance\n"
            "SGD 500,000.00 SGD 18,535.00 SGD 42,350.00 SGD 523,815.00\n"
            "TRANSACTION DETAILS\n"
            "Transaction\n"
            "Description Reference Number Withdrawals (-) Deposits (+) Balance\n"
            "Date\n"
            "04 MAY 2026 GIRO-SALARY VIA IDEAL REFSAL20260504 18,500.00 481,500.00\n"
            "06 MAY 2026 INWARD GIRO - ACME CORP INV-99210 42,350.00 523,850.00\n"
            "08 MAY 2026 FT OUT CABLE CHG / TELEX CHG20260508 35.00 523,815.00\n"
            "IMPORTANT NOTICE:\n"
        )
        parser = DBSParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 3
        assert transactions[0].transaction_type == "debit"
        assert transactions[1].transaction_type == "credit"
        assert transactions[2].transaction_type == "debit"

    def test_handles_multiline_description(self):
        """Handles transaction descriptions that span multiple lines."""
        text = (
            "ACCOUNT SUMMARY\n"
            "Opening Balance Total Withdrawals (-) Total Deposits (+) Closing Balance\n"
            "SGD 500,000.00 SGD 8,200.00 SGD 0.00 SGD 491,800.00\n"
            "TRANSACTION DETAILS\n"
            "Transaction\n"
            "Description Reference Number Withdrawals (-) Deposits (+) Balance\n"
            "Date\n"
            "14 MAY 2026 DEBIT ADVISE - TERM LOAN TL-992184-MAY 8,200.00 491,800.00\n"
            "REPAYMENT\n"
            "IMPORTANT NOTICE:\n"
        )
        parser = DBSParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 1
        assert "REPAYMENT" in transactions[0].description

    def test_handles_comma_formatted_amounts(self):
        """Parses amounts with commas correctly (e.g., '65,000.00')."""
        text = (
            "ACCOUNT SUMMARY\n"
            "Opening Balance Total Withdrawals (-) Total Deposits (+) Closing Balance\n"
            "SGD 500,000.00 SGD 65,000.00 SGD 0.00 SGD 435,000.00\n"
            "TRANSACTION DETAILS\n"
            "Transaction\n"
            "Description Reference Number Withdrawals (-) Deposits (+) Balance\n"
            "Date\n"
            "08 MAY 2026 TELEGRAPHIC TRANSFER OUT FX-SUPPLIER-OS 65,000.00 435,000.00\n"
            "IMPORTANT NOTICE:\n"
        )
        parser = DBSParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 1
        assert transactions[0].amount == 65000.00

    def test_returns_empty_list_when_no_transactions(self):
        """Returns empty list when no transaction section found."""
        text = "Random text without any transaction section.\n"
        parser = DBSParser()
        transactions = parser.extract_transactions(text)
        assert transactions == []


class TestDBSParserAmountParsing:
    """Tests for DBS-specific amount formatting."""

    def test_parse_amount_with_commas(self):
        """Parses amounts with comma separators."""
        parser = DBSParser()
        assert parser._parse_amount("1,234.56") == 1234.56
        assert parser._parse_amount("65,000.00") == 65000.00
        assert parser._parse_amount("500,000.00") == 500000.00

    def test_parse_amount_without_commas(self):
        """Parses amounts without comma separators."""
        parser = DBSParser()
        assert parser._parse_amount("35.00") == 35.00
        assert parser._parse_amount("100.50") == 100.50

    def test_parse_amount_large_numbers(self):
        """Parses large amounts with multiple comma separators."""
        parser = DBSParser()
        assert parser._parse_amount("1,234,567.89") == 1234567.89


class TestDBSParserIntegration:
    """Integration tests using the actual mock DBS PDF."""

    def test_full_extraction_from_mock_pdf(self):
        """Full end-to-end test against mock_dbs_sme_statement_v2.pdf."""
        from src.ocr_engine import OCREngine

        pdf_path = os.path.join(
            os.path.dirname(__file__), "..", "mock_dbs_sme_statement_v2.pdf"
        )

        if not os.path.exists(pdf_path):
            return  # Skip if PDF not available

        engine = OCREngine(pdf_path)
        pages = engine.extract()
        full_text = "\n".join(pages)

        parser = DBSParser()

        # Test company name
        company = parser.extract_company_name(full_text)
        assert company == "TECH INNOVATION PTE. LTD."

        # Test statement period
        period = parser.identify_statement_period(full_text)
        assert period == "01 MAY 2026 - 31 MAY 2026"

        # Test transactions
        transactions = parser.extract_transactions(full_text)
        assert len(transactions) == 12

        # Verify totals match the statement summary
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
        assert "GIRO-SALARY" in transactions[0].description

        # Second transaction: inward giro (credit)
        assert transactions[1].transaction_type == "credit"
        assert transactions[1].amount == 42350.00

        # All transactions should have valid dates
        for tx in transactions:
            assert tx.date
            assert "MAY 2026" in tx.date
