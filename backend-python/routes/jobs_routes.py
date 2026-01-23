"""
Synchronous job processing routes.
"""
from flask import Blueprint, request, jsonify
from services.llm_service import process_leetcode, process_test_cases, process_code_modification

jobs_bp = Blueprint('jobs', __name__)


@jobs_bp.route('/api/jobs/leetcode', methods=['POST'])
def submit_leetcode_job():
    """Process a LeetCode problem synchronously"""
    problem_number = request.json.get('problem_number', '')
    custom_prompt = request.json.get('custom_prompt', None)
    api_key = request.json.get('google_api_key') or request.headers.get('X-Google-API-Key')

    if not api_key:
        return jsonify({
            'success': False,
            'error': 'No Google API key provided'
        }), 400

    # Process synchronously
    result = process_leetcode(problem_number, api_key, custom_prompt)

    if result.get('success'):
        return jsonify({
            'success': True,
            'result': result
        }), 200
    else:
        return jsonify({
            'success': False,
            'error': result.get('error', 'Unknown error')
        }), 500


@jobs_bp.route('/api/jobs/test-cases', methods=['POST'])
def submit_test_case_job():
    """Generate test cases synchronously"""
    code = request.json.get('code', '')
    api_key = request.json.get('google_api_key') or request.headers.get('X-Google-API-Key')

    if not api_key:
        return jsonify({
            'success': False,
            'error': 'No Google API key provided'
        }), 400

    # Process synchronously
    result = process_test_cases(code, api_key)

    if result.get('success'):
        return jsonify({
            'success': True,
            'result': result
        }), 200
    else:
        return jsonify({
            'success': False,
            'error': result.get('error', 'Unknown error')
        }), 500


@jobs_bp.route('/api/jobs/code-modification', methods=['POST'])
def submit_code_modification_job():
    """Modify code synchronously"""
    prompt = request.json.get('prompt', '')
    code = request.json.get('code', '')
    api_key = request.json.get('google_api_key') or request.headers.get('X-Google-API-Key')

    if not api_key:
        return jsonify({
            'success': False,
            'error': 'No Google API key provided'
        }), 400

    # Process synchronously
    result = process_code_modification(prompt, code, api_key)

    if result.get('success'):
        return jsonify({
            'success': True,
            'result': result
        }), 200
    else:
        return jsonify({
            'success': False,
            'error': result.get('error', 'Unknown error')
        }), 500
