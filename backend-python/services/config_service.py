"""
Simple in-memory configuration service to replace Redis state management.
This provides a single source of truth for application configuration without external dependencies.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ConfigService:
    """In-memory configuration state management"""

    def __init__(self):
        # Cache settings
        self._cache_enabled = True
        self._model_aware_cache = True
        self._current_model = 'gemini-2.5-flash'
        self._semantic_cache_enabled = False
        self._semantic_similarity_threshold = 0.95

        # RAG settings
        self._rag_enabled = False
        self._rag_doc_id_counter = 0

    # Cache configuration methods
    def set_cache_enabled(self, enabled: bool) -> bool:
        """Enable or disable caching"""
        self._cache_enabled = enabled
        logger.info(f"Cache enabled set to: {enabled}")
        return enabled

    def is_cache_enabled(self) -> bool:
        """Check if caching is enabled"""
        return self._cache_enabled

    def set_model_aware_cache(self, model_aware: bool) -> bool:
        """Enable or disable model-aware caching"""
        self._model_aware_cache = model_aware
        logger.info(f"Model-aware cache set to: {model_aware}")
        return model_aware

    def is_model_aware_cache(self) -> bool:
        """Check if model-aware caching is enabled"""
        return self._model_aware_cache

    def set_current_model(self, model: str) -> str:
        """Set the current LLM model"""
        self._current_model = model
        logger.info(f"Current model set to: {model}")
        return model

    def get_current_model(self) -> str:
        """Get the current LLM model"""
        return self._current_model

    def set_semantic_cache_enabled(self, enabled: bool) -> bool:
        """Enable or disable semantic caching"""
        self._semantic_cache_enabled = enabled
        logger.info(f"Semantic cache enabled set to: {enabled}")
        return enabled

    def is_semantic_cache_enabled(self) -> bool:
        """Check if semantic caching is enabled"""
        return self._semantic_cache_enabled

    def set_semantic_similarity_threshold(self, threshold: float) -> float:
        """Set the semantic similarity threshold"""
        self._semantic_similarity_threshold = threshold
        logger.info(f"Semantic similarity threshold set to: {threshold}")
        return threshold

    def get_semantic_similarity_threshold(self) -> float:
        """Get the semantic similarity threshold"""
        return self._semantic_similarity_threshold

    # RAG configuration methods
    def set_rag_enabled(self, enabled: bool) -> bool:
        """Enable or disable RAG"""
        self._rag_enabled = enabled
        logger.info(f"RAG enabled set to: {enabled}")
        return enabled

    def is_rag_enabled(self) -> bool:
        """Check if RAG is enabled"""
        return self._rag_enabled

    def increment_rag_doc_id(self) -> int:
        """Increment and return the RAG document ID counter"""
        self._rag_doc_id_counter += 1
        return self._rag_doc_id_counter

    def get_rag_doc_id_counter(self) -> int:
        """Get the current RAG document ID counter"""
        return self._rag_doc_id_counter


# Global singleton instance
config = ConfigService()
