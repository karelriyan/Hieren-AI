"""
FastAPI Server for Hieren AI RAG System
Production-Grade API with Error Handling
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Hieren AI API (Production)")

# Lazy import to prevent startup failures
_engine_module = None

def get_engine():
    """Lazy load engine module"""
    global _engine_module
    if _engine_module is None:
        try:
            from app import engine as _engine_module
            logger.info("RAG engine loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load RAG engine: {e}")
            raise
    return _engine_module


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    text: str
    user_id: str = "guest"


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Chat endpoint for RAG-powered responses

    Args:
        request: ChatRequest with text and optional user_id

    Returns:
        JSON response with RAG answer or error message
    """
    if not request.text:
        raise HTTPException(status_code=400, detail="Text kosong")

    try:
        engine = get_engine()
        result = engine.process_query(request.text)
        return {
            "response": result["response"],
            "citations": result.get("citations", []),
            "source": result.get("source", "rag"),
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal System Error: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint - returns 200 even if RAG engine not ready"""
    import os

    # Check if environment variables are set
    required_vars = [
        "GROQ_API_KEY",
        "PINECONE_API_KEY",
        "CLOUDFLARE_ACCOUNT_ID",
        "COHERE_API_KEY"
    ]

    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        logger.warning(f"Missing environment variables: {missing_vars}")
        return {
            "status": "degraded",
            "message": "Server running but some env vars missing",
            "missing": missing_vars
        }

    return {"status": "healthy", "message": "All systems operational"}
