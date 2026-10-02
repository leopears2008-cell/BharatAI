CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768)
USING CASE WHEN embedding IS NULL OR embedding='' THEN NULL ELSE embedding::text::vector(768) END;
CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);
