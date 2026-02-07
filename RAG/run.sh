#!/bin/bash
# Hieren AI Backend Startup Script

set -e

echo "🚀 Starting Hieren AI RAG Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Check for .env file
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Copying from .env.example..."
    cp .env.example .env.local
    echo "Please edit .env.local with your API keys"
    exit 1
fi

# Start server
echo "🔥 Starting FastAPI server on http://0.0.0.0:8000"
uvicorn app.server:app --host 0.0.0.0 --port 8000 --reload
