import sqlite3
import json
import time
from datetime import datetime
from pathlib import Path

class ObservabilityLogger:
    def __init__(self, db_path='llm_metrics.db'):
        self.db_path = db_path
        self._init_database()

    def _init_database(self):
        """Initialize the SQLite database and create tables if they don't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS llm_calls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                operation_type TEXT NOT NULL,
                prompt TEXT NOT NULL,
                prompt_preview TEXT NOT NULL,
                prompt_length INTEGER NOT NULL,
                response_text TEXT NOT NULL,
                response_preview TEXT NOT NULL,
                response_length INTEGER NOT NULL,
                tokens_sent INTEGER NOT NULL,
                tokens_received INTEGER NOT NULL,
                total_tokens INTEGER NOT NULL,
                latency_ms REAL NOT NULL,
                success BOOLEAN NOT NULL,
                error TEXT,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create indexes for common queries
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_timestamp ON llm_calls(timestamp DESC)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_operation_type ON llm_calls(operation_type)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_success ON llm_calls(success)
        ''')

        conn.commit()
        conn.close()

    def log_llm_call(self, operation_type, prompt, response_text, tokens_sent, tokens_received,
                     latency_ms, error=None, metadata=None):
        """
        Log an LLM API call with all relevant metrics.

        Args:
            operation_type: Type of operation (e.g., 'leetcode_solve', 'test_case_gen', 'code_modify')
            prompt: The prompt sent to the LLM
            response_text: The response received from the LLM
            tokens_sent: Number of tokens in the prompt
            tokens_received: Number of tokens in the response
            latency_ms: Time taken for the API call in milliseconds
            error: Error message if the call failed
            metadata: Additional metadata (e.g., problem_number, model_name)
        """
        timestamp = datetime.utcnow().isoformat()
        prompt_preview = prompt[:200] + '...' if len(prompt) > 200 else prompt
        response_preview = response_text[:200] + '...' if len(response_text) > 200 else response_text
        metadata_json = json.dumps(metadata) if metadata else None

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO llm_calls (
                timestamp, operation_type, prompt, prompt_preview, prompt_length,
                response_text, response_preview, response_length,
                tokens_sent, tokens_received, total_tokens,
                latency_ms, success, error, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            timestamp, operation_type, prompt, prompt_preview, len(prompt),
            response_text, response_preview, len(response_text),
            tokens_sent, tokens_received, tokens_sent + tokens_received,
            latency_ms, error is None, error, metadata_json
        ))

        conn.commit()
        conn.close()

        return {
            'timestamp': timestamp,
            'operation_type': operation_type,
            'tokens_sent': tokens_sent,
            'tokens_received': tokens_received,
            'latency_ms': latency_ms,
            'success': error is None
        }

    def get_metrics(self, limit=100):
        """
        Retrieve the most recent metrics.

        Args:
            limit: Maximum number of records to return

        Returns:
            List of log entries, most recent first
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT
                id, timestamp, operation_type, prompt, prompt_preview, prompt_length,
                response_text, response_preview, response_length, tokens_sent, tokens_received,
                total_tokens, latency_ms, success, error, metadata
            FROM llm_calls
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (limit,))

        rows = cursor.fetchall()
        conn.close()

        metrics = []
        for row in rows:
            metric = dict(row)
            # Parse metadata JSON
            if metric['metadata']:
                metric['metadata'] = json.loads(metric['metadata'])
            metrics.append(metric)

        return metrics

    def get_summary_stats(self):
        """
        Calculate summary statistics across all logged calls.

        Returns:
            Dictionary with aggregate metrics
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Get overall stats
        cursor.execute('''
            SELECT
                COUNT(*) as total_calls,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_calls,
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_calls,
                SUM(total_tokens) as total_tokens,
                AVG(latency_ms) as avg_latency_ms,
                SUM(latency_ms) as total_latency_ms
            FROM llm_calls
        ''')

        stats = cursor.fetchone()

        # Get operation breakdown
        cursor.execute('''
            SELECT operation_type, COUNT(*) as count
            FROM llm_calls
            GROUP BY operation_type
        ''')

        operation_breakdown = {row[0]: row[1] for row in cursor.fetchall()}

        conn.close()

        return {
            'total_calls': stats[0] or 0,
            'successful_calls': stats[1] or 0,
            'failed_calls': stats[2] or 0,
            'total_tokens': stats[3] or 0,
            'avg_latency_ms': round(stats[4], 2) if stats[4] else 0,
            'total_latency_ms': round(stats[5], 2) if stats[5] else 0,
            'operation_breakdown': operation_breakdown
        }

    def get_call_by_id(self, call_id):
        """Get full details of a specific LLM call including full prompt and response."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM llm_calls WHERE id = ?
        ''', (call_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            call = dict(row)
            if call['metadata']:
                call['metadata'] = json.loads(call['metadata'])
            return call
        return None

# Global logger instance
logger = ObservabilityLogger()
