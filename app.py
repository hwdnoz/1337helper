import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Google AI
client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

# Current model (can be changed dynamically)
current_model = 'gemini-2.5-flash'

# Import and register blueprints
from routes import llm_bp, admin_bp, cache_bp, code_bp

app.register_blueprint(llm_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(cache_bp)
app.register_blueprint(code_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
