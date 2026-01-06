import logging
import hashlib
import os
import uuid
from typing import List, Dict, Optional
from datetime import datetime
import numpy as np
import redis
import chromadb
from chromadb.config import Settings
from google import genai
from utils import service_error_handler, cache_error_handler

logger = logging.getLogger(__name__)


class RAGService:
    """RAG service for document retrieval"""

    CHUNK_SIZE = 200
    CHUNK_OVERLAP = 50

    def __init__(self, chroma_path='data/chroma'):
        self.chroma_path = chroma_path

        self.genai_client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

        self.chroma_client = chromadb.PersistentClient(
            path=chroma_path,
            settings=Settings(anonymized_telemetry=False)
        )

        self.collection = self.chroma_client.get_or_create_collection(
            name="rag_documents",
            metadata={"description": "RAG document embeddings", "hnsw:space": "cosine"}
        )

    def _get_redis_client(self):
        """Get Redis client with password authentication"""
        password = os.environ.get('REDIS_PASSWORD', '')
        return redis.Redis(host='redis', port=6379, db=1,
                          password=password, decode_responses=True)

    def _get_redis_bool(self, key, default=True):
        """Get boolean value from Redis (stored as '1'/'0')"""
        r = self._get_redis_client()
        value = r.get(key)
        return value == '1' if value is not None else default

    def _set_redis_bool(self, key, value):
        """Set boolean value in Redis (stored as '1'/'0')"""
        r = self._get_redis_client()
        r.set(key, '1' if value else '0')
        return value

    def _get_next_id(self) -> int:
        """Get next available document ID from Redis counter"""
        r = self._get_redis_client()
        return r.incr('rag_doc_id_counter')

    def _hash_content(self, content: str) -> str:
        """Generate SHA256 hash of content for deduplication"""
        return hashlib.sha256(content.encode()).hexdigest()

    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Google's embedding API"""

        try:
            result = self.genai_client.models.embed_content(
                model='models/text-embedding-004',
                contents=[text]
            )
            return result.embeddings[0].values
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return [0.0] * 768  # fall back on empty list, text-embedding-004 has 768 dims

    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= self.CHUNK_SIZE:
            return [text]

        chunks = []
        start = 0

        while start < len(text):

            end = start + self.CHUNK_SIZE
            chunk = text[start:end]

            # split at word boundary
            if end < len(text) and ' ' in chunk:
                last_space = chunk.rfind(' ')
                if last_space > self.CHUNK_SIZE // 2:  # Only if space is in latter half
                    chunk = chunk[:last_space]
                    end = start + last_space

            chunks.append(chunk.strip())

            start = end - self.CHUNK_OVERLAP

            if start <= len(chunks[-1]) + len(chunks) - 1:
                start = end

        return chunks

    @service_error_handler(default_value=None, error_message_prefix="Error adding document")
    def add_document(self, content: str) -> Optional[int]:
        """Add a document to the RAG store, chunking if necessary"""
        content_hash = self._hash_content(content)
        created_at = datetime.now().isoformat()

        existing = self.collection.get(
            where={
                "$and": [
                    {"content_hash": content_hash},
                    {"chunk_index": {"$lte": 0}}
                ]
            }
        )

        if existing and len(existing['ids']) > 0:
            doc_id = int(existing['ids'][0])
            logger.info(f"Document with hash {content_hash[:8]}... already exists (id={doc_id}), skipping duplicate")
            return doc_id

        chunks = self._chunk_text(content)

        if len(chunks) == 1:
            doc_id = self._get_next_id()
            embedding = self._generate_embedding(content)

            self.collection.add(
                ids=[str(doc_id)],
                embeddings=[embedding],
                documents=[content],
                metadatas=[{
                    "content_hash": content_hash,
                    "chunk_index": 0,
                    "chunk_count": 1,
                    "created_at": created_at
                }]
            )

            return doc_id

        # multiple chunks, create parent doc
        parent_id = self._get_next_id()
        parent_embedding = self._generate_embedding(content)

        self.collection.add(
            ids=[str(parent_id)],
            embeddings=[parent_embedding],
            documents=[content],
            metadatas=[{
                "content_hash": content_hash,
                "chunk_index": -1,
                "chunk_count": len(chunks),
                "created_at": created_at
            }]
        )

        # add chunks
        chunk_ids = []
        chunk_embeddings = []
        chunk_metadatas = []

        for i, chunk in enumerate(chunks):
            chunk_id = self._get_next_id()
            chunk_ids.append(str(chunk_id))

            embedding = self._generate_embedding(chunk)
            chunk_embeddings.append(embedding)

            chunk_metadatas.append({
                "parent_id": parent_id,
                "chunk_index": i,
                "chunk_count": len(chunks),
                "created_at": created_at
            })

        self.collection.add(
            ids=chunk_ids,
            embeddings=chunk_embeddings,
            documents=chunks,
            metadatas=chunk_metadatas
        )

        return parent_id

    @service_error_handler(default_value=False, error_message_prefix="Error deleting document")
    def delete_document(self, doc_id: int) -> bool:
        """Delete a document by ID (and all its chunks if it's a parent)"""
        chunks = self.collection.get(
            where={"parent_id": doc_id}
        )

        ids_to_delete = [str(doc_id)]
        if chunks and chunks['ids']:
            ids_to_delete.extend(chunks['ids'])

        try:
            self.collection.delete(ids=ids_to_delete)
            return True
        except Exception as e:
            logger.error(f"Error deleting from ChromaDB: {e}")
            return False

    @service_error_handler(default_value=[], error_message_prefix="Error getting documents")
    def get_documents(self, limit: Optional[int] = None, show_all: bool = False) -> List[Dict]:
        """
        Get documents with optional limit

        Args:
            limit: Maximum number of documents to return
            show_all: If True, returns ALL ChromaDB entries including chunks.
                     If False, returns only parent/standalone documents
        """
        if show_all:
            result = self.collection.get(include=['documents', 'metadatas'])
        else:
            # Get only parent/standalone docs (chunk_index <= 0)
            result = self.collection.get(
                where={"chunk_index": {"$lte": 0}},
                include=['documents', 'metadatas']
            )

        if not result or not result['ids']:
            return []

        documents = []
        for i, doc_id in enumerate(result['ids']):
            metadata = result['metadatas'][i]

            if not show_all and 'parent_id' in metadata:
                continue

            doc = {
                'id': int(doc_id),
                'content': result['documents'][i],
                'created_at': metadata.get('created_at'),
                'chunk_count': metadata.get('chunk_count', 1),
                'chunk_index': metadata.get('chunk_index', 0),
                'content_hash': metadata.get('content_hash', '')[:12] + '...' if metadata.get('content_hash') else None,
            }

            if 'parent_id' in metadata:
                doc['parent_id'] = metadata['parent_id']

            documents.append(doc)

        documents.sort(key=lambda x: x['id'], reverse=False)

        if limit:
            documents = documents[:limit]

        return documents

    def _get_all_documents(self) -> List[Dict]:
        """Get all searchable chunks (excludes parent documents with chunk_index=-1)"""

        # get docs where chunk_index >= 0 (actual chunks, not parent docs)
        result = self.collection.get(
            where={"chunk_index": {"$gte": 0}},
            include=['documents', 'metadatas']
        )

        if not result or not result['ids']:
            return []

        documents = []
        for i, doc_id in enumerate(result['ids']):
            metadata = result['metadatas'][i]
            documents.append({
                'id': int(doc_id),
                'content': result['documents'][i],
                'created_at': metadata.get('created_at'),
                'chunk_index': metadata.get('chunk_index', 0),
                'chunk_count': metadata.get('chunk_count', 1),
                'parent_id': metadata.get('parent_id')
            })

        documents.sort(key=lambda x: x['created_at'] if x['created_at'] else '', reverse=True)

        return documents

    @service_error_handler(default_value=[], error_message_prefix="Error during retrieval")
    def retrieve(self, query: str, top_k: int = 20, min_similarity: float = 0.5) -> List[Dict]:
        """Retrieve top-k most relevant documents for a query"""
        if self.collection.count() == 0:
            print("[RAG DEBUG] No documents in ChromaDB collection")
            return []

        query_embedding = self._generate_embedding(query)

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,  # get up to top_k results to filter by threshold
            include=['documents', 'distances', 'metadatas']
        )

        retrieved_docs = []
        if results['ids'] and len(results['ids'][0]) > 0:
            print(f"[RAG DEBUG] Top {min(5, len(results['ids'][0]))} document similarities for query: '{query[:100]}...'")

            for i, (doc_id, document, distance, metadata) in enumerate(zip(
                results['ids'][0],
                results['documents'][0],
                results['distances'][0],
                results['metadatas'][0]
            )):
                # chromaDB returns cosine distance (lower is better), convert to similarity (0-1, higher is better)
                # cosine_similarity = 1 - cosine_distance
                similarity = 1.0 - distance

                if i < 5:
                    print(f"[RAG DEBUG]   {i+1}. Doc {doc_id}: {similarity:.4f} | {document[:80]}...")

                # filter by threshold
                if similarity >= min_similarity:
                    retrieved_docs.append({
                        'id': int(doc_id),
                        'content': document,
                        'similarity_score': float(similarity),
                        'metadata': metadata
                    })

        if not retrieved_docs:
            print(f"[RAG DEBUG] No documents above similarity threshold {min_similarity}")

        return retrieved_docs

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

    def set_enabled(self, enabled: bool) -> bool:
        """Store RAG enabled state in Redis (shared across all containers)"""
        return self._set_redis_bool('rag_enabled', enabled)

    @cache_error_handler(default_value=True)
    def is_enabled(self) -> bool:
        """Read RAG enabled state from Redis (shared across all containers)"""
        return self._get_redis_bool('rag_enabled', default=True)


# Global RAG instance
rag_service = RAGService()
