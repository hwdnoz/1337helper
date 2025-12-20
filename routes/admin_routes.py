from flask import Blueprint, request, jsonify
from observability import logger
from cache import cache

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/api/observability/metrics', methods=['GET'])
def get_metrics():
    """Get recent LLM call metrics"""
    try:
        limit = request.args.get('limit', 100, type=int)
        metrics = logger.get_metrics(limit=limit)
        return jsonify({'success': True, 'metrics': metrics})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@admin_bp.route('/api/observability/summary', methods=['GET'])
def get_summary():
    """Get summary statistics"""
    try:
        summary = logger.get_summary_stats()
        return jsonify({'success': True, 'summary': summary})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@admin_bp.route('/api/observability/call/<int:call_id>', methods=['GET'])
def get_call_details(call_id):
    """Get full details of a specific LLM call"""
    try:
        call = logger.get_call_by_id(call_id)
        if call:
            return jsonify({'success': True, 'call': call})
        else:
            return jsonify({'success': False, 'error': 'Call not found'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@admin_bp.route('/api/current-model', methods=['GET'])
def get_current_model_route():
    """Get current model"""
    try:
        return jsonify({'success': True, 'model': cache.get_current_model()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@admin_bp.route('/api/current-model', methods=['POST'])
def set_current_model_route():
    """Set current model"""
    try:
        model = request.json.get('model')
        if model:
            cache.set_current_model(model)
            return jsonify({'success': True, 'model': cache.get_current_model()})
        else:
            return jsonify({'success': False, 'error': 'No model specified'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
