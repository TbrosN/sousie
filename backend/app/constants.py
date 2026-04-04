from pathlib import Path

APP_NAME = "Sousie API"
APP_VERSION = "0.1.0"

API_PREFIX = "/api"
CHAT_ENDPOINT = f"{API_PREFIX}/chat"
HEALTH_ENDPOINT = "/health"

RUNTIME_DATA_DIR = Path("data/runtime")
MAX_CHAT_HISTORY = 10

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_API_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={api_key}"
)

SYSTEM_PROMPT = (
    "You are a recipe editing assistant. You must output STRICT JSON only. "
    "Use one action at a time. Prefer deterministic servings changes via set_servings. "
    "Never return markdown."
)

ERROR_MESSAGE_GENERIC = "Something went wrong. Please try again."
ERROR_MESSAGE_AI_UNAVAILABLE = "AI service is unavailable right now."
