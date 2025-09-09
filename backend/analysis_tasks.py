import os
import json
import traceback
from datetime import datetime
from celery import Celery
from video_analyzer import VideoAnalyzer
import redis

# Initialize Redis for job status tracking
redis_client = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))

# Initialize Celery
celery = Celery('video_analysis')
celery.conf.broker_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
celery.conf.result_backend = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

def update_job_status(job_id, state, progress=0, stage='', error=None):
    """Update job status in Redis"""
    status = {
        'job_id': job_id,
        'state': state,
        'progress': progress,
        'stage': stage,
        'timestamp': datetime.utcnow().isoformat()
    }
    if error:
        status['error'] = error
    
    redis_client.setex(f"job_status:{job_id}", 3600, json.dumps(status))  # Expire in 1 hour

def update_job_result(job_id, result):
    """Store job result in Redis"""
    redis_client.setex(f"job_result:{job_id}", 3600, json.dumps(result))  # Expire in 1 hour

@celery.task(bind=True)
def analyze_video(self, job_id, file_path):
    """Celery task to analyze video"""
    try:
        update_job_status(job_id, 'RUNNING', 0, 'Starting analysis...')
        
        # Initialize analyzer
        analyzer = VideoAnalyzer(file_path)
        
        # Stage 1: Extract metadata
        update_job_status(job_id, 'RUNNING', 10, 'Extracting metadata...')
        metadata = analyzer.extract_metadata()
        
        # Stage 2: Audio analysis
        update_job_status(job_id, 'RUNNING', 30, 'Analyzing audio...')
        audio_issues = analyzer.analyze_audio()
        
        # Stage 3: Video analysis
        update_job_status(job_id, 'RUNNING', 60, 'Analyzing video frames...')
        video_issues = analyzer.analyze_video()
        
        # Stage 4: Generate metrics
        update_job_status(job_id, 'RUNNING', 80, 'Computing metrics...')
        metrics = analyzer.compute_metrics()
        
        # Stage 5: Compile report
        update_job_status(job_id, 'RUNNING', 90, 'Compiling report...')
        
        # Create final result
        result = {
            'job_id': job_id,
            'filename': os.path.basename(file_path),
            'analysis_timestamp': datetime.utcnow().isoformat(),
            'metadata': metadata,
            'audio_issues': audio_issues,
            'video_issues': video_issues,
            'metrics': metrics,
            'summary': analyzer.generate_summary(audio_issues, video_issues, metrics)
        }
        
        # Store result
        update_job_result(job_id, result)
        update_job_status(job_id, 'DONE', 100, 'Analysis complete')
        
        # Cleanup uploaded file
        try:
            os.remove(file_path)
        except OSError:
            pass
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        traceback_msg = traceback.format_exc()
        update_job_status(job_id, 'ERROR', 0, 'Analysis failed', f"{error_msg}\n{traceback_msg}")
        
        # Cleanup uploaded file on error
        try:
            os.remove(file_path)
        except OSError:
            pass
        
        raise

def get_job_status(job_id):
    """Get job status from Redis"""
    status_json = redis_client.get(f"job_status:{job_id}")
    if status_json:
        return json.loads(status_json)
    return {'job_id': job_id, 'state': 'NOT_FOUND', 'progress': 0, 'stage': ''}

def get_job_result(job_id):
    """Get job result from Redis"""
    result_json = redis_client.get(f"job_result:{job_id}")
    if result_json:
        return json.loads(result_json)
    return None
