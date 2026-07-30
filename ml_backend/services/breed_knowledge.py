import json
import pathlib
from typing import Any, Dict, Optional
from schemas.breed import BreedInfo


_DATA_DIR = pathlib.Path(__file__).parent.parent / "data" / "breed_knowledge"
_dogs_data: Optional[Dict[str, Any]] = None
_cats_data: Optional[Dict[str, Any]] = None


def _load_data():
    global _dogs_data, _cats_data
    if _dogs_data is None:
        dogs_path = _DATA_DIR / "dogs.json"
        if dogs_path.exists():
            with open(dogs_path, "r", encoding="utf-8") as f:
                _dogs_data = json.load(f)
        else:
            _dogs_data = {}

    if _cats_data is None:
        cats_path = _DATA_DIR / "cats.json"
        if cats_path.exists():
            with open(cats_path, "r", encoding="utf-8") as f:
                _cats_data = json.load(f)
        else:
            _cats_data = {}


def get_breed_info(breed_name: str, species: str = "dog") -> Optional[BreedInfo]:
    """
    Returns rich breed information given a breed name and species (dog/cat).
    Fuzzy matches by title/lowercase.
    """
    _load_data()

    dataset = _dogs_data if species.lower() == "dog" else _cats_data
    if not dataset:
        return None

    # Exact lookup
    if breed_name in dataset:
        data = dataset[breed_name]
        return BreedInfo(**data)

    # Normalized lookup
    norm_target = breed_name.lower().replace("_", " ").replace("-", " ").strip()
    for key, data in dataset.items():
        norm_key = key.lower().replace("_", " ").replace("-", " ").strip()
        if norm_key == norm_target or norm_target in norm_key:
            return BreedInfo(**data)

    return None
