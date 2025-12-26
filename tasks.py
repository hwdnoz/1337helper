import os
import time
from typing import Optional, Callable, Dict, Any
from celery_app import celery_app
from google import genai
from observability import logger
from cache import cache

# Configure Google AI
client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))


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
    Generic LLM task execution with caching, logging, and error handling.

    This function consolidates the common pattern used across all LLM tasks:
    1. Check cache
    2. Make API call if not cached
    3. Post-process response (optional)
    4. Log metrics
    5. Save to cache
    6. Handle errors

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
                'metadata': cached_response.get('metadata', {})
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
            'latency_ms': latency_ms
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
    prompt = f"""Given the following Python code, generate exactly 3 simple test cases.

Code:
```python
{code}
```

Generate exactly 3 simple test cases in the following format:
- Create Python code that calls the main function with 3 different simple inputs
- Keep the test cases straightforward and easy to understand
- Print the results so they can be verified
- Do NOT include any comments in the code

IMPORTANT: Return ONLY the test case code, ready to be pasted into the test case window.

DO NOT wrap the code in markdown code blocks. DO NOT include ```python or ``` markers. Return raw Python code only."""

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
    full_prompt = f"""You are a code modification assistant. Given the following Python code and a user instruction, modify the code according to the instruction.

Current code:
```python
{code}
```

User instruction: {prompt}

IMPORTANT: Return ONLY the modified Python code, ready to run.

DO NOT include any explanations, comments, or text before or after the code.
DO NOT wrap the code in markdown code blocks. DO NOT include ```python or ``` markers. Return raw Python code only."""

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
    # Build prompt - use custom or default
    if custom_prompt:
        prompt = custom_prompt
    else:
        prompt = f"""Fetch the LeetCode problem #{problem_number} and provide a complete Python solution.

Please structure your response as follows:
1. Problem title and description
2. A complete, working Python solution
3. Time and space complexity analysis

IMPORTANT: Return ONLY the Python code for the solution, properly formatted and ready to run. Include the problem description as a docstring at the top of the solution function.

DO NOT wrap the code in markdown code blocks. DO NOT include ```python or ``` markers. Return raw Python code only."""

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
