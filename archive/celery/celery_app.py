import os
from celery import Celery
from dotenv import load_dotenv

# Load .env from parent directory (project root)
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

# Get RabbitMQ connection details from environment
RABBITMQ_USER = os.environ['RABBITMQ_USER']
RABBITMQ_PASS = os.environ['RABBITMQ_PASS']
RABBITMQ_HOST = os.environ['RABBITMQ_HOST']
RABBITMQ_PORT = os.environ['RABBITMQ_PORT']
REDIS_HOST = os.environ['REDIS_HOST']
REDIS_PORT = os.environ['REDIS_PORT']
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', '')

# Configure Celery
# Build Redis URL - handle empty password case
if REDIS_PASSWORD:
    redis_url = f'redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0'
else:
    redis_url = f'redis://{REDIS_HOST}:{REDIS_PORT}/0'

celery_app = Celery(
    'tasks',
    broker=f'amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@{RABBITMQ_HOST}:{RABBITMQ_PORT}//',
    backend=redis_url,
    include=['tasks']  # Include tasks module
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes max
    result_persistent=True,  # Persist results
    result_expires=3600,  # Results expire after 1 hour
)
