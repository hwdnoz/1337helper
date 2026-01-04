import sqlite3
import logging
import hashlib
from typing import List, Dict, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from utils import sqlite_connection, service_error_handler

logger = logging.getLogger(__name__)


class RAGService:
    """RAG service for document retrieval"""

    # Chunking configuration
    CHUNK_SIZE = 500  # Characters per chunk
    CHUNK_OVERLAP = 100  # Character overlap between chunks

    def __init__(self, db_path='data/rag_documents.db'):
        self.db_path = db_path
        self._init_database()

    def _init_database(self):
        """Initialize RAG documents database"""
        with sqlite_connection(self.db_path) as (conn, cursor):
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    content_hash TEXT,
                    chunk_index INTEGER DEFAULT 0,
                    parent_doc_id INTEGER,
                    chunk_count INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            # Add indexes for efficient chunk queries and deduplication
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_parent_doc ON documents(parent_doc_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_chunk_index ON documents(chunk_index)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_content_hash ON documents(content_hash)')

    def _hash_content(self, content: str) -> str:
        """Generate SHA256 hash of content for deduplication"""
        return hashlib.sha256(content.encode()).hexdigest()

    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= self.CHUNK_SIZE:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            # Get chunk
            end = start + self.CHUNK_SIZE
            chunk = text[start:end]

            # If not at the end and we can split at word boundary, do so
            if end < len(text) and ' ' in chunk:
                # Try to break at last space to avoid cutting words
                last_space = chunk.rfind(' ')
                if last_space > self.CHUNK_SIZE // 2:  # Only if space is in latter half
                    chunk = chunk[:last_space]
                    end = start + last_space

            chunks.append(chunk.strip())

            # Move start forward, accounting for overlap
            start = end - self.CHUNK_OVERLAP

            # Avoid infinite loop if chunk_size <= overlap
            if start <= len(chunks[-1]) + len(chunks) - 1:
                start = end

        return chunks

    @service_error_handler(default_value=None, error_message_prefix="Error adding document")
    def add_document(self, content: str) -> Optional[int]:
        """Add a document to the RAG store, chunking if necessary"""
        # Calculate content hash for deduplication
        content_hash = self._hash_content(content)

        with sqlite_connection(self.db_path, row_factory=sqlite3.Row) as (conn, cursor):
            # Check if document with this hash already exists (only check parent/standalone docs)
            cursor.execute(
                'SELECT id FROM documents WHERE content_hash = ? AND chunk_index <= 0',
                (content_hash,)
            )
            existing = cursor.fetchone()
            if existing:
                logger.info(f"Document with hash {content_hash[:8]}... already exists (id={existing['id']}), skipping duplicate")
                return existing['id']

            # Document is new, proceed with chunking and adding
            chunks = self._chunk_text(content)

            # If single chunk, store as simple document
            if len(chunks) == 1:
                cursor.execute(
                    'INSERT INTO documents (content, content_hash, chunk_index, chunk_count) VALUES (?, ?, 0, 1)',
                    (content, content_hash)
                )
                return cursor.lastrowid

            # Multiple chunks: create parent and chunk documents
            # First, create parent document (stores full content with hash)
            cursor.execute(
                'INSERT INTO documents (content, content_hash, chunk_index, chunk_count) VALUES (?, ?, -1, ?)',
                (content, content_hash, len(chunks))
            )
            parent_id = cursor.lastrowid

            # Then create chunk documents (chunks don't need hash since they're not checked for duplicates)
            for i, chunk in enumerate(chunks):
                cursor.execute(
                    'INSERT INTO documents (content, chunk_index, parent_doc_id, chunk_count) VALUES (?, ?, ?, ?)',
                    (chunk, i, parent_id, len(chunks))
                )

            return parent_id

    @service_error_handler(default_value=False, error_message_prefix="Error deleting document")
    def delete_document(self, doc_id: int) -> bool:
        """Delete a document by ID (and all its chunks if it's a parent)"""
        with sqlite_connection(self.db_path) as (conn, cursor):
            # Delete the document
            cursor.execute('DELETE FROM documents WHERE id = ?', (doc_id,))
            deleted = cursor.rowcount > 0

            # Also delete any chunks that reference this as parent
            cursor.execute('DELETE FROM documents WHERE parent_doc_id = ?', (doc_id,))

            return deleted

    @service_error_handler(default_value=[], error_message_prefix="Error getting documents")
    def get_documents(self, limit: Optional[int] = None) -> List[Dict]:
        """Get documents with optional limit (only returns parent documents or standalone docs, not chunks)"""
        with sqlite_connection(self.db_path, row_factory=sqlite3.Row) as (conn, cursor):
            # Only return documents that are parents (chunk_index=-1) or standalone (chunk_index=0 and parent_doc_id IS NULL)
            if limit:
                cursor.execute('''
                    SELECT * FROM documents
                    WHERE chunk_index <= 0 AND (parent_doc_id IS NULL OR chunk_index = -1)
                    ORDER BY created_at DESC LIMIT ?
                ''', (limit,))
            else:
                cursor.execute('''
                    SELECT * FROM documents
                    WHERE chunk_index <= 0 AND (parent_doc_id IS NULL OR chunk_index = -1)
                    ORDER BY created_at DESC
                ''')
            return [dict(row) for row in cursor.fetchall()]

    def _get_all_documents(self) -> List[Dict]:
        """Get all searchable chunks (excludes parent documents with chunk_index=-1)"""
        with sqlite_connection(self.db_path, row_factory=sqlite3.Row) as (conn, cursor):
            # Only return actual chunks (chunk_index >= 0), not parent documents (chunk_index = -1)
            cursor.execute('SELECT * FROM documents WHERE chunk_index >= 0 ORDER BY created_at DESC')
            return [dict(row) for row in cursor.fetchall()]

    @service_error_handler(default_value=[], error_message_prefix="Error during retrieval")
    def retrieve(self, query: str, top_k: int = 3, min_similarity: float = 0.6) -> List[Dict]:
        """Retrieve top-k most relevant documents for a query"""
        documents = self._get_all_documents()
        if not documents:
            return []

        # Extract content for vectorization
        doc_contents = [d['content'] for d in documents]
        doc_contents.append(query)

        # Create TF-IDF vectors
        vectorizer = TfidfVectorizer(lowercase=True, stop_words='english', max_features=500)
        tfidf_matrix = vectorizer.fit_transform(doc_contents)

        # Calculate cosine similarity
        similarities = cosine_similarity(tfidf_matrix[-1:], tfidf_matrix[:-1])[0]

        # Log top 5 similarity scores for debugging
        top_5_indices = np.argsort(similarities)[::-1][:5]
        print(f"[RAG DEBUG] Top 5 document similarities for query: '{query[:100]}...'")
        for i, idx in enumerate(top_5_indices, 1):
            if idx < len(documents):
                print(f"[RAG DEBUG]   {i}. Doc {documents[idx]['id']}: {similarities[idx]:.4f} | {documents[idx]['content'][:80]}...")

        # Get top-k indices above threshold
        valid_indices = np.where(similarities >= min_similarity)[0]
        if len(valid_indices) == 0:
            print(f"[RAG DEBUG] No documents above similarity threshold {min_similarity}")
            return []

        top_indices = valid_indices[np.argsort(similarities[valid_indices])[::-1]][:top_k]

        # Build results
        results = []
        for idx in top_indices:
            doc = documents[idx].copy()
            doc['similarity_score'] = float(similarities[idx])
            results.append(doc)

        return results

    def format_context(self, documents: List[Dict], max_length: int = 2000) -> str:
        """Format retrieved documents into context string"""
        if not documents:
            return ""

        context_parts = ["## RELEVANT CONTEXT:\n"]
        current_length = len(context_parts[0])

        for i, doc in enumerate(documents, 1):
            content = doc.get('content', '')
            doc_text = f"\n[{i}]\n{content}\n"

            if current_length + len(doc_text) > max_length:
                break

            context_parts.append(doc_text)
            current_length += len(doc_text)

        return "".join(context_parts)


# Global RAG instance
rag_service = RAGService()
