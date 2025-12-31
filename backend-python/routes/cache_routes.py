from flask import Blueprint, request
from services import cache
from utils import handle_errors

cache_bp = Blueprint('cache', __name__)


def create_cache_setting_routes(path, key, getter_fn, setter_fn, default_value=True):
    """
    Factory function to create GET/POST route pairs for cache settings.

    Args:
        path: API path (e.g., '/api/cache/enabled')
        key: JSON key for the setting (e.g., 'enabled')
        getter_fn: Function to get current value
        setter_fn: Function to set new value
        default_value: Default value for POST requests
    """
    # Create unique endpoint names based on the key
    get_endpoint = f'get_{key}'
    set_endpoint = f'set_{key}'

    @cache_bp.route(path, methods=['GET'], endpoint=get_endpoint)
    @handle_errors
    def get_setting():
        return {key: getter_fn()}

    @cache_bp.route(path, methods=['POST'], endpoint=set_endpoint)
    @handle_errors
    def set_setting():
        value = request.json.get(key, default_value)
        setter_fn(value)
        return {key: getter_fn()}

    # Return functions to allow endpoint name customization if needed
    return get_setting, set_setting


@cache_bp.route('/api/cache/stats', methods=['GET'])
@handle_errors
def get_cache_stats():
    """Get cache statistics"""
    return {'stats': cache.get_stats()}


@cache_bp.route('/api/cache/entries', methods=['GET'])
@handle_errors
def get_cache_entries():
    """Get all cache entries"""
    limit = request.args.get('limit', 100, type=int)
    return {'entries': cache.get_all_entries(limit=limit)}


@cache_bp.route('/api/cache/clear', methods=['POST'])
@handle_errors
def clear_cache():
    """Clear all cache entries"""
    return {'deleted_count': cache.clear_all()}


@cache_bp.route('/api/cache/clear-expired', methods=['POST'])
@handle_errors
def clear_expired_cache():
    """Clear expired cache entries"""
    return {'deleted_count': cache.clear_expired()}


# Create GET/POST route pairs using factory
get_cache_enabled, set_cache_enabled = create_cache_setting_routes(
    '/api/cache/enabled',
    'enabled',
    cache.is_enabled,
    cache.set_enabled,
    default_value=True
)

get_cache_model_aware, set_cache_model_aware = create_cache_setting_routes(
    '/api/cache/model-aware',
    'model_aware',
    cache.is_model_aware_cache,
    cache.set_model_aware_cache,
    default_value=True
)

get_semantic_cache_enabled, set_semantic_cache_enabled = create_cache_setting_routes(
    '/api/cache/semantic-enabled',
    'semantic_enabled',
    cache.is_semantic_cache_enabled,
    cache.set_semantic_cache_enabled,
    default_value=False
)
