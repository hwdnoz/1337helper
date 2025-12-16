import io
import os
import time
from contextlib import redirect_stdout
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types
from observability import logger

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Google AI
client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

@app.route('/api/code', methods=['GET'])
def get_code():
    return jsonify({'code': open('two_sum.py').read()})

@app.route('/api/run', methods=['POST'])
def run_code():
    code = request.json.get('code', '')
    stdout = io.StringIO()
    try:
        with redirect_stdout(stdout):
            exec(code, {'__name__': '__main__'})
        return jsonify({'success': True, 'stdout': stdout.getvalue()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/leetcode', methods=['POST'])
def solve_leetcode():
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

        # Track observability metrics
        start_time = time.time()
        error_msg = None

        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=fetch_prompt
            )

            latency_ms = (time.time() - start_time) * 1000

            print("\nRAW RESPONSE FROM GOOGLE AI:")
            print("-"*80)
            print(response.text)
            print("-"*80)

            # Estimate tokens
            tokens_sent = len(fetch_prompt) // 4
            tokens_received = len(response.text) // 4

            # Log the call
            logger.log_llm_call(
                operation_type='leetcode_solve',
                prompt=fetch_prompt,
                response_text=response.text,
                tokens_sent=tokens_sent,
                tokens_received=tokens_received,
                latency_ms=latency_ms,
                error=error_msg,
                metadata={'model': 'gemini-2.5-flash', 'problem_number': problem_number}
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
                metadata={'model': 'gemini-2.5-flash', 'problem_number': problem_number}
            )
            raise

        solution_code = response.text.strip()

        # Remove markdown code blocks if present
        if solution_code.startswith('```python'):
            solution_code = solution_code.split('```python')[1].split('```')[0].strip()
        elif solution_code.startswith('```'):
            solution_code = solution_code.split('```')[1].split('```')[0].strip()

        print("\nFINAL SOLUTION CODE:")
        print("-"*80)
        print(solution_code)
        print("-"*80 + "\n")

        return jsonify({'success': True, 'code': solution_code})
    except Exception as e:
        print(f"\nERROR: {str(e)}\n")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/generate-test-cases', methods=['POST'])
def generate_test_cases():
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

        # Track observability metrics
        start_time = time.time()
        error_msg = None

        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=test_prompt
            )

            latency_ms = (time.time() - start_time) * 1000

            print("\nRAW RESPONSE FROM GOOGLE AI:")
            print("-"*80)
            print(response.text)
            print("-"*80)

            # Estimate tokens
            tokens_sent = len(test_prompt) // 4
            tokens_received = len(response.text) // 4

            # Log the call
            logger.log_llm_call(
                operation_type='test_case_generation',
                prompt=test_prompt,
                response_text=response.text,
                tokens_sent=tokens_sent,
                tokens_received=tokens_received,
                latency_ms=latency_ms,
                error=error_msg,
                metadata={'model': 'gemini-2.5-flash'}
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
                metadata={'model': 'gemini-2.5-flash'}
            )
            raise

        test_cases = response.text.strip()

        # Remove markdown code blocks if present
        if test_cases.startswith('```python'):
            test_cases = test_cases.split('```python')[1].split('```')[0].strip()
        elif test_cases.startswith('```'):
            test_cases = test_cases.split('```')[1].split('```')[0].strip()

        print("\nFINAL TEST CASES:")
        print("-"*80)
        print(test_cases)
        print("-"*80 + "\n")

        return jsonify({'success': True, 'test_cases': test_cases})
    except Exception as e:
        print(f"\nERROR: {str(e)}\n")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/models', methods=['GET'])
def list_models():
    try:
        models = client.models.list()
        model_names = [model.name for model in models]
        return jsonify({'success': True, 'models': model_names})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/llm', methods=['POST'])
def llm_modify_code():
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

        # Track observability metrics
        start_time = time.time()
        error_msg = None

        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=full_prompt
            )

            latency_ms = (time.time() - start_time) * 1000

            print("\nRAW RESPONSE FROM GOOGLE AI:")
            print("-"*80)
            print(response.text)
            print("-"*80)

            # Estimate tokens (rough approximation: 1 token ≈ 4 characters)
            tokens_sent = len(full_prompt) // 4
            tokens_received = len(response.text) // 4

            # Log the call
            logger.log_llm_call(
                operation_type='code_modification',
                prompt=full_prompt,
                response_text=response.text,
                tokens_sent=tokens_sent,
                tokens_received=tokens_received,
                latency_ms=latency_ms,
                error=error_msg,
                metadata={'model': 'gemini-2.5-flash'}
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
                metadata={'model': 'gemini-2.5-flash'}
            )
            raise

        modified_code = response.text.strip()

        # Remove markdown code blocks if present
        if modified_code.startswith('```python'):
            modified_code = modified_code.split('```python')[1].split('```')[0].strip()
        elif modified_code.startswith('```'):
            modified_code = modified_code.split('```')[1].split('```')[0].strip()

        print("\nFINAL PROCESSED CODE:")
        print("-"*80)
        print(modified_code)
        print("-"*80 + "\n")

        return jsonify({'success': True, 'code': modified_code})
    except Exception as e:
        print(f"\nERROR: {str(e)}\n")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/observability/metrics', methods=['GET'])
def get_metrics():
    """Get recent LLM call metrics"""
    try:
        limit = request.args.get('limit', 100, type=int)
        metrics = logger.get_metrics(limit=limit)
        return jsonify({'success': True, 'metrics': metrics})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/observability/summary', methods=['GET'])
def get_summary():
    """Get summary statistics"""
    try:
        summary = logger.get_summary_stats()
        return jsonify({'success': True, 'summary': summary})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
