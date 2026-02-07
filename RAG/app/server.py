"""
FastAPI Server for Hieren AI RAG System
Production-Grade API with Error Handling
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.engine import process_query

app = FastAPI(title="Hieren AI API (Production)")


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
        response = process_query(request.text)
        return {"response": str(response), "status": "success"}
    except Exception as e:
        # Log error to monitoring system (Sentry/etc) here
        raise HTTPException(status_code=500, detail="Internal System Error")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
