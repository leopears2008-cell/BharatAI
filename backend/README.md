# BharatAI Python Backend

Production-oriented FastAPI backend for BharatAI.

## Production features
- PostgreSQL + native pgvector cosine retrieval with HNSW
- SQLite fallback for local development
- Redis distributed rate limiting
- JWT authentication with scrypt password hashing and role-based authorization
- JSON request logging, request IDs and Prometheus metrics
- Integration/e2e test scaffolding
- Deterministic evaluation/benchmark runner
- Render and Docker Compose deployment configuration

## Local
`cd backend`
`pip install -r requirements.txt`
Copy `.env.example` to `.env`, then run `uvicorn app.main:app --reload --port 8000`.

SQLite and the in-memory rate-limit fallback are development conveniences only.

## Production
Use PostgreSQL with pgvector, Redis, a strong JWT secret, `AUTH_REQUIRED=true`, HTTPS, and the deployed frontend origin. Set `ADMIN_EMAILS` to trusted administrator emails.

Gemini embeddings are requested at 768 dimensions. PostgreSQL uses pgvector cosine distance and an HNSW index. If upgrading an existing database from the previous JSON embedding column, run `migrations/001_pgvector.sql` first.

Run the regression benchmark with `cd backend && python evals/run_eval.py`.
