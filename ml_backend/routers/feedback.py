import hashlib
import json
import os
import sqlite3
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from schemas.feedback import FeedbackRequest, FeedbackResponse

router = APIRouter(tags=["Feedback"])

_SQLITE_DB_PATH = Path(__file__).parent.parent / "feedback.db"
_FEEDBACK_IMAGES_DIR = Path(__file__).parent.parent / "feedback_images"
_FEEDBACK_IMAGES_DIR.mkdir(parents=True, exist_ok=True)


def _init_sqlite_db():
    """Initializes local SQLite fallback table if not exists & adds image_path column."""
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
                image_path TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        # Ensure column exists if table was created previously without image_path
        try:
            cursor.execute("ALTER TABLE model_feedback ADD COLUMN image_path TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists
        conn.commit()
    finally:
        conn.close()


@router.post(
    "/feedback",
    response_model=FeedbackResponse,
    summary="Regista o feedback do utilizador sobre uma previsão do modelo (com suporte a imagem opcional)",
)
async def submit_feedback_v1(
    raw_request: Request,
    json_data: Optional[str] = Form(default=None),
    image: Optional[UploadFile] = File(default=None),
):
    """
    Guarda o feedback do utilizador referente a uma classificação, permitindo opcionalmente anexar a imagem.

    Suporta:
    - `multipart/form-data` com campo `json` (string do JSON) e `image` (ficheiro binário)
    - `application/json` direto com payload JSON tradicional
    """
    import app as main_app

    # 1. Parsing do FeedbackRequest
    req: Optional[FeedbackRequest] = None
    if json_data:
        try:
            req = FeedbackRequest.parse_raw(json_data)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Erro ao descodificar 'json' form-data: {exc}")
    else:
        try:
            body = await raw_request.json()
            req = FeedbackRequest(**body)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Payload JSON inválido: {exc}")

    if not req:
        raise HTTPException(status_code=400, detail="Dados de feedback em falta.")

    feedback_id = str(uuid.uuid4())
    saved_image_path: Optional[str] = req.image_path

    # 2. Guardar Ficheiro de Imagem se enviado
    if image:
        try:
            image_bytes = await image.read()
            if len(image_bytes) > 0:
                img_hash = hashlib.sha256(image_bytes).hexdigest()
                img_filename = f"{img_hash}.jpg"
                full_save_path = _FEEDBACK_IMAGES_DIR / img_filename
                with open(full_save_path, "wb") as f:
                    f.write(image_bytes)
                saved_image_path = f"feedback_images/{img_filename}"
                print(f"[Feedback] Imagem guardada em: {saved_image_path}")
        except Exception as img_err:
            print(f"[Feedback] Aviso: Erro ao guardar imagem de feedback: {img_err}")

    # 3. Guardar em PostgreSQL se disponível
    if main_app.db_pool:
        try:
            async with main_app.db_pool.acquire() as conn:
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
                        image_path TEXT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                """)
                # Migration safety check for existing postgres tables
                await conn.execute("ALTER TABLE model_feedback ADD COLUMN IF NOT EXISTS image_path TEXT;")

                await conn.execute(
                    """
                    INSERT INTO model_feedback (
                        id, model_name, model_version, input_hash, prediction,
                        confidence, is_correct, correct_label, user_confidence,
                        feedback_text, metadata, image_path
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
                    saved_image_path,
                )
            print(f"[Feedback] Guardado no PostgreSQL (ID: {feedback_id}, Imagem: {saved_image_path})")
            return FeedbackResponse(status="success", id=feedback_id, image_path=saved_image_path)
        except Exception as pg_err:
            print(f"[Feedback] Erro ao guardar no PostgreSQL ({pg_err}), recorrendo ao SQLite...")

    # 4. Fallback SQLite
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
                        image_path TEXT,
                        created_at TEXT DEFAULT (datetime('now'))
                    )
                """)
                try:
                    await db.execute("ALTER TABLE model_feedback ADD COLUMN image_path TEXT")
                except Exception:
                    pass

                await db.execute(
                    """
                    INSERT INTO model_feedback (
                        id, model_name, model_version, input_hash, prediction,
                        confidence, is_correct, correct_label, user_confidence,
                        feedback_text, metadata, image_path
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                        saved_image_path,
                    ),
                )
                await db.commit()
        except ImportError:
            _init_sqlite_db()
            conn = sqlite3.connect(str(_SQLITE_DB_PATH))
            try:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO model_feedback (
                        id, model_name, model_version, input_hash, prediction,
                        confidence, is_correct, correct_label, user_confidence,
                        feedback_text, metadata, image_path
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                        saved_image_path,
                    ),
                )
                conn.commit()
            finally:
                conn.close()

        print(f"[Feedback] Guardado no SQLite local (ID: {feedback_id}, Imagem: {saved_image_path})")
        return FeedbackResponse(status="success", id=feedback_id, image_path=saved_image_path)
    except Exception as sqlite_err:
        print(f"[Feedback] Erro no SQLite: {sqlite_err}")
        raise HTTPException(status_code=500, detail=f"Erro ao guardar feedback: {str(sqlite_err)}")
