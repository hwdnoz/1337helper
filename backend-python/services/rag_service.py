import sqlite3
import logging
from typing import List, Dict, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from utils import sqlite_connection

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

    def add_document(self, content: str) -> Optional[int]:
        """Add a document to the RAG store"""
        try:
            with sqlite_connection(self.db_path) as (conn, cursor):
                cursor.execute(
                    'INSERT INTO documents (content) VALUES (?)',
                    (content,)
                )
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Error adding document: {e}")
            return None

    def _get_all_documents(self) -> List[Dict]:
        """Get all documents"""
        try:
            with sqlite_connection(self.db_path, row_factory=sqlite3.Row) as (conn, cursor):
                cursor.execute('SELECT * FROM documents ORDER BY created_at DESC')
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error getting documents: {e}")
            return []

    def retrieve(self, query: str, top_k: int = 3, min_similarity: float = 0.6) -> List[Dict]:
        """Retrieve top-k most relevant documents for a query"""
        documents = self._get_all_documents()
        if not documents:
            return []

        try:
            # Extract content for vectorization
            doc_contents = [d['content'] for d in documents]
            doc_contents.append(query)

            # Create TF-IDF vectors
            vectorizer = TfidfVectorizer(lowercase=True, stop_words='english', max_features=500)
            tfidf_matrix = vectorizer.fit_transform(doc_contents)

            # Calculate cosine similarity
            similarities = cosine_similarity(tfidf_matrix[-1:], tfidf_matrix[:-1])[0]

            # Get top-k indices above threshold
            valid_indices = np.where(similarities >= min_similarity)[0]
            if len(valid_indices) == 0:
                return []

            top_indices = valid_indices[np.argsort(similarities[valid_indices])[::-1]][:top_k]

            # Build results
            results = []
            for idx in top_indices:
                doc = documents[idx].copy()
                doc['similarity_score'] = float(similarities[idx])
                results.append(doc)

            return results

        except Exception as e:
            logger.error(f"Error during retrieval: {e}")
            return []

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
