"""
Utility functions and decorators
"""

from functools import wraps
from flask import jsonify
import redis
import logging
import sqlite3
from contextlib import contextmanager

logger = logging.getLogger(__name__)


def handle_errors(f):
    """
    Decorator to handle errors in route handlers.

    Wraps the handler with try/except and returns standardized JSON responses:
    - Success: {'success': True, ...handler response...}
    - Error: {'success': False, 'error': str(exception)}

    Usage:
        @app.route('/api/something')
        @handle_errors
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


def redis_fallback(default_value):
    """
    Decorator to handle Redis errors with a fallback default value.

    Catches redis.ConnectionError and general exceptions, logs them appropriately,
    and returns the specified default value.

    Usage:
        @redis_fallback(default_value=True)
        def is_enabled(self):
            r = self._get_redis_client()
            value = r.get('cache_enabled')
            return value == '1' if value is not None else True
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except redis.ConnectionError as e:
                logger.warning(f"Redis unavailable in {f.__name__}, using default: {e}")
                return default_value
            except Exception as e:
                logger.error(f"Unexpected error in {f.__name__}: {e}")
                return default_value
        return wrapper
    return decorator


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
