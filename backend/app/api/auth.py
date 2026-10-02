import uuid
from datetime import datetime,timezone,timedelta
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,EmailStr,Field
from sqlalchemy import select
from app.db import User,RefreshSession,get_session
from app.auth import hash_password,verify_password,issue_token,issue_refresh_token,token_hash,decode_token
from app.config import settings
router=APIRouter()
class LoginRequest(BaseModel):email:EmailStr;password:str=Field(min_length=8,max_length=128)
class RefreshRequest(BaseModel):refresh_token:str=Field(min_length=20,max_length=200)
def role_for(email:str)->str:
 admins={x.strip().lower() for x in settings.admin_emails.split(",") if x.strip()};return "admin" if email.lower() in admins else "user"
async def create_session(session,user):
 raw=issue_refresh_token();session.add(RefreshSession(id=uuid.uuid4().hex,user_id=user.id,token_hash=token_hash(raw),expires_at=datetime.now(timezone.utc)+timedelta(days=settings.refresh_expire_days)));return raw
@router.post("/v1/auth/login")
async def login(req:LoginRequest):
 email=str(req.email).lower()
 async for session in get_session():
  user=(await session.execute(select(User).where(User.email==email))).scalar_one_or_none()
  if not user:
   user=User(id=uuid.uuid4().hex,email=email,password_hash=hash_password(req.password),role=role_for(email));session.add(user);await session.flush()
  elif not verify_password(req.password,user.password_hash):raise HTTPException(401,"Invalid email or password.")
  refresh=await create_session(session,user);await session.commit()
  return {"token":issue_token(user.id,user.email,user.role),"refresh_token":refresh,"user":{"id":user.id,"email":user.email,"role":user.role}}
@router.post("/v1/auth/refresh")
async def refresh(req:RefreshRequest):
 async for session in get_session():
  row=(await session.execute(select(RefreshSession).where(RefreshSession.token_hash==token_hash(req.refresh_token),RefreshSession.revoked_at.is_(None)))).scalar_one_or_none()
  if not row:raise HTTPException(401,"Refresh token expired or revoked.")
  expiry=row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=timezone.utc)
  if expiry<datetime.now(timezone.utc):raise HTTPException(401,"Refresh token expired or revoked.")
  user=(await session.execute(select(User).where(User.id==row.user_id))).scalar_one_or_none()
  if not user:raise HTTPException(401,"User session is invalid.")
  row.revoked_at=datetime.now(timezone.utc);new_refresh=await create_session(session,user);await session.commit()
  return {"token":issue_token(user.id,user.email,user.role),"refresh_token":new_refresh}
@router.post("/v1/auth/logout")
async def logout(req:RefreshRequest):
 async for session in get_session():
  row=(await session.execute(select(RefreshSession).where(RefreshSession.token_hash==token_hash(req.refresh_token)))).scalar_one_or_none()
  if row:row.revoked_at=datetime.now(timezone.utc);await session.commit()
  return {"status":"ok"}
