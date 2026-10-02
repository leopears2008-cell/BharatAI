# BharatAI Python Backend

FastAPI backend for BharatAI with async streaming, RAG, tool calling, persistence, JWT authentication, model routing and web search.

Local: `cd backend` then `pip install -r requirements.txt` and `uvicorn app.main:app --reload --port 8000`.

Production: use PostgreSQL + pgvector, a strong JWT secret, `AUTH_REQUIRED=true`, and a deployed Python API URL.
