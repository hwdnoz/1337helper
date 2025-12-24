from flask import Blueprint, request, jsonify
from cache import cache

cache_bp = Blueprint('cache', __name__)

@cache_bp.route('/api/cache/stats', methods=['GET'])
def get_cache_stats():
    """Get cache statistics"""
    try:
        stats = cache.get_stats()
        return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@cache_bp.route('/api/cache/entries', methods=['GET'])
def get_cache_entries():
    """Get all cache entries"""
    try:
        limit = request.args.get('limit', 100, type=int)
        entries = cache.get_all_entries(limit=limit)
        return jsonify({'success': True, 'entries': entries})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@cache_bp.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    """Clear all cache entries"""
    try:
        deleted_count = cache.clear_all()
        return jsonify({'success': True, 'deleted_count': deleted_count})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@cache_bp.route('/api/cache/clear-expired', methods=['POST'])
def clear_expired_cache():
    """Clear expired cache entries"""
    try:
        deleted_count = cache.clear_expired()
        return jsonify({'success': True, 'deleted_count': deleted_count})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@cache_bp.route('/api/cache/enabled', methods=['GET'])
def get_cache_enabled():
    """Get cache enabled status"""
    try:
        return jsonify({'success': True, 'enabled': cache.is_enabled()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@cache_bp.route('/api/cache/enabled', methods=['POST'])
def set_cache_enabled():
    """Set cache enabled status"""
    try:
        enabled = request.json.get('enabled', True)
        cache.set_enabled(enabled)
        return jsonify({'success': True, 'enabled': cache.is_enabled()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@cache_bp.route('/api/cache/model-aware', methods=['GET'])
def get_cache_model_aware():
    """Get model-aware cache status"""
    try:
        return jsonify({'success': True, 'model_aware': cache.is_model_aware_cache()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@cache_bp.route('/api/cache/model-aware', methods=['POST'])
def set_cache_model_aware():
    """Set model-aware cache status"""
    try:
        model_aware = request.json.get('model_aware', True)
        cache.set_model_aware_cache(model_aware)
        return jsonify({'success': True, 'model_aware': cache.is_model_aware_cache()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@cache_bp.route('/api/cache/semantic-enabled', methods=['GET'])
def get_semantic_cache_enabled():
    """Get semantic cache enabled status"""
    try:
        return jsonify({'success': True, 'semantic_enabled': cache.is_semantic_cache_enabled()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@cache_bp.route('/api/cache/semantic-enabled', methods=['POST'])
def set_semantic_cache_enabled():
    """Set semantic cache enabled status"""
    try:
        semantic_enabled = request.json.get('semantic_enabled', False)
        cache.set_semantic_cache_enabled(semantic_enabled)
        return jsonify({'success': True, 'semantic_enabled': cache.is_semantic_cache_enabled()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
