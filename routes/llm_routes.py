import os
import time
from flask import Blueprint, request, jsonify
from google import genai
from observability import logger
from cache import cache

llm_bp = Blueprint('llm', __name__)

# Configure Google AI
client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

# Import current_model from app (will be set via get_current_model function)
def get_current_model():
    from app import current_model
    return current_model

@llm_bp.route('/api/leetcode', methods=['POST'])
def solve_leetcode():
    current_model = get_current_model()
    problem_number = request.json.get('problem_number', '')
    custom_prompt = request.json.get('custom_prompt', None)

    print("\n" + "="*80)
    print(f"LEETCODE SOLVER - Problem #{problem_number}")
    print("="*80)

    try:
        # Use custom prompt if provided, otherwise use default
        if custom_prompt:
            fetch_prompt = custom_prompt
        else:
            fetch_prompt = f"""Fetch the LeetCode problem #{problem_number} and provide a complete Python solution.

Please structure your response as follows:
1. Problem title and description
2. A complete, working Python solution
3. Time and space complexity analysis

Return ONLY the Python code for the solution, properly formatted and ready to run. Include the problem description as a docstring at the top of the solution function."""

        print("\nPROMPT SENT TO GOOGLE AI:")
        print("-"*80)
        print(fetch_prompt)
        print("-"*80)

        # Check cache first
        cached_response = cache.get(fetch_prompt, 'leetcode_solve', current_model)
        cache_hit = False

        if cached_response:
            print("\n*** CACHE HIT - Using cached response ***\n")
            response_text = cached_response['response_text']
            cache_hit = True

            # Log cache hit
            logger.log_llm_call(
                operation_type='leetcode_solve',
                prompt=fetch_prompt,
                response_text=response_text,
                tokens_sent=0,
                tokens_received=0,
                latency_ms=1,
                error=None,
                metadata={'model': current_model, 'problem_number': problem_number, 'cache_hit': True}
            )
        else:
            print("\n*** CACHE MISS - Calling LLM API ***\n")

            # Track observability metrics
            start_time = time.time()
            error_msg = None

            try:
                response = client.models.generate_content(
                    model=current_model,
                    contents=fetch_prompt
                )

                latency_ms = (time.time() - start_time) * 1000
                response_text = response.text

                print("\nRAW RESPONSE FROM GOOGLE AI:")
                print("-"*80)
                print(response_text)
                print("-"*80)

                # Estimate tokens
                tokens_sent = len(fetch_prompt) // 4
                tokens_received = len(response_text) // 4

                # Cache the response
                cache.set(
                    fetch_prompt,
                    'leetcode_solve',
                    response_text,
                    metadata={'model': current_model, 'problem_number': problem_number},
                    model=current_model
                )

                # Log the call
                logger.log_llm_call(
                    operation_type='leetcode_solve',
                    prompt=fetch_prompt,
                    response_text=response_text,
                    tokens_sent=tokens_sent,
                    tokens_received=tokens_received,
                    latency_ms=latency_ms,
                    error=error_msg,
                    metadata={'model': current_model, 'problem_number': problem_number, 'cache_hit': False}
                )
            except Exception as e:
                latency_ms = (time.time() - start_time) * 1000
                error_msg = str(e)
                logger.log_llm_call(
                    operation_type='leetcode_solve',
                    prompt=fetch_prompt,
                    response_text='',
                    tokens_sent=len(fetch_prompt) // 4,
                    tokens_received=0,
                    latency_ms=latency_ms,
                    error=error_msg,
                    metadata={'model': current_model, 'problem_number': problem_number, 'cache_hit': False}
                )
                raise

        solution_code = response_text.strip()

        # Remove markdown code blocks if present
        if solution_code.startswith('```python'):
            solution_code = solution_code.split('```python')[1].split('```')[0].strip()
        elif solution_code.startswith('```'):
            solution_code = solution_code.split('```')[1].split('```')[0].strip()

        print("\nFINAL SOLUTION CODE:")
        print("-"*80)
        print(solution_code)
        print("-"*80 + "\n")

        return jsonify({'success': True, 'code': solution_code, 'cache_hit': cache_hit})
    except Exception as e:
        print(f"\nERROR: {str(e)}\n")
        return jsonify({'success': False, 'error': str(e)})

@llm_bp.route('/api/generate-test-cases', methods=['POST'])
def generate_test_cases():
    current_model = get_current_model()
    code = request.json.get('code', '')

    print("\n" + "="*80)
    print("GENERATING TEST CASES")
    print(f"Code Length: {len(code)} characters")
    print("="*80)

    try:
        # Use the LLM to generate test cases based on the code
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

Return ONLY the test case code (without markdown formatting and without any comments), ready to be pasted into the test case window."""

        print("\nPROMPT SENT TO GOOGLE AI:")
        print("-"*80)
        print(test_prompt)
        print("-"*80)

        # Check cache first
        cached_response = cache.get(test_prompt, 'test_case_generation', current_model)
        cache_hit = False

        if cached_response:
            print("\n*** CACHE HIT - Using cached response ***\n")
            response_text = cached_response['response_text']
            cache_hit = True

            # Log cache hit
            logger.log_llm_call(
                operation_type='test_case_generation',
                prompt=test_prompt,
                response_text=response_text,
                tokens_sent=0,
                tokens_received=0,
                latency_ms=1,
                error=None,
                metadata={'model': current_model, 'cache_hit': True}
            )
        else:
            print("\n*** CACHE MISS - Calling LLM API ***\n")

            # Track observability metrics
            start_time = time.time()
            error_msg = None

            try:
                response = client.models.generate_content(
                    model=current_model,
                    contents=test_prompt
                )

                latency_ms = (time.time() - start_time) * 1000
                response_text = response.text

                print("\nRAW RESPONSE FROM GOOGLE AI:")
                print("-"*80)
                print(response_text)
                print("-"*80)

                # Estimate tokens
                tokens_sent = len(test_prompt) // 4
                tokens_received = len(response_text) // 4

                # Cache the response
                cache.set(
                    test_prompt,
                    'test_case_generation',
                    response_text,
                    metadata={'model': current_model},
                    model=current_model
                )

                # Log the call
                logger.log_llm_call(
                    operation_type='test_case_generation',
                    prompt=test_prompt,
                    response_text=response_text,
                    tokens_sent=tokens_sent,
                    tokens_received=tokens_received,
                    latency_ms=latency_ms,
                    error=error_msg,
                    metadata={'model': current_model, 'cache_hit': False}
                )
            except Exception as e:
                latency_ms = (time.time() - start_time) * 1000
                error_msg = str(e)
                logger.log_llm_call(
                    operation_type='test_case_generation',
                    prompt=test_prompt,
                    response_text='',
                    tokens_sent=len(test_prompt) // 4,
                    tokens_received=0,
                    latency_ms=latency_ms,
                    error=error_msg,
                    metadata={'model': current_model}
                )
                raise

        test_cases = response_text.strip()

        # Remove markdown code blocks if present
        if test_cases.startswith('```python'):
            test_cases = test_cases.split('```python')[1].split('```')[0].strip()
        elif test_cases.startswith('```'):
            test_cases = test_cases.split('```')[1].split('```')[0].strip()

        print("\nFINAL TEST CASES:")
        print("-"*80)
        print(test_cases)
        print("-"*80 + "\n")

        return jsonify({'success': True, 'test_cases': test_cases, 'cache_hit': cache_hit})
    except Exception as e:
        print(f"\nERROR: {str(e)}\n")
        return jsonify({'success': False, 'error': str(e)})

@llm_bp.route('/api/llm', methods=['POST'])
def llm_modify_code():
    current_model = get_current_model()
    prompt = request.json.get('prompt', '')
    code = request.json.get('code', '')

    print("\n" + "="*80)
    print("RECEIVED FROM FRONTEND:")
    print(f"User Prompt: {prompt}")
    print(f"Current Code Length: {len(code)} characters")
    print("="*80)

    try:
        # Create a prompt for the LLM to modify the code
        full_prompt = f"""You are a code modification assistant. Given the following Python code and a user instruction, modify the code according to the instruction and return ONLY the modified code without any explanations or markdown formatting.

Current code:
```python
{code}
```

User instruction: {prompt}

Modified code (return ONLY the code, no explanations):"""

        print("\nFULL PROMPT SENT TO GOOGLE AI:")
        print("-"*80)
        print(full_prompt)
        print("-"*80)

        # Check cache first
        cached_response = cache.get(full_prompt, 'code_modification', current_model)
        cache_hit = False

        if cached_response:
            print("\n*** CACHE HIT - Using cached response ***\n")
            response_text = cached_response['response_text']
            cache_hit = True

            # Log cache hit
            logger.log_llm_call(
                operation_type='code_modification',
                prompt=full_prompt,
                response_text=response_text,
                tokens_sent=0,
                tokens_received=0,
                latency_ms=1,
                error=None,
                metadata={'model': current_model, 'cache_hit': True}
            )
        else:
            print("\n*** CACHE MISS - Calling LLM API ***\n")

            # Track observability metrics
            start_time = time.time()
            error_msg = None

            try:
                response = client.models.generate_content(
                    model=current_model,
                    contents=full_prompt
                )

                latency_ms = (time.time() - start_time) * 1000
                response_text = response.text

                print("\nRAW RESPONSE FROM GOOGLE AI:")
                print("-"*80)
                print(response_text)
                print("-"*80)

                # Estimate tokens (rough approximation: 1 token ≈ 4 characters)
                tokens_sent = len(full_prompt) // 4
                tokens_received = len(response_text) // 4

                # Cache the response
                cache.set(
                    full_prompt,
                    'code_modification',
                    response_text,
                    metadata={'model': current_model},
                    model=current_model
                )

                # Log the call
                logger.log_llm_call(
                    operation_type='code_modification',
                    prompt=full_prompt,
                    response_text=response_text,
                    tokens_sent=tokens_sent,
                    tokens_received=tokens_received,
                    latency_ms=latency_ms,
                    error=error_msg,
                    metadata={'model': current_model, 'cache_hit': False}
                )
            except Exception as e:
                latency_ms = (time.time() - start_time) * 1000
                error_msg = str(e)
                logger.log_llm_call(
                    operation_type='code_modification',
                    prompt=full_prompt,
                    response_text='',
                    tokens_sent=len(full_prompt) // 4,
                    tokens_received=0,
                    latency_ms=latency_ms,
                    error=error_msg,
                    metadata={'model': current_model}
                )
                raise

        modified_code = response_text.strip()

        # Remove markdown code blocks if present
        if modified_code.startswith('```python'):
            modified_code = modified_code.split('```python')[1].split('```')[0].strip()
        elif modified_code.startswith('```'):
            modified_code = modified_code.split('```')[1].split('```')[0].strip()

        print("\nFINAL PROCESSED CODE:")
        print("-"*80)
        print(modified_code)
        print("-"*80 + "\n")

        return jsonify({'success': True, 'code': modified_code, 'cache_hit': cache_hit})
    except Exception as e:
        print(f"\nERROR: {str(e)}\n")
        return jsonify({'success': False, 'error': str(e)})
