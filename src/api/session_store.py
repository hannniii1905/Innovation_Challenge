"""In-memory session store for analysis sessions.

Holds the per-session state that bridges extraction and the human-in-the-loop
verification/approval steps. Sessions are keyed by a generated UUID and live
only for the lifetime of the process (session-scoped, non-persistent), which is
sufficient for the demo web application described in the design.

Each session tracks:
    - the current workflow stage,
    - the identified document type,
    - the auto-extracted data and the (possibly corrected) working data,
    - which fields/transactions a human corrected,
    - the approval state,
    - the final analysis report (once approved).

Validates: Requirements 8.3, 9.1, 9.5, 9.6, 9.8
"""

import threading
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from src.api.schemas import (
    STAGE_UPLOADED,
    TransactionModel,
)


@dataclass
class Session:
    """State for a single analysis session.

    Attributes:
        session_id: Unique session identifier.
        stage: Current workflow stage (see schemas.STAGE_*).
        document_type: Identified document type (bank id or "IRAS_NOA").
        error: Error message if the session entered the `failed` stage.
        approved: Whether the data has passed the Approval_Step.

        bank/company_name/statement_period: Bank statement working fields.
        transactions: Working transaction list (may include human edits).
        individual_name/total_income/year_of_assessment: IRAS NOA working fields.

        corrected_fields: Names of top-level fields corrected by a human.
        report: Final analysis report dict (populated after approval).
    """

    session_id: str
    stage: str = STAGE_UPLOADED
    document_type: Optional[str] = None
    error: Optional[str] = None
    approved: bool = False

    # Progress reporting (0-100) and a short human-readable status message
    # describing what the backend is currently doing.
    progress: int = 0
    progress_message: str = ""

    # Bank statement working data
    bank: Optional[str] = None
    company_name: Optional[str] = None
    statement_period: Optional[str] = None
    transactions: List[TransactionModel] = field(default_factory=list)

    # IRAS NOA working data
    individual_name: Optional[str] = None
    total_income: Optional[float] = None
    year_of_assessment: Optional[str] = None

    # Verification metadata
    corrected_fields: List[str] = field(default_factory=list)

    # Final report
    report: Optional[dict] = None


class SessionStore:
    """Thread-safe in-memory store of :class:`Session` objects."""

    def __init__(self) -> None:
        self._sessions: Dict[str, Session] = {}
        self._lock = threading.Lock()

    def create(self) -> Session:
        """Create and register a new session with a generated UUID."""
        session_id = str(uuid.uuid4())
        session = Session(session_id=session_id)
        with self._lock:
            self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> Optional[Session]:
        """Return the session for ``session_id``, or None if unknown."""
        with self._lock:
            return self._sessions.get(session_id)

    def delete(self, session_id: str) -> None:
        """Remove a session from the store (best-effort)."""
        with self._lock:
            self._sessions.pop(session_id, None)

    def clear(self) -> None:
        """Remove all sessions (primarily for tests)."""
        with self._lock:
            self._sessions.clear()
