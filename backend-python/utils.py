"""
Utility functions and decorators
"""

from functools import wraps
from flask import jsonify
import logging
import sqlite3
import json
from contextlib import contextmanager

logger = logging.getLogger(__name__)


def route_error_handler(f):
    """
    Decorator to handle errors in route handlers.

    Wraps the handler with try/except and returns standardized JSON responses:
    - Success: {'success': True, ...handler response...}
    - Error: {'success': False, 'error': str(exception)}

    Usage:
        @app.route('/api/something')
        @route_error_handler
        def my_route():
            return {'data': 'value'}  # Will be wrapped as {'success': True, 'data': 'value'}
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            result = f(*args, **kwargs)

            # If result is already a Response object, return as-is
            if hasattr(result, 'status_code'):
                return result

            # If result is a dict, wrap with success
            if isinstance(result, dict):
                return jsonify({'success': True, **result})

            # If result is a tuple (response, status_code), wrap the response
            if isinstance(result, tuple):
                data, status_code = result
                if isinstance(data, dict):
                    return jsonify({'success': True, **data}), status_code
                return result

            # Otherwise return as-is
            return result

        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})

    return wrapper


def cache_error_handler(default_value):
    """
    Decorator to handle cache errors with a fallback default value.

    Catches general exceptions, logs them, and returns the specified default value.

    Usage:
        @cache_error_handler(default_value=True)
        def is_enabled(self):
            return self._config.get('cache_enabled', True)
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except Exception as e:
                logger.error(f"Unexpected error in {f.__name__}: {e}")
                return default_value
        return wrapper
    return decorator


def service_error_handler(default_value, error_message_prefix="Error"):
    """
    Decorator to handle errors in service methods with a fallback default value.

    Catches all exceptions, logs them, and returns the specified default value.

    Usage:
        @service_error_handler(default_value=None, error_message_prefix="Error adding document")
        def add_document(self, content):
            # DB operation that might fail
            return doc_id

        @service_error_handler(default_value=[], error_message_prefix="Error getting documents")
        def get_documents(self):
            # DB operation that might fail
            return documents
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except Exception as e:
                logger.error(f"{error_message_prefix} in {f.__name__}: {e}")
                return default_value
        return wrapper
    return decorator


def parse_metadata_json(metadata):
    """
    Parse metadata from JSON string to dict, handling all cases.

    Args:
        metadata: Can be None, dict, or JSON string

    Returns:
        dict or None

    Usage:
        row['metadata'] = parse_metadata_json(row['metadata'])
    """
    if not metadata:
        return None
    if isinstance(metadata, dict):
        return metadata
    if isinstance(metadata, str):
        try:
            return json.loads(metadata)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse metadata JSON: {metadata[:100]}")
            return None
    return None


@contextmanager
def sqlite_connection(db_path, row_factory=None):
    """
    Context manager for SQLite database connections.

    Automatically handles connection creation, commit on success,
    rollback on error, and ensures connection is always closed.

    Usage:
        with sqlite_connection('data/db.sqlite') as (conn, cursor):
            cursor.execute('SELECT * FROM table')
            rows = cursor.fetchall()
            # Auto-commits on success
        # Connection automatically closed

        # With row_factory for dict results:
        with sqlite_connection('data/db.sqlite', row_factory=sqlite3.Row) as (conn, cursor):
            cursor.execute('SELECT * FROM table')
            row = cursor.fetchone()
            data = dict(row)
    """
    conn = sqlite3.connect(db_path)
    if row_factory:
        conn.row_factory = row_factory
    cursor = conn.cursor()

    try:
        yield conn, cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error in {db_path}, rolling back: {e}")
        raise
    finally:
        cursor.close()
        conn.close()
