"""
The Brain 2.0: Advanced Query Engine
Features: LLM Router, Query Transformation, Resilience, Multi-source Retrieval
"""
import os
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.core.retrievers import QueryFusionRetriever
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.postprocessor.cohere_rerank import CohereRerank
from pinecone import Pinecone
from tavily import TavilyClient
from app.config import init_settings, robust_api_call

# Init Resources
llm, _ = init_settings()
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


@robust_api_call
def get_chat_engine():
    """Build Engine with Retry Logic"""
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    pinecone_index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
    vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
    index = VectorStoreIndex.from_vector_store(vector_store=vector_store)

    # Retrieval Strategy: Vector Search + Cohere Rerank
    # (Note: Full Hybrid BM25 is difficult on Vercel due to storage limits.
    # We compensate with strong Reranking and Query Transform)
    vector_retriever = index.as_retriever(similarity_top_k=15)  # Get more candidates

    cohere_rerank = CohereRerank(
        api_key=os.getenv("COHERE_API_KEY"),
        top_n=5  # Take top 5 for LLM context
    )

    query_engine = RetrieverQueryEngine.from_args(
        vector_retriever,
        node_postprocessors=[cohere_rerank],
        llm=llm
    )

    return query_engine


RAG_ENGINE = get_chat_engine()


def transform_query(query: str) -> str:
    """Transform vague user questions into technical RAG queries"""
    prompt = f"""
Kamu adalah ahli energi terbarukan. Tulis ulang pertanyaan user menjadi query pencarian
yang spesifik dan teknis untuk database manual alat.
Gunakan istilah baku (misal: "listrik naik turun" -> "voltage fluctuation").
User: "{query}"
Technical Query:"""

    # Call LLM (Fast)
    return llm.complete(prompt).text.strip().replace('"', '')


def semantic_router(query: str) -> str:
    """✅ FIXED: Use LLM for intent classification instead of keywords"""
    prompt = f"""
Classify the following query into exactly one category:
1. TECHNICAL: Manuals, troubleshooting, installation, calculations (e.g. "How to wire", "Error 501").
2. MARKET: Real-time prices, news, government regulations, weather.
3. ACTION: Direct commands to control devices (e.g. "Turn off", "Set limit").
Query: "{query}"
Category (Just one word):"""

    try:
        category = llm.complete(prompt).text.strip().upper()
        if "TECHNICAL" in category:
            return "TECHNICAL"
        if "MARKET" in category:
            return "MARKET"
        if "ACTION" in category:
            return "ACTION"
        return "TECHNICAL"  # Default safe fallback
    except:
        return "TECHNICAL"


def extract_citations(source_nodes) -> list:
    """Extract citation metadata from LlamaIndex source nodes"""
    citations = []
    seen = set()
    for node in source_nodes:
        meta = node.metadata or {}
        file_name = meta.get("file_name", "Unknown Document")
        page = meta.get("page_label") or meta.get("page_number")
        score = round(node.score, 3) if node.score else None
        # Deduplicate by file_name + page
        key = f"{file_name}:{page}"
        if key in seen:
            continue
        seen.add(key)
        citation = {"document": file_name, "relevance": score}
        if page:
            citation["page"] = str(page)
        citations.append(citation)
    return citations


def process_query(query: str) -> dict:
    """Main query processing pipeline. Returns dict with response and citations."""
    # 1. Routing
    route = semantic_router(query)
    print(f"🚦 Route: {route}")

    if route == "MARKET":
        try:
            results = tavily.search(query, search_depth="basic")['results']
            context = "\n".join([f"- {r['content']}" for r in results[:3]])
            answer = llm.complete(f"Jawab berdasarkan data web ini:\n{context}\n\nPertanyaan: {query}")
            web_sources = [{"document": r.get("title", r["url"]), "url": r["url"]} for r in results[:3]]
            return {"response": str(answer), "citations": web_sources, "source": "web"}
        except Exception as e:
            return {"response": f"Gagal akses data pasar: {str(e)}", "citations": [], "source": "error"}

    elif route == "ACTION":
        return {"response": "⚠️ [MOCK] Perintah IoT dikirim ke MQTT Broker.", "citations": [], "source": "action"}

    else:  # TECHNICAL
        # 2. Query Transformation (Improvement)
        refined_query = transform_query(query)
        print(f"🔍 Refined Query: {refined_query}")

        # 3. RAG Execution with Retry
        try:
            result = RAG_ENGINE.query(refined_query)
            citations = extract_citations(result.source_nodes) if result.source_nodes else []
            return {"response": str(result), "citations": citations, "source": "rag"}
        except Exception as e:
            print(f"❌ RAG Error: {e}")
            return {"response": "Maaf, sistem database sedang sibuk. Silakan coba sesaat lagi.", "citations": [], "source": "error"}
