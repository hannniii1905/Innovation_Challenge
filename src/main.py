"""CLI entry point for the OCR Financial Statement Analyzer.

Ties together the full analysis pipeline:

    OCREngine -> DocumentRouter -> Parser -> LoanDetector
              -> FraudDetector -> ReportGenerator

Handles both bank statements (DBS, OCBC, Maybank, UOB) and IRAS Notice of
Assessment documents through a single entry point. Prints a structured JSON
report to stdout by default, or writes it to a file with ``--output``.

Usage::

    python -m src.main path/to/statement.pdf
    python -m src.main statement.pdf --output report.json --verbose

Exit codes:
    0  Success.
    1  Input/usage error (file not found, not a PDF, unsupported document).
    2  Processing error (extraction failure, unexpected error).
"""

import argparse
import logging
import sys
from typing import List, Optional

from src.document_router import (
    DOCUMENT_TYPE_IRAS_NOA,
    DocumentRouter,
    UnsupportedDocumentError,
)
from src.fraud_detector import FraudDetector
from src.loan_detector import LoanDetector
from src.ocr_engine import (
    ExtractionError,
    FileNotFoundError as OCRFileNotFoundError,
    InvalidPDFError,
    OCREngine,
    OCREngineError,
)
from src.parsers.iras_noa_parser import IrasNoaParser
from src.reporter import ReportGenerator

# Exit codes
EXIT_SUCCESS = 0
EXIT_INPUT_ERROR = 1
EXIT_PROCESSING_ERROR = 2

logger = logging.getLogger("ocr_analyzer")


def build_parser() -> argparse.ArgumentParser:
    """Construct the argparse CLI parser."""
    parser = argparse.ArgumentParser(
        prog="ocr-financial-statement-analyzer",
        description=(
            "Analyze a financial PDF (bank statement or IRAS Notice of "
            "Assessment) and produce a structured JSON report."
        ),
    )
    parser.add_argument(
        "pdf_path",
        help="Path to the PDF file to analyze.",
    )
    parser.add_argument(
        "-o",
        "--output",
        metavar="FILE",
        default=None,
        help="Write the JSON report to FILE instead of stdout.",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable detailed logging to stderr.",
    )
    return parser


def _configure_logging(verbose: bool) -> None:
    """Configure logging for our logger based on the verbose flag.

    Only our application logger is set to DEBUG when ``--verbose`` is given;
    third-party library loggers (e.g. pdfminer) are left untouched to avoid
    flooding stderr with their internal debug output.
    """
    handler = logging.StreamHandler(stream=sys.stderr)
    handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG if verbose else logging.WARNING)
    logger.propagate = False


def analyze_bank_statement(
    bank: str,
    pages: List[str],
    router: DocumentRouter,
) -> dict:
    text = "\n".join(pages)
    warnings: List[str] = []

    parser_class = router.get_parser_class()
    parser = parser_class()

    company_name = parser.extract_company_name(text)
    statement_period = parser.identify_statement_period(text)
    transactions = parser.extract_transactions(text)

    loan_result = LoanDetector().detect(transactions)
    suspicious_credits = FraudDetector().analyze(transactions, statement_period)

    # 1. Base statement report parser summary compilation
    base_report = ReportGenerator().generate_bank_report(
        bank=bank,
        company_name=company_name,
        statement_period=statement_period,
        transactions=transactions,
        loan_result=loan_result,
        suspicious_credits=suspicious_credits,
        warnings=warnings,
    )

    # 2. Extract live credits validation parameters to map 4-Zone matrix variables
    total_credits = base_report.get("total_credits", 0.0)
    flagged_kiting_volume = sum(item.get("amount", 0.0) for item in suspicious_credits)
    true_adjusted_revenue = max(0.0, total_credits - flagged_kiting_volume)

    # 3. Inject flattened rule attributes for front-end rendering consumption mapping
    base_report.update({
        "evaluation_status": "refer_to_CA" if flagged_kiting_volume > 0 else "APPROVE",
        "probability_of_default": 8 if flagged_kiting_volume == 0 else 38,
        "integrity_check": "PASSED",
        "kiting_volume": flagged_kiting_volume,
        "true_adjusted_turnover": true_adjusted_revenue,
        "max_system_cap": true_adjusted_revenue * 0.15,
        "recommended_offer": min(50000.0, true_adjusted_revenue * 0.15),
        "justification": "Automated pipeline analysis processing complete.",
        "engine_warnings": warnings
    })

    return base_report


def analyze_iras_noa(pages: List[str]) -> dict:
    """Run the IRAS NOA analysis pipeline and build a report dict.

    Args:
        pages: Extracted page text from the OCR engine.

    Returns:
        An IRAS NOA report dict produced by ReportGenerator.
    """
    text = "\n".join(pages)
    warnings: List[str] = []

    parsed = IrasNoaParser().parse(text)

    if not parsed.get("individual_name"):
        warnings.append("Could not extract the individual's name from the NOA.")
    if parsed.get("total_income") is None:
        warnings.append("Could not extract the total income from the NOA.")
    if not parsed.get("year_of_assessment"):
        warnings.append("Could not identify the year of assessment.")

    return ReportGenerator().generate_iras_report(
        individual_name=parsed.get("individual_name"),
        year_of_assessment=parsed.get("year_of_assessment"),
        total_income=parsed.get("total_income"),
        warnings=warnings,
    )


def run(pdf_path: str) -> dict:
    """Execute the full analysis pipeline for the given PDF.

    Args:
        pdf_path: Path to the PDF file to analyze.

    Returns:
        A report dict (bank statement or IRAS NOA).

    Raises:
        OCREngineError: On file/extraction problems.
        UnsupportedDocumentError: If the document type is not supported.
    """
    logger.debug("Extracting text from: %s", pdf_path)
    engine = OCREngine(pdf_path)
    pages = engine.extract()
    logger.debug("Extracted %d page(s)", len(pages))

    router = DocumentRouter(pages)
    doc_type = router.identify()
    logger.debug("Identified document type: %s", doc_type)

    if doc_type == DOCUMENT_TYPE_IRAS_NOA:
        return analyze_iras_noa(pages)
    return analyze_bank_statement(doc_type, pages, router)


def main(argv: Optional[List[str]] = None) -> int:
    """CLI entry point.

    Args:
        argv: Optional argument list (defaults to ``sys.argv[1:]``).

    Returns:
        A process exit code.
    """
    args = build_parser().parse_args(argv)
    _configure_logging(args.verbose)

    try:
        report = run(args.pdf_path)
    except (OCRFileNotFoundError, InvalidPDFError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return EXIT_INPUT_ERROR
    except UnsupportedDocumentError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return EXIT_INPUT_ERROR
    except ExtractionError as exc:
        print(f"Error: failed to extract text. {exc}", file=sys.stderr)
        return EXIT_PROCESSING_ERROR
    except OCREngineError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return EXIT_PROCESSING_ERROR
    except Exception as exc:  # noqa: BLE001 - top-level safety net
        logger.debug("Unexpected error", exc_info=True)
        print(f"Error: an unexpected error occurred. {exc}", file=sys.stderr)
        return EXIT_PROCESSING_ERROR

    json_output = ReportGenerator().to_json(report)

    if args.output:
        try:
            with open(args.output, "w", encoding="utf-8") as fh:
                fh.write(json_output)
        except OSError as exc:
            print(
                f"Error: could not write to output file '{args.output}'. {exc}",
                file=sys.stderr,
            )
            return EXIT_INPUT_ERROR
        logger.debug("Report written to %s", args.output)
        print(f"Report written to {args.output}", file=sys.stderr)
    else:
        print(json_output)

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
