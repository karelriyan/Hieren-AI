# How to Use the RAG System - Complete Guide

## 🎯 Quick Overview

The RAG system allows you to:
1. Add PDF documents (manuals, guides, specifications)
2. Search and retrieve information from those documents
3. Get enhanced AI answers using the document context
4. Fall back to regular Groq if RAG is unavailable

## 📚 Step 1: Prepare Your Documents

### Where to Put Files
```
hieren-ai/
└── RAG/
    └── data/           ← PUT YOUR PDF FILES HERE
        ├── manual-1.pdf
        ├── manual-2.pdf
        ├── specs.pdf
        └── guide.pdf
```

### Creating the Data Directory
```bash
cd RAG
mkdir -p data
```

### Supported File Formats
✅ **PDF** - Full document parsing with text extraction
✅ **DOCX** - Word documents
✅ **XLSX** - Excel spreadsheets
✅ **CSV** - Data files
✅ **TXT** - Plain text files

### Where to Get Documents
- 📖 Inverter manuals
- ⚡ Solar panel specifications
- 🌊 Wind turbine documentation
- 📋 Installation guides
- 📊 Technical specifications
- 💡 Reference materials

## 🏗️ Step 2: Build the RAG Index

### Method 1: Using Python Script (Recommended)

```bash
cd RAG
python -m app.builder
```

**What it does:**
- ✅ Reads all PDFs from `data/` directory
- ✅ Extracts text using LlamaParse
- ✅ Normalizes technical units (Wp, kWh, etc.)
- ✅ Creates vector embeddings
- ✅ Uploads to Pinecone
- ✅ Creates searchable index

**Expected output:**
```
🚀 Starting Production Ingestion...
📦 Creating Index: hieren-ai-index
⚡ Parsing documents with LlamaParse...
☁️ Uploading documents...
✅ Ingestion Complete.
```

### Method 2: Using Makefile

```bash
cd RAG
make build-index
```

### Troubleshooting Build

**Error: "data directory not found"**
```bash
mkdir -p data
# Add your PDFs to data/
python -m app.builder
```

**Error: "Pinecone connection failed"**
```bash
# Check your API key in .env.local
cat RAG/.env.local | grep PINECONE
# Should have: PINECONE_API_KEY=xxx
```

**Error: "LlamaParse error"**
```bash
# Verify LlamaCloud API key
cat RAG/.env.local | grep LLAMA_CLOUD
# Make sure LLAMA_CLOUD_API_KEY is set
```

## 🚀 Step 3: Start the RAG Backend

### Terminal 1: Start RAG Server

```bash
cd RAG
pip install -r requirements.txt  # Only first time
uvicorn app.server:app --reload
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### Terminal 2: Start Next.js Frontend

```bash
npm run dev
```

**Expected output:**
```
> ready - started server on 0.0.0.0:3000
```

## 🔍 Step 4: Test the RAG System

### Option A: Test RAG Backend Directly

```bash
# Check if RAG is healthy
curl http://localhost:8000/health

# Should return:
# {"status": "healthy"}
```

### Option B: Test RAG Query

```bash
# Send a query to RAG backend
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Berapa tegangan Voc Inverter?",
    "user_id": "test_user"
  }'

# Should return answer from your documents
```

### Option C: Test RAG Integration from Frontend

```bash
# Check if frontend can reach RAG
curl http://localhost:3000/api/rag/health

# Should return:
# {"app": "healthy", "rag_backend": "connected", ...}
```

### Option D: Test RAG Proxy

```bash
# Forward query through Next.js
curl -X POST http://localhost:3000/api/rag/chat \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Berapa tegangan Voc?",
    "user_id": "test"
  }'
```

### Option E: Test Enhanced Chat Endpoint

```bash
# Use the enhanced chat (RAG + Groq)
curl -X POST http://localhost:3000/api/chat-rag \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Berapa tegangan Voc?"}
    ]
  }'

# Will stream response
```

## 💻 Step 5: Use RAG in Your Frontend

### Method 1: Use RAG Client Library

```typescript
// pages/chat.tsx or components/ChatComponent.tsx
import { queryRAG, hybridQuery, checkRAGHealth } from '@/lib/api/ragClient';

export default function ChatPage() {
  const [isRAGAvailable, setIsRAGAvailable] = useState(false);

  // Check RAG health on mount
  useEffect(() => {
    checkRAGHealth().then(setIsRAGAvailable);
  }, []);

  const handleSendMessage = async (userMessage: string) => {
    try {
      // Option 1: Try RAG first
      const result = await queryRAG({
        text: userMessage,
        user_id: userId
      });

      if (result.status === 'success') {
        displayAnswer(result.response);
      } else {
        // Fallback to Groq
        displayAnswer(result.response || 'Error occurred');
      }
    } catch (error) {
      console.error('RAG query failed:', error);
      // Fallback to regular chat
    }
  };

  const handleHybridQuery = async (userMessage: string) => {
    // Automatically tries RAG, falls back to Groq
    const result = await hybridQuery(userMessage, userId);
    displayAnswer(result.response);
  };

  return (
    <div>
      {isRAGAvailable && <span>✅ RAG Available</span>}
      {/* Chat UI */}
    </div>
  );
}
```

### Method 2: Direct API Call

```typescript
// Simple direct call
const response = await fetch('/api/rag/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: userQuestion,
    user_id: userId
  })
});

const data = await response.json();
setAnswer(data.response);
```

### Method 3: Use Enhanced Chat Endpoint

```typescript
// Use the enhanced chat that intelligently uses RAG
const response = await fetch('/api/chat-rag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [...conversationHistory],
    sessionId: currentSessionId
  })
});

// Handle streaming response
const reader = response.body?.getReader();
// ... handle stream
```

## 📊 Step 6: Monitor RAG Performance

### Check RAG Logs

**Terminal running RAG backend shows:**
```
🚦 Route: TECHNICAL
🔍 Refined Query: What is the open-circuit voltage specification?
15 candidates retrieved from Pinecone
Top 5 after Cohere reranking
✅ Response generated in 2.3 seconds
```

### Common Query Types

**Technical Query:**
```
User: "Berapa tegangan Voc Inverter X?"
→ Goes to RAG
→ Searches your documents
→ Returns technical answer
```

**Market Query:**
```
User: "Harga panel surya hari ini?"
→ Uses web search
→ Gets real-time prices
→ Returns market data
```

**General Query:**
```
User: "Apa itu energi terbarukan?"
→ Uses Groq directly
→ Returns general knowledge
→ No document search needed
```

## 🎯 Practical Examples

### Example 1: Add Manual and Query It

```bash
# 1. Create data directory
mkdir -p RAG/data

# 2. Copy your PDF manual
cp /path/to/inverter-manual.pdf RAG/data/

# 3. Build index
cd RAG
python -m app.builder
# Output: "✅ Ingestion Complete"

# 4. In another terminal, test
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Apa spesifikasi teknis dari manual ini?",
    "user_id": "user_123"
  }'

# 5. Get answer from your document
```

### Example 2: Add Multiple Documents

```bash
# Add documents
cd RAG/data
cp ~/documents/solar-panel-specs.pdf .
cp ~/documents/inverter-manual.pdf .
cp ~/documents/installation-guide.pdf .
cp ~/documents/troubleshooting.pdf .

# Build all at once
cd ..
python -m app.builder

# Now all documents are searchable
```

### Example 3: Update Documents

```bash
# 1. Delete old documents
rm RAG/data/old-manual.pdf

# 2. Add new ones
cp ~/new-manual.pdf RAG/data/

# 3. Rebuild index
cd RAG
python -m app.builder

# Old documents removed, new ones added
```

## 📋 Document Organization Tips

### Good Structure
```
RAG/data/
├── inverters/
│   ├── inverter-x-manual.pdf
│   └── inverter-y-specs.pdf
├── solar-panels/
│   ├── panel-specs.pdf
│   └── installation.pdf
└── guides/
    ├── troubleshooting.pdf
    └── faq.pdf
```

### Naming Convention
```
[DEVICE]-[TYPE]-[VERSION].pdf

Examples:
- inverter-x-manual-v2.pdf
- solar-panel-specs-2024.pdf
- installation-guide-basic.pdf
```

## 🧪 Testing the RAG System

### Run Evaluation Suite

```bash
cd RAG
python -m eval.evaluate_rag
```

**Output:**
```
🧪 Starting Evaluation...
Testing: Berapa tegangan Voc Inverter X?...
Testing: Harga panel surya 500Wp hari ini...
Testing: Kenapa inverter error 501?...

--- 📊 EVALUATION REPORT ---
Accuracy Score: 3/3 (100%)
Avg Latency: 3.45s
✅ PASS | Query 1 (2.1s)
✅ PASS | Query 2 (3.8s)
✅ PASS | Query 3 (4.2s)
```

### Custom Test Queries

Create `RAG/test_queries.txt`:
```
Berapa tegangan Voc dari manual?
Apa spesifikasi daya output?
Bagaimana cara instalasi?
Apa yang harus dilakukan jika error?
```

Then query each one:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "YOUR QUERY HERE", "user_id": "test"}'
```

## 🔧 Troubleshooting

### Problem: RAG Returns Generic Answer

**Cause:** Documents not indexed properly

**Solution:**
```bash
# Check Pinecone dashboard
# Verify index has documents
# Rebuild index
cd RAG
python -m app.builder
```

### Problem: Query Takes Too Long (>10s)

**Cause:** First query initializes engine

**Solution:**
- First query: 5-10 seconds (normal)
- Subsequent: 2-3 seconds
- Check logs for errors

### Problem: "Connection refused :8000"

**Cause:** RAG backend not running

**Solution:**
```bash
# Start RAG in new terminal
cd RAG
uvicorn app.server:app --reload
```

### Problem: Documents Not Found

**Cause:** Directory path wrong or files not there

**Solution:**
```bash
# Verify directory exists
ls -la RAG/data/

# Verify files are there
ls -la RAG/data/*.pdf

# Rebuild
python -m app.builder
```

## 📈 Performance Tips

### 1. Optimize Document Size
- Remove images if not needed
- Use PDF compression
- Keep file size < 10MB per file

### 2. Use Proper Naming
- Clear file names help the system understand context
- Example: `inverter-x-manual.pdf` not `doc1.pdf`

### 3. Chunk Overlap
- Already set to 20% (200 bytes)
- Prevents cutting technical specs
- No need to change

### 4. Build Index During Off-Hours
- Building index takes time (depends on document size)
- 10 documents: ~2-5 minutes
- Do this when not in use

## 📊 Monitoring Query Types

The RAG system logs what type of query it receives:

```bash
# Watch logs in RAG terminal
# You'll see:
🚦 Route: TECHNICAL      ← Will use RAG
🚦 Route: MARKET         ← Will use web search
🚦 Route: ACTION         ← Will use IoT
🚦 Route: GENERAL        ← Will use Groq only
```

## 🎯 Best Practices

✅ **DO:**
- Keep documents organized
- Name files descriptively
- Update documents regularly
- Monitor RAG health
- Test with real queries
- Check logs for errors

❌ **DON'T:**
- Leave RAG running with no documents
- Use extremely large PDFs (>50MB)
- Delete data folder while RAG is running
- Ignore error messages
- Run multiple builders simultaneously

## 📚 Document Best Practices

### Good Documents for RAG
- ✅ Technical manuals
- ✅ Specification sheets
- ✅ Installation guides
- ✅ Troubleshooting guides
- ✅ Reference materials
- ✅ FAQ documents

### Documents to Avoid
- ❌ Marketing materials
- ❌ News articles
- ❌ Social media content
- ❌ Unstructured blog posts
- ❌ Copyrighted textbooks

## 🚀 Production Deployment

### Prepare for Production

1. **Build final index locally**
   ```bash
   cd RAG
   python -m app.builder
   ```

2. **Export Pinecone data**
   - Pinecone handles persistence
   - Index persists across deployments
   - No need to rebuild

3. **Deploy both services**
   - Frontend to Vercel/Netlify
   - RAG to Railway/Render/Heroku

4. **Set environment variables**
   ```env
   RAG_BACKEND_URL=https://rag-api.production.com
   ```

5. **Monitor in production**
   - Check health regularly
   - Monitor query latency
   - Track accuracy metrics

## 📞 Quick Reference Commands

```bash
# Build index
cd RAG && python -m app.builder

# Start RAG backend
cd RAG && uvicorn app.server:app --reload

# Start Next.js frontend
npm run dev

# Check RAG health
curl http://localhost:8000/health

# Test RAG query
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "question", "user_id": "user"}'

# Check integration
curl http://localhost:3000/api/rag/health

# Run evaluation
cd RAG && python -m eval.evaluate_rag

# View RAG logs
# (shown in RAG terminal running uvicorn)
```

## 🎉 You're Ready!

You now know how to:
- ✅ Add documents to RAG
- ✅ Build the index
- ✅ Start the system
- ✅ Test queries
- ✅ Use RAG in your app
- ✅ Monitor performance
- ✅ Troubleshoot issues

**Next:** Start with your first PDF document and build the index! 🚀
