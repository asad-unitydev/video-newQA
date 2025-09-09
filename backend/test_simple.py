import os
import uuid
import json
from datetime import datetime
from flask import Flask, request, jsonify, Response, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import cv2
import numpy as np
from moviepy.editor import VideoFileClip
import librosa
from pydub import AudioSegment

app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1GB max file size
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Allowed video extensions
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'mkv', 'avi', 'wmv', 'flv', 'webm', 'm4v'}

# In-memory storage for demo
jobs = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def seconds_to_timestamp(seconds):
    """Convert seconds to HH:MM:SS.mmm format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"

def analyze_video_simple(file_path):
    """Enhanced video analysis with realistic issue detection"""
    try:
        # Initialize result structure
        result = {
            'metadata': {},
            'audio_issues': [],
            'video_issues': [],
            'metrics': {},
            'summary': {}
        }
        
        # Extract basic metadata using moviepy
        video = VideoFileClip(file_path)
        
        result['metadata'] = {
            'duration': video.duration,
            'fps': video.fps,
            'width': video.w,
            'height': video.h,
            'has_audio': video.audio is not None,
            'file_size': os.path.getsize(file_path),
            'video_codec': 'h264',  # Default assumption
            'audio_codec': 'aac' if video.audio else None,
            'sample_rate': int(video.audio.fps) if video.audio else None
        }
        
        # Enhanced video analysis
        frame_count = 0
        black_frame_count = 0
        frozen_frame_count = 0
        prev_frame = None
        
        # Sample every 2 seconds for better coverage (analyze full video)
        sample_interval = 2.0
        sample_times = np.arange(0, video.duration, sample_interval)
        
        for t in sample_times:
            try:
                frame = video.get_frame(t)
                gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
                mean_brightness = np.mean(gray)
                
                frame_count += 1
                
                # Black frame detection (more realistic threshold)
                if mean_brightness < 20:  # Lowered threshold for better detection
                    black_frame_count += 1
                    result['video_issues'].append({
                        'type': 'black_frame',
                        'timestamp': seconds_to_timestamp(t),
                        'duration': sample_interval,
                        'severity': 'high' if mean_brightness < 5 else 'medium',
                        'description': f'Dark/black frame detected (brightness: {mean_brightness:.1f}/255)',
                        'suggested_fix': 'Check for encoding issues or intentional black frames'
                    })
                
                # Frozen frame detection
                if prev_frame is not None:
                    # Calculate frame difference
                    frame_diff = cv2.absdiff(gray, prev_frame)
                    diff_mean = np.mean(frame_diff)
                    
                    if diff_mean < 2.0:  # Very similar frames
                        frozen_frame_count += 1
                        result['video_issues'].append({
                            'type': 'frozen_frame',
                            'timestamp': seconds_to_timestamp(t),
                            'duration': sample_interval,
                            'severity': 'medium',
                            'description': f'Potential frozen frame detected (difference: {diff_mean:.2f})',
                            'suggested_fix': 'Check for encoding or source material issues'
                        })
                
                # Low resolution detection
                if video.w < 720 or video.h < 480:
                    if frame_count == 1:  # Only add once
                        result['video_issues'].append({
                            'type': 'low_resolution',
                            'timestamp': '00:00:00.000',
                            'duration': video.duration,
                            'severity': 'medium',
                            'description': f'Low resolution video ({video.w}x{video.h})',
                            'suggested_fix': 'Consider using higher resolution source material'
                        })
                
                # Frame rate issues
                if video.fps < 24:
                    if frame_count == 1:  # Only add once
                        result['video_issues'].append({
                            'type': 'low_framerate',
                            'timestamp': '00:00:00.000',
                            'duration': video.duration,
                            'severity': 'low',
                            'description': f'Low frame rate detected ({video.fps} FPS)',
                            'suggested_fix': 'Consider using higher frame rate for smoother playback'
                        })
                
                prev_frame = gray.copy()
                
            except Exception as e:
                print(f"Error processing frame at {t}s: {e}")
                result['video_issues'].append({
                    'type': 'frame_analysis_error',
                    'timestamp': seconds_to_timestamp(t),
                    'duration': 0,
                    'severity': 'low',
                    'description': f'Frame analysis error: {str(e)}',
                    'suggested_fix': 'Frame may be corrupted or unsupported'
                })
        
        # Enhanced audio analysis if audio exists
        if video.audio:
            try:
                # Extract audio array
                audio_array = video.audio.to_soundarray()
                # Ensure we have a proper numpy array
                if not isinstance(audio_array, np.ndarray):
                    audio_array = np.array(audio_array)
                
                if len(audio_array.shape) > 1 and audio_array.shape[1] > 1:
                    # Multi-channel audio - convert to mono
                    audio_mono = np.mean(audio_array, axis=1)
                else:
                    # Already mono or flatten if needed
                    audio_mono = audio_array.flatten()
                
                sample_rate = video.audio.fps
                
                # Check for clipping (samples near ±1.0)
                clipped_samples = np.abs(audio_mono) >= 0.95  # More sensitive threshold
                if np.any(clipped_samples):
                    clip_percentage = np.sum(clipped_samples) / len(audio_mono) * 100
                    if clip_percentage > 0.01:  # Much more sensitive
                        result['audio_issues'].append({
                            'type': 'clipping',
                            'timestamp': '00:00:00.000',
                            'duration': video.duration,
                            'severity': 'high' if clip_percentage > 0.5 else 'medium',
                            'description': f'Audio clipping detected ({clip_percentage:.3f}% of samples)',
                            'suggested_fix': 'Reduce input gain or apply limiting before encoding'
                        })
                
                # Check for silence (very low amplitude)
                rms = np.sqrt(np.mean(audio_mono ** 2))
                if rms < 0.05:  # More realistic threshold
                    result['audio_issues'].append({
                        'type': 'low_volume',
                        'timestamp': '00:00:00.000',
                        'duration': video.duration,
                        'severity': 'medium',
                        'description': f'Audio levels very low (RMS: {rms:.4f})',
                        'suggested_fix': 'Increase audio levels or apply normalization'
                    })
                elif rms > 0.8:  # Very loud
                    result['audio_issues'].append({
                        'type': 'high_volume',
                        'timestamp': '00:00:00.000',
                        'duration': video.duration,
                        'severity': 'medium',
                        'description': f'Audio levels very high (RMS: {rms:.4f})',
                        'suggested_fix': 'Reduce audio levels to prevent distortion'
                    })
                
                # Check for DC offset
                dc_offset = np.mean(audio_mono)
                if abs(dc_offset) > 0.01:
                    result['audio_issues'].append({
                        'type': 'dc_offset',
                        'timestamp': '00:00:00.000',
                        'duration': video.duration,
                        'severity': 'low',
                        'description': f'DC offset detected ({dc_offset:.4f})',
                        'suggested_fix': 'Apply high-pass filter to remove DC component'
                    })
                
                # Check for mono audio in stereo file
                if len(audio_array.shape) > 1 and audio_array.shape[1] == 2:
                    left_channel = audio_array[:, 0]
                    right_channel = audio_array[:, 1]
                    correlation = np.corrcoef(left_channel, right_channel)[0, 1]
                    if correlation > 0.99:  # Essentially identical channels
                        result['audio_issues'].append({
                            'type': 'mono_in_stereo',
                            'timestamp': '00:00:00.000',
                            'duration': video.duration,
                            'severity': 'low',
                            'description': f'Mono audio in stereo file (correlation: {correlation:.3f})',
                            'suggested_fix': 'Convert to true mono or add stereo content'
                        })
                
                # Detect potential silence gaps
                # Find very quiet sections
                window_size = int(sample_rate * 0.5)  # 0.5 second windows
                for i in range(0, len(audio_mono) - window_size, window_size):
                    window = audio_mono[i:i + window_size]
                    window_rms = np.sqrt(np.mean(window ** 2))
                    
                    if window_rms < 0.001:  # Very quiet section
                        timestamp_sec = i / sample_rate
                        result['audio_issues'].append({
                            'type': 'silence',
                            'timestamp': seconds_to_timestamp(timestamp_sec),
                            'duration': 0.5,
                            'severity': 'low',
                            'description': f'Silent section detected (RMS: {window_rms:.6f})',
                            'suggested_fix': 'Check for unintended gaps in audio'
                        })
                
            except Exception as e:
                print(f"Error analyzing audio: {e}")
                result['audio_issues'].append({
                    'type': 'analysis_error',
                    'timestamp': '00:00:00.000',
                    'duration': 0,
                    'severity': 'low',
                    'description': f'Audio analysis failed: {str(e)}',
                    'suggested_fix': 'Check audio format compatibility'
                })
        else:
            # No audio track
            result['audio_issues'].append({
                'type': 'no_audio',
                'timestamp': '00:00:00.000',
                'duration': video.duration,
                'severity': 'medium',
                'description': 'No audio track detected in video file',
                'suggested_fix': 'Add audio track if audio is expected'
            })
        
        # Compute enhanced metrics
        result['metrics'] = {
            'duration_formatted': seconds_to_timestamp(video.duration),
            'fps': video.fps,
            'resolution': f"{video.w}x{video.h}",
            'aspect_ratio': round(video.w / video.h, 2),
            'file_size_mb': round(os.path.getsize(file_path) / (1024 * 1024), 2),
            'frames_analyzed': frame_count,
            'black_frames_detected': black_frame_count,
            'frozen_frames_detected': frozen_frame_count,
            'video_codec': result['metadata']['video_codec'],
            'audio_codec': result['metadata']['audio_codec'],
            'audio_sample_rate': result['metadata']['sample_rate'],
            'bitrate_estimate': round((os.path.getsize(file_path) * 8) / (video.duration * 1024), 2) if video.duration > 0 else 0  # kbps
        }
        
        # Generate enhanced summary
        total_issues = len(result['audio_issues']) + len(result['video_issues'])
        high_severity = len([i for i in result['audio_issues'] + result['video_issues'] if i['severity'] == 'high'])
        medium_severity = len([i for i in result['audio_issues'] + result['video_issues'] if i['severity'] == 'medium'])
        
        # More nuanced status determination
        if high_severity > 0:
            status = 'FAIL'
        elif medium_severity > 2 or total_issues > 5:
            status = 'WARNING'
        else:
            status = 'PASS'
        
        summary_points = []
        if total_issues == 0:
            summary_points.append("✅ No significant issues detected - video appears to be high quality")
        else:
            if result['audio_issues']:
                audio_types = [issue['type'] for issue in result['audio_issues']]
                unique_audio_types = list(set(audio_types))
                summary_points.append(f"🔊 Found {len(result['audio_issues'])} audio issues: {', '.join(unique_audio_types)}")
            
            if result['video_issues']:
                video_types = [issue['type'] for issue in result['video_issues']]
                unique_video_types = list(set(video_types))
                summary_points.append(f"🎬 Found {len(result['video_issues'])} video issues: {', '.join(unique_video_types)}")
            
            if high_severity > 0:
                summary_points.append(f"⚠️ {high_severity} high-severity issues require immediate attention")
            elif medium_severity > 0:
                summary_points.append(f"⚡ {medium_severity} medium-severity issues should be reviewed")
        
        # Technical summary
        duration_str = result['metrics']['duration_formatted']
        resolution = result['metrics']['resolution']
        fps = result['metrics']['fps']
        file_size = result['metrics']['file_size_mb']
        
        summary_points.append(f"📊 Technical: {duration_str}, {resolution} @ {fps}fps, {file_size}MB")
        
        # Quality assessment
        if video.w >= 1920 and video.h >= 1080:
            summary_points.append("✨ High definition video (1080p+)")
        elif video.w >= 1280 and video.h >= 720:
            summary_points.append("📺 Standard definition video (720p)")
        else:
            summary_points.append("📱 Low resolution video")
        
        result['summary'] = {
            'status': status,
            'total_issues': total_issues,
            'high_severity_issues': high_severity,
            'medium_severity_issues': medium_severity,
            'points': summary_points[:6]  # Limit to 6 points
        }
        
        video.close()
        return result
        
    except Exception as e:
        print(f"Analysis error: {e}")
        return {
            'metadata': {'error': str(e)},
            'audio_issues': [],
            'video_issues': [],
            'metrics': {},
            'summary': {
                'status': 'ERROR',
                'total_issues': 1,
                'high_severity_issues': 1,
                'points': [f'Analysis failed: {str(e)}']
            }
        }

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
    
    # Store job info
    jobs[job_id] = {
        'job_id': job_id,
        'filename': filename,
        'file_path': file_path,
        'status': 'RUNNING',
        'progress': 0,
        'stage': 'Starting analysis...',
        'timestamp': datetime.utcnow().isoformat()
    }
    
    try:
        # Simple analysis
        jobs[job_id].update({'progress': 20, 'stage': 'Extracting metadata...'})
        
        jobs[job_id].update({'progress': 50, 'stage': 'Analyzing video...'})
        analysis_result = analyze_video_simple(file_path)
        
        jobs[job_id].update({'progress': 90, 'stage': 'Compiling report...'})
        
        # Create final result
        result = {
            'job_id': job_id,
            'filename': filename,
            'analysis_timestamp': datetime.utcnow().isoformat(),
            **analysis_result
        }
        
        # Update job with video path for serving
        jobs[job_id].update({
            'status': 'DONE',
            'progress': 100,
            'stage': 'Analysis complete',
            'result': result,
            'video_path': file_path  # Keep path for video serving
        })
        
        # Don't delete the file - keep it for video playback
        # try:
        #     os.remove(file_path)
        # except OSError:
        #     pass
        
        return jsonify({
            'job_id': job_id,
            'task_id': job_id,
            'status': 'completed',
            'filename': filename
        }), 201
        
    except Exception as e:
        jobs[job_id].update({
            'status': 'ERROR',
            'progress': 0,
            'stage': 'Analysis failed',
            'error': str(e)
        })
        
        # Cleanup
        try:
            os.remove(file_path)
        except OSError:
            pass
        
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@app.route('/api/jobs/<job_id>/status', methods=['GET'])
def get_job_status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({'job_id': job_id, 'state': 'NOT_FOUND', 'progress': 0, 'stage': ''}), 404
    
    return jsonify({
        'job_id': job_id,
        'state': job['status'],
        'progress': job['progress'],
        'stage': job['stage'],
        'timestamp': job['timestamp']
    })

@app.route('/api/jobs/<job_id>/result', methods=['GET'])
def get_job_result(job_id):
    job = jobs.get(job_id)
    if not job or 'result' not in job:
        return jsonify({'error': 'Job not found or not completed'}), 404
    return jsonify(job['result'])

@app.route('/api/jobs/<job_id>/stream', methods=['GET'])
def stream_progress(job_id):
    def generate():
        job = jobs.get(job_id)
        if not job:
            yield f"data: {json.dumps({'job_id': job_id, 'state': 'NOT_FOUND', 'progress': 0, 'stage': ''})}\n\n"
            return
        
        status = {
            'job_id': job_id,
            'state': job['status'],
            'progress': job['progress'],
            'stage': job['stage'],
            'timestamp': job['timestamp']
        }
        yield f"data: {json.dumps(status)}\n\n"
    
    return Response(generate(), mimetype='text/event-stream', 
                   headers={'Cache-Control': 'no-cache', 'Connection': 'keep-alive'})

@app.route('/api/jobs/<job_id>/report.md', methods=['GET'])
def get_markdown_report(job_id):
    job = jobs.get(job_id)
    if not job or 'result' not in job:
        return jsonify({'error': 'Report not found'}), 404
    
    result = job['result']
    report = f"""# Video Quality Analysis Report

## Summary
**Status:** {result['summary']['status']}
**Total Issues:** {result['summary']['total_issues']}

### Key Points
"""
    for point in result['summary']['points']:
        report += f"- {point}\n"
    
    report += f"""
## Video Information
- **Filename:** {result['filename']}
- **Analysis Date:** {result['analysis_timestamp']}
- **Duration:** {result['metrics'].get('duration_formatted', 'Unknown')}
- **Resolution:** {result['metrics'].get('resolution', 'Unknown')}

## Issues Found
"""
    
    if result['audio_issues']:
        report += "### Audio Issues\n"
        for issue in result['audio_issues']:
            report += f"- **{issue['timestamp']}** - {issue['type']}: {issue['description']}\n"
    
    if result['video_issues']:
        report += "### Video Issues\n"
        for issue in result['video_issues']:
            report += f"- **{issue['timestamp']}** - {issue['type']}: {issue['description']}\n"
    
    if not result['audio_issues'] and not result['video_issues']:
        report += "No issues detected.\n"
    
    return Response(report, mimetype='text/markdown', 
                   headers={'Content-Disposition': f'attachment; filename="{job_id}_report.md"'})

@app.route('/api/jobs/<job_id>/video', methods=['GET'])
def get_video(job_id):
    """Serve the analyzed video file"""
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = jobs[job_id]
    if job['status'] != 'DONE':
        return jsonify({'error': 'Video not ready - analysis still in progress'}), 404
    
    video_path = job.get('video_path')
    if not video_path or not os.path.exists(video_path):
        return jsonify({'error': 'Video file not found'}), 404
    
    return send_file(video_path, as_attachment=False, mimetype='video/mp4')

if __name__ == '__main__':
    print("🎬 Starting AI Video QA System (Simplified Mode)")
    print("🔧 Backend API: http://localhost:5000")
    print("❤️  Health Check: http://localhost:5000/api/health")
    print("📊 Ready to analyze videos!")
    app.run(debug=True, host='0.0.0.0', port=5000)