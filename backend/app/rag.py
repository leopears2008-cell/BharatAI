import json,math,re
from sqlalchemy import select,or_
from sqlalchemy.ext.asyncio import AsyncSession
from google import genai
from google.genai import types
from app.config import settings
from app.db import DocumentChunk
client=genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None
IS_POSTGRES=settings.database_url.startswith("postgres")
async def embed(text:str,task_type:str="RETRIEVAL_DOCUMENT"):
 if not client:return []
 result=await client.aio.models.embed_content(model=settings.embedding_model,contents=text,config=types.EmbedContentConfig(task_type=task_type,output_dimensionality=settings.embedding_dimensions))
 return list(result.embeddings[0].values) if result.embeddings else []
def cosine(a,b):
 if not a or not b:return 0.0
 dot=sum(x*y for x,y in zip(a,b));na=math.sqrt(sum(x*x for x in a));nb=math.sqrt(sum(x*x for x in b));return dot/(na*nb) if na and nb else 0.0
def rewrite_query(query:str)->str:
 return re.sub(r"\\s+"," ",query.strip())[:1000]
def lexical_score(query:str,text:str)->float:
 q=set(re.findall(r"[a-z0-9]{3,}",query.lower()));t=set(re.findall(r"[a-z0-9]{3,}",text.lower()));return len(q&t)/max(1,len(q))
async def ingest(session:AsyncSession,source:str,text:str,metadata:dict|None=None):
 seen=set()
 for start in range(0,len(text),900):
  chunk=text[start:start+1200].strip(); key=chunk.lower()
  if not chunk or key in seen:continue
  seen.add(key); vector=await embed(chunk,"RETRIEVAL_DOCUMENT");session.add(DocumentChunk(source=source,content=chunk,embedding=vector if IS_POSTGRES else json.dumps(vector)))
 await session.commit()
async def retrieve(session:AsyncSession,query:str,limit:int=8,source_filter:str|None=None):
 query=rewrite_query(query); vector=await embed(query,"RETRIEVAL_QUERY")
 if IS_POSTGRES and vector:
  distance=DocumentChunk.embedding.cosine_distance(vector); stmt=select(DocumentChunk,(1-distance).label("semantic")).where(DocumentChunk.embedding.is_not(None))
  if source_filter: stmt=stmt.where(DocumentChunk.source==source_filter)
  rows=(await session.execute(stmt.order_by(distance).limit(limit*3))).all()
  ranked=[]
  for r in rows:
   lex=lexical_score(query,r.DocumentChunk.content); score=.75*float(r.semantic)+.25*lex;ranked.append((score,r.DocumentChunk))
 else:
  rows=(await session.execute(select(DocumentChunk).where(DocumentChunk.source==source_filter) if source_filter else select(DocumentChunk))).scalars().all();ranked=[]
  for row in rows:
   semantic=cosine(vector,json.loads(row.embedding)) if vector and row.embedding else 0.0;ranked.append((.75*semantic+.25*lexical_score(query,row.content),row))
 ranked.sort(key=lambda x:x[0],reverse=True);out=[];seen=set()
 for score,row in ranked:
  key=row.content.strip().lower()
  if key in seen:continue
  seen.add(key);out.append({"source":row.source,"content":row.content,"score":round(score,4)})
  if len(out)>=limit:break
 return out
