from flask import Blueprint, request, jsonify
from services import logger, cache
from prompts.loader import prompts
from utils import handle_errors

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/api/observability/metrics', methods=['GET'])
@handle_errors
def get_metrics():
    """Get recent LLM call metrics"""
    limit = request.args.get('limit', 100, type=int)
    return {'metrics': logger.get_metrics(limit=limit)}


@admin_bp.route('/api/observability/summary', methods=['GET'])
@handle_errors
def get_summary():
    """Get summary statistics"""
    return {'summary': logger.get_summary_stats()}


@admin_bp.route('/api/observability/call/<int:call_id>', methods=['GET'])
@handle_errors
def get_call_details(call_id):
    """Get full details of a specific LLM call"""
    call = logger.get_call_by_id(call_id)
    if call:
        return {'call': call}
    else:
        return jsonify({'success': False, 'error': 'Call not found'})


@admin_bp.route('/api/current-model', methods=['GET'])
@handle_errors
def get_current_model_route():
    """Get current model"""
    return {'model': cache.get_current_model()}


@admin_bp.route('/api/current-model', methods=['POST'])
@handle_errors
def set_current_model_route():
    """Set current model"""
    model = request.json.get('model')
    if not model:
        return jsonify({'success': False, 'error': 'No model specified'})

    cache.set_current_model(model)
    return {'model': cache.get_current_model()}


@admin_bp.route('/api/prompts', methods=['GET'])
@handle_errors
def list_prompts():
    """List all available prompts with their edit status"""
    return {'prompts': prompts.list_all()}


@admin_bp.route('/api/prompts/<prompt_name>', methods=['GET'])
@handle_errors
def get_prompt(prompt_name):
    """Get a specific prompt (raw, unformatted)"""
    return {'prompt': prompts.get_raw(prompt_name)}


@admin_bp.route('/api/prompts/<prompt_name>', methods=['POST'])
@handle_errors
def update_prompt(prompt_name):
    """Update/edit a prompt"""
    content = request.json.get('content')
    if content is None:
        return jsonify({'success': False, 'error': 'No content provided'})

    prompts.set(prompt_name, content)
    return {'message': 'Prompt updated successfully'}


@admin_bp.route('/api/prompts/<prompt_name>', methods=['DELETE'])
@handle_errors
def reset_prompt(prompt_name):
    """Reset a prompt to default"""
    default_content = prompts.reset(prompt_name)
    return {'message': 'Prompt reset to default', 'content': default_content}
