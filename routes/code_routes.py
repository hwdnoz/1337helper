import io
import os
from contextlib import redirect_stdout
from flask import Blueprint, request, jsonify
from google import genai

code_bp = Blueprint('code', __name__)

# Configure Google AI
client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

@code_bp.route('/api/code', methods=['GET'])
def get_code():
    return jsonify({'code': open('two_sum.py').read()})

@code_bp.route('/api/run', methods=['POST'])
def run_code():
    code = request.json.get('code', '')
    stdout = io.StringIO()
    try:
        with redirect_stdout(stdout):
            exec(code, {'__name__': '__main__'})
        return jsonify({'success': True, 'stdout': stdout.getvalue()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@code_bp.route('/api/available-models', methods=['GET'])
def list_models():
    try:
        models = client.models.list()
        model_names = [model.name for model in models]
        return jsonify({'success': True, 'models': model_names})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
