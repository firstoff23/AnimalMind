import io
import os
from typing import Tuple
from PIL import Image
import numpy as np


DEFAULT_THRESHOLD = float(os.environ.get("LAPLACIAN_THRESHOLD", 100.0))


def assess_image_quality(
    image_bytes: bytes,
    threshold: float = DEFAULT_THRESHOLD,
    max_dimension: int = 640
) -> Tuple[bool, float, str]:
    """
    Assesses image quality (blurriness & lighting) using Laplacian variance.
    Returns (is_acceptable, variance, message).
    """
    try:
        # Try OpenCV first if available
        import cv2

        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

        if img is None:
            return False, 0.0, "Não foi possível descodificar a imagem."

        # Resize for fast computation if image is large
        h, w = img.shape[:2]
        if max(h, w) > max_dimension:
            scale = max_dimension / float(max(h, w))
            new_w, new_h = int(w * scale), int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

        variance = float(cv2.Laplacian(img, cv2.CV_64F).var())

    except Exception:
        # Fallback to PIL + Scipy/Numpy if OpenCV is missing
        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("L")
            w, h = pil_img.size
            if max(h, w) > max_dimension:
                scale = max_dimension / float(max(h, w))
                pil_img = pil_img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

            arr = np.array(pil_img, dtype=np.float64)
            # 3x3 Laplacian filter kernel
            kernel = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float64)

            from scipy.signal import convolve2d
            filtered = convolve2d(arr, kernel, mode="valid")
            variance = float(np.var(filtered))
        except Exception as exc:
            # If both fail, log error and allow image through gracefully
            print(f"[Quality] Warning: Quality assessment failed ({exc}). Bypassing blur check.")
            return True, 999.0, "Quality check bypassed."

    is_acceptable = variance >= threshold
    msg = "Imagem aceitável." if is_acceptable else "A imagem está desfocada ou com pouca luz. Tira outra foto."
    return is_acceptable, round(variance, 2), msg
