from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import init_db
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.conversations import router as conversations_router
from app.api.chat import router as chat_router
from app.observability import observability_middleware,metrics_response
@asynccontextmanager
async def lifespan(app):
    await init_db(); yield
app=FastAPI(title="BharatAI Python AI Backend",version="3.0.0",lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=[x.strip() for x in settings.api_cors_origin.split(",") if x.strip()],allow_credentials=True,allow_methods=["GET","POST","OPTIONS"],allow_headers=["Authorization","Content-Type","X-Request-ID"])
app.middleware("http")(observability_middleware)
app.include_router(health_router,prefix="/api");app.include_router(auth_router,prefix="/api");app.include_router(conversations_router,prefix="/api");app.include_router(chat_router,prefix="/api")
@app.get("/")
async def root(): return {"name":"BharatAI","backend":"FastAPI","status":"ok","version":"3.0.0"}
@app.get("/metrics")
async def metrics(): return metrics_response()
