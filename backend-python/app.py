import os
import sys
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv


if not load_dotenv():
    print(
        "Missing .env. Create backend-python/.env with GOOGLE_API_KEY "
        "(or export GOOGLE_API_KEY in your shell)."
    )
    sys.exit(1)
if not os.getenv('GOOGLE_API_KEY'):
    print(
        "Missing GOOGLE_API_KEY. Add it to backend-python/.env "
        "(or export GOOGLE_API_KEY in your shell)."
    )
    sys.exit(1)

app = Flask(__name__)
CORS(app)

# Import and register blueprints
from routes import admin_bp, cache_bp, code_bp, jobs_bp

app.register_blueprint(admin_bp)
app.register_blueprint(cache_bp)
app.register_blueprint(code_bp)
app.register_blueprint(jobs_bp)

@app.route('/health')
def health():
    return {'status': 'healthy'}, 200

@app.route('/type')
def type_endpoint():
    return {'type': 'python'}, 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3102)
