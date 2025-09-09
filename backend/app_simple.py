import os
import uuid
import json
import threading
from datetime import datetime
from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename
import tempfile
from video_analyzer import VideoAnalyzer
from report_generator import generate_markdown_report, generate_pdf_report

app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1GB max file size
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Allowed video extensions
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'mkv', 'avi', 'wmv', 'flv', 'webm', 'm4v'}

# Simple in-memory storage for demo (use database in production)
job_storage = {}
job_status = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def update_job_status(job_id, state, progress=0, stage='', error=None):
    """Update job status in memory"""
    status = {
        'job_id': job_id,
        'state': state,
        'progress': progress,
        'stage': stage,
        'timestamp': datetime.utcnow().isoformat()
    }
    if error:
        status['error'] = error
    
    job_status[job_id] = status

def analyze_video_sync(job_id, file_path):
    """Synchronous video analysis (runs in background thread)"""
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
        job_storage[job_id] = result
        update_job_status(job_id, 'DONE', 100, 'Analysis complete')
        
        # Cleanup uploaded file
        try:
            os.remove(file_path)
        except OSError:
            pass
        
    except Exception as e:
        error_msg = str(e)
        update_job_status(job_id, 'ERROR', 0, 'Analysis failed', error_msg)
        
        # Cleanup uploaded file on error
        try:
            os.remove(file_path)
        except OSError:
            pass

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/jobs', methods=['POST'])
def create_job():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: ' + ', '.join(ALLOWED_EXTENSIONS)}), 400
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Save uploaded file
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{job_id}_{filename}")
    file.save(file_path)
    
    # Start analysis in background thread
    thread = threading.Thread(target=analyze_video_sync, args=(job_id, file_path))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'job_id': job_id,
        'task_id': job_id,  # Same as job_id for simplicity
        'status': 'queued',
        'filename': filename
    }), 201

@app.route('/api/jobs/<job_id>/status', methods=['GET'])
def get_job_status(job_id):
    status = job_status.get(job_id)
    if not status:
        return jsonify({'job_id': job_id, 'state': 'NOT_FOUND', 'progress': 0, 'stage': ''}), 404
    return jsonify(status)

@app.route('/api/jobs/<job_id>/result', methods=['GET'])
def get_job_result(job_id):
    result = job_storage.get(job_id)
    if not result:
        return jsonify({'error': 'Job not found or not completed'}), 404
    return jsonify(result)

@app.route('/api/jobs/<job_id>/stream', methods=['GET'])
def stream_progress(job_id):
    def generate():
        import time
        while True:
            status = job_status.get(job_id)
            if status:
                yield f"data: {json.dumps(status)}\n\n"
                
                if status['state'] in ['DONE', 'ERROR']:
                    break
            else:
                yield f"data: {json.dumps({'job_id': job_id, 'state': 'NOT_FOUND', 'progress': 0, 'stage': ''})}\n\n"
                break
            
            time.sleep(1)
    
    return Response(generate(), mimetype='text/plain')

@app.route('/api/jobs/<job_id>/report.md', methods=['GET'])
def get_markdown_report(job_id):
    result = job_storage.get(job_id)
    if not result:
        return jsonify({'error': 'Report not found'}), 404
    
    # Generate markdown report
    md_content = f"""# Video QA Analysis Report

**Job ID:** {job_id}  
**Filename:** {result['filename']}  
**Analysis Date:** {result['analysis_timestamp']}  
**Status:** {result['summary']['status']}

## Executive Summary

{chr(10).join(f"- {point}" for point in result['summary']['points'])}

**Total Issues Found:** {result['summary']['total_issues']}  
**High Severity Issues:** {result['summary']['high_severity_issues']}

## Audio Issues

{len(result['audio_issues'])} issues found:

{chr(10).join(f"- **{issue['timestamp']}** ({issue['severity']}): {issue['description']}" for issue in result['audio_issues']) if result['audio_issues'] else "No audio issues detected."}

## Video Issues

{len(result['video_issues'])} issues found:

{chr(10).join(f"- **{issue['timestamp']}** ({issue['severity']}): {issue['description']}" for issue in result['video_issues']) if result['video_issues'] else "No video issues detected."}

## Technical Metrics

- **Duration:** {result['metadata'].get('duration', 'N/A')} seconds
- **Resolution:** {result['metrics'].get('resolution', 'N/A')}
- **Frame Rate:** {result['metadata'].get('fps', 'N/A')} FPS
- **File Size:** {result['metrics'].get('file_size_mb', 'N/A')} MB
- **Integrated LUFS:** {result['metrics'].get('integrated_lufs', 'N/A')}

---
*Report generated by AI Video QA System*
"""
    
    return Response(md_content, mimetype='text/markdown', 
                   headers={'Content-Disposition': f'attachment; filename="{job_id}_report.md"'})

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 1GB.'}), 413

if __name__ == '__main__':
    print("=" * 50)
    print("AI Video QA System - Simple Backend")
    print("=" * 50)
    print()
    print("Backend API: http://localhost:5000")
    print("Health Check: http://localhost:5000/api/health")
    print()
    print("Note: This is a simplified version without Redis/Celery")
    print("For production use, please use the full Docker setup")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)

