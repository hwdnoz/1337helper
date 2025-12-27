"""
Utility functions and decorators
"""

from functools import wraps
from flask import jsonify


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
