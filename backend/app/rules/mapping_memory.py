"""
Persistent Mapping Memory & Institutional Rulebase
Persists informaticist decisions (unit overrides, local terminology groundings, Z-segment mappings)
using a lightweight SQLite database and automatically applies learned rules to incoming messages.
"""

import sqlite3
import os
import uuid
from datetime import datetime
from typing import Any
from dataclasses import dataclass, asdict

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "mapping_rules.db")


@dataclass
class MappingRule:
    id: str
    facility: str  # Specific sending facility e.g. "METRO_HEALTH", or "*" for global
    rule_type: str  # "MISSING_UNIT", "LOCAL_TERMINOLOGY", "CUSTOM_Z_SEGMENT"
    source_key: str  # Local code, analyte name, or segment ID (e.g. "BP_LOCAL", "29463-7")
    target_value: str  # Resolved standard value (e.g. "kg", "85354-9^Blood pressure panel")
    target_display: str
    author: str
    created_at: str
    applied_count: int
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class MappingMemory:
    """Manages persistence and retrieval of institutional clinical mapping rules."""

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS mapping_rules (
                    id TEXT PRIMARY KEY,
                    facility TEXT NOT NULL,
                    rule_type TEXT NOT NULL,
                    source_key TEXT NOT NULL,
                    target_value TEXT NOT NULL,
                    target_display TEXT NOT NULL,
                    author TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    applied_count INTEGER DEFAULT 0,
                    notes TEXT DEFAULT ''
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_rules_lookup 
                ON mapping_rules (facility, rule_type, source_key)
                """
            )
            conn.commit()

            # Seed pre-configured baseline institutional rules if table is empty
            cursor = conn.execute("SELECT COUNT(*) FROM mapping_rules")
            if cursor.fetchone()[0] == 0:
                self._seed_baseline_rules(conn)

    def _seed_baseline_rules(self, conn: sqlite3.Connection):
        """Seed common hospital conventions for immediate demonstration."""
        now = datetime.utcnow().isoformat() + "Z"
        baseline = [
            (
                f"rule-{uuid.uuid4().hex[:8]}",
                "METRO_HEALTH",
                "LOCAL_TERMINOLOGY",
                "BP_LOCAL",
                "85354-9",
                "Blood pressure panel with all children optional",
                "Clinical Informatics Governance",
                now,
                4,
                "Hospital default for Philips bedside telemetry monitor non-invasive blood pressure.",
            ),
            (
                f"rule-{uuid.uuid4().hex[:8]}",
                "METRO_HEALTH",
                "MISSING_UNIT",
                "29463-7",
                "kg",
                "Kilograms (kg)",
                "Quality & Safety Committee",
                now,
                6,
                "Inpatient adult medical floors use calibrated metric scales; default to kg.",
            ),
            (
                f"rule-{uuid.uuid4().hex[:8]}",
                "METRO_CARDIO",
                "LOCAL_TERMINOLOGY",
                "TROP_POC",
                "49563-0",
                "Troponin I.cardiac [Mass/volume] in Blood by Point of care method",
                "Cardiology Quality Lead",
                now,
                2,
                "Metro Cardiology point-of-care rapid troponin immunoassay.",
            ),
        ]
        conn.executemany(
            """
            INSERT INTO mapping_rules (id, facility, rule_type, source_key, target_value, target_display, author, created_at, applied_count, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            baseline,
        )
        conn.commit()

    def add_or_update_rule(
        self,
        facility: str,
        rule_type: str,
        source_key: str,
        target_value: str,
        target_display: str = "",
        author: str = "Clinical Informaticist",
        notes: str = "",
    ) -> MappingRule:
        """Create or update an institutional mapping rule."""
        norm_facility = facility.strip().upper() if facility else "*"
        norm_source = source_key.strip()
        norm_type = rule_type.strip().upper()
        now = datetime.utcnow().isoformat() + "Z"

        with self._get_connection() as conn:
            # Check existing
            row = conn.execute(
                """
                SELECT id, applied_count FROM mapping_rules 
                WHERE facility = ? AND rule_type = ? AND source_key = ?
                """,
                (norm_facility, norm_type, norm_source),
            ).fetchone()

            if row:
                rule_id = row["id"]
                count = row["applied_count"]
                conn.execute(
                    """
                    UPDATE mapping_rules 
                    SET target_value = ?, target_display = ?, author = ?, notes = ?
                    WHERE id = ?
                    """,
                    (target_value.strip(), target_display.strip(), author.strip(), notes.strip(), rule_id),
                )
            else:
                rule_id = f"rule-{uuid.uuid4().hex[:8]}"
                count = 0
                conn.execute(
                    """
                    INSERT INTO mapping_rules (id, facility, rule_type, source_key, target_value, target_display, author, created_at, applied_count, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (rule_id, norm_facility, norm_type, norm_source, target_value.strip(), target_display.strip(), author.strip(), now, count, notes.strip()),
                )
            conn.commit()

        return MappingRule(
            id=rule_id,
            facility=norm_facility,
            rule_type=norm_type,
            source_key=norm_source,
            target_value=target_value.strip(),
            target_display=target_display.strip(),
            author=author.strip(),
            created_at=now,
            applied_count=count,
            notes=notes.strip(),
        )

    def find_matching_rule(self, facility: str, rule_type: str, source_key: str) -> MappingRule | None:
        """
        Find a matching rule by specific facility first, falling back to global facility '*'.
        """
        norm_fac = facility.strip().upper() if facility else "*"
        norm_type = rule_type.strip().upper()
        norm_source = source_key.strip()

        with self._get_connection() as conn:
            # Priority 1: Facility-specific rule
            row = conn.execute(
                """
                SELECT * FROM mapping_rules 
                WHERE facility = ? AND rule_type = ? AND source_key = ?
                """,
                (norm_fac, norm_type, norm_source),
            ).fetchone()

            # Priority 2: Global rule (*)
            if not row and norm_fac != "*":
                row = conn.execute(
                    """
                    SELECT * FROM mapping_rules 
                    WHERE facility = '*' AND rule_type = ? AND source_key = ?
                    """,
                    (norm_type, norm_source),
                ).fetchone()

            if row:
                return MappingRule(
                    id=row["id"],
                    facility=row["facility"],
                    rule_type=row["rule_type"],
                    source_key=row["source_key"],
                    target_value=row["target_value"],
                    target_display=row["target_display"],
                    author=row["author"],
                    created_at=row["created_at"],
                    applied_count=row["applied_count"],
                    notes=row["notes"] or "",
                )
        return None

    def increment_usage(self, rule_id: str):
        """Increment the application counter for audit and tracking."""
        with self._get_connection() as conn:
            conn.execute(
                "UPDATE mapping_rules SET applied_count = applied_count + 1 WHERE id = ?",
                (rule_id,),
            )
            conn.commit()

    def list_rules(self, facility: str | None = None) -> list[MappingRule]:
        """List all rules, optionally filtered by facility."""
        with self._get_connection() as conn:
            if facility:
                rows = conn.execute(
                    "SELECT * FROM mapping_rules WHERE facility = ? OR facility = '*' ORDER BY created_at DESC",
                    (facility.strip().upper(),),
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM mapping_rules ORDER BY created_at DESC").fetchall()

            return [
                MappingRule(
                    id=r["id"],
                    facility=r["facility"],
                    rule_type=r["rule_type"],
                    source_key=r["source_key"],
                    target_value=r["target_value"],
                    target_display=r["target_display"],
                    author=r["author"],
                    created_at=r["created_at"],
                    applied_count=r["applied_count"],
                    notes=r["notes"] or "",
                )
                for r in rows
            ]

    def delete_rule(self, rule_id: str) -> bool:
        """Remove a rule by ID."""
        with self._get_connection() as conn:
            cur = conn.execute("DELETE FROM mapping_rules WHERE id = ?", (rule_id,))
            conn.commit()
            return cur.rowcount > 0

    def export_concept_map(self) -> dict[str, Any]:
        """Export persistent terminology rules as an HL7 FHIR ConceptMap resource."""
        rules = self.list_rules()
        group_elements = []

        for r in rules:
            if r.rule_type == "LOCAL_TERMINOLOGY":
                group_elements.append({
                    "code": r.source_key,
                    "target": [{
                        "code": r.target_value,
                        "display": r.target_display,
                        "equivalence": "equivalent",
                        "comment": f"Institutional rule for facility: {r.facility}. Author: {r.author}",
                    }]
                })

        return {
            "resourceType": "ConceptMap",
            "id": "semanticare-institutional-rules",
            "title": "SemantiCare Institutional Terminology ConceptMap",
            "status": "active",
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "publisher": "SemantiCare Clinical Informatics",
            "sourceUri": "http://example.org/fhir/ValueSet/local-hospital-codes",
            "targetUri": "http://loinc.org/vs",
            "group": [
                {
                    "source": "http://example.org/codes/hospital-local",
                    "target": "http://loinc.org",
                    "element": group_elements,
                }
            ],
        }


# Global repository instance
mapping_memory = MappingMemory()
