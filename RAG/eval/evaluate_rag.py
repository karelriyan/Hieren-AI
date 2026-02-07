"""
Evaluation Suite for Hieren AI RAG System
Required before production deployment to ensure no hallucinations
"""
import asyncio
import time
from app.engine import process_query, transform_query


# Dataset Testing (Golden Dataset)
TEST_CASES = [
    {
        "query": "Berapa tegangan Voc Inverter X?",
        "expected_keywords": ["450V", "Voc", "Open Circuit"],
        "category": "TECHNICAL"
    },
    {
        "query": "Harga panel surya 500Wp hari ini",
        "expected_keywords": ["Rp", "Juta", "Ribuan"],
        "category": "MARKET"
    },
    {
        "query": "Kenapa inverter error 501?",
        "expected_keywords": ["Grounding", "Fault", "Kabel"],
        "category": "TECHNICAL"
    }
]


def run_evaluation():
    """Run evaluation suite on RAG system"""
    print("🧪 Starting Evaluation of Hieren AI RAG System...")
    results = []

    for test in TEST_CASES:
        print(f"\nTesting: {test['query']}...")

        # 1. Test Latency & Response
        start = time.time()
        response = str(process_query(test['query']))
        duration = time.time() - start

        # 2. Check Hit Rate (Simple Keyword Matching)
        # In production, use LLM-as-a-Judge for better evaluation
        hit = any(kw.lower() in response.lower() for kw in test['expected_keywords'])

        results.append({
            "query": test['query'],
            "hit": hit,
            "latency": duration,
            "response_snippet": response[:100] + "..."
        })

    # Report
    print("\n--- 📊 EVALUATION REPORT ---")
    total_score = sum(1 for r in results if r['hit'])
    avg_latency = sum(r['latency'] for r in results) / len(results)

    print(f"Accuracy Score: {total_score}/{len(results)} ({total_score/len(results):.0%})")
    print(f"Avg Latency: {avg_latency:.2f}s")

    for r in results:
        status = "✅ PASS" if r['hit'] else "❌ FAIL"
        print(f"{status} | {r['query']} ({r['latency']:.1f}s)")


if __name__ == "__main__":
    run_evaluation()
