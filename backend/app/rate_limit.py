import time
from collections import defaultdict,deque
from fastapi import HTTPException,Request
from app.config import settings
_hits=defaultdict(deque)
def enforce(request:Request):
 key=request.client.host if request.client else "unknown";now=time.time();q=_hits[key]
 while q and q[0]<now-60:q.popleft()
 if len(q)>=settings.rate_limit_per_minute:raise HTTPException(429,"Too many requests. Please try again in a minute.")
 q.append(now)
