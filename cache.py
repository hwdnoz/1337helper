import sqlite3
import hashlib
import json
import time
from datetime import datetime, timedelta

class PromptCache:
    def __init__(self, db_path='llm_cache.db', ttl_hours=24):
        self.db_path = db_path
        self.ttl_hours = ttl_hours
        self._init_database()

    def _init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prompt_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt_hash TEXT UNIQUE NOT NULL,
                prompt TEXT NOT NULL,
                operation_type TEXT NOT NULL,
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

        conn.commit()
        conn.close()

    def _hash_prompt(self, prompt, operation_type):
        content = f"{operation_type}:{prompt}"
        return hashlib.sha256(content.encode()).hexdigest()

    def get(self, prompt, operation_type):
        prompt_hash = self._hash_prompt(prompt, operation_type)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        expiry_time = datetime.utcnow() - timedelta(hours=self.ttl_hours)

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
            conn.commit()

            result = dict(row)
            if result['metadata']:
                result['metadata'] = json.loads(result['metadata'])

            conn.close()
            return result

        conn.close()
        return None

    def set(self, prompt, operation_type, response_text, metadata=None):
        prompt_hash = self._hash_prompt(prompt, operation_type)
        metadata_json = json.dumps(metadata) if metadata else None

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT OR REPLACE INTO prompt_cache (
                prompt_hash, prompt, operation_type, response_text, metadata,
                created_at, accessed_at, access_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            prompt_hash, prompt, operation_type, response_text, metadata_json,
            datetime.utcnow().isoformat(),
            datetime.utcnow().isoformat(),
            1
        ))

        conn.commit()
        conn.close()

    def clear_expired(self):
        expiry_time = datetime.utcnow() - timedelta(hours=self.ttl_hours)

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            DELETE FROM prompt_cache WHERE created_at < ?
        ''', (expiry_time.isoformat(),))

        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()

        return deleted_count

    def clear_all(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('DELETE FROM prompt_cache')
        deleted_count = cursor.rowcount

        conn.commit()
        conn.close()

        return deleted_count

    def get_stats(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

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

        conn.close()

        return {
            'total_entries': stats[0] or 0,
            'total_accesses': stats[1] or 0,
            'avg_accesses_per_entry': round(stats[2], 2) if stats[2] else 0,
            'operation_breakdown': operation_breakdown,
            'ttl_hours': self.ttl_hours
        }

    def get_all_entries(self, limit=100):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT
                id, prompt_hash, operation_type,
                substr(prompt, 1, 100) as prompt_preview,
                substr(response_text, 1, 100) as response_preview,
                created_at, accessed_at, access_count
            FROM prompt_cache
            ORDER BY accessed_at DESC
            LIMIT ?
        ''', (limit,))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

cache = PromptCache()
