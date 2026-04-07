# Sousie

Sousie is an AI assistant creating and cooking recipes.

## Project Layout

- `frontend`: Expo app (Android, iOS, Web)
- `backend`: FastAPI service for LLM-driven recipe edits

## Backend Setup (uv)

1. Install dependencies and create a local venv:

```bash
cd backend
uv sync
```

2. Configure environment:

```bash
cp .env.example .env
```

Set `GEMINI_API_KEY` in `backend/.env`.

3. Run the API:

```bash
uv run -m app.main
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

## Upcoming features
- Make LLM order the steps optimially for parallel cooking
    - consider multiple cooks and dish-washing too!
