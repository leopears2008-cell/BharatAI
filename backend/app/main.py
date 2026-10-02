from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from app.config import settings
from app.db import init_db
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.conversations import router as conversations_router
from app.api.chat import router as chat_router
from app.api.memory import router as memory_router
from app.observability import observability_middleware,metrics_response
@asynccontextmanager
async def lifespan(app): await init_db(); yield
app=FastAPI(title="BharatAI Python AI Backend",version="4.0.0",lifespan=lifespan)
allowed=[x.strip() for x in settings.api_cors_origin.split(",") if x.strip()]
app.add_middleware(CORSMiddleware,allow_origins=allowed,allow_credentials=True,allow_methods=["GET","POST","PUT","DELETE","OPTIONS"],allow_headers=["Authorization","Content-Type","X-Request-ID"])
if settings.trusted_hosts.strip(): app.add_middleware(TrustedHostMiddleware,allowed_hosts=[x.strip() for x in settings.trusted_hosts.split(",") if x.strip()])
app.middleware("http")(observability_middleware)
app.include_router(health_router,prefix="/api"); app.include_router(auth_router,prefix="/api"); app.include_router(conversations_router,prefix="/api"); app.include_router(chat_router,prefix="/api"); app.include_router(memory_router,prefix="/api")
@app.get("/")
async def root(): return {"name":"BharatAI","backend":"FastAPI","status":"ok","version":"4.0.0"}
@app.get("/api/readiness")
async def readiness(): return {"status":"ready","database":settings.database_url.split(":",1)[0],"model_provider":settings.model_provider}
@app.get("/metrics")
async def metrics(): return metrics_response()
