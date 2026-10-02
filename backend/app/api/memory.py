from fastapi import APIRouter, Depends
from app.auth import current_user
from app.db import get_session
from app.memory import retrieve_memory, clear_memory
router=APIRouter()
@router.get("/v1/memory")
async def list_memory(user=Depends(current_user)):
    async for session in get_session(): return {"memories":await retrieve_memory(session,user["sub"],20)}
@router.delete("/v1/memory")
async def delete_memory(user=Depends(current_user)):
    async for session in get_session(): await clear_memory(session,user["sub"]); return {"status":"ok"}
