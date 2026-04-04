# Sousie

Sousie is a mobile MVP for recipe editing with an AI assistant.

## Project Layout

- `frontend`: Expo app (Android, iOS, Web)
- `backend`: FastAPI service for LLM-driven recipe edits

## Backend Setup (uv)

1. Install dependencies and create a local venv:

```bash
cd backend
uv sync
```

1. Configure environment:

```bash
cp .env.example .env
```

Set `GEMINI_API_KEY` in `backend/.env`.

1. Run the API:

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Frontend Setup

```bash
cd frontend
npm install
npm run android
```

For web:

```bash
npm run web
```

## Verification Commands

- Frontend lint and type-check:

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

- Backend compile/import:

```bash
cd backend
uv run -m app.main
```

