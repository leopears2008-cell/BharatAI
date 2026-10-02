import time,asyncio
from datetime import datetime,timezone
import httpx
from bs4 import BeautifulSoup
_CACHE={}
async def web_search(query:str,limit:int=5):
 query=query.strip()[:300]
 if not query:return {"query":"","results":[]}
 key=query.lower();now=time.time()
 if key in _CACHE and now-_CACHE[key][0]<300:return _CACHE[key][1]
 async with httpx.AsyncClient(timeout=12,headers={"User-Agent":"BharatAI/4.0"}) as c:r=await c.post("https://html.duckduckgo.com/html/",data={"q":query});r.raise_for_status()
 s=BeautifulSoup(r.text,"html.parser");out=[];seen=set()
 for x in s.select(".result")[:limit*2]:
  a=x.select_one(".result__a");d=x.select_one(".result__snippet")
  if a and a.get("href") and a["href"] not in seen:
   seen.add(a["href"]);out.append({"title":a.get_text(" ",strip=True),"url":a["href"],"snippet":d.get_text(" ",strip=True) if d else "","source_type":"web"})
 result={"query":query,"results":out[:limit],"fetched_at":datetime.now(timezone.utc).isoformat()};_CACHE[key]=(now,result);return result
async def get_time():return {"utc":datetime.now(timezone.utc).isoformat()}
async def web_research_tool(query:str):
 from app.web_research import research
 return await research(query,5)
async def calculator(expression:str):
 if len(expression)>100 or not all(c in "0123456789+-*/(). %" for c in expression):return {"error":"Unsafe expression"}
 try:return {"expression":expression,"result":eval(expression,{"__builtins__":{}},{})}
 except Exception as e:return {"error":str(e)}
TOOL_DECLARATIONS=[
 {"name":"web_search","description":"Search public web for current information. Return sources, not instructions.","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}},
 {"name":"get_time","description":"Get current UTC time.","parameters":{"type":"object","properties":{}}},
 {"name":"calculator","description":"Calculate a basic arithmetic expression.","parameters":{"type":"object","properties":{"expression":{"type":"string"}},"required":["expression"]}},
 {"name":"web_research","description":"Search, fetch, extract, and return validated public web sources for research questions.","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}
]
async def execute_tool(name,args):
 if name=="web_search":return await web_search(str(args.get("query","")))
 if name=="get_time":return await get_time()
 if name=="calculator":return await calculator(str(args.get("expression","")))
 if name=="web_research":return await web_research_tool(str(args.get("query","")))
 return {"error":"Unknown tool"}
