"""Tests for the UOB (United Overseas Bank) statement parser."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.parsers.uob_parser import UOBParser
from src.parsers.base_parser import Transaction


class TestUOBParserCompanyName:
    """Tests for extract_company_name method."""

    def test_extract_company_name_from_standard_header(self):
        """Company name is extracted from a standard UOB statement header."""
        text = (
            "XUOB\n"
            "BUSINESS ACCOUNT STATEMENT\n"
            "UNITED OVERSEAS BANK Statement Period: 01 MAY 2026 TO 31 MAY 2026\n"
            "TECH INNOVATION PTE. LTD. Account Number: 128-304928-4\n"
            "8 MARINA BOULEVARD\n"
        )
        parser = UOBParser()
        assert parser.extract_company_name(text) == "TECH INNOVATION PTE. LTD."

    def test_extract_company_name_returns_none_when_missing(self):
        """Returns None when the company name cannot be identified."""
        text = "Some random text without the expected UOB header format.\n"
        parser = UOBParser()
        assert parser.extract_company_name(text) is None

    def test_extract_company_name_handles_different_company_names(self):
        """Works with different company name formats."""
        text = (
            "BUSINESS ACCOUNT STATEMENT\n"
            "UNITED OVERSEAS BANK Statement Period: 01 JAN 2025 TO 31 JAN 2025\n"
            "ABC TRADING (S) PTE LTD Account Number: 128-998877-1\n"
        )
        parser = UOBParser()
        assert parser.extract_company_name(text) == "ABC TRADING (S) PTE LTD"


class TestUOBParserStatementPeriod:
    """Tests for identify_statement_period method."""

    def test_extract_statement_period(self):
        """Statement period is extracted from the header."""
        text = "UNITED OVERSEAS BANK Statement Period: 01 MAY 2026 TO 31 MAY 2026\n"
        parser = UOBParser()
        assert parser.identify_statement_period(text) == "01 MAY 2026 TO 31 MAY 2026"

    def test_extract_statement_period_different_month(self):
        """Works with different months."""
        text = "Statement Period: 01 JAN 2025 TO 31 JAN 2025\n"
        parser = UOBParser()
        assert parser.identify_statement_period(text) == "01 JAN 2025 TO 31 JAN 2025"

    def test_returns_none_when_period_not_found(self):
        """Returns None when the statement period is not present."""
        text = "Some random text without a statement period.\n"
        parser = UOBParser()
        assert parser.identify_statement_period(text) is None

    def test_extract_period_case_insensitive(self):
        """Period extraction is case-insensitive."""
        text = "statement period: 15 MAR 2026 to 14 APR 2026\n"
        parser = UOBParser()
        result = parser.identify_statement_period(text)
        assert result is not None
        assert "MAR 2026" in result
        assert "APR 2026" in result


class TestUOBParserTransactions:
    """Tests for extract_transactions method."""

    HEADER = (
        "TRANSACTION HISTORY\n"
        "CREDITS\n"
        "TRANS DATE TRANSACTION DESCRIPTION REF/CHQ NO. DEBITS (-) BALANCE\n"
        "(+)\n"
        "02 MAY 2026 STATEMENT OPENING BALANCE 150,000.00\n"
    )

    FOOTER = "*** END OF STATEMENT ***\n"

    def test_extract_single_debit_transaction(self):
        """Parses a single debit transaction correctly."""
        text = (
            self.HEADER
            + "04 MAY 2026 GIRO - PAYROLL UOB-PAY-0821 18,500.00 131,500.00\n"
            + self.FOOTER
        )
        parser = UOBParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 1
        assert transactions[0].date == "04 MAY 2026"
        assert transactions[0].amount == 18500.00
        assert transactions[0].transaction_type == "debit"
        assert "GIRO - PAYROLL" in transactions[0].description

    def test_extract_single_credit_transaction(self):
        """Parses a single credit transaction correctly."""
        text = (
            self.HEADER
            + "06 MAY 2026 GIRO INWARD - ACME CORP FT26050611 42,350.00 192,350.00\n"
            + self.FOOTER
        )
        parser = UOBParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 1
        assert transactions[0].date == "06 MAY 2026"
        assert transactions[0].amount == 42350.00
        assert transactions[0].transaction_type == "credit"

    def test_extract_multiple_transactions(self):
        """Parses multiple transactions with correct types via balance tracking."""
        text = (
            self.HEADER
            + "04 MAY 2026 GIRO - PAYROLL UOB-PAY-0821 18,500.00 131,500.00\n"
            + "06 MAY 2026 GIRO INWARD - ACME CORP FT26050611 42,350.00 173,850.00\n"
            + "08 MAY 2026 OUTWARD TELE-TRANSFER TT-UOB-88291 65,000.00 108,850.00\n"
            + self.FOOTER
        )
        parser = UOBParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 3
        assert transactions[0].transaction_type == "debit"
        assert transactions[1].transaction_type == "credit"
        assert transactions[2].transaction_type == "debit"

    def test_handles_comma_formatted_amounts(self):
        """Parses amounts with commas correctly (e.g., '350,000.00')."""
        text = (
            self.HEADER
            + "11 MAY 2026 SHAREHOLDER ADVANCE - CAP INJ SH-FUND-99 350,000.00 500,000.00\n"
            + self.FOOTER
        )
        parser = UOBParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 1
        assert transactions[0].amount == 350000.00
        assert transactions[0].transaction_type == "credit"

    def test_handles_small_amounts(self):
        """Correctly handles small amounts like cable charges."""
        text = (
            self.HEADER
            + "08 MAY 2026 CABLE / TELEX CHARGES CHG20260508 35.00 149,965.00\n"
            + self.FOOTER
        )
        parser = UOBParser()
        transactions = parser.extract_transactions(text)
        assert len(transactions) == 1
        assert transactions[0].amount == 35.00
        assert transactions[0].transaction_type == "debit"

    def test_returns_empty_list_when_no_transactions(self):
        """Returns empty list when no transaction section is found."""
        text = "Random text without any transaction section.\n"
        parser = UOBParser()
        assert parser.extract_transactions(text) == []

    def test_skips_opening_balance_line(self):
        """Opening balance line is not counted as a transaction."""
        text = self.HEADER + self.FOOTER
        parser = UOBParser()
        assert len(parser.extract_transactions(text)) == 0


class TestUOBParserAmountParsing:
    """Tests for UOB-specific amount formatting."""

    def test_parse_amount_with_commas(self):
        """Parses amounts with comma separators."""
        parser = UOBParser()
        assert parser._parse_amount("1,234.56") == 1234.56
        assert parser._parse_amount("65,000.00") == 65000.00
        assert parser._parse_amount("350,000.00") == 350000.00

    def test_parse_amount_without_commas(self):
        """Parses amounts without comma separators."""
        parser = UOBParser()
        assert parser._parse_amount("35.00") == 35.00
        assert parser._parse_amount("100.50") == 100.50

    def test_parse_amount_large_numbers(self):
        """Parses large amounts with multiple comma separators."""
        parser = UOBParser()
        assert parser._parse_amount("1,234,567.89") == 1234567.89


class TestUOBParserIntegration:
    """Integration tests using the actual mock UOB PDF."""

    def test_full_extraction_from_mock_pdf(self):
        """Full end-to-end test against mock_uob_sme_statement.pdf."""
        from src.ocr_engine import OCREngine

        pdf_path = os.path.join(
            os.path.dirname(__file__), "..", "mock_uob_sme_statement.pdf"
        )

        if not os.path.exists(pdf_path):
            return  # Skip if PDF not available

        engine = OCREngine(pdf_path)
        pages = engine.extract()
        full_text = "\n".join(pages)

        parser = UOBParser()

        # Company name.
        assert parser.extract_company_name(full_text) == "TECH INNOVATION PTE. LTD."

        # Statement period.
        assert parser.identify_statement_period(full_text) == "01 MAY 2026 TO 31 MAY 2026"

        # Transactions.
        transactions = parser.extract_transactions(full_text)
        assert len(transactions) == 13

        # Totals must match the ACCOUNT SUMMARY.
        total_credits = sum(
            tx.amount for tx in transactions if tx.transaction_type == "credit"
        )
        total_debits = sum(
            tx.amount for tx in transactions if tx.transaction_type == "debit"
        )
        assert total_credits == 448250.00
        assert total_debits == 116135.00

        # First transaction: payroll (debit).
        assert transactions[0].transaction_type == "debit"
        assert transactions[0].amount == 18500.00
        assert "PAYROLL" in transactions[0].description

        # Shareholder advance / capital injection is a credit.
        injection = [tx for tx in transactions if "SHAREHOLDER" in tx.description]
        assert len(injection) == 1
        assert injection[0].transaction_type == "credit"
        assert injection[0].amount == 350000.00

        # Loan repayment is a debit.
        loan_tx = [tx for tx in transactions if "LOAN REPAYMENT" in tx.description]
        assert len(loan_tx) == 1
        assert loan_tx[0].transaction_type == "debit"
        assert loan_tx[0].amount == 8200.00

        # All transactions should have valid MAY 2026 dates.
        for tx in transactions:
            assert tx.date
            assert "MAY 2026" in tx.date
