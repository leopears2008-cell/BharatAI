import hashlib,hmac,os,time,secrets
from datetime import datetime,timezone,timedelta
from jose import jwt,JWTError
from fastapi import HTTPException,Request
from app.config import settings
ALG="HS256"
def hash_password(password:str)->str:
 salt=os.urandom(16);digest=hashlib.scrypt(password.encode(),salt=salt,n=2**14,r=8,p=1);return "scrypt$"+salt.hex()+"$"+digest.hex()
def verify_password(password:str,stored:str)->bool:
 try:
  _,salt_hex,digest_hex=stored.split("$",2);digest=hashlib.scrypt(password.encode(),salt=bytes.fromhex(salt_hex),n=2**14,r=8,p=1);return hmac.compare_digest(digest.hex(),digest_hex)
 except (ValueError,TypeError):return False
def issue_token(uid:str,email:str,role:str="user"):
 now=int(time.time());return jwt.encode({"sub":uid,"email":email,"role":role,"iat":now,"exp":now+settings.jwt_expire_minutes*60,"typ":"access"},settings.jwt_secret,algorithm=ALG)
def issue_refresh_token():return secrets.token_urlsafe(48)
def token_hash(token:str)->str:return hashlib.sha256(token.encode()).hexdigest()
def decode_token(token:str):
 try:return jwt.decode(token,settings.jwt_secret,algorithms=[ALG])
 except JWTError:return None
async def current_user(request:Request):
 header=request.headers.get("Authorization","")
 if header.lower().startswith("bearer "):
  data=decode_token(header[7:].strip())
  if data and data.get("typ","access")=="access":return data
 if not settings.auth_required:return {"sub":"demo-user","email":"demo@bharatai.local","role":"user"}
 raise HTTPException(401,"Authentication required.")
def require_admin(user):
 if user.get("role")!="admin":raise HTTPException(403,"Administrator access required.")
 return user
