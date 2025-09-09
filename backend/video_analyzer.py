import os
import numpy as np
import cv2
import librosa
import pyloudnorm as pyln
from pydub import AudioSegment
from moviepy.editor import VideoFileClip
import json
from datetime import timedelta

class VideoAnalyzer:
    def __init__(self, file_path):
        self.file_path = file_path
        self.video_clip = None
        self.audio_data = None
        self.sample_rate = None
        
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.video_clip:
            self.video_clip.close()
    
    def extract_metadata(self):
        """Extract basic video metadata"""
        try:
            self.video_clip = VideoFileClip(self.file_path)
            
            metadata = {
                'duration': self.video_clip.duration,
                'fps': self.video_clip.fps,
                'width': self.video_clip.w,
                'height': self.video_clip.h,
                'has_audio': self.video_clip.audio is not None,
                'file_size': os.path.getsize(self.file_path)
            }
            
            # Try to get codec info
            try:
                import ffmpeg
                probe = ffmpeg.probe(self.file_path)
                for stream in probe['streams']:
                    if stream['codec_type'] == 'video':
                        metadata['video_codec'] = stream.get('codec_name', 'unknown')
                    elif stream['codec_type'] == 'audio':
                        metadata['audio_codec'] = stream.get('codec_name', 'unknown')
                        metadata['sample_rate'] = int(stream.get('sample_rate', 0))
            except:
                metadata['video_codec'] = 'unknown'
                metadata['audio_codec'] = 'unknown'
                metadata['sample_rate'] = 44100
            
            return metadata
            
        except Exception as e:
            raise Exception(f"Failed to extract metadata: {str(e)}")
    
    def analyze_audio(self):
        """Analyze audio for issues"""
        if not self.video_clip or not self.video_clip.audio:
            return []
        
        issues = []
        
        try:
            # Extract audio using moviepy
            audio_clip = self.video_clip.audio
            audio_array = audio_clip.to_soundarray()
            
            if len(audio_array.shape) > 1:
                # Convert stereo to mono for analysis
                audio_mono = np.mean(audio_array, axis=1)
            else:
                audio_mono = audio_array
            
            self.sample_rate = audio_clip.fps
            self.audio_data = audio_mono
            
            # 1. Loudness analysis using pyloudnorm
            issues.extend(self._analyze_loudness(audio_mono, self.sample_rate))
            
            # 2. Clipping detection
            issues.extend(self._detect_clipping(audio_mono, self.sample_rate))
            
            # 3. Silence detection
            issues.extend(self._detect_silences(audio_mono, self.sample_rate))
            
            # 4. Voice glitch detection (heuristic)
            issues.extend(self._detect_voice_glitches(audio_mono, self.sample_rate))
            
        except Exception as e:
            issues.append({
                'type': 'audio_analysis_error',
                'timestamp': '00:00:00.000',
                'duration': 0,
                'severity': 'high',
                'description': f'Audio analysis failed: {str(e)}',
                'suggested_fix': 'Check audio format compatibility'
            })
        
        return sorted(issues, key=lambda x: self._timestamp_to_seconds(x['timestamp']))
    
    def analyze_video(self):
        """Analyze video for visual issues"""
        if not self.video_clip:
            return []
        
        issues = []
        
        try:
            # Sample frames for analysis (every 1 second)
            duration = self.video_clip.duration
            fps = self.video_clip.fps
            sample_interval = 1.0  # Sample every second
            
            prev_frame = None
            frozen_start = None
            frozen_duration = 0
            
            for t in np.arange(0, duration, sample_interval):
                try:
                    frame = self.video_clip.get_frame(t)
                    gray_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
                    
                    # 1. Black frame detection
                    mean_brightness = np.mean(gray_frame)
                    if mean_brightness < 8:  # Very dark frame
                        issues.append({
                            'type': 'black_frame',
                            'timestamp': self._seconds_to_timestamp(t),
                            'duration': sample_interval,
                            'severity': 'medium',
                            'description': f'Black frame detected (brightness: {mean_brightness:.1f}/255)',
                            'suggested_fix': 'Check for encoding issues or intentional black frames'
                        })
                    
                    # 2. Frozen frame detection
                    if prev_frame is not None:
                        # Calculate PSNR between consecutive frames
                        mse = np.mean((gray_frame - prev_frame) ** 2)
                        if mse == 0:
                            psnr = float('inf')
                        else:
                            psnr = 20 * np.log10(255.0 / np.sqrt(mse))
                        
                        if psnr > 45:  # Very similar frames
                            if frozen_start is None:
                                frozen_start = t - sample_interval
                            frozen_duration += sample_interval
                        else:
                            if frozen_start is not None and frozen_duration > 2:  # Frozen for >2 seconds
                                severity = 'high' if frozen_duration > 5 else 'medium'
                                issues.append({
                                    'type': 'frozen_frame',
                                    'timestamp': self._seconds_to_timestamp(frozen_start),
                                    'duration': frozen_duration,
                                    'severity': severity,
                                    'description': f'Frozen frames for {frozen_duration:.1f} seconds',
                                    'suggested_fix': 'Check encoding settings or source material'
                                })
                            frozen_start = None
                            frozen_duration = 0
                    
                    prev_frame = gray_frame
                    
                except Exception as frame_error:
                    issues.append({
                        'type': 'frame_analysis_error',
                        'timestamp': self._seconds_to_timestamp(t),
                        'duration': 0,
                        'severity': 'low',
                        'description': f'Frame analysis error at {self._seconds_to_timestamp(t)}: {str(frame_error)}',
                        'suggested_fix': 'Frame may be corrupted'
                    })
            
            # Handle final frozen frame sequence
            if frozen_start is not None and frozen_duration > 2:
                severity = 'high' if frozen_duration > 5 else 'medium'
                issues.append({
                    'type': 'frozen_frame',
                    'timestamp': self._seconds_to_timestamp(frozen_start),
                    'duration': frozen_duration,
                    'severity': severity,
                    'description': f'Frozen frames for {frozen_duration:.1f} seconds',
                    'suggested_fix': 'Check encoding settings or source material'
                })
                
        except Exception as e:
            issues.append({
                'type': 'video_analysis_error',
                'timestamp': '00:00:00.000',
                'duration': 0,
                'severity': 'high',
                'description': f'Video analysis failed: {str(e)}',
                'suggested_fix': 'Check video format compatibility'
            })
        
        return sorted(issues, key=lambda x: self._timestamp_to_seconds(x['timestamp']))
    
    def compute_metrics(self):
        """Compute various video metrics"""
        if not self.video_clip:
            return {}
        
        metrics = {
            'duration_formatted': self._seconds_to_timestamp(self.video_clip.duration),
            'fps': self.video_clip.fps,
            'resolution': f"{self.video_clip.w}x{self.video_clip.h}",
            'aspect_ratio': round(self.video_clip.w / self.video_clip.h, 2),
            'file_size_mb': round(os.path.getsize(self.file_path) / (1024 * 1024), 2)
        }
        
        if self.audio_data is not None and self.sample_rate:
            # Compute integrated LUFS
            try:
                meter = pyln.Meter(self.sample_rate)
                loudness = meter.integrated_loudness(self.audio_data)
                metrics['integrated_lufs'] = round(loudness, 2) if not np.isinf(loudness) else 'N/A'
            except:
                metrics['integrated_lufs'] = 'N/A'
            
            # Audio sample rate
            metrics['audio_sample_rate'] = self.sample_rate
            
            # Dynamic range approximation
            try:
                rms = np.sqrt(np.mean(self.audio_data ** 2))
                peak = np.max(np.abs(self.audio_data))
                if rms > 0:
                    dynamic_range = 20 * np.log10(peak / rms)
                    metrics['dynamic_range_db'] = round(dynamic_range, 2)
                else:
                    metrics['dynamic_range_db'] = 'N/A'
            except:
                metrics['dynamic_range_db'] = 'N/A'
        
        return metrics
    
    def generate_summary(self, audio_issues, video_issues, metrics):
        """Generate executive summary"""
        total_issues = len(audio_issues) + len(video_issues)
        high_severity = len([i for i in audio_issues + video_issues if i['severity'] == 'high'])
        
        # Determine overall status
        if high_severity > 0:
            status = 'FAIL'
        elif total_issues > 5:
            status = 'FAIL'
        else:
            status = 'PASS'
        
        # Generate bullet points
        summary_points = []
        
        if total_issues == 0:
            summary_points.append("No significant audio or visual issues detected")
        else:
            if audio_issues:
                audio_types = set(issue['type'] for issue in audio_issues)
                summary_points.append(f"Found {len(audio_issues)} audio issues: {', '.join(audio_types)}")
            
            if video_issues:
                video_types = set(issue['type'] for issue in video_issues)
                summary_points.append(f"Found {len(video_issues)} video issues: {', '.join(video_types)}")
            
            if high_severity > 0:
                summary_points.append(f"{high_severity} high-severity issues require immediate attention")
        
        # Add technical summary
        duration_str = metrics.get('duration_formatted', 'Unknown')
        resolution = metrics.get('resolution', 'Unknown')
        summary_points.append(f"Video: {duration_str} duration, {resolution} resolution")
        
        lufs = metrics.get('integrated_lufs', 'N/A')
        if lufs != 'N/A':
            if lufs < -28:
                summary_points.append(f"Audio levels too quiet ({lufs} LUFS)")
            elif lufs > -12:
                summary_points.append(f"Audio levels too loud ({lufs} LUFS)")
            else:
                summary_points.append(f"Audio levels acceptable ({lufs} LUFS)")
        
        return {
            'status': status,
            'total_issues': total_issues,
            'high_severity_issues': high_severity,
            'points': summary_points[:5]  # Limit to 5 points
        }
    
    def _analyze_loudness(self, audio_data, sample_rate):
        """Analyze audio loudness"""
        issues = []
        try:
            meter = pyln.Meter(sample_rate)
            loudness = meter.integrated_loudness(audio_data)
            
            if not np.isinf(loudness):
                if loudness < -28:
                    issues.append({
                        'type': 'low_loudness',
                        'timestamp': '00:00:00.000',
                        'duration': len(audio_data) / sample_rate,
                        'severity': 'medium',
                        'description': f'Audio too quiet: {loudness:.1f} LUFS (target: -28 to -12 LUFS)',
                        'suggested_fix': 'Increase audio levels or apply normalization'
                    })
                elif loudness > -12:
                    issues.append({
                        'type': 'high_loudness',
                        'timestamp': '00:00:00.000',
                        'duration': len(audio_data) / sample_rate,
                        'severity': 'medium',
                        'description': f'Audio too loud: {loudness:.1f} LUFS (target: -28 to -12 LUFS)',
                        'suggested_fix': 'Reduce audio levels to prevent distortion'
                    })
        except Exception as e:
            pass  # Skip loudness analysis if it fails
        
        return issues
    
    def _detect_clipping(self, audio_data, sample_rate):
        """Detect audio clipping"""
        issues = []
        clip_threshold = 0.99
        
        # Find samples near clipping
        clipped_samples = np.abs(audio_data) >= clip_threshold
        
        if np.any(clipped_samples):
            # Group consecutive clipped regions
            diff = np.diff(np.concatenate([[False], clipped_samples, [False]]).astype(int))
            starts = np.where(diff == 1)[0]
            ends = np.where(diff == -1)[0]
            
            for start, end in zip(starts, ends):
                duration = (end - start) / sample_rate
                timestamp = start / sample_rate
                
                issues.append({
                    'type': 'clipping',
                    'timestamp': self._seconds_to_timestamp(timestamp),
                    'duration': duration,
                    'severity': 'high',
                    'description': f'Audio clipping detected for {duration:.3f} seconds',
                    'suggested_fix': 'Reduce input gain or apply limiting'
                })
        
        return issues
    
    def _detect_silences(self, audio_data, sample_rate):
        """Detect long silences"""
        issues = []
        
        # Convert to dB
        audio_db = 20 * np.log10(np.abs(audio_data) + 1e-10)
        silence_threshold = -40  # dBFS
        min_silence_duration = 1.0  # seconds
        
        # Find silent samples
        silent_samples = audio_db < silence_threshold
        
        if np.any(silent_samples):
            # Group consecutive silent regions
            diff = np.diff(np.concatenate([[False], silent_samples, [False]]).astype(int))
            starts = np.where(diff == 1)[0]
            ends = np.where(diff == -1)[0]
            
            for start, end in zip(starts, ends):
                duration = (end - start) / sample_rate
                if duration >= min_silence_duration:
                    timestamp = start / sample_rate
                    severity = 'low' if duration < 3 else 'medium'
                    
                    issues.append({
                        'type': 'silence',
                        'timestamp': self._seconds_to_timestamp(timestamp),
                        'duration': duration,
                        'severity': severity,
                        'description': f'Silence detected for {duration:.1f} seconds',
                        'suggested_fix': 'Check for intentional silence or audio gaps'
                    })
        
        return issues
    
    def _detect_voice_glitches(self, audio_data, sample_rate):
        """Detect potential voice glitches using heuristics"""
        issues = []
        
        try:
            # Use librosa for zero-crossing rate analysis
            frame_length = int(0.025 * sample_rate)  # 25ms frames
            hop_length = int(0.010 * sample_rate)   # 10ms hop
            
            zcr = librosa.feature.zero_crossing_rate(audio_data, frame_length=frame_length, hop_length=hop_length)[0]
            rms = librosa.feature.rms(y=audio_data, frame_length=frame_length, hop_length=hop_length)[0]
            
            # Detect sudden spikes in zero-crossing rate with low RMS (potential glitches)
            zcr_threshold = np.percentile(zcr, 95)  # Top 5% of ZCR values
            rms_threshold = np.percentile(rms, 20)   # Bottom 20% of RMS values
            
            glitch_frames = (zcr > zcr_threshold) & (rms < rms_threshold)
            
            if np.any(glitch_frames):
                glitch_indices = np.where(glitch_frames)[0]
                
                # Group consecutive glitch frames
                groups = []
                current_group = [glitch_indices[0]]
                
                for i in range(1, len(glitch_indices)):
                    if glitch_indices[i] - glitch_indices[i-1] <= 2:  # Within 2 frames
                        current_group.append(glitch_indices[i])
                    else:
                        groups.append(current_group)
                        current_group = [glitch_indices[i]]
                groups.append(current_group)
                
                for group in groups:
                    start_frame = group[0]
                    end_frame = group[-1]
                    timestamp = start_frame * hop_length / sample_rate
                    duration = (end_frame - start_frame + 1) * hop_length / sample_rate
                    
                    if duration > 0.05:  # Only report glitches longer than 50ms
                        issues.append({
                            'type': 'voice_glitch',
                            'timestamp': self._seconds_to_timestamp(timestamp),
                            'duration': duration,
                            'severity': 'medium',
                            'description': f'Potential voice glitch detected ({duration:.3f} seconds)',
                            'suggested_fix': 'Check for audio artifacts or encoding issues'
                        })
        
        except Exception as e:
            pass  # Skip glitch detection if it fails
        
        return issues
    
    def _seconds_to_timestamp(self, seconds):
        """Convert seconds to HH:MM:SS.mmm format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"
    
    def _timestamp_to_seconds(self, timestamp):
        """Convert HH:MM:SS.mmm to seconds"""
        parts = timestamp.split(':')
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = float(parts[2])
        return hours * 3600 + minutes * 60 + seconds
