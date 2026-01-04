import sqlite3
import logging
from typing import List, Dict, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from utils import sqlite_connection, service_error_handler

logger = logging.getLogger(__name__)


class RAGService:
    """RAG service for document retrieval"""

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
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

    @service_error_handler(default_value=None, error_message_prefix="Error adding document")
    def add_document(self, content: str) -> Optional[int]:
        """Add a document to the RAG store"""
        with sqlite_connection(self.db_path) as (conn, cursor):
            cursor.execute(
                'INSERT INTO documents (content) VALUES (?)',
                (content,)
            )
            return cursor.lastrowid

    @service_error_handler(default_value=False, error_message_prefix="Error deleting document")
    def delete_document(self, doc_id: int) -> bool:
        """Delete a document by ID"""
        with sqlite_connection(self.db_path) as (conn, cursor):
            cursor.execute('DELETE FROM documents WHERE id = ?', (doc_id,))
            return cursor.rowcount > 0

    @service_error_handler(default_value=[], error_message_prefix="Error getting documents")
    def get_documents(self, limit: Optional[int] = None) -> List[Dict]:
        """Get documents with optional limit"""
        with sqlite_connection(self.db_path, row_factory=sqlite3.Row) as (conn, cursor):
            if limit:
                cursor.execute('SELECT * FROM documents ORDER BY created_at DESC LIMIT ?', (limit,))
            else:
                cursor.execute('SELECT * FROM documents ORDER BY created_at DESC')
            return [dict(row) for row in cursor.fetchall()]

    def _get_all_documents(self) -> List[Dict]:
        """Get all documents (internal use for retrieval)"""
        return self.get_documents(limit=None)

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

    def set_enabled(self, enabled: bool) -> bool:
        """Store RAG enabled state in Redis (shared across all containers)"""
        return self._set_redis_bool('rag_enabled', enabled)

    @cache_error_handler(default_value=True)
    def is_enabled(self) -> bool:
        """Read RAG enabled state from Redis (shared across all containers)"""
        return self._get_redis_bool('rag_enabled', default=True)

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
