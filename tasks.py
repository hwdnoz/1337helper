import os
import time
from celery_app import celery_app
from google import genai
from observability import logger
from cache import cache

# Configure Google AI
client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

@celery_app.task(bind=True)
def process_test_case_task(self, code, current_model, use_cache=True, model_aware_cache=True):
    """
    Background task to generate test cases for code
    """
    try:
        test_prompt = f"""Given the following Python code, generate exactly 3 simple test cases.

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

        # Check cache
        cached_response = cache.get(test_prompt, 'test_case_generation', current_model, use_cache, model_aware_cache)

        if cached_response:
            return {
                'success': True,
                'test_cases': cached_response['response_text'],
                'from_cache': True,
                'metadata': cached_response.get('metadata', {})
            }

        # Make LLM call
        start_time = time.time()
        response = client.models.generate_content(
            model=current_model,
            contents=test_prompt
        )
        latency_ms = (time.time() - start_time) * 1000

        response_text = response.text

        # Remove markdown code blocks if present
        test_cases = response_text.strip()
        if test_cases.startswith('```python'):
            test_cases = test_cases.split('```python')[1].split('```')[0].strip()
        elif test_cases.startswith('```'):
            test_cases = test_cases.split('```')[1].split('```')[0].strip()

        # Log metrics
        logger.log_llm_call(
            operation_type='test_case_generation',
            prompt=test_prompt,
            response_text=response_text,
            tokens_sent=len(test_prompt.split()),
            tokens_received=len(response_text.split()),
            latency_ms=latency_ms,
            metadata={'model': current_model}
        )

        # Save to cache
        cache.set(
            test_prompt,
            'test_case_generation',
            response_text,
            metadata={'model': current_model},
            model=current_model,
            use_cache=use_cache,
            model_aware_cache=model_aware_cache
        )

        return {
            'success': True,
            'test_cases': test_cases,
            'from_cache': False,
            'latency_ms': latency_ms
        }

    except Exception as e:
        # Log error
        logger.log_llm_call(
            operation_type='test_case_generation',
            prompt=test_prompt,
            response_text='',
            tokens_sent=len(test_prompt.split()),
            tokens_received=0,
            latency_ms=0,
            error=str(e),
            metadata={'model': current_model}
        )

        return {
            'success': False,
            'error': str(e)
        }

@celery_app.task(bind=True)
def process_code_modification_task(self, prompt, code, current_model, use_cache=True, model_aware_cache=True):
    """
    Background task to modify code based on user prompt
    """
    try:
        full_prompt = f"""You are a code modification assistant. Given the following Python code and a user instruction, modify the code according to the instruction.

Current code:
```python
{code}
```

User instruction: {prompt}

IMPORTANT: Return ONLY the modified Python code, ready to run.

DO NOT include any explanations, comments, or text before or after the code.
DO NOT wrap the code in markdown code blocks. DO NOT include ```python or ``` markers. Return raw Python code only."""

        # Check cache
        cached_response = cache.get(full_prompt, 'code_modification', current_model, use_cache, model_aware_cache)

        if cached_response:
            return {
                'success': True,
                'code': cached_response['response_text'],
                'from_cache': True,
                'metadata': cached_response.get('metadata', {})
            }

        # Make LLM call
        start_time = time.time()
        response = client.models.generate_content(
            model=current_model,
            contents=full_prompt
        )
        latency_ms = (time.time() - start_time) * 1000

        response_text = response.text

        # Remove markdown code blocks if present
        modified_code = response_text.strip()
        if modified_code.startswith('```python'):
            modified_code = modified_code.split('```python')[1].split('```')[0].strip()
        elif modified_code.startswith('```'):
            modified_code = modified_code.split('```')[1].split('```')[0].strip()

        # Log metrics
        logger.log_llm_call(
            operation_type='code_modification',
            prompt=full_prompt,
            response_text=response_text,
            tokens_sent=len(full_prompt.split()),
            tokens_received=len(response_text.split()),
            latency_ms=latency_ms,
            metadata={'model': current_model}
        )

        # Save to cache
        cache.set(
            full_prompt,
            'code_modification',
            response_text,
            metadata={'model': current_model},
            model=current_model,
            use_cache=use_cache,
            model_aware_cache=model_aware_cache
        )

        return {
            'success': True,
            'code': modified_code,
            'from_cache': False,
            'latency_ms': latency_ms
        }

    except Exception as e:
        # Log error
        logger.log_llm_call(
            operation_type='code_modification',
            prompt=full_prompt,
            response_text='',
            tokens_sent=len(full_prompt.split()),
            tokens_received=0,
            latency_ms=0,
            error=str(e),
            metadata={'model': current_model}
        )

        return {
            'success': False,
            'error': str(e)
        }

@celery_app.task(bind=True)
def process_leetcode_task(self, problem_number, custom_prompt, current_model, use_cache=True, model_aware_cache=True):
    """
    Background task to process LeetCode problem
    """
    try:
        # Build prompt
        if custom_prompt:
            fetch_prompt = custom_prompt
        else:
            fetch_prompt = f"""Fetch the LeetCode problem #{problem_number} and provide a complete Python solution.

Please structure your response as follows:
1. Problem title and description
2. A complete, working Python solution
3. Time and space complexity analysis

IMPORTANT: Return ONLY the Python code for the solution, properly formatted and ready to run. Include the problem description as a docstring at the top of the solution function.

DO NOT wrap the code in markdown code blocks. DO NOT include ```python or ``` markers. Return raw Python code only."""

        # Check cache
        cached_response = cache.get(fetch_prompt, 'leetcode_solve', current_model, use_cache, model_aware_cache)

        if cached_response:
            return {
                'success': True,
                'response': cached_response['response_text'],
                'from_cache': True,
                'metadata': cached_response.get('metadata', {})
            }

        # Make LLM call
        start_time = time.time()
        response = client.models.generate_content(
            model=current_model,
            contents=fetch_prompt
        )
        latency_ms = (time.time() - start_time) * 1000

        response_text = response.text

        # Log metrics
        logger.log_llm_call(
            operation_type='leetcode_solve',
            prompt=fetch_prompt,
            response_text=response_text,
            tokens_sent=len(fetch_prompt.split()),
            tokens_received=len(response_text.split()),
            latency_ms=latency_ms,
            metadata={'problem_number': problem_number, 'model': current_model}
        )

        # Save to cache
        cache.set(
            fetch_prompt,
            'leetcode_solve',
            response_text,
            metadata={'problem_number': problem_number},
            model=current_model,
            use_cache=use_cache,
            model_aware_cache=model_aware_cache
        )

        return {
            'success': True,
            'response': response_text,
            'from_cache': False,
            'latency_ms': latency_ms
        }

    except Exception as e:
        # Log error
        logger.log_llm_call(
            operation_type='leetcode_solve',
            prompt=fetch_prompt,
            response_text='',
            tokens_sent=len(fetch_prompt.split()),
            tokens_received=0,
            latency_ms=0,
            error=str(e),
            metadata={'problem_number': problem_number, 'model': current_model}
        )

        return {
            'success': False,
            'error': str(e)
        }
