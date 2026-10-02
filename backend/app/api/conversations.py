from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import current_user
from app.db import Conversation,Message,get_session,get_conversation
router=APIRouter()
async def dep():
 async for s in get_session():yield s
@router.get("/v1/conversations")
async def listing(user=Depends(current_user),s:AsyncSession=Depends(dep)):
 rows=(await s.execute(select(Conversation).where(Conversation.user_id==user["sub"]).order_by(Conversation.updated_at.desc()).limit(50))).scalars().all();return [{"id":x.id,"title":x.title,"created_at":x.created_at.isoformat(),"updated_at":x.updated_at.isoformat()} for x in rows]
@router.get("/v1/conversations/{cid}")
async def read(cid,user=Depends(current_user),s:AsyncSession=Depends(dep)):
 c=await get_conversation(s,cid,user["sub"])
 if not c:raise HTTPException(404,"Conversation not found")
 rows=(await s.execute(select(Message).where(Message.conversation_id==cid).order_by(Message.id))).scalars().all();return {"conversation":{"id":c.id,"title":c.title},"messages":[{"role":"user" if x.role=="user" else "model","content":x.content} for x in rows]}
