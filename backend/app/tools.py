import httpx
from bs4 import BeautifulSoup
from datetime import datetime,timezone
async def web_search(query:str,limit:int=5):
 query=query.strip()[:300]
 if not query:return {"query":"","results":[]}
 async with httpx.AsyncClient(timeout=12,headers={"User-Agent":"BharatAI/2.0"}) as c:r=await c.post("https://html.duckduckgo.com/html/",data={"q":query})
 r.raise_for_status();s=BeautifulSoup(r.text,"html.parser");out=[]
 for x in s.select(".result")[:limit]:
  a=x.select_one(".result__a");d=x.select_one(".result__snippet")
  if a and a.get("href"):out.append({"title":a.get_text(" ",strip=True),"url":a["href"],"snippet":d.get_text(" ",strip=True) if d else ""})
 return {"query":query,"results":out,"fetched_at":datetime.now(timezone.utc).isoformat()}
async def get_time():return {"utc":datetime.now(timezone.utc).isoformat()}
TOOL_DECLARATIONS=[{"name":"web_search","description":"Search public web for current information.","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}},{"name":"get_time","description":"Get current UTC time.","parameters":{"type":"object","properties":{}}}]
async def execute_tool(name,args):
 if name=="web_search":return await web_search(str(args.get("query","")))
 if name=="get_time":return await get_time()
 return {"error":"Unknown tool"}
