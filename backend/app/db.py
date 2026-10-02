from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, select, Float
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from app.config import settings
try:
    from pgvector.sqlalchemy import Vector
except ImportError: Vector=None
class Base(DeclarativeBase): pass
class User(Base):
    __tablename__="users"; id:Mapped[str]=mapped_column(String(64),primary_key=True); email:Mapped[str]=mapped_column(String(320),unique=True,index=True); password_hash:Mapped[str]=mapped_column(String(512),default=""); role:Mapped[str]=mapped_column(String(32),default="user",index=True); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))
class Conversation(Base):
    __tablename__="conversations"; id:Mapped[str]=mapped_column(String(64),primary_key=True); user_id:Mapped[str]=mapped_column(String(64),index=True); title:Mapped[str]=mapped_column(String(200),default="New chat"); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc)); updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc),onupdate=lambda:datetime.now(timezone.utc)); messages:Mapped[list["Message"]]=relationship(back_populates="conversation",cascade="all, delete-orphan")
class Message(Base):
    __tablename__="messages"; id:Mapped[int]=mapped_column(primary_key=True,autoincrement=True); conversation_id:Mapped[str]=mapped_column(ForeignKey("conversations.id",ondelete="CASCADE"),index=True); role:Mapped[str]=mapped_column(String(20)); content:Mapped[str]=mapped_column(Text); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc)); conversation:Mapped[Conversation]=relationship(back_populates="messages")
class Memory(Base):
    __tablename__="memories"; id:Mapped[int]=mapped_column(primary_key=True,autoincrement=True); user_id:Mapped[str]=mapped_column(String(64),index=True); content:Mapped[str]=mapped_column(Text); kind:Mapped[str]=mapped_column(String(32),default="preference"); score:Mapped[float]=mapped_column(Float,default=1.0); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))
_embedding_type=Vector(settings.embedding_dimensions) if (Vector and settings.database_url.startswith("postgres")) else Text()
class DocumentChunk(Base):
    __tablename__="document_chunks"; id:Mapped[int]=mapped_column(primary_key=True,autoincrement=True); source:Mapped[str]=mapped_column(String(500),index=True); content:Mapped[str]=mapped_column(Text); embedding=mapped_column(_embedding_type,nullable=True)
engine=create_async_engine(settings.database_url,pool_pre_ping=True); Session=async_sessionmaker(engine,expire_on_commit=False)
async def init_db():
    async with engine.begin() as conn:
        if engine.url.get_backend_name()=="postgresql": await conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
        await conn.run_sync(Base.metadata.create_all)
        if engine.url.get_backend_name()=="postgresql":
            await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(512) DEFAULT ''")
            await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'user'")
            await conn.exec_driver_sql("ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector(768)")
            await conn.exec_driver_sql("ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768) USING CASE WHEN embedding IS NULL THEN NULL ELSE embedding::text::vector(768) END")
            await conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops)")
async def get_session():
    async with Session() as session: yield session
async def get_conversation(session:AsyncSession,cid:str,uid:str):
    return (await session.execute(select(Conversation).where(Conversation.id==cid,Conversation.user_id==uid))).scalar_one_or_none()
