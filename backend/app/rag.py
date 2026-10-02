import json, math
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google import genai
from google.genai import types
from app.config import settings
from app.db import DocumentChunk
client = genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None
IS_POSTGRES = settings.database_url.startswith("postgres")
async def embed(text: str, task_type: str = "RETRIEVAL_DOCUMENT"):
    if not client: return []
    result = await client.aio.models.embed_content(model=settings.embedding_model, contents=text, config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=settings.embedding_dimensions))
    return list(result.embeddings[0].values) if result.embeddings else []
def cosine(a, b):
    if not a or not b: return 0.0
    dot=sum(x*y for x,y in zip(a,b)); na=math.sqrt(sum(x*x for x in a)); nb=math.sqrt(sum(y*y for y in b))
    return dot/(na*nb) if na and nb else 0.0
async def ingest(session: AsyncSession, source: str, text: str):
    for start in range(0,len(text),1000):
        chunk=text[start:start+1200]; vector=await embed(chunk,"RETRIEVAL_DOCUMENT")
        session.add(DocumentChunk(source=source,content=chunk,embedding=vector if IS_POSTGRES else json.dumps(vector)))
    await session.commit()
async def retrieve(session: AsyncSession, query: str, limit: int = 5):
    vector=await embed(query,"RETRIEVAL_QUERY")
    if not vector: return []
    if IS_POSTGRES:
        distance=DocumentChunk.embedding.cosine_distance(vector)
        rows=(await session.execute(select(DocumentChunk,(1-distance).label("score")).where(DocumentChunk.embedding.is_not(None)).order_by(distance).limit(limit))).all()
        return [{"source":r.DocumentChunk.source,"content":r.DocumentChunk.content,"score":round(float(r.score),4)} for r in rows if float(r.score)>0.15]
    rows=(await session.execute(select(DocumentChunk))).scalars().all()
    ranked=sorted(((cosine(vector,json.loads(row.embedding)) if row.embedding else 0.0,row) for row in rows),key=lambda x:x[0],reverse=True)
    return [{"source":row.source,"content":row.content,"score":round(score,4)} for score,row in ranked[:limit] if score>0.15]
