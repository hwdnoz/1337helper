"""
Test configuration and fixtures
"""
import pytest
from unittest.mock import Mock, MagicMock


@pytest.fixture(autouse=True)
def mock_services(monkeypatch):
    """Mock all services to isolate route testing"""

    # Mock cache service
    mock_cache = Mock()
    mock_cache.get_stats.return_value = {'hits': 10, 'misses': 5}
    mock_cache.get_all_entries.return_value = [{'id': 1, 'key': 'test'}]
    mock_cache.is_enabled.return_value = True
    mock_cache.set_enabled.return_value = None
    mock_cache.is_model_aware_cache.return_value = True
    mock_cache.set_model_aware_cache.return_value = None
    mock_cache.is_semantic_cache_enabled.return_value = False
    mock_cache.set_semantic_cache_enabled.return_value = None
    mock_cache.clear_all.return_value = 5
    mock_cache.clear_expired.return_value = 2
    mock_cache.get_current_model.return_value = 'gemini-1.5-flash'
    mock_cache.set_current_model.return_value = None

    # Mock logger/observability service
    mock_logger = Mock()
    mock_logger.get_metrics.return_value = [{'id': 1, 'model': 'test'}]
    mock_logger.get_summary_stats.return_value = {'total_calls': 100}
    mock_logger.get_call_by_id.return_value = {'id': 1, 'prompt': 'test'}

    # Mock prompts loader
    mock_prompts = Mock()
    mock_prompts.list_all.return_value = [{'name': 'test', 'edited': False}]
    mock_prompts.get_raw.return_value = 'test prompt content'
    mock_prompts.set.return_value = True  # Return success
    mock_prompts.reset.return_value = 'default content'
    mock_prompts.exists.return_value = True  # Make prompts exist

    # Mock Google AI client
    mock_genai_client = Mock()
    mock_model = Mock()
    mock_model.name = 'models/gemini-1.5-flash'
    mock_genai_client.models.list.return_value = [mock_model]

    # Patch services
    monkeypatch.setattr('services.cache', mock_cache)
    monkeypatch.setattr('services.logger', mock_logger)
    monkeypatch.setattr('prompts.loader.prompts', mock_prompts)

    # Patch Google AI in code_routes
    import sys
    if 'routes.code_routes' in sys.modules:
        monkeypatch.setattr('routes.code_routes.client', mock_genai_client)


@pytest.fixture
def client():
    """Flask test client with mocked services"""
    from app import app
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client
