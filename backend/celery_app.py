"""
Celery application configuration
"""
import os
from celery import Celery

def make_celery():
    """Create and configure Celery app"""
    celery = Celery('video_analysis')
    
    # Configuration
    celery.conf.update(
        broker_url=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        result_backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        task_track_started=True,
        task_time_limit=1800,  # 30 minutes
        task_soft_time_limit=1500,  # 25 minutes
        worker_prefetch_multiplier=1,
        worker_max_tasks_per_child=50,
    )
    
    return celery

# Create Celery instance
celery_app = make_celery()
