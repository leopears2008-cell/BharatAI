import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request
from app.config import settings
try:
    from redis.asyncio import Redis
except ImportError:
    Redis=None
_local_hits=defaultdict(deque)
_redis=Redis.from_url(settings.redis_url,decode_responses=True) if (Redis and settings.redis_url) else None
async def enforce(request: Request,user_id: str|None=None):
    identity=user_id or (request.client.host if request.client else "unknown")
    if _redis:
        bucket=int(time.time()//60); key=f"bharatai:rate:{identity}:{bucket}"; count=await _redis.incr(key)
        if count==1: await _redis.expire(key,70)
        if count>settings.rate_limit_per_minute: raise HTTPException(429,"Too many requests. Please try again in a minute.",headers={"Retry-After":"60"})
        return
    now=time.time(); queue=_local_hits[identity]
    while queue and queue[0]<now-60: queue.popleft()
    if len(queue)>=settings.rate_limit_per_minute: raise HTTPException(429,"Too many requests. Please try again in a minute.",headers={"Retry-After":"60"})
    queue.append(now)
