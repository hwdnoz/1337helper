from flask import Blueprint, request
from services import cache
from utils import handle_errors

cache_bp = Blueprint('cache', __name__)


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


@cache_bp.route('/api/cache/enabled', methods=['GET'])
@handle_errors
def get_cache_enabled():
    """Get cache enabled status"""
    return {'enabled': cache.is_enabled()}


@cache_bp.route('/api/cache/enabled', methods=['POST'])
@handle_errors
def set_cache_enabled():
    """Set cache enabled status"""
    enabled = request.json.get('enabled', True)
    cache.set_enabled(enabled)
    return {'enabled': cache.is_enabled()}


@cache_bp.route('/api/cache/model-aware', methods=['GET'])
@handle_errors
def get_cache_model_aware():
    """Get model-aware cache status"""
    return {'model_aware': cache.is_model_aware_cache()}


@cache_bp.route('/api/cache/model-aware', methods=['POST'])
@handle_errors
def set_cache_model_aware():
    """Set model-aware cache status"""
    model_aware = request.json.get('model_aware', True)
    cache.set_model_aware_cache(model_aware)
    return {'model_aware': cache.is_model_aware_cache()}


@cache_bp.route('/api/cache/semantic-enabled', methods=['GET'])
@handle_errors
def get_semantic_cache_enabled():
    """Get semantic cache enabled status"""
    return {'semantic_enabled': cache.is_semantic_cache_enabled()}


@cache_bp.route('/api/cache/semantic-enabled', methods=['POST'])
@handle_errors
def set_semantic_cache_enabled():
    """Set semantic cache enabled status"""
    semantic_enabled = request.json.get('semantic_enabled', False)
    cache.set_semantic_cache_enabled(semantic_enabled)
    return {'semantic_enabled': cache.is_semantic_cache_enabled()}
