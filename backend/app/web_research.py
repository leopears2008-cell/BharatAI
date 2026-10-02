import asyncio, hashlib
from datetime import datetime, timezone
import httpx
from bs4 import BeautifulSoup
from app.tools import web_search

async def research(query: str, limit: int = 5):
    search=await web_search(query,limit)
    results=[]
    async with httpx.AsyncClient(timeout=10,headers={"User-Agent":"BharatAI/4.0 (+research)"},follow_redirects=True) as client:
        async def fetch(item):
            try:
                r=await client.get(item["url"]); r.raise_for_status()
                soup=BeautifulSoup(r.text,"html.parser")
                for tag in soup(["script","style","noscript"]): tag.decompose()
                text=" ".join(soup.stripped_strings)[:5000]
                return {**item,"content":text,"status":r.status_code,"fetched_at":datetime.now(timezone.utc).isoformat()}
            except Exception as e: return {**item,"content":"","error":str(e)}
        results=await asyncio.gather(*(fetch(x) for x in search.get("results",[])))
    seen=set(); unique=[]
    for x in results:
        key=hashlib.sha256((x.get("url","")+x.get("title","")).encode()).hexdigest()
        if key not in seen: seen.add(key); unique.append(x)
    return {"query":query,"results":unique,"researched_at":datetime.now(timezone.utc).isoformat()}
