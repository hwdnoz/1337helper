import os
from celery import Celery

# Get RabbitMQ credentials from environment
RABBITMQ_USER = os.getenv('RABBITMQ_USER', '1337helper')
RABBITMQ_PASS = os.getenv('RABBITMQ_PASS', '1337helper')

# Configure Celery
celery_app = Celery(
    'tasks',
    broker=os.getenv('CELERY_BROKER_URL', f'amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@localhost:5672//'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
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
