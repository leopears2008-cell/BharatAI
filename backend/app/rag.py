import json,math
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google import genai
from google.genai import types
from app.config import settings
from app.db import DocumentChunk
client=genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None
async def embed(text):
 if not client:return []
 r=await client.aio.models.embed_content(model=settings.embedding_model,contents=text,config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"))
 return list(r.embeddings[0].values) if r.embeddings else []
def cosine(a,b):
 if not a or not b:return 0
 d=sum(x*y for x,y in zip(a,b));na=math.sqrt(sum(x*x for x in a));nb=math.sqrt(sum(y*y for y in b));return d/(na*nb) if na and nb else 0
async def ingest(s:AsyncSession,source,text):
 for i in range(0,len(text),1000):
  chunk=text[i:i+1200];s.add(DocumentChunk(source=source,content=chunk,embedding=json.dumps(await embed(chunk))))
 await s.commit()
async def retrieve(s:AsyncSession,query,limit=5):
 q=await embed(query);rows=(await s.execute(select(DocumentChunk))).scalars().all();ranked=sorted(((cosine(q,json.loads(x.embedding)) if x.embedding else 0,x) for x in rows),key=lambda z:z[0],reverse=True)
 return [{"source":x.source,"content":x.content,"score":round(score,4)} for score,x in ranked[:limit] if score>.15]
