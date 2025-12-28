import sqlite3
import hashlib
import json
import time
import os
import logging
from datetime import datetime, timedelta
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import redis
from utils import redis_fallback, sqlite_connection

logger = logging.getLogger(__name__)

class PromptCache:
    def __init__(self, db_path='data/llm_cache.db', ttl_hours=24):
        self.db_path = db_path
        self.ttl_hours = ttl_hours
        self._init_database()

    def _get_redis_client(self):
        """Get Redis client with password authentication"""
        password = os.environ.get('REDIS_PASSWORD', '')
        return redis.Redis(host='redis', port=6379, db=1,
                          password=password, decode_responses=True)

    def _init_database(self):
        with sqlite_connection(self.db_path) as (conn, cursor):
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS prompt_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prompt_hash TEXT UNIQUE NOT NULL,
                    prompt TEXT NOT NULL,
                    operation_type TEXT NOT NULL,
                    model TEXT,
                    response_text TEXT NOT NULL,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    access_count INTEGER DEFAULT 1
                )
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_prompt_hash ON prompt_cache(prompt_hash)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_created_at ON prompt_cache(created_at)
            ''')

    def _hash_prompt(self, prompt, operation_type, model=None, model_aware_cache=None):
        # Use provided model_aware_cache setting, or fall back to Redis setting
        use_model_aware = model_aware_cache if model_aware_cache is not None else self.is_model_aware_cache()

        # Only include model in hash if model_aware_cache is enabled
        if use_model_aware:
            model_str = model if model else 'unknown'
            content = f"{operation_type}:{model_str}:{prompt}"
        else:
            # Model-agnostic caching - don't include model in hash
            content = f"{operation_type}:{prompt}"
        return hashlib.sha256(content.encode()).hexdigest()

    def get(self, prompt, operation_type, model=None, use_cache=None, model_aware_cache=None, metadata=None):
        # Use provided use_cache setting, or fall back to Redis setting
        should_use_cache = use_cache if use_cache is not None else self.is_enabled()

        if not should_use_cache:
            return None

        # Try exact hash match first
        prompt_hash = self._hash_prompt(prompt, operation_type, model, model_aware_cache)
        expiry_time = datetime.utcnow() - timedelta(hours=self.ttl_hours)

        with sqlite_connection(self.db_path, row_factory=sqlite3.Row) as (conn, cursor):
            cursor.execute('''
                SELECT * FROM prompt_cache
                WHERE prompt_hash = ? AND created_at > ?
            ''', (prompt_hash, expiry_time.isoformat()))

            row = cursor.fetchone()

            if row:
                cursor.execute('''
                    UPDATE prompt_cache
                    SET accessed_at = ?, access_count = access_count + 1
                    WHERE prompt_hash = ?
                ''', (datetime.utcnow().isoformat(), prompt_hash))

                result = dict(row)
                if result['metadata']:
                    result['metadata'] = json.loads(result['metadata'])

                return result

        # If no exact match, try semantic search (if enabled)
        semantic_result = self._find_similar_prompt(prompt, operation_type, model, model_aware_cache, metadata)
        if semantic_result:
            if semantic_result.get('metadata'):
                semantic_result['metadata'] = json.loads(semantic_result['metadata']) if isinstance(semantic_result['metadata'], str) else semantic_result['metadata']
        return semantic_result

    def set(self, prompt, operation_type, response_text, metadata=None, model=None, use_cache=None, model_aware_cache=None):
        # Use provided use_cache setting, or fall back to Redis setting
        should_use_cache = use_cache if use_cache is not None else self.is_enabled()

        if not should_use_cache:
            return

        prompt_hash = self._hash_prompt(prompt, operation_type, model, model_aware_cache)
        metadata_json = json.dumps(metadata) if metadata else None

        with sqlite_connection(self.db_path) as (conn, cursor):
            cursor.execute('''
                INSERT OR REPLACE INTO prompt_cache (
                    prompt_hash, prompt, operation_type, model, response_text, metadata,
                    created_at, accessed_at, access_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                prompt_hash, prompt, operation_type, model, response_text, metadata_json,
                datetime.utcnow().isoformat(),
                datetime.utcnow().isoformat(),
                1
            ))

    def clear_expired(self):
        expiry_time = datetime.utcnow() - timedelta(hours=self.ttl_hours)

        with sqlite_connection(self.db_path) as (conn, cursor):
            cursor.execute('''
                DELETE FROM prompt_cache WHERE created_at < ?
            ''', (expiry_time.isoformat(),))

            deleted_count = cursor.rowcount

        return deleted_count

    def clear_all(self):
        with sqlite_connection(self.db_path) as (conn, cursor):
            cursor.execute('DELETE FROM prompt_cache')
            deleted_count = cursor.rowcount

        return deleted_count

    def get_stats(self):
        with sqlite_connection(self.db_path) as (conn, cursor):
            cursor.execute('''
                SELECT
                    COUNT(*) as total_entries,
                    SUM(access_count) as total_accesses,
                    AVG(access_count) as avg_accesses_per_entry
                FROM prompt_cache
            ''')

            stats = cursor.fetchone()

            cursor.execute('''
                SELECT operation_type, COUNT(*) as count
                FROM prompt_cache
                GROUP BY operation_type
            ''')

            operation_breakdown = {row[0]: row[1] for row in cursor.fetchall()}

        return {
            'total_entries': stats[0] or 0,
            'total_accesses': stats[1] or 0,
            'avg_accesses_per_entry': round(stats[2], 2) if stats[2] else 0,
            'operation_breakdown': operation_breakdown,
            'ttl_hours': self.ttl_hours,
            'enabled': self.is_enabled(),
            'model_aware_cache': self.is_model_aware_cache(),
            'semantic_cache_enabled': self.is_semantic_cache_enabled()
        }

    def set_enabled(self, enabled):
        """Store cache enabled state in Redis (shared across all containers)"""
        r = self._get_redis_client()
        r.set('cache_enabled', '1' if enabled else '0')
        return enabled

    @redis_fallback(default_value=True)
    def is_enabled(self):
        """Read cache enabled state from Redis (shared across all containers)"""
        r = self._get_redis_client()
        value = r.get('cache_enabled')
        return value == '1' if value is not None else True  # Default True

    def set_model_aware_cache(self, model_aware):
        """Store model-aware cache state in Redis (shared across all containers)"""
        r = self._get_redis_client()
        r.set('model_aware_cache', '1' if model_aware else '0')
        return model_aware

    @redis_fallback(default_value=True)
    def is_model_aware_cache(self):
        """Read model-aware cache state from Redis (shared across all containers)"""
        r = self._get_redis_client()
        value = r.get('model_aware_cache')
        return value == '1' if value is not None else True  # Default True

    def set_current_model(self, model):
        """Store current model in Redis (shared across all containers)"""
        r = self._get_redis_client()
        r.set('current_model', model)
        return model

    @redis_fallback(default_value='gemini-2.5-flash')
    def get_current_model(self):
        """Read current model from Redis (shared across all containers)"""
        r = self._get_redis_client()
        model = r.get('current_model')
        return model if model else 'gemini-2.5-flash'  # Default model

    def set_semantic_cache_enabled(self, enabled):
        """Store semantic cache enabled state in Redis (shared across all containers)"""
        r = self._get_redis_client()
        r.set('semantic_cache_enabled', '1' if enabled else '0')
        return enabled

    @redis_fallback(default_value=False)
    def is_semantic_cache_enabled(self):
        """Read semantic cache enabled state from Redis (shared across all containers)"""
        r = self._get_redis_client()
        value = r.get('semantic_cache_enabled')
        return value == '1' if value is not None else False  # Default False

    @redis_fallback(default_value=0.95)
    def get_semantic_similarity_threshold(self):
        """Get semantic similarity threshold from Redis (default 0.95)"""
        r = self._get_redis_client()
        value = r.get('semantic_similarity_threshold')
        return float(value) if value else 0.95

    def _find_similar_prompt(self, prompt, operation_type, model=None, model_aware_cache=None, metadata=None):
        """Find similar cached prompt using semantic search (TF-IDF + cosine similarity)

        Only compares against cached entries with matching metadata fields.
        This ensures semantic cache only matches similar prompts for the SAME problem/context.
        """
        if not self.is_semantic_cache_enabled():
            return None

        use_model_aware = model_aware_cache if model_aware_cache is not None else self.is_model_aware_cache()
        threshold = self.get_semantic_similarity_threshold()

        expiry_time = datetime.utcnow() - timedelta(hours=self.ttl_hours)

        # Get all non-expired prompts for this operation type (and model if model-aware)
        with sqlite_connection(self.db_path, row_factory=sqlite3.Row) as (conn, cursor):
            if use_model_aware and model:
                cursor.execute('''
                    SELECT * FROM prompt_cache
                    WHERE operation_type = ? AND model = ? AND created_at > ?
                ''', (operation_type, model, expiry_time.isoformat()))
            else:
                cursor.execute('''
                    SELECT * FROM prompt_cache
                    WHERE operation_type = ? AND created_at > ?
                ''', (operation_type, expiry_time.isoformat()))

            rows = cursor.fetchall()

        if not rows:
            return None

        # Extract prompts and filter by metadata if provided
        cached_prompts = [dict(row) for row in rows]

        # Filter by metadata: only keep entries with matching metadata fields
        if metadata:
            filtered_prompts = []
            for cp in cached_prompts:
                if cp['metadata']:
                    try:
                        cached_metadata = json.loads(cp['metadata']) if isinstance(cp['metadata'], str) else cp['metadata']
                        # Check if all provided metadata fields match
                        metadata_match = all(
                            cached_metadata.get(key) == value
                            for key, value in metadata.items()
                        )
                        if metadata_match:
                            filtered_prompts.append(cp)
                    except (json.JSONDecodeError, TypeError, AttributeError) as e:
                        logger.debug(f"Skipping cache entry with invalid metadata: {e}")
                        continue
            cached_prompts = filtered_prompts

        if not cached_prompts:
            return None

        # Extract prompts for comparison
        prompt_texts = [cp['prompt'] for cp in cached_prompts]
        prompt_texts.append(prompt)  # Add current prompt

        # Calculate TF-IDF vectors
        try:
            vectorizer = TfidfVectorizer(lowercase=True, stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(prompt_texts)

            # Calculate cosine similarity between current prompt and all cached prompts
            similarities = cosine_similarity(tfidf_matrix[-1:], tfidf_matrix[:-1])[0]

            # Find best match above threshold
            max_idx = np.argmax(similarities)
            max_similarity = similarities[max_idx]

            if max_similarity >= threshold:
                best_match = cached_prompts[max_idx]
                best_match['similarity_score'] = float(max_similarity)
                best_match['semantic_cache_hit'] = True
                best_match['current_prompt'] = prompt  # Include current prompt for diff comparison

                # Update access stats for the matched entry
                with sqlite_connection(self.db_path) as (conn, cursor):
                    cursor.execute('''
                        UPDATE prompt_cache
                        SET accessed_at = ?, access_count = access_count + 1
                        WHERE prompt_hash = ?
                    ''', (datetime.utcnow().isoformat(), best_match['prompt_hash']))

                return best_match
        except Exception as e:
            logger.warning(f"Semantic search error: {e}")
            return None

        return None

    def get_all_entries(self, limit=100):
        with sqlite_connection(self.db_path, row_factory=sqlite3.Row) as (conn, cursor):
            cursor.execute('''
                SELECT
                    id, prompt_hash, operation_type, model,
                    substr(prompt, 1, 100) as prompt_preview,
                    substr(response_text, 1, 100) as response_preview,
                    created_at, accessed_at, access_count
                FROM prompt_cache
                ORDER BY accessed_at DESC
                LIMIT ?
            ''', (limit,))

            rows = cursor.fetchall()

        return [dict(row) for row in rows]

cache = PromptCache()
