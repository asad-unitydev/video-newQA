# AI Video QA Web Application

A comprehensive video quality analysis system with a modern React frontend and Python Flask backend. Analyze uploaded videos for audio and visual issues including voice glitches, clipping, silences, black frames, and frozen frames using only free and open-source libraries.

## 🚀 Features

### Frontend (React + TypeScript)
- **Modern UI**: Built with React 18, TypeScript, TailwindCSS, and shadcn/ui components
- **Drag & Drop Upload**: Intuitive file upload with validation and progress tracking
- **Real-time Progress**: Live analysis updates via Server-Sent Events (SSE)
- **Interactive Video Player**: Timeline overlay with clickable issue markers
- **Comprehensive Results**: Tabbed interface with summary, audio issues, video issues, and metrics
- **Export Capabilities**: Download reports in Markdown, PDF, and JSON formats
- **Responsive Design**: Mobile-friendly with dark/light theme support
- **Accessibility**: ARIA labels, keyboard navigation, and adequate contrast

### Backend (Python Flask)
- **Video Analysis Engine**: Powered by moviepy, librosa, opencv-python, and pyloudnorm
- **Background Processing**: Celery + Redis for handling long-running analysis jobs
- **RESTful API**: Clean endpoints for job management and results retrieval
- **Report Generation**: Automated Markdown and PDF report creation
- **File Management**: Secure upload handling with automatic cleanup

### Analysis Capabilities

#### Audio Analysis
- **Loudness Analysis**: Integrated LUFS measurement with broadcast compliance checking
- **Clipping Detection**: Identifies audio samples near digital clipping (±1.0)
- **Silence Detection**: Finds gaps longer than 1 second below -40 dBFS
- **Voice Glitch Detection**: Heuristic detection using zero-crossing rate and RMS analysis

#### Video Analysis
- **Black Frame Detection**: Identifies frames with mean brightness below threshold
- **Frozen Frame Detection**: Uses PSNR comparison to detect static sequences
- **Technical Metrics**: Resolution, frame rate, codecs, file size analysis
- **Quality Assessment**: Overall quality scoring and recommendations

## 📋 Prerequisites

### System Requirements
- **Docker & Docker Compose** (recommended) OR
- **Python 3.11+** and **Node.js 18+** for manual setup
- **FFmpeg** (automatically included in Docker setup)

### Platform Support
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu 20.04+, CentOS 8+, etc.)

## 🐳 Quick Start with Docker (Recommended)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd video-qa-system
```

### 2. One-Command Setup
```bash
# Production deployment
docker-compose up -d

# Development mode (with hot reload)
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

### 4. Upload and Analyze
1. Navigate to http://localhost:3000
2. Drag and drop a video file (MP4, MOV, AVI, WebM, MKV)
3. Click "Start Analysis"
4. Monitor real-time progress
5. View comprehensive results with interactive timeline
6. Export reports in multiple formats

## 🔧 Manual Setup (Alternative)

### Backend Setup

1. **Install Python Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

2. **Install FFmpeg**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# macOS (with Homebrew)
brew install ffmpeg

# Windows (with Chocolatey)
choco install ffmpeg
```

3. **Start Redis**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally and start
redis-server
```

4. **Start Backend Services**
```bash
# Terminal 1: Flask API
python app.py

# Terminal 2: Celery Worker
celery -A analysis_tasks worker --loglevel=info
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Start Development Server**
```bash
npm run dev
```

3. **Build for Production**
```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
video-qa-system/
├── backend/                    # Python Flask backend
│   ├── app.py                 # Main Flask application
│   ├── analysis_tasks.py      # Celery tasks for video analysis
│   ├── video_analyzer.py      # Core analysis engine
│   ├── report_generator.py    # Report generation utilities
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile            # Backend container config
├── frontend/                  # React TypeScript frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── lib/             # Utilities and API client
│   │   └── store/           # Zustand state management
│   ├── package.json         # Node.js dependencies
│   └── Dockerfile          # Frontend container config
├── docker-compose.yml       # Production deployment
├── docker-compose.dev.yml   # Development environment
└── README.md               # This file
```

## 🔌 API Documentation

### Core Endpoints

#### Create Analysis Job
```http
POST /api/jobs
Content-Type: multipart/form-data

Body: video file (max 1GB)
Response: { job_id, task_id, status, filename }
```

#### Get Job Status
```http
GET /api/jobs/{job_id}/status
Response: { job_id, state, progress, stage, timestamp }
```

#### Get Analysis Results
```http
GET /api/jobs/{job_id}/result
Response: { job_id, filename, analysis_timestamp, metadata, audio_issues, video_issues, metrics, summary }
```

#### Stream Progress (SSE)
```http
GET /api/jobs/{job_id}/stream
Content-Type: text/plain
```

#### Download Reports
```http
GET /api/jobs/{job_id}/report.md    # Markdown report
GET /api/jobs/{job_id}/report.pdf   # PDF report
```

### Analysis Result Schema

```json
{
  "job_id": "uuid",
  "filename": "video.mp4",
  "analysis_timestamp": "2024-01-01T12:00:00Z",
  "metadata": {
    "duration": 120.5,
    "fps": 29.97,
    "width": 1920,
    "height": 1080,
    "has_audio": true,
    "file_size": 52428800,
    "video_codec": "h264",
    "audio_codec": "aac",
    "sample_rate": 48000
  },
  "audio_issues": [
    {
      "type": "clipping",
      "timestamp": "00:01:23.456",
      "duration": 0.123,
      "severity": "high",
      "description": "Audio clipping detected",
      "suggested_fix": "Reduce input gain"
    }
  ],
  "video_issues": [
    {
      "type": "black_frame",
      "timestamp": "00:02:15.789",
      "duration": 1.0,
      "severity": "medium",
      "description": "Black frame detected",
      "suggested_fix": "Check encoding settings"
    }
  ],
  "metrics": {
    "duration_formatted": "00:02:00.500",
    "fps": 29.97,
    "resolution": "1920x1080",
    "aspect_ratio": 1.78,
    "file_size_mb": 50.0,
    "integrated_lufs": -23.4,
    "audio_sample_rate": 48000,
    "dynamic_range_db": 12.3
  },
  "summary": {
    "status": "PASS",
    "total_issues": 2,
    "high_severity_issues": 1,
    "points": [
      "Found 1 audio issue: clipping",
      "Found 1 video issue: black_frame",
      "Audio levels acceptable (-23.4 LUFS)"
    ]
  }
}
```

## 🛠️ Development

### Environment Variables

Create `.env` files for configuration:

**Backend (.env)**
```env
REDIS_URL=redis://localhost:6379/0
FLASK_ENV=development
FLASK_DEBUG=True
```

### Running Tests
```bash
# Backend tests (when implemented)
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

### Code Quality
```bash
# Backend linting
cd backend
flake8 .
black .

# Frontend linting
cd frontend
npm run lint
```

## 🚀 Deployment

### Production Deployment
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale workers
docker-compose up -d --scale celery-worker=3

# Update services
docker-compose pull
docker-compose up -d
```

### Environment Configuration
- **Development**: Uses `docker-compose.dev.yml` with hot reload
- **Production**: Uses `docker-compose.yml` with optimized builds
- **Scaling**: Celery workers can be scaled based on load

## 📊 Monitoring

### Health Checks
- **Frontend**: http://localhost:3000 (should load the UI)
- **Backend**: http://localhost:5000/api/health
- **Redis**: `docker-compose exec redis redis-cli ping`
- **Celery**: `docker-compose exec celery-worker celery -A analysis_tasks inspect ping`

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f celery-worker
```

## 🔒 Security Considerations

- File upload size limited to 1GB
- Uploaded files are automatically cleaned up after processing
- Basic rate limiting implemented
- CORS configured for frontend-backend communication
- No user authentication (add if needed for production)

## 🐛 Troubleshooting

### Common Issues

1. **FFmpeg not found**
   - Ensure FFmpeg is installed and in PATH
   - Docker setup includes FFmpeg automatically

2. **Redis connection failed**
   - Check if Redis is running: `docker-compose ps redis`
   - Verify Redis URL in environment variables

3. **Video analysis fails**
   - Check video format compatibility
   - Ensure sufficient disk space
   - Check Celery worker logs: `docker-compose logs celery-worker`

4. **Frontend can't connect to backend**
   - Verify backend is running on port 5000
   - Check CORS configuration
   - Ensure proxy settings in `vite.config.ts`

### Performance Tuning

1. **Scale Celery Workers**
   ```bash
   docker-compose up -d --scale celery-worker=4
   ```

2. **Increase Worker Concurrency**
   ```yaml
   # In docker-compose.yml
   command: celery -A analysis_tasks worker --loglevel=info --concurrency=4
   ```

3. **Optimize Video Analysis**
   - Reduce frame sampling rate for faster analysis
   - Adjust quality thresholds based on requirements

## 📝 License

This project uses only free and open-source libraries:
- **Backend**: Flask, Celery, moviepy, librosa, opencv-python, pyloudnorm
- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Infrastructure**: Docker, Redis, Nginx

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit with clear messages: `git commit -m "Add feature"`
5. Push and create a Pull Request

## 📞 Support

For issues and questions:
1. Check this README for common solutions
2. Review the troubleshooting section
3. Check Docker logs for error details
4. Create an issue with detailed error information

---

**Built with ❤️ using only free and open-source technologies**
