import os
import uuid
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from celery import Celery
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, origins=["*"])  # Allow all origins for free hosting

# Configuration optimized for free hosting
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # Reduced to 100MB for free hosting
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
app.config['CELERY_BROKER_URL'] = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
app.config['CELERY_RESULT_BACKEND'] = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize Celery with optimized settings for free hosting
celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max for free hosting
    task_soft_time_limit=240,  # 4 minutes soft limit
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=10,  # Restart worker after 10 tasks
)

# Allowed video extensions (reduced for free hosting)
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy', 
        'timestamp': datetime.utcnow().isoformat(),
        'mode': 'free-hosting'
    })

@app.route('/api/jobs', methods=['POST'])
def create_job():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: ' + ', '.join(ALLOWED_EXTENSIONS)}), 400
    
    # Check file size for free hosting
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size > app.config['MAX_CONTENT_LENGTH']:
        return jsonify({'error': 'File too large. Maximum size is 100MB for free hosting.'}), 413
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Save uploaded file
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{job_id}_{filename}")
    file.save(file_path)
    
    # Start analysis task
    from analysis_tasks import analyze_video
    task = analyze_video.delay(job_id, file_path)
    
    return jsonify({
        'job_id': job_id,
        'task_id': task.id,
        'status': 'queued',
        'filename': filename,
        'file_size_mb': round(file_size / (1024 * 1024), 2)
    }), 201

@app.route('/api/jobs/<job_id>/status', methods=['GET'])
def get_job_status(job_id):
    from analysis_tasks import get_job_status as get_status
    status = get_status(job_id)
    return jsonify(status)

@app.route('/api/jobs/<job_id>/result', methods=['GET'])
def get_job_result(job_id):
    from analysis_tasks import get_job_result as get_result
    result = get_result(job_id)
    if result is None:
        return jsonify({'error': 'Job not found or not completed'}), 404
    return jsonify(result)

@app.route('/api/jobs/<job_id>/stream', methods=['GET'])
def stream_progress(job_id):
    def generate():
        from analysis_tasks import get_job_status as get_status
        max_iterations = 300  # 5 minutes max for free hosting
        iteration = 0
        
        while iteration < max_iterations:
            status = get_status(job_id)
            yield f"data: {json.dumps(status)}\\n\\n"
            
            if status['state'] in ['DONE', 'ERROR']:
                break
            
            import time
            time.sleep(1)
            iteration += 1
        
        # Send final status if timed out
        if iteration >= max_iterations:
            yield f"data: {json.dumps({'state': 'ERROR', 'error': 'Timeout'})}\\n\\n"
    
    return Response(generate(), mimetype='text/plain')

@app.route('/api/jobs/<job_id>/report.md', methods=['GET'])
def get_markdown_report(job_id):
    from report_generator import generate_markdown_report
    report = generate_markdown_report(job_id)
    if report is None:
        return jsonify({'error': 'Report not found'}), 404
    
    return Response(report, mimetype='text/markdown', 
                   headers={'Content-Disposition': f'attachment; filename="{job_id}_report.md"'})

@app.route('/api/jobs/<job_id>/report.pdf', methods=['GET'])
def get_pdf_report(job_id):
    from report_generator import generate_pdf_report
    pdf_path = generate_pdf_report(job_id)
    if pdf_path is None:
        return jsonify({'error': 'Report not found'}), 404
    
    return send_file(pdf_path, as_attachment=True, download_name=f'{job_id}_report.pdf')

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 100MB for free hosting.'}), 413

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error. Free hosting limitations may apply.'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)