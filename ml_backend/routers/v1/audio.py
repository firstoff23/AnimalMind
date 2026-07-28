from fastapi import APIRouter, File, HTTPException, UploadFile
from schemas.audio import AudioClassificationResponse
from services.audio_service import classify_vocalization

router = APIRouter(tags=["v1-audio"])

MAX_AUDIO_SIZE_BYTES = 5 * 1024 * 1024  # 5MB max


@router.post(
    "/classify-audio",
    response_model=AudioClassificationResponse,
    summary="Classify pet vocalization (bark, meow, whine, growl, hiss, silence)",
    description="Accepts audio files (WAV, MP3, OGG, M4A, FLAC) up to 5MB and returns vocalization classification with calibrated confidence scores."
)
async def classify_audio_endpoint(
    file: UploadFile = File(..., description="Audio file binary")
):
    if file.content_type and not file.content_type.startswith("audio/") and not file.content_type.startswith("application/octet-stream"):
        raise HTTPException(
            status_code=400,
            detail=f"Formato de ficheiro inválido ({file.content_type}). Por favor envia um ficheiro de áudio (audio/wav, audio/mpeg, etc.)."
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="O ficheiro de áudio enviado está vazio.")

    if len(content) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="O ficheiro de áudio excede o limite máximo de 5MB.")

    result = classify_vocalization(content)
    return result
