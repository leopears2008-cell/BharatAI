import time
from jose import jwt,JWTError
from fastapi import HTTPException,Request
from app.config import settings
ALG="HS256"
def issue_token(uid,email):return jwt.encode({"sub":uid,"email":email,"exp":int(time.time())+604800},settings.jwt_secret,algorithm=ALG)
def decode_token(t):
 try:return jwt.decode(t,settings.jwt_secret,algorithms=[ALG])
 except JWTError:return None
async def current_user(request:Request):
 h=request.headers.get("Authorization","")
 if h.lower().startswith("bearer "):
  data=decode_token(h[7:].strip())
  if data:return data
 if not settings.auth_required:return {"sub":"demo-user","email":"demo@bharatai.local"}
 raise HTTPException(401,"Authentication required.")
