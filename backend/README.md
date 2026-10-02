# BharatAI Python Backend

Production-oriented FastAPI backend for BharatAI.

## Level-10 architecture
- FastAPI gateway with CORS, trusted-host protection, readiness and health endpoints
- Context-aware multi-turn orchestration with automatic context trimming and summaries
- Planner/router/tool/executor pipeline with bounded iterations and tool validation
- Gemini primary model with OpenAI-compatible and Qwen-compatible fallback providers
- PostgreSQL + pgvector + HNSW hybrid semantic/lexical retrieval with deduplication
- Web search caching and source/citation collection
- Persistent user memory with explicit list/delete controls
- JWT access tokens plus rotating persistent refresh sessions
- Redis distributed rate limiting
- Structured JSON logs, request IDs and Prometheus metrics
- Deterministic evaluation suite and regression tests
- Docker/Render deployment configuration

## Local
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

For production use PostgreSQL/pgvector, Redis, HTTPS, a strong JWT secret, AUTH_REQUIRED=true, a restricted API_CORS_ORIGIN, and explicit TRUSTED_HOSTS. Never commit real API keys.

## API
- GET /api/health
- GET /api/readiness
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout
- POST /api/v1/chat
- GET /api/v1/conversations
- PATCH /api/v1/conversations/{id}
- DELETE /api/v1/conversations/{id}
- GET/DELETE /api/v1/memory
- GET /metrics

Run tests with pytest -q and the benchmark with python evals/run_eval.py.


CI verification uses PostgreSQL/pgvector and Redis service containers with PYTHONPATH configured for pytest.

CI trusted-host test configuration is isolated to GitHub Actions.
