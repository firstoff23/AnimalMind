import logging
import sys
import uuid
from typing import Optional


logger = logging.getLogger("animalmind_ml")


def setup_structured_logging():
    """Sets up python-json-logger if installed, or standard clean logger."""
    try:
        from pythonjsonlogger import jsonlogger

        handler = logging.StreamHandler(sys.stdout)
        formatter = jsonlogger.JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s %(correlation_id)s"
        )
        handler.setFormatter(formatter)
        logger.handlers = [handler]
        logger.setLevel(logging.INFO)
        print("[Logging] Structured JSON logging initialized.")
    except ImportError:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        )
        print("[Logging] Standard logging initialized (python-json-logger not installed).")


def get_correlation_id() -> str:
    """Generates a unique request correlation ID."""
    return str(uuid.uuid4())
