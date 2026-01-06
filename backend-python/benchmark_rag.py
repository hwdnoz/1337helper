"""
RAG System Benchmark - Compare Current vs LlamaIndex

Run this before and after implementing LlamaIndex to measure improvements.
"""

import time
import json
import os
import shutil
from typing import List, Dict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from services.rag_service import rag_service
from benchmark_test_cases import TEST_CASES, doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8, doc9, doc10, doc11, doc12


def setup_test_documents():
    """Add test documents that expose chunking weaknesses"""

    current_docs = rag_service.get_documents(show_all=True)
    print(f"Documents in RAG before adding test docs: {len(current_docs)}")

    print("Adding test documents...")
    doc_ids = []
    for i, doc in enumerate([doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8, doc9, doc10, doc11, doc12], 1):
        doc_id = rag_service.add_document(doc)
        doc_ids.append(doc_id)
        print(f"  Added doc {i}/12 with ID: {doc_id}")

    print(f"\nAll test documents added successfully!")
    print(f"Total documents in RAG: {len(rag_service.get_documents(show_all=False))}")

    return {i: doc_id for i, doc_id in enumerate(doc_ids, 1)}


def measure_context_completeness(query: str, expected_keywords: List[str]) -> Dict:
    """
    Measure if retrieved context contains all necessary information
    Returns: dict with completeness score and details
    """
    retrieved = rag_service.retrieve(query, top_k=20, min_similarity=0.5)
    print(f"  [DEBUG] Retrieved {len(retrieved)} documents for completeness check")
    if retrieved:
        for i, doc in enumerate(retrieved):
            print(f"    Doc {i+1}: similarity={doc['similarity_score']:.3f}, preview={doc['content'][:60]}...")

    context = " ".join([doc['content'] for doc in retrieved])

    # Check which keywords were found
    found_keywords = [kw for kw in expected_keywords if kw.lower() in context.lower()]
    missing_keywords = [kw for kw in expected_keywords if kw.lower() not in context.lower()]

    found_count = len(found_keywords)
    score = found_count / len(expected_keywords) if expected_keywords else 0

    return {
        'completeness': score,
        'found_count': found_count,
        'expected_count': len(expected_keywords),
        'found_keywords': found_keywords,
        'missing_keywords': missing_keywords
    }


def measure_retrieval_precision_recall(query: str, relevant_doc_ids: List[int], k: int = 20) -> Dict:
    """
    Measure precision@k and chunk retrieval rate:
    - Precision: What percentage of retrieved chunks are from the expected document?
    - Chunk Retrieval Rate: Number of relevant chunks retrieved compared to total chunks in document.
      NOTE: This is NOT true recall. True recall requires knowing which specific chunks
      are relevant to the query. This metric simply measures how many chunks from the
      entire document were retrieved, regardless of whether they're all relevant to the query.
    Returns dict with both metrics and metadata
    """
    retrieved = rag_service.retrieve(query, top_k=k, min_similarity=0.5)

    # Get total count of chunks belonging to expected parent documents
    total_relevant_chunks = 0
    for parent_id in relevant_doc_ids:
        # Query ChromaDB to count chunks with this parent_id
        result = rag_service.collection.get(
            where={"parent_id": parent_id},
            include=['metadatas']
        )
        total_relevant_chunks += len(result['ids']) if result['ids'] else 0

        # Also check if the parent document itself exists (chunk_index = -1)
        parent_result = rag_service.collection.get(
            ids=[str(parent_id)],
            include=['metadatas']
        )
        if parent_result['ids']:
            total_relevant_chunks += 1

    print(f"  [DEBUG] Expected parent doc IDs: {relevant_doc_ids}")
    print(f"  [DEBUG] Total relevant chunks in DB: {total_relevant_chunks}")
    print(f"  [DEBUG] Retrieved chunks:")

    relevant_count = 0
    retrieved_chunks = []

    for doc in retrieved:
        chunk_id = doc['id']
        parent_id = doc.get('metadata', {}).get('parent_id')

        chunk_info = {
            'chunk_id': chunk_id,
            'parent_id': parent_id,
            'is_relevant': False
        }

        if chunk_id in relevant_doc_ids or parent_id in relevant_doc_ids:
            relevant_count += 1
            chunk_info['is_relevant'] = True
            print(f"  [DEBUG]   ✓ Chunk {chunk_id} (parent: {parent_id}) matches expected")
        else:
            print(f"  [DEBUG]   ✗ Chunk {chunk_id} (parent: {parent_id}) does NOT match")

        retrieved_chunks.append(chunk_info)

    precision = relevant_count / len(retrieved_chunks) if len(retrieved_chunks) > 0 else 0
    chunk_retrieval_rate = relevant_count / total_relevant_chunks if total_relevant_chunks > 0 else 0

    print(f"  [DEBUG] ")
    print(f"  [DEBUG] Expected parent IDs: {relevant_doc_ids}")
    print(f"  [DEBUG] Retrieved chunk breakdown:")
    for chunk in retrieved_chunks:
        match_symbol = "✓" if chunk['is_relevant'] else "✗"
        print(f"  [DEBUG]   {match_symbol} Chunk {chunk['chunk_id']} → parent {chunk['parent_id']} {'MATCHES' if chunk['is_relevant'] else 'no match'}")
    print(f"  [DEBUG] ")
    print(f"  [DEBUG] Precision: {precision:.1%} ({relevant_count}/{k} retrieved are from expected document)")
    print(f"  [DEBUG] Chunk Retrieval Rate: {chunk_retrieval_rate:.1%} ({relevant_count}/{total_relevant_chunks} of document's chunks retrieved)")

    return {
        'precision': precision,
        'chunk_retrieval_rate': chunk_retrieval_rate,
        'relevant_retrieved': relevant_count,
        'total_retrieved': len(retrieved),
        'total_document_chunks': total_relevant_chunks,
        'expected_docs': len(relevant_doc_ids),
        'retrieved_chunks': retrieved_chunks,
        'expected_parent_ids': relevant_doc_ids
    }


def measure_avg_similarity_score(query: str) -> float:
    """
    Measure average similarity of retrieved chunks
    Higher = more confident matches
    """
    retrieved = rag_service.retrieve(query, top_k=20, min_similarity=0.5)

    if not retrieved:
        return 0.0

    avg_sim = sum(doc['similarity_score'] for doc in retrieved) / len(retrieved)
    return avg_sim


def measure_retrieval_latency(queries: List[str]) -> float:
    """
    Measure average retrieval time in milliseconds
    """
    start = time.time()

    for query in queries:
        rag_service.retrieve(query, top_k=20)

    elapsed = (time.time() - start) * 1000  # convert to ms
    avg_latency = elapsed / len(queries) if queries else 0

    return avg_latency


def run_benchmark():
    """
    Run complete benchmark suite
    """
    print("=" * 80)
    print("RAG SYSTEM BENCHMARK")
    print("=" * 80)
    print()

    print("Setting up test documents...")
    id_mapping = setup_test_documents()
    print()

    results = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "test_cases": [],
        "summary": {}
    }

    print("Running test cases...")
    print("-" * 80)

    completeness_scores = []
    precision_scores = []
    chunk_retrieval_scores = []
    similarity_scores = []

    for i, test in enumerate(TEST_CASES, 1):
        print(f"\n[{i}/{len(TEST_CASES)}] {test['name']}")
        print(f"Description: {test['description']}")
        print(f"Query: {test['query']}")

        completeness_result = measure_context_completeness(
            test['query'],
            test['expected_keywords']
        )
        completeness_scores.append(completeness_result['completeness'])

        # Map the test's expected doc IDs to actual RAG doc IDs
        actual_relevant_ids = [id_mapping[doc_id] for doc_id in test['relevant_doc_ids']]
        precision_recall_result = measure_retrieval_precision_recall(
            test['query'],
            actual_relevant_ids
        )
        precision_scores.append(precision_recall_result['precision'])
        chunk_retrieval_scores.append(precision_recall_result['chunk_retrieval_rate'])

        avg_sim = measure_avg_similarity_score(test['query'])
        similarity_scores.append(avg_sim)

        results["test_cases"].append({
            "name": test['name'],
            "query": test['query'],
            "completeness": completeness_result['completeness'],
            "completeness_details": {
                "found_count": completeness_result['found_count'],
                "expected_count": completeness_result['expected_count'],
                "found_keywords": completeness_result['found_keywords'],
                "missing_keywords": completeness_result['missing_keywords']
            },
            "precision": precision_recall_result['precision'],
            "chunk_retrieval_rate": precision_recall_result['chunk_retrieval_rate'],
            "precision_recall_details": {
                "relevant_retrieved": precision_recall_result['relevant_retrieved'],
                "total_retrieved": precision_recall_result['total_retrieved'],
                "total_document_chunks": precision_recall_result['total_document_chunks'],
                "expected_docs": precision_recall_result['expected_docs'],
                "retrieved_chunks": precision_recall_result['retrieved_chunks'],
                "expected_parent_ids": precision_recall_result['expected_parent_ids']
            },
            "avg_similarity": avg_sim
        })

    print("\nMeasuring retrieval latency...")
    queries = [test['query'] for test in TEST_CASES]
    avg_latency = measure_retrieval_latency(queries * 5)  # Run 5x for stable measurement

    results["summary"] = {
        "avg_completeness": sum(completeness_scores) / len(completeness_scores),
        "avg_precision": sum(precision_scores) / len(precision_scores),
        "avg_chunk_retrieval_rate": sum(chunk_retrieval_scores) / len(chunk_retrieval_scores),
        "avg_similarity": sum(similarity_scores) / len(similarity_scores),
        "avg_latency_ms": avg_latency
    }

    print("\n" + "=" * 80)
    print("DETAILED RESULTS BY TEST CASE")
    print("=" * 80)
    for i, test_result in enumerate(results['test_cases'], 1):
        print(f"\n[{i}] {test_result['name']}")
        print(f"    Query: {test_result['query']}")
        print(f"    Context Completeness: {test_result['completeness']:.1%}")
        print(f"    Precision@3: {test_result['precision']:.1%}")
        print(f"    Chunk Retrieval Rate: {test_result['chunk_retrieval_rate']:.1%}")
        print(f"    Avg Similarity: {test_result['avg_similarity']:.3f}")

    print("\n" + "=" * 80)
    print("SUMMARY RESULTS")
    print("=" * 80)
    print(f"Average Context Completeness: {results['summary']['avg_completeness']:.1%}")
    print(f"Average Precision@3: {results['summary']['avg_precision']:.1%}")
    print(f"Average Chunk Retrieval Rate: {results['summary']['avg_chunk_retrieval_rate']:.1%}")
    print(f"Average Similarity Score: {results['summary']['avg_similarity']:.3f}")
    print(f"Average Retrieval Latency: {results['summary']['avg_latency_ms']:.2f}ms")
    print()

    timestamp = time.strftime('%Y%m%d_%H%M%S')

    # Create benchmark_results directory in data volume if it doesn't exist
    os.makedirs("data/benchmark_results", exist_ok=True)

    # Save results to data volume (visible on host)
    results_file = f"data/benchmark_results/benchmark_results_{timestamp}.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Results saved to: {results_file}")

    print("=" * 80)
    print("\nFULL RESULTS JSON:")
    print(json.dumps(results, indent=2))
    print("=" * 80)

    return results


if __name__ == "__main__":
    run_benchmark()
