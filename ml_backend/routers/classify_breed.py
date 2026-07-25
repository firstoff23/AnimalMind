import io
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from PIL import Image
import torch
import torch.nn.functional as F

from schemas.breed import BreedClassificationResponse, Top3Item
from services.quality import assess_image_quality
from services.breed_knowledge import get_breed_info
from utils.cache import get_cached_inference, get_image_hash, set_cached_inference
from utils.auth import get_current_user


router = APIRouter(tags=["Breed Classification"], dependencies=[Depends(get_current_user)])


@router.post(
    "/classify-breed",
    response_model=BreedClassificationResponse,
    summary="Classificação detalhada de raça de cão ou gato com validação de qualidade",
)
async def classify_breed_v1(
    file: UploadFile = File(...),
    include_info: bool = Query(default=False, description="Incluir dados detalhados da raça"),
):
    """
    Classifica a raça de um pet (cão ou gato) a partir de uma fotografia.

    - **file**: Imagem (JPEG, PNG ou WebP, máx 10MB)
    - **include_info**: Se `true`, inclui descrição, temperamento, grupo e riscos de saúde.

    Retorna raça identificada, confiança, top 3 alternativas e metadados.
    """
    # 1. Validar Content-Type
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    ct = (file.content_type or "").lower()
    if ct not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de ficheiro não suportado '{ct}'. Permitidos: {sorted(allowed_types)}",
        )

    # 2. Validar Tamanho Máximo (10 MB)
    MAX_SIZE = 10 * 1024 * 1024
    image_bytes = await file.read()
    if len(image_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Ficheiro demasiado grande. O tamanho máximo permitido é 10 MB.",
        )

    # 3. Validar Magic Bytes Binários
    is_valid_magic = (
        image_bytes[:3] == b"\xff\xd8\xff"
        or image_bytes[:8] == b"\x89PNG\r\n\x1a\n"
        or (image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP")
    )
    if not is_valid_magic:
        raise HTTPException(
            status_code=415,
            detail="O conteúdo do ficheiro não corresponde a um formato de imagem válido.",
        )

    # 4. Validar Qualidade da Imagem (Blur & Iluminação - Variância do Laplaciano >= 100)
    is_acceptable, variance, quality_msg = assess_image_quality(image_bytes)
    if not is_acceptable:
        raise HTTPException(
            status_code=400,
            detail="A imagem está desfocada ou com pouca luz. Tira outra foto.",
        )

    # 5. Verificação de Cache (SHA-256 do binário da imagem)
    img_hash = get_image_hash(image_bytes)
    cache_key = f"v1:classify-breed:{img_hash}:{include_info}"
    
    # Import main app module dynamically to access shared model singletons & redis_conn
    import app as main_app

    cached_result = get_cached_inference(cache_key, redis_conn=main_app.redis_conn)
    if cached_result:
        return BreedClassificationResponse(**cached_result)

    # 6. Carregar Modelo de Visão
    t_start = time.perf_counter()
    try:
        main_app._load_vision_model()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Erro ao carregar modelo de visão: {exc}")

    # 7. Descodificar Imagem
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Não foi possível descodificar a imagem: {exc}")

    # 8. Inferência
    try:
        with torch.no_grad():
            inputs = main_app._vit_processor(images=img, return_tensors="pt")
            outputs = main_app._vit_model(**inputs)

        if hasattr(outputs, "logits") or "logits" in outputs:
            logits = outputs.logits if hasattr(outputs, "logits") else outputs["logits"]

            # Apply Temperature Scaling if calibrated parameter exists
            import pathlib
            temp_path = pathlib.Path(__file__).parent.parent / "models" / "temperature.pt"
            if temp_path.exists():
                try:
                    temp_data = torch.load(str(temp_path), map_location="cpu")
                    temp_val = float(temp_data.get("temperature", 1.0))
                    if temp_val > 0:
                        logits = logits / temp_val
                except Exception as temp_err:
                    print(f"[Inference] Warning: Erro ao carregar parâmetro de temperatura: {temp_err}")

            prob_breed = F.softmax(logits, dim=-1)[0]
            top_k = torch.topk(prob_breed, k=min(3, len(prob_breed)))

            top3_items: List[Top3Item] = []
            id2label = getattr(main_app._vit_model.config, "id2label", {}) or {}

            for idx, score in zip(top_k.indices, top_k.values):
                raw_label = id2label.get(int(idx), main_app._BREED_LABELS[int(idx)] if int(idx) < len(main_app._BREED_LABELS) else f"Breed_{idx}")
                clean_name = main_app._clean_breed_label(raw_label)
                top3_items.append(Top3Item(breed=clean_name, confidence=round(float(score), 3)))

            top_breed = top3_items[0].breed
            top_confidence = top3_items[0].confidence
            species = "cat" if top_breed[0].isupper() else "dog"

        else:
            # Dual-head fallback
            prob_species = F.softmax(outputs["logits_species"], dim=-1)[0]
            prob_breed = F.softmax(outputs["logits_breed"], dim=-1)[0]

            species_idx = int(prob_species.argmax())
            species = main_app._SPECIES_LABELS[species_idx]

            top_k = torch.topk(prob_breed, k=3)
            top3_items = []
            for idx, score in zip(top_k.indices, top_k.values):
                clean_name = main_app._clean_breed_label(main_app._BREED_LABELS[int(idx)])
                top3_items.append(Top3Item(breed=clean_name, confidence=round(float(score), 3)))

            top_breed = top3_items[0].breed
            top_confidence = round(float((prob_species[species_idx] * prob_breed[top_k.indices[0]]) ** 0.5), 3)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro durante a inferência: {exc}")

    elapsed_ms = (time.perf_counter() - t_start) * 1000.0

    # 9. Enriquecer com Informação da Raça (se solicitado)
    info = get_breed_info(top_breed, species=species) if include_info else None

    response_data = BreedClassificationResponse(
        breed=top_breed,
        confidence=top_confidence,
        species=species,
        top3=top3_items,
        info=info,
        processing_time_ms=round(elapsed_ms, 1),
    )

    # 10. Guardar em Cache
    set_cached_inference(cache_key, response_data.dict(), redis_conn=main_app.redis_conn)

    return response_data
