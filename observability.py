import json
import time
from datetime import datetime
from pathlib import Path

class ObservabilityLogger:
    def __init__(self, log_file='llm_metrics.jsonl'):
        self.log_file = log_file
        self.log_path = Path(log_file)

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
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'operation_type': operation_type,
            'prompt_preview': prompt[:200] + '...' if len(prompt) > 200 else prompt,
            'prompt_length': len(prompt),
            'response_preview': response_text[:200] + '...' if len(response_text) > 200 else response_text,
            'response_length': len(response_text),
            'tokens_sent': tokens_sent,
            'tokens_received': tokens_received,
            'total_tokens': tokens_sent + tokens_received,
            'latency_ms': latency_ms,
            'success': error is None,
            'error': error,
            'metadata': metadata or {}
        }

        # Append to JSONL file
        with open(self.log_path, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')

        return log_entry

    def get_metrics(self, limit=100):
        """
        Retrieve the most recent metrics.

        Args:
            limit: Maximum number of records to return

        Returns:
            List of log entries, most recent first
        """
        if not self.log_path.exists():
            return []

        with open(self.log_path, 'r') as f:
            lines = f.readlines()

        # Get the last N lines and parse them
        recent_lines = lines[-limit:] if len(lines) > limit else lines
        metrics = [json.loads(line) for line in recent_lines]

        # Return in reverse order (most recent first)
        return list(reversed(metrics))

    def get_summary_stats(self):
        """
        Calculate summary statistics across all logged calls.

        Returns:
            Dictionary with aggregate metrics
        """
        if not self.log_path.exists():
            return {
                'total_calls': 0,
                'successful_calls': 0,
                'failed_calls': 0,
                'total_tokens': 0,
                'avg_latency_ms': 0,
                'total_latency_ms': 0
            }

        metrics = self.get_metrics(limit=None)  # Get all

        if not metrics:
            return {
                'total_calls': 0,
                'successful_calls': 0,
                'failed_calls': 0,
                'total_tokens': 0,
                'avg_latency_ms': 0,
                'total_latency_ms': 0
            }

        total_calls = len(metrics)
        successful_calls = sum(1 for m in metrics if m['success'])
        failed_calls = total_calls - successful_calls
        total_tokens = sum(m['total_tokens'] for m in metrics)
        total_latency = sum(m['latency_ms'] for m in metrics)
        avg_latency = total_latency / total_calls if total_calls > 0 else 0

        # Get operation type breakdown
        operation_counts = {}
        for m in metrics:
            op_type = m['operation_type']
            operation_counts[op_type] = operation_counts.get(op_type, 0) + 1

        return {
            'total_calls': total_calls,
            'successful_calls': successful_calls,
            'failed_calls': failed_calls,
            'total_tokens': total_tokens,
            'avg_latency_ms': round(avg_latency, 2),
            'total_latency_ms': round(total_latency, 2),
            'operation_breakdown': operation_counts
        }

# Global logger instance
logger = ObservabilityLogger()
