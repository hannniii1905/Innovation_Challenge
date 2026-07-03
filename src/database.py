# src/database.py
import os
import json
from sqlalchemy import Index, create_engine, Column, Integer, String, Float, Text, TypeDecorator
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Define Local SQLite Database URL Location
DATABASE_URL = "sqlite:///./innovation_challenge.db"

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}  # Required configuration parameter for SQLite multi-threading
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. Custom JSON Type Decorator to store structured questionnaire arrays cleanly in SQLite
class SQLiteJSON(TypeDecorator):
    impl = Text

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return None

# 3. Define the Staged Core Credit Application Staging Ledger
class StagedApplication(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    status = Column(String(32), default="PENDING")  # States: PENDING, EVALUATED, ERROR
    
    # Singpass/ACRA Form Verified Identity Pillars
    uen = Column(String(16), index=True, nullable=False)
    company_name = Column(String(255), nullable=False)
    singpass_profile_json = Column(SQLiteJSON, nullable=True) # Holds directors list, incorporation dates
    
    # Hardcoded Structured Pre-Questionnaire Inputs (No OCR Needed)
    requested_quantum = Column(Float, nullable=False)        # The requested loan amount ($)
    declared_loans = Column(String(255), default="NIL")      # Declared text field for liability matching
    pre_questionnaire_json = Column(SQLiteJSON, nullable=True) # Stores the explicit form fields layout dict
    
    # Local Storage Document File Tracking Infrastructure Roots
    bank_statement_path = Column(String(512), nullable=True)   # Pointer to raw UOB statement file location
    income_statement_path = Column(String(512), nullable=True) # Pointer to raw IRAS tax record statement location

    # Loan Configuration
    loan_tenure_months = Column(Integer, nullable=True)
    monthly_installment = Column(Float, nullable=True)
    loan_purpose = Column(String(255), nullable=True)

    # Additional uploads
    ic_path = Column(String(512), nullable=True)

    # Client declarations
    industry = Column(String(255), nullable=True)
    declared_revenue = Column(Float, nullable=True)
    declared_ebitda = Column(Float, nullable=True)
    declared_tnw = Column(Float, nullable=True)

    # Consent
    credit_bureau_consent = Column(String(5), default="NO")

    #OCR documents
    bank_ocr_json = Column(SQLiteJSON, nullable=True)
    income_ocr_json = Column(SQLiteJSON, nullable=True)
    ic_ocr_json = Column(SQLiteJSON, nullable=True)

    # Experian Results
    acra_json = Column(SQLiteJSON, nullable=True)
    litigation_json = Column(SQLiteJSON, nullable=True)
    credit_bureau_json = Column(SQLiteJSON, nullable=True)

    # Derived Financial Metrics
    annualised_revenue = Column(Float, nullable=True)
    ebitda = Column(Float, nullable=True)
    tnw = Column(Float, nullable=True)
    dscr = Column(Float, nullable=True)
    fcc = Column(Float, nullable=True)
    mue = Column(Float, nullable=True)
    tue = Column(Float, nullable=True)

    #OCR checks
    credit_kiting_score = Column(Float, nullable=True)
    existing_debt = Column(Float, nullable=True)
    existing_debt_items = Column(SQLiteJSON, nullable=True)

    system_decision = Column(String(32), nullable=True)
    system_reason = Column(Text, nullable=True)
    risk_flags = Column(SQLiteJSON, nullable=True)
    credit_score = Column(String(10), nullable=True)

    # Credit Approver
    approver_decision = Column(String(32), nullable=True)
    approver_name = Column(String(255), nullable=True)
    approver_notes = Column(Text, nullable=True)
    
    # Final recommendation
    approved_amount = Column(Float, nullable=True)


# 4. Database Lifecycle Initialization Interface Entry Points
def init_db():
    """
    Called at application startup bootstrap phase inside src/main.py.
    Safely generates tables automatically if they do not exist.
    """
    Base.metadata.create_all(bind=engine)

def get_db():
    """
    FastAPI dependency yielding isolated contextual session management loops.
    Ensures safe database connections close-outs upon cycle completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()