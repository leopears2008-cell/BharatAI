import uuid
from fastapi import APIRouter
from pydantic import BaseModel,EmailStr
from sqlalchemy import select
from app.db import User,get_session
from app.auth import issue_token
router=APIRouter()
class LoginRequest(BaseModel):email:EmailStr
@router.post("/v1/auth/login")
async def login(req:LoginRequest):
 async for s in get_session():
  email=str(req.email).lower();u=(await s.execute(select(User).where(User.email==email))).scalar_one_or_none()
  if not u:u=User(id=uuid.uuid4().hex,email=email);s.add(u);await s.commit()
  return {"token":issue_token(u.id,u.email),"user":{"id":u.id,"email":u.email}}
