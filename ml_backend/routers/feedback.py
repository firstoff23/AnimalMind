import json
import os
import sqlite3
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException

from schemas.feedback import FeedbackRequest, FeedbackResponse

router = APIRouter(tags=["Feedback"])

_SQLITE_DB_PATH = Path(__file__).parent.parent / "feedback.db"


def _init_sqlite_db():
    """Initializes local SQLite fallback table if not exists."""
    conn = sqlite3.connect(str(_SQLITE_DB_PATH))
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS model_feedback (
                id TEXT PRIMARY KEY,
                model_name TEXT NOT NULL,
                model_version TEXT NOT NULL,
                input_hash TEXT NOT NULL,
                prediction TEXT NOT NULL,
                confidence REAL NOT NULL,
                is_correct INTEGER NOT NULL,
                correct_label TEXT,
                user_confidence INTEGER,
                feedback_text TEXT,
                metadata TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.commit()
    finally:
        conn.close()


@router.post(
    "/feedback",
    response_model=FeedbackResponse,
    summary="Regista o feedback do utilizador sobre uma previsão do modelo",
)
async def submit_feedback_v1(req: FeedbackRequest):
    """
    Guarda o feedback do utilizador referente a uma classificação.

    - Se PostgreSQL (`DATABASE_URL`) estiver disponível, armazena na tabela de base de dados principal.
    - Caso contrário, utiliza o SQLite local (`feedback.db`).
    """
    import app as main_app

    feedback_id = str(uuid.uuid4())

    # Try PostgreSQL first
    if main_app.db_pool:
        try:
            async with main_app.db_pool.acquire() as conn:
                # Ensure table exists
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS model_feedback (
                        id UUID PRIMARY KEY,
                        model_name TEXT NOT NULL,
                        model_version TEXT NOT NULL,
                        input_hash TEXT NOT NULL,
                        prediction TEXT NOT NULL,
                        confidence FLOAT NOT NULL,
                        is_correct BOOLEAN NOT NULL,
                        correct_label TEXT,
                        user_confidence INT,
                        feedback_text TEXT,
                        metadata JSONB,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                """)
                await conn.execute(
                    """
                    INSERT INTO model_feedback (
                        id, model_name, model_version, input_hash, prediction,
                        confidence, is_correct, correct_label, user_confidence,
                        feedback_text, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    """,
                    uuid.UUID(feedback_id),
                    req.model_name,
                    req.model_version,
                    req.input_hash,
                    req.prediction,
                    req.confidence,
                    req.is_correct,
                    req.correct_label,
                    req.user_confidence,
                    req.feedback_text,
                    json.dumps(req.metadata or {}),
                )
            print(f"[Feedback] Guardado no PostgreSQL (ID: {feedback_id})")
            return FeedbackResponse(status="success", id=feedback_id)
        except Exception as pg_err:
            print(f"[Feedback] Erro ao guardar no PostgreSQL ({pg_err}), recorrendo ao SQLite...")

    # Fallback to SQLite
    try:
        try:
            import aiosqlite

            async with aiosqlite.connect(str(_SQLITE_DB_PATH)) as db:
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS model_feedback (
                        id TEXT PRIMARY KEY,
                        model_name TEXT NOT NULL,
                        model_version TEXT NOT NULL,
                        input_hash TEXT NOT NULL,
                        prediction TEXT NOT NULL,
                        confidence REAL NOT NULL,
                        is_correct INTEGER NOT NULL,
                        correct_label TEXT,
                        user_confidence INTEGER,
                        feedback_text TEXT,
                        metadata TEXT,
                        created_at TEXT DEFAULT (datetime('now'))
                    )
                """)
                await db.execute(
                    """
                    INSERT INTO model_feedback (
                        id, model_name, model_version, input_hash, prediction,
                        confidence, is_correct, correct_label, user_confidence,
                        feedback_text, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        feedback_id,
                        req.model_name,
                        req.model_version,
                        req.input_hash,
                        req.prediction,
                        req.confidence,
                        1 if req.is_correct else 0,
                        req.correct_label,
                        req.user_confidence,
                        req.feedback_text,
                        json.dumps(req.metadata or {}),
                    ),
                )
                await db.commit()
        except ImportError:
            # Synchronous sqlite3 fallback
            _init_sqlite_db()
            conn = sqlite3.connect(str(_SQLITE_DB_PATH))
            try:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO model_feedback (
                        id, model_name, model_version, input_hash, prediction,
                        confidence, is_correct, correct_label, user_confidence,
                        feedback_text, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        feedback_id,
                        req.model_name,
                        req.model_version,
                        req.input_hash,
                        req.prediction,
                        req.confidence,
                        1 if req.is_correct else 0,
                        req.correct_label,
                        req.user_confidence,
                        req.feedback_text,
                        json.dumps(req.metadata or {}),
                    ),
                )
                conn.commit()
            finally:
                conn.close()

        print(f"[Feedback] Guardado no SQLite local (ID: {feedback_id})")
        return FeedbackResponse(status="success", id=feedback_id)
    except Exception as sqlite_err:
        print(f"[Feedback] Erro no SQLite: {sqlite_err}")
        raise HTTPException(status_code=500, detail=f"Erro ao guardar feedback: {str(sqlite_err)}")
