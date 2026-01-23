import io
from contextlib import redirect_stdout
from flask import Blueprint, request, jsonify
from google import genai

code_bp = Blueprint('code', __name__)

@code_bp.route('/api/code', methods=['GET'])
def get_code():
    return jsonify({'code': open('default_problem.py').read()})

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
        # Extract API key from query params or headers
        api_key = request.args.get('google_api_key') or request.headers.get('X-Google-API-Key')

        if not api_key:
            return jsonify({'success': False, 'error': 'No Google API key provided'}), 400

        client = genai.Client(api_key=api_key)
        models = client.models.list()
        model_names = [model.name for model in models]
        return jsonify({'success': True, 'models': model_names})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
