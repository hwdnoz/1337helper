from flask import Blueprint, request, jsonify
from tasks import process_leetcode_task, process_test_case_task, process_code_modification_task
from celery.result import AsyncResult
from services import cache

jobs_bp = Blueprint('jobs', __name__)


def _submit_job(task_func, task_args, message):
    """
    Helper function to submit a Celery job with cache settings.

    Args:
        task_func: The Celery task function to execute
        task_args: Tuple of arguments to pass to the task (excluding cache settings)
        message: Success message to return

    Returns:
        Tuple of (jsonify response, status_code)
    """
    task = task_func.delay(
        *task_args,
        cache.get_current_model(),
        use_cache=cache.is_enabled(),
        model_aware_cache=cache.is_model_aware_cache()
    )

    return jsonify({
        'job_id': task.id,
        'status': 'submitted',
        'message': message
    }), 202

@jobs_bp.route('/api/jobs/leetcode', methods=['POST'])
def submit_leetcode_job():
    """Submit a LeetCode problem for async processing"""
    problem_number = request.json.get('problem_number', '')
    custom_prompt = request.json.get('custom_prompt', None)

    return _submit_job(
        process_leetcode_task,
        (problem_number, custom_prompt),
        'Job submitted for processing'
    )

@jobs_bp.route('/api/jobs/test-cases', methods=['POST'])
def submit_test_case_job():
    """Submit test case generation for async processing"""
    code = request.json.get('code', '')

    return _submit_job(
        process_test_case_task,
        (code,),
        'Test case generation job submitted'
    )

@jobs_bp.route('/api/jobs/code-modification', methods=['POST'])
def submit_code_modification_job():
    """Submit code modification for async processing"""
    prompt = request.json.get('prompt', '')
    code = request.json.get('code', '')

    return _submit_job(
        process_code_modification_task,
        (prompt, code),
        'Code modification job submitted'
    )

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
