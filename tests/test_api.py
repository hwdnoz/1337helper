"""
Simple API tests for backend endpoints
"""

import pytest


@pytest.fixture
def client():
    """Flask test client"""
    from app import app
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    """Health check should return healthy status"""
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'
