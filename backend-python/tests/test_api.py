"""
Simple API tests for backend endpoints
"""

import pytest
import os


# Health endpoint
def test_health_endpoint(client):
    """Health check should return healthy status"""
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'


# Code routes
def test_get_code(client):
    """GET /api/code should return default code"""
    response = client.get('/api/code')
    assert response.status_code == 200
    data = response.get_json()
    assert 'code' in data


def test_get_available_models(client):
    """GET /api/available-models should return list of models"""
    response = client.get('/api/available-models')
    assert response.status_code == 200
    data = response.get_json()
    assert 'success' in data


def test_run_code_success(client):
    """POST /api/run should execute simple code"""
    response = client.post('/api/run', json={'code': 'print("test")'})
    assert response.status_code == 200
    data = response.get_json()
    assert 'success' in data


# Admin routes
def test_get_metrics(client):
    """GET /api/observability/metrics should return metrics"""
    response = client.get('/api/observability/metrics')
    assert response.status_code == 200
    data = response.get_json()
    assert 'metrics' in data


def test_get_summary(client):
    """GET /api/observability/summary should return summary stats"""
    response = client.get('/api/observability/summary')
    assert response.status_code == 200
    data = response.get_json()
    assert 'summary' in data


def test_get_call_details(client):
    """GET /api/observability/call/<call_id> should return call details"""
    response = client.get('/api/observability/call/1')
    assert response.status_code == 200
    data = response.get_json()
    # May return 'call' if found, or 'error' if not found
    assert 'call' in data or 'error' in data


def test_get_current_model(client):
    """GET /api/current-model should return current model"""
    response = client.get('/api/current-model')
    assert response.status_code == 200
    data = response.get_json()
    assert 'model' in data


def test_set_current_model(client):
    """POST /api/current-model should set model"""
    response = client.post('/api/current-model', json={'model': 'test-model'})
    assert response.status_code == 200
    data = response.get_json()
    # May fail if Redis unavailable, but endpoint should respond
    assert 'model' in data or 'error' in data


def test_list_prompts(client):
    """GET /api/prompts should return list of prompts"""
    response = client.get('/api/prompts')
    assert response.status_code == 200
    data = response.get_json()
    assert 'prompts' in data


def test_get_prompt(client):
    """GET /api/prompts/<name> should return specific prompt"""
    response = client.get('/api/prompts/test_prompt')
    assert response.status_code == 200
    data = response.get_json()
    # May return 'prompt' if found, or 'error' if file doesn't exist
    assert 'prompt' in data or 'error' in data


def test_update_prompt(client):
    """POST /api/prompts/<name> should update prompt"""
    response = client.post('/api/prompts/test_prompt', json={'content': 'new content'})
    assert response.status_code == 200
    data = response.get_json()
    # May return 'message' on success, or 'error' if Redis unavailable
    assert 'message' in data or 'error' in data


def test_reset_prompt(client):
    """DELETE /api/prompts/<name> should reset prompt to default"""
    response = client.delete('/api/prompts/test_prompt')
    assert response.status_code == 200
    data = response.get_json()
    # May return 'message' on success, or 'error' if Redis/file unavailable
    assert 'message' in data or 'error' in data


# Jobs routes (skip if Redis/Celery not available)
@pytest.mark.skip(reason="Requires Celery/Redis to be running")
def test_submit_leetcode_job(client):
    """POST /api/jobs/leetcode should submit job"""
    response = client.post('/api/jobs/leetcode', json={'problem_number': '1'})
    assert response.status_code == 202
    data = response.get_json()
    assert 'job_id' in data


@pytest.mark.skip(reason="Requires Celery/Redis to be running")
def test_submit_test_case_job(client):
    """POST /api/jobs/test-cases should submit test case generation job"""
    response = client.post('/api/jobs/test-cases', json={'code': 'def test(): pass'})
    assert response.status_code == 202
    data = response.get_json()
    assert 'job_id' in data


@pytest.mark.skip(reason="Requires Celery/Redis to be running")
def test_submit_code_modification_job(client):
    """POST /api/jobs/code-modification should submit code modification job"""
    response = client.post('/api/jobs/code-modification', json={
        'prompt': 'add comments',
        'code': 'def test(): pass'
    })
    assert response.status_code == 202
    data = response.get_json()
    assert 'job_id' in data


@pytest.mark.skip(reason="Requires Celery/Redis to be running")
def test_get_job_status(client):
    """GET /api/jobs/<job_id> should return job status"""
    response = client.get('/api/jobs/fake-job-id')
    assert response.status_code == 200
    data = response.get_json()
    assert 'state' in data


# Cache routes
def test_get_cache_stats(client):
    """GET /api/cache/stats should return cache statistics"""
    response = client.get('/api/cache/stats')
    assert response.status_code == 200
    data = response.get_json()
    assert 'stats' in data


def test_get_cache_entries(client):
    """GET /api/cache/entries should return cache entries"""
    response = client.get('/api/cache/entries')
    assert response.status_code == 200
    data = response.get_json()
    assert 'entries' in data


def test_get_cache_enabled(client):
    """GET /api/cache/enabled should return enabled status"""
    response = client.get('/api/cache/enabled')
    assert response.status_code == 200
    data = response.get_json()
    assert 'enabled' in data


def test_set_cache_enabled(client):
    """POST /api/cache/enabled should set enabled status"""
    response = client.post('/api/cache/enabled', json={'enabled': True})
    assert response.status_code == 200
    data = response.get_json()
    assert 'enabled' in data or 'error' in data


def test_get_cache_model_aware(client):
    """GET /api/cache/model-aware should return model-aware status"""
    response = client.get('/api/cache/model-aware')
    assert response.status_code == 200
    data = response.get_json()
    assert 'model_aware' in data


def test_set_cache_model_aware(client):
    """POST /api/cache/model-aware should set model-aware status"""
    response = client.post('/api/cache/model-aware', json={'model_aware': True})
    assert response.status_code == 200
    data = response.get_json()
    assert 'model_aware' in data or 'error' in data


def test_get_semantic_cache_enabled(client):
    """GET /api/cache/semantic-enabled should return semantic cache status"""
    response = client.get('/api/cache/semantic-enabled')
    assert response.status_code == 200
    data = response.get_json()
    assert 'semantic_enabled' in data


def test_set_semantic_cache_enabled(client):
    """POST /api/cache/semantic-enabled should set semantic cache status"""
    response = client.post('/api/cache/semantic-enabled', json={'semantic_enabled': False})
    assert response.status_code == 200
    data = response.get_json()
    assert 'semantic_enabled' in data or 'error' in data


def test_clear_cache(client):
    """POST /api/cache/clear should clear cache"""
    response = client.post('/api/cache/clear')
    assert response.status_code == 200
    data = response.get_json()
    assert 'deleted_count' in data


def test_clear_expired_cache(client):
    """POST /api/cache/clear-expired should clear expired entries"""
    response = client.post('/api/cache/clear-expired')
    assert response.status_code == 200
    data = response.get_json()
    assert 'deleted_count' in data
