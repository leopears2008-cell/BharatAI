import re
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import Memory
from app.config import settings

async def remember_from_text(session: AsyncSession, user_id: str, text: str):
    patterns=[r"\bI prefer ([^.\n]{3,180})",r"\bmy preferred ([^.\n]{3,180})",r"\bI like ([^.\n]{3,180})"]
    for pattern in patterns:
        m=re.search(pattern,text,re.I)
        if m:
            value=m.group(1).strip()
            exists=(await session.execute(select(Memory).where(Memory.user_id==user_id,Memory.content==value))).scalar_one_or_none()
            if not exists: session.add(Memory(user_id=user_id,content=value,kind="preference",score=1.0))
    await session.commit()

async def retrieve_memory(session: AsyncSession,user_id:str,limit:int=5):
    rows=(await session.execute(select(Memory).where(Memory.user_id==user_id).order_by(Memory.score.desc(),Memory.created_at.desc()).limit(limit))).scalars().all()
    return [x.content for x in rows]

async def clear_memory(session: AsyncSession,user_id:str):
    await session.execute(delete(Memory).where(Memory.user_id==user_id)); await session.commit()
