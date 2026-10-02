import uuid
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,EmailStr,Field
from sqlalchemy import select
from app.db import User,get_session
from app.auth import hash_password,verify_password,issue_token
from app.config import settings
router=APIRouter()
class LoginRequest(BaseModel):
    email: EmailStr
    password: str=Field(min_length=8,max_length=128)
def role_for(email: str)->str:
    admins={x.strip().lower() for x in settings.admin_emails.split(",") if x.strip()}
    return "admin" if email.lower() in admins else "user"
@router.post("/v1/auth/login")
async def login(req: LoginRequest):
    email=str(req.email).lower()
    async for session in get_session():
        user=(await session.execute(select(User).where(User.email==email))).scalar_one_or_none()
        if not user:
            user=User(id=uuid.uuid4().hex,email=email,password_hash=hash_password(req.password),role=role_for(email));session.add(user);await session.commit()
        elif not verify_password(req.password,user.password_hash):
            raise HTTPException(401,"Invalid email or password.")
        return {"token":issue_token(user.id,user.email,user.role),"user":{"id":user.id,"email":user.email,"role":user.role}}
@router.post("/v1/auth/logout")
async def logout():
    return {"status":"ok","message":"Discard the bearer token on the client."}
