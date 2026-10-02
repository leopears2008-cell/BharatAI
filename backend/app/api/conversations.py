from fastapi import APIRouter,Depends,HTTPException,Query
from pydantic import BaseModel,Field
from sqlalchemy import select,delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import current_user
from app.db import Conversation,Message,get_session,get_conversation
router=APIRouter()
async def dep():
 async for s in get_session():yield s
class RenameRequest(BaseModel):title:str=Field(min_length=1,max_length=200)
@router.get("/v1/conversations")
async def listing(q:str|None=Query(default=None,max_length=100),user=Depends(current_user),s:AsyncSession=Depends(dep)):
 stmt=select(Conversation).where(Conversation.user_id==user["sub"])
 if q:stmt=stmt.where(Conversation.title.ilike(f"%{q}%"))
 rows=(await s.execute(stmt.order_by(Conversation.updated_at.desc()).limit(100))).scalars().all();return [{"id":x.id,"title":x.title,"created_at":x.created_at.isoformat(),"updated_at":x.updated_at.isoformat()} for x in rows]
@router.get("/v1/conversations/{cid}")
async def read(cid,user=Depends(current_user),s:AsyncSession=Depends(dep)):
 c=await get_conversation(s,cid,user["sub"])
 if not c:raise HTTPException(404,"Conversation not found")
 rows=(await s.execute(select(Message).where(Message.conversation_id==cid).order_by(Message.id))).scalars().all();return {"conversation":{"id":c.id,"title":c.title},"messages":[{"role":"user" if x.role=="user" else "model","content":x.content} for x in rows]}
@router.patch("/v1/conversations/{cid}")
async def rename(cid,req:RenameRequest,user=Depends(current_user),s:AsyncSession=Depends(dep)):
 c=await get_conversation(s,cid,user["sub"])
 if not c:raise HTTPException(404,"Conversation not found")
 c.title=req.title.strip();await s.commit();return {"id":c.id,"title":c.title}
@router.delete("/v1/conversations/{cid}")
async def remove(cid,user=Depends(current_user),s:AsyncSession=Depends(dep)):
 c=await get_conversation(s,cid,user["sub"])
 if not c:raise HTTPException(404,"Conversation not found")
 await s.delete(c);await s.commit();return {"status":"deleted","id":cid}
