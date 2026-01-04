import os
import time
from typing import Optional, Callable, Dict, Any
from celery_app import celery_app
from google import genai
from services import logger, cache
from services.rag_service import rag_service
from prompts.loader import PromptLoader

# Configure Google AI
client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

# Initialize prompt loader
prompts = PromptLoader()


def _strip_markdown_code_blocks(text: str) -> str:
    """
    Remove markdown code blocks from response text.

    Args:
        text: Response text that may contain markdown code blocks

    Returns:
        Cleaned text without markdown formatting
    """
    text = text.strip()
    if text.startswith('```python'):
        return text.split('```python')[1].split('```')[0].strip()
    elif text.startswith('```'):
        return text.split('```')[1].split('```')[0].strip()
    return text


def _execute_llm_task(
    prompt: str,
    operation_type: str,
    current_model: str,
    response_key: str = 'response',
    cache_metadata: Optional[Dict[str, Any]] = None,
    post_processor: Optional[Callable[[str], str]] = None,
    use_cache: bool = True,
    model_aware_cache: bool = True
) -> Dict[str, Any]:
    """
    Generic LLM task execution with RAG, caching, logging, and error handling.

    This function consolidates the common pattern used across all LLM tasks:
    1. Augment prompt with RAG context
    2. Check cache
    3. Make API call if not cached
    4. Post-process response (optional)
    5. Log metrics
    6. Save to cache
    7. Handle errors

    Args:
        prompt: The prompt to send to the LLM
        operation_type: Type of operation (for logging/caching)
        current_model: Model to use for generation
        response_key: Key name for response in return dict (default: 'response')
        cache_metadata: Optional metadata for cache lookup
        post_processor: Optional function to process response text
        use_cache: Whether to use caching
        model_aware_cache: Whether to use model-aware caching

    Returns:
        Dict with success status, response data, and metadata
    """
    try:
        # Prepare cache metadata
        if cache_metadata is None:
            cache_metadata = {}
        cache_metadata['model'] = current_model

        # Augment prompt with RAG context (if enabled)
        rag_doc_count = 0
        if rag_service.is_enabled():
            retrieved_docs = rag_service.retrieve(query=prompt)
            rag_doc_count = len(retrieved_docs)
            if retrieved_docs:
                print(f"[RAG] Found {len(retrieved_docs)} matching documents:")
                for i, doc in enumerate(retrieved_docs, 1):
                    similarity = doc.get('similarity_score', 0)
                    content_preview = doc.get('content', '')[:100]
                    print(f"[RAG]   {i}. Similarity: {similarity:.4f} | Preview: {content_preview}...")
                context = rag_service.format_context(retrieved_docs)
                prompt = f"{prompt}\n\n{context}"
            else:
                print("[RAG] No matching documents found in RAG system")
        else:
            print("[RAG] RAG is disabled, skipping document retrieval")

        # Check cache
        cached_response = cache.get(
            prompt,
            operation_type,
            current_model,
            use_cache,
            model_aware_cache,
            metadata=cache_metadata if cache_metadata != {'model': current_model} else None
        )

        if cached_response:
            processed_response = cached_response['response_text']
            if post_processor:
                processed_response = post_processor(processed_response)

            return {
                'success': True,
                response_key: processed_response,
                'from_cache': True,
                'semantic_cache_hit': cached_response.get('semantic_cache_hit', False),
                'similarity_score': cached_response.get('similarity_score'),
                'cached_prompt': cached_response.get('prompt'),
                'current_prompt': cached_response.get('current_prompt'),
                'metadata': cached_response.get('metadata', {}),
                'rag_doc_count': rag_doc_count
            }

        # Make LLM call
        start_time = time.time()
        response = client.models.generate_content(
            model=current_model,
            contents=prompt
        )
        latency_ms = (time.time() - start_time) * 1000

        response_text = response.text

        # Post-process response if needed
        processed_response = response_text
        if post_processor:
            processed_response = post_processor(response_text)

        # Log metrics
        logger.log_llm_call(
            operation_type=operation_type,
            prompt=prompt,
            response_text=response_text,
            tokens_sent=len(prompt.split()),
            tokens_received=len(response_text.split()),
            latency_ms=latency_ms,
            metadata=cache_metadata
        )

        # Save to cache
        cache.set(
            prompt,
            operation_type,
            response_text,
            metadata=cache_metadata,
            model=current_model,
            use_cache=use_cache,
            model_aware_cache=model_aware_cache
        )

        return {
            'success': True,
            response_key: processed_response,
            'from_cache': False,
            'latency_ms': latency_ms,
            'rag_doc_count': rag_doc_count
        }

    except Exception as e:
        # Log error
        logger.log_llm_call(
            operation_type=operation_type,
            prompt=prompt,
            response_text='',
            tokens_sent=len(prompt.split()),
            tokens_received=0,
            latency_ms=0,
            error=str(e),
            metadata=cache_metadata
        )

        return {
            'success': False,
            'error': str(e)
        }

@celery_app.task(bind=True)
def process_test_case_task(self, code, current_model, use_cache=True, model_aware_cache=True):
    """
    Background task to generate test cases for code
    """
    prompt = prompts.get('test_case_generation', code=code)

    return _execute_llm_task(
        prompt=prompt,
        operation_type='test_case_generation',
        current_model=current_model,
        response_key='test_cases',
        post_processor=_strip_markdown_code_blocks,
        use_cache=use_cache,
        model_aware_cache=model_aware_cache
    )

@celery_app.task(bind=True)
def process_code_modification_task(self, prompt, code, current_model, use_cache=True, model_aware_cache=True):
    """
    Background task to modify code based on user prompt
    """
    full_prompt = prompts.get('code_modification', code=code, prompt=prompt)

    return _execute_llm_task(
        prompt=full_prompt,
        operation_type='code_modification',
        current_model=current_model,
        response_key='code',
        post_processor=_strip_markdown_code_blocks,
        use_cache=use_cache,
        model_aware_cache=model_aware_cache
    )

@celery_app.task(bind=True)
def process_leetcode_task(self, problem_number, custom_prompt, current_model, use_cache=True, model_aware_cache=True):
    """
    Background task to process LeetCode problem
    """
    # Use custom prompt if provided, otherwise load from file
    if custom_prompt:
        prompt = custom_prompt
    else:
        prompt = prompts.get('leetcode_solve', problem_number=problem_number)

    return _execute_llm_task(
        prompt=prompt,
        operation_type='leetcode_solve',
        current_model=current_model,
        response_key='response',
        cache_metadata={'problem_number': problem_number},
        post_processor=None,  # No markdown stripping for leetcode
        use_cache=use_cache,
        model_aware_cache=model_aware_cache
    )
