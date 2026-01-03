from flask import Blueprint, request, jsonify
from services import logger, cache
from services.rag_service import rag_service
from prompts.loader import prompts
from utils import route_error_handler

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/api/observability/metrics', methods=['GET'])
@route_error_handler
def get_metrics():
    """Get recent LLM call metrics"""
    limit = request.args.get('limit', 100, type=int)
    return {'metrics': logger.get_metrics(limit=limit)}


@admin_bp.route('/api/observability/summary', methods=['GET'])
@route_error_handler
def get_summary():
    """Get summary statistics"""
    return {'summary': logger.get_summary_stats()}


@admin_bp.route('/api/observability/call/<int:call_id>', methods=['GET'])
@route_error_handler
def get_call_details(call_id):
    """Get full details of a specific LLM call"""
    call = logger.get_call_by_id(call_id)
    if call:
        return {'call': call}
    else:
        return jsonify({'success': False, 'error': 'Call not found'})


@admin_bp.route('/api/current-model', methods=['GET'])
@route_error_handler
def get_current_model_route():
    """Get current model"""
    return {'model': cache.get_current_model()}


@admin_bp.route('/api/current-model', methods=['POST'])
@route_error_handler
def set_current_model_route():
    """Set current model"""
    model = request.json.get('model')
    if not model:
        return jsonify({'success': False, 'error': 'No model specified'})

    cache.set_current_model(model)
    return {'model': cache.get_current_model()}


@admin_bp.route('/api/prompts', methods=['GET'])
@route_error_handler
def list_prompts():
    """List all available prompts with their edit status"""
    return {'prompts': prompts.list_all()}


@admin_bp.route('/api/prompts/<prompt_name>', methods=['GET'])
@route_error_handler
def get_prompt(prompt_name):
    """Get a specific prompt (raw, unformatted)"""
    return {'prompt': prompts.get_raw(prompt_name)}


@admin_bp.route('/api/prompts/<prompt_name>', methods=['POST'])
@route_error_handler
def update_prompt(prompt_name):
    """Update/edit a prompt"""
    content = request.json.get('content')
    if content is None:
        return jsonify({'success': False, 'error': 'No content provided'})

    prompts.set(prompt_name, content)
    return {'message': 'Prompt updated successfully'}


@admin_bp.route('/api/prompts/<prompt_name>', methods=['DELETE'])
@route_error_handler
def reset_prompt(prompt_name):
    """Reset a prompt to default"""
    default_content = prompts.reset(prompt_name)
    return {'message': 'Prompt reset to default', 'content': default_content}


@admin_bp.route('/api/rag/documents', methods=['GET'])
@route_error_handler
def get_rag_documents():
    """Get all RAG documents"""
    limit = request.args.get('limit', 100, type=int)
    return {'documents': rag_service.get_documents(limit=limit)}


@admin_bp.route('/api/rag/documents', methods=['POST'])
@route_error_handler
def add_rag_document():
    """Add a new document to RAG"""
    content = request.json.get('content')
    if not content:
        return jsonify({'success': False, 'error': 'No content provided'})

    doc_id = rag_service.add_document(content)
    if doc_id:
        return {'success': True, 'id': doc_id}
    else:
        return jsonify({'success': False, 'error': 'Failed to add document'})


@admin_bp.route('/api/rag/documents/<int:doc_id>', methods=['DELETE'])
@route_error_handler
def delete_rag_document(doc_id):
    """Delete a RAG document"""
    if rag_service.delete_document(doc_id):
        return {'message': f'Document {doc_id} deleted'}
    else:
        return jsonify({'success': False, 'error': 'Document not found'})
