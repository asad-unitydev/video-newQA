#!/usr/bin/env python3
"""
Simple test server to verify Flask setup
"""
from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'message': 'AI Video QA Backend is running!'
    })

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'message': 'AI Video QA Backend API',
        'endpoints': [
            'GET /api/health - Health check',
            'POST /api/jobs - Create analysis job (not implemented in test mode)'
        ]
    })

if __name__ == '__main__':
    print("=" * 60)
    print("AI Video QA System - Test Server")
    print("=" * 60)
    print()
    print("🚀 Starting test server...")
    print("📍 Backend API: http://localhost:5000")
    print("🔍 Health Check: http://localhost:5000/api/health")
    print()
    print("✅ This is a basic test to verify Flask is working")
    print("⚠️  For full video analysis, install all dependencies")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    
    try:
        app.run(debug=True, host='0.0.0.0', port=5000)
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped. Goodbye!")

