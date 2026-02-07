"""
Configuration Module for Hieren AI RAG System
Production-Ready Settings with Safety & Resilience
"""
import os
from dotenv import load_dotenv
from llama_index.llms.groq import Groq
from llama_index.embeddings.cloudflare import CloudflareEmbedding
from llama_index.core import Settings
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv()

# --- CONSTANTS ---
CHUNK_SIZE = 1024
CHUNK_OVERLAP = 200  # ✅ FIXED: Increased from 20 to 200 (20%) to prevent technical context cutoff


def init_settings():
    """Initialize Model with Safety Settings"""
    # 1. LLM: Groq (Llama 3)
    llm = Groq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.0,  # 0.0 Required for technical/safety responses
        max_tokens=2048
    )

    # 2. Embedding: Cloudflare (BGE-M3)
    embed_model = CloudflareEmbedding(
        model_name="@cf/baai/bge-m3",
        account_id=os.getenv("CLOUDFLARE_ACCOUNT_ID"),
        api_token=os.getenv("CLOUDFLARE_API_TOKEN")
    )

    # Global Settings
    Settings.llm = llm
    Settings.embed_model = embed_model
    Settings.chunk_size = CHUNK_SIZE
    Settings.chunk_overlap = CHUNK_OVERLAP

    return llm, embed_model


# --- RETRY DECORATOR (Resilience Pattern) ---
# Use this in engine functions to handle Pinecone/API timeouts
robust_api_call = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
