import json
import os
from pathlib import Path

# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Try Backend root first (.env sits at Backend/.env), then project root
_env_file = Path(__file__).resolve().parent.parent / '.env'
if not _env_file.exists():
    _env_file = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(_env_file, override=False)


BASE_DIR = Path(__file__).resolve().parent.parent


def get_env(name: str, default: str | None = None) -> str | None:
    return os.getenv(name, default)



def get_field_rules() -> dict:
    rules_path = Path(__file__).with_name('field_rules.json')
    with rules_path.open('r', encoding='utf-8') as fh:
        return json.load(fh)


def get_extractor_provider() -> str:
    """Return the configured strategy: 'auto', 'custom_rule', 'gemini', or 'cerebras'."""
    return get_env('EXTRACTOR_PROVIDER', 'auto')


def get_max_upload_size_mb() -> float:
    """Returns the maximum upload size limit in MB."""
    try:
        return float(get_env('MAX_UPLOAD_SIZE_MB', '5.0'))
    except ValueError:
        return 5.0
