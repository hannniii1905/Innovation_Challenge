"""Tests for the IRAS Notice of Assessment (NOA) parser."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.parsers.iras_noa_parser import IrasNoaParser


SAMPLE_NOA_TEXT = (
    "IRAS NOTICE OF ASSESSMENT\n"
    "INLAND REVENUE AUTHORITY OF SINGAPORE YEAR OF ASSESSMENT 2026\n"
    "JOYCE TAN Tax Reference No: TXXXX123A\n"
    "8 MARINA BOULEVARD Notice Date: 28 APR 2026\n"
    "#12-04 MARINA BAY FINANCIAL CENTRE TOWER 1\n"
    "Notice No: 202611089274A\n"
    "SINGAPORE 018981\n"
    "Account Type: Income Tax (Individual)\n"
    "TAX STATEMENT / TAX COMPUTATION\n"
    "EMPLOYMENT INCOME\n"
    "Salary & Bonuses (Auto-included under AIS) 135,000.00\n"
    "Other Employment Benefits 2,400.00 137,400.00\n"
    "TOTAL INCOME 137,400.00\n"
    "Less: Expenses / Donations 0.00 0.00\n"
    "ASSESSABLE INCOME 137,400.00\n"
)


class TestExtractIndividualName:
    """Tests for extract_individual_name method."""

    def test_extracts_name_before_tax_reference(self):
        """Name is extracted from the line preceding 'Tax Reference No'."""
        parser = IrasNoaParser()
        assert parser.extract_individual_name(SAMPLE_NOA_TEXT) == "JOYCE TAN"

    def test_handles_different_name(self):
        """Works with a different taxpayer name."""
        text = "JOHN WEE LIM Tax Reference No: S1234567B\n"
        parser = IrasNoaParser()
        assert parser.extract_individual_name(text) == "JOHN WEE LIM"

    def test_returns_none_when_name_missing(self):
        """Returns None when no name can be identified."""
        text = "Some unrelated content without taxpayer details.\n"
        parser = IrasNoaParser()
        assert parser.extract_individual_name(text) is None


class TestExtractTotalIncome:
    """Tests for extract_total_income method."""

    def test_extracts_total_income(self):
        """Total income is parsed from the 'TOTAL INCOME' line."""
        parser = IrasNoaParser()
        assert parser.extract_total_income(SAMPLE_NOA_TEXT) == 137400.00

    def test_does_not_confuse_with_assessable_income(self):
        """Only the TOTAL INCOME line is used, not ASSESSABLE INCOME."""
        text = (
            "ASSESSABLE INCOME 999,999.00\n"
            "TOTAL INCOME 50,000.00\n"
        )
        parser = IrasNoaParser()
        assert parser.extract_total_income(text) == 50000.00

    def test_returns_none_when_total_income_missing(self):
        """Returns None when the total income line is absent."""
        text = "EMPLOYMENT INCOME\nSalary 100.00\n"
        parser = IrasNoaParser()
        assert parser.extract_total_income(text) is None


class TestExtractYearOfAssessment:
    """Tests for extract_year_of_assessment method."""

    def test_extracts_year_of_assessment(self):
        """Year of assessment is extracted from the header."""
        parser = IrasNoaParser()
        assert parser.extract_year_of_assessment(SAMPLE_NOA_TEXT) == "2026"

    def test_handles_different_year(self):
        """Works with a different assessment year."""
        text = "INLAND REVENUE AUTHORITY OF SINGAPORE YEAR OF ASSESSMENT 2023\n"
        parser = IrasNoaParser()
        assert parser.extract_year_of_assessment(text) == "2023"

    def test_returns_none_when_year_missing(self):
        """Returns None when no year of assessment is present."""
        text = "IRAS NOTICE OF ASSESSMENT\n"
        parser = IrasNoaParser()
        assert parser.extract_year_of_assessment(text) is None


class TestParseAmount:
    """Tests for the SGD amount parsing helper."""

    def test_parses_amount_with_commas(self):
        """Parses amounts with thousands separators."""
        parser = IrasNoaParser()
        assert parser._parse_amount("137,400.00") == 137400.00
        assert parser._parse_amount("1,234,567.89") == 1234567.89

    def test_parses_amount_without_commas(self):
        """Parses amounts without separators."""
        parser = IrasNoaParser()
        assert parser._parse_amount("0.00") == 0.00
        assert parser._parse_amount("135.50") == 135.50

    def test_parses_negative_amount(self):
        """Parses amounts with a leading minus sign (e.g., rebates)."""
        parser = IrasNoaParser()
        assert parser._parse_amount("-200.00") == -200.00


class TestParse:
    """Tests for the top-level parse method returning structured data."""

    def test_parse_returns_structured_data(self):
        """parse() returns all three fields in a dict."""
        parser = IrasNoaParser()
        result = parser.parse(SAMPLE_NOA_TEXT)
        assert result == {
            "individual_name": "JOYCE TAN",
            "total_income": 137400.00,
            "year_of_assessment": "2026",
        }


class TestIrasNoaParserIntegration:
    """Integration test using the actual mock IRAS NOA PDF."""

    def test_full_extraction_from_mock_pdf(self):
        """Full end-to-end test against mock_iras_noa_individual.pdf."""
        from src.ocr_engine import OCREngine

        pdf_path = os.path.join(
            os.path.dirname(__file__), "..", "mock_iras_noa_individual.pdf"
        )

        if not os.path.exists(pdf_path):
            return  # Skip if PDF not available

        engine = OCREngine(pdf_path)
        pages = engine.extract()
        full_text = "\n".join(pages)

        parser = IrasNoaParser()
        result = parser.parse(full_text)

        assert result["individual_name"] == "JOYCE TAN"
        assert result["total_income"] == 137400.00
        assert result["year_of_assessment"] == "2026"
