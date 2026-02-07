# Hieren AI RAG Backend

Production-ready RAG (Retrieval-Augmented Generation) system for renewable energy technical queries.

## Architecture

- **LLM**: Groq (Llama 3.3-70b-versatile)
- **Embeddings**: Cloudflare (BGE-M3)
- **Vector Store**: Pinecone
- **Reranking**: Cohere
- **Web Search**: Tavily
- **API Framework**: FastAPI

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required:
- `GROQ_API_KEY` - LLM provider
- `CLOUDFLARE_ACCOUNT_ID` & `CLOUDFLARE_API_TOKEN` - Embeddings
- `PINECONE_API_KEY` & `PINECONE_INDEX_NAME` - Vector store
- `COHERE_API_KEY` - Reranking
- `TAVILY_API_KEY` - Web search

### 3. Build Index

Prepare your documents in a `data/` directory, then:

```bash
python -m app.builder
```

This will:
- Parse PDFs using LlamaParse
- Normalize technical units
- Create Pinecone index
- Upload embeddings

## Running the Server

```bash
uvicorn app.server:app --host 0.0.0.0 --port 8000 --reload
```

The server will be available at `http://localhost:8000`

### Health Check

```bash
curl http://localhost:8000/health
```

## API Endpoints

### POST /chat

Send a query to the RAG system.

**Request:**
```json
{
  "text": "Berapa tegangan Voc Inverter X?",
  "user_id": "optional_user_id"
}
```

**Response:**
```json
{
  "response": "Tegangan Voc Inverter X adalah 450V dengan...",
  "status": "success"
}
```

## Evaluation

Run the test suite before production deployment:

```bash
python -m eval.evaluate_rag
```

This evaluates:
- Accuracy (keyword matching against golden dataset)
- Latency
- Router classification
- Error handling

## Key Features

### 1. Chunk Overlap (20%)
Increased from 20 to 200 bytes overlap to prevent cutting technical specifications mid-sentence.

### 2. Semantic Routing
Uses LLM to classify queries into:
- **TECHNICAL**: Manuals, troubleshooting, calculations (RAG)
- **MARKET**: Prices, news, regulations, weather (Web search)
- **ACTION**: IoT commands (Mock MQTT)

### 3. Query Transformation
Converts vague user questions into technical terms before RAG:
- "listrik naik turun" → "voltage fluctuation"
- "sering error" → "recurring fault"

### 4. Resilience
- Tenacity retry logic for API failures (exponential backoff)
- Fallback responses for system errors
- Cohere reranking for better relevance

## Cost Awareness

Each user query calls:
- LLM 3x (Router, Transform, Answer)
- Cohere Rerank 1x
- Vector search via Pinecone

**Recommendation**: Implement Redis caching for identical queries within 24 hours.

## Vercel Deployment Notes

- Cannot use full BM25 hybrid search (storage limits)
- Compensates with Query Transformation + Cohere Reranking
- Sufficient for handling technical terminology variations

## Next Steps (Advanced)

1. **Self-RAG**: LLM self-evaluates answers, triggers re-search if poor quality
2. **Multimodal RAG**: Vision support for damage photo analysis
3. **Monitoring**: Integrate Sentry for error tracking
4. **Caching**: Add Redis for query deduplication
