# BharatAI

BharatAI is an India-focused, multilingual AI platform with a Next.js/React client and a production-oriented Python FastAPI AI backend.

## Architecture

User
↓
Next.js / React UI
↓ HTTPS + streaming
FastAPI Gateway
↓
AI Orchestrator
→ Context + Memory
→ Model Router (Gemini / OpenAI-compatible / Qwen-compatible)
→ Planner / Tool Executor
→ Hybrid RAG (PostgreSQL + pgvector + HNSW)
→ Web Research
→ Multimodal Analysis
↓
Verification / Sources
↓
Streaming Markdown response
↓
Prometheus / structured logs / evaluation

## Implemented capabilities

- Real token streaming and persistent multi-turn conversations
- Automatic context-window management and deterministic long-chat summaries
- Bounded planner/router/tool execution with tool-result validation
- Gemini primary model with OpenAI-compatible and Qwen-compatible fallbacks
- PostgreSQL pgvector + HNSW hybrid semantic/lexical retrieval, deduplication and source tracking
- Web search caching plus search → fetch → extract research
- Source/citation output in answers
- Persistent user memory with explicit GET/DELETE controls
- JWT access tokens with rotating persistent refresh sessions
- Redis distributed rate limiting
- Security headers, trusted-host protection and request IDs
- Multimodal image/PDF/document/CSV/code analysis endpoint
- Conversation search, rename and delete APIs
- Prometheus metrics, structured request logs and CI regression tests
- Production Docker/Render configuration

## Frontend

```bash
npm ci
npm run dev
npm run lint
npm run build
```

Set `NEXT_PUBLIC_PYTHON_API_URL` to the deployed FastAPI URL.

## Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Use PostgreSQL + pgvector and Redis in production. Never commit API keys, JWT secrets, database passwords or refresh tokens.

## Important

BharatAI is an application architecture built on configurable foundation models; it is not a foundation model trained from scratch.
