from flask import Blueprint, request, jsonify
from tasks import process_leetcode_task, process_test_case_task, process_code_modification_task
from celery.result import AsyncResult

jobs_bp = Blueprint('jobs', __name__)

@jobs_bp.route('/api/jobs/leetcode', methods=['POST'])
def submit_leetcode_job():
    """Submit a LeetCode problem for async processing"""
    from app import current_model

    problem_number = request.json.get('problem_number', '')
    custom_prompt = request.json.get('custom_prompt', None)

    # Submit task to Celery
    task = process_leetcode_task.delay(problem_number, custom_prompt, current_model)

    return jsonify({
        'job_id': task.id,
        'status': 'submitted',
        'message': 'Job submitted for processing'
    }), 202

@jobs_bp.route('/api/jobs/test-cases', methods=['POST'])
def submit_test_case_job():
    """Submit test case generation for async processing"""
    from app import current_model

    code = request.json.get('code', '')

    # Submit task to Celery
    task = process_test_case_task.delay(code, current_model)

    return jsonify({
        'job_id': task.id,
        'status': 'submitted',
        'message': 'Test case generation job submitted'
    }), 202

@jobs_bp.route('/api/jobs/code-modification', methods=['POST'])
def submit_code_modification_job():
    """Submit code modification for async processing"""
    from app import current_model

    prompt = request.json.get('prompt', '')
    code = request.json.get('code', '')

    # Submit task to Celery
    task = process_code_modification_task.delay(prompt, code, current_model)

    return jsonify({
        'job_id': task.id,
        'status': 'submitted',
        'message': 'Code modification job submitted'
    }), 202

@jobs_bp.route('/api/jobs/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Check status of a background job"""
    task = AsyncResult(job_id)

    if task.state == 'PENDING':
        response = {
            'job_id': job_id,
            'state': task.state,
            'status': 'Job is waiting to be processed'
        }
    elif task.state == 'STARTED':
        response = {
            'job_id': job_id,
            'state': task.state,
            'status': 'Job is being processed'
        }
    elif task.state == 'SUCCESS':
        response = {
            'job_id': job_id,
            'state': task.state,
            'status': 'Job completed successfully',
            'result': task.result
        }
    elif task.state == 'FAILURE':
        response = {
            'job_id': job_id,
            'state': task.state,
            'status': 'Job failed',
            'error': str(task.info)
        }
    else:
        response = {
            'job_id': job_id,
            'state': task.state,
            'status': f'Job state: {task.state}'
        }

    return jsonify(response)
