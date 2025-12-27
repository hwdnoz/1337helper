import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3102)
