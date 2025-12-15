import io
import os
from contextlib import redirect_stdout
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types

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

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt
        )

        print("\nRAW RESPONSE FROM GOOGLE AI:")
        print("-"*80)
        print(response.text)
        print("-"*80)

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

if __name__ == '__main__':
    app.run(debug=True, port=5001)
