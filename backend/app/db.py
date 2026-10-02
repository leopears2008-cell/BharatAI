from datetime import datetime,timezone
from sqlalchemy import String,Text,DateTime,ForeignKey,select
from sqlalchemy.ext.asyncio import AsyncSession,async_sessionmaker,create_async_engine
from sqlalchemy.orm import DeclarativeBase,Mapped,mapped_column,relationship
from app.config import settings
class Base(DeclarativeBase):pass
class User(Base):
 __tablename__="users";id:Mapped[str]=mapped_column(String(64),primary_key=True);email:Mapped[str]=mapped_column(String(320),unique=True,index=True);created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))
class Conversation(Base):
 __tablename__="conversations";id:Mapped[str]=mapped_column(String(64),primary_key=True);user_id:Mapped[str]=mapped_column(String(64),index=True);title:Mapped[str]=mapped_column(String(200),default="New chat");created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc));updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc),onupdate=lambda:datetime.now(timezone.utc));messages:Mapped[list["Message"]]=relationship(back_populates="conversation",cascade="all, delete-orphan")
class Message(Base):
 __tablename__="messages";id:Mapped[int]=mapped_column(primary_key=True,autoincrement=True);conversation_id:Mapped[str]=mapped_column(ForeignKey("conversations.id",ondelete="CASCADE"),index=True);role:Mapped[str]=mapped_column(String(20));content:Mapped[str]=mapped_column(Text);created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc));conversation:Mapped[Conversation]=relationship(back_populates="messages")
class DocumentChunk(Base):
 __tablename__="document_chunks";id:Mapped[int]=mapped_column(primary_key=True,autoincrement=True);source:Mapped[str]=mapped_column(String(500),index=True);content:Mapped[str]=mapped_column(Text);embedding:Mapped[str|None]=mapped_column(Text,nullable=True)
engine=create_async_engine(settings.database_url,pool_pre_ping=True);Session=async_sessionmaker(engine,expire_on_commit=False)
async def init_db():
 async with engine.begin() as c:
  if engine.url.get_backend_name()=="postgresql":await c.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
  await c.run_sync(Base.metadata.create_all)
async def get_session():
 async with Session() as s:yield s
async def get_conversation(s:AsyncSession,cid,uid):return (await s.execute(select(Conversation).where(Conversation.id==cid,Conversation.user_id==uid))).scalar_one_or_none()
