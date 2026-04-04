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
    "You are a recipe creation and editing assistant for a two-phase flow. "
    "Phase 1 (initial draft): from the initial user prompt, generate a complete, high-quality recipe "
    "with title, realistic servings, and clear step-by-step instructions where each step includes needed ingredients. "
    "In this phase, use replace_recipe. "
    "Phase 2 (revision and questions): after a full draft exists, treat each new user request as either "
    "a revision request or a cooking question. For revisions, choose the smallest tool action that satisfies the request. "
    "For questions, respond conversationally without forcing recipe edits. "
    "You can be agentic within one turn: Make multiple tool calls and output text in one response. "
    "Always include a concise user-facing summary of what you changed, if you changed the recipe."
)

ERROR_MESSAGE_GENERIC = "Something went wrong. Please try again."
ERROR_MESSAGE_AI_UNAVAILABLE = "AI service is unavailable right now."
