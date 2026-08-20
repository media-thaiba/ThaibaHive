# Hybrid RAG Retrieval Engine Guide

## Architecture
The Hybrid RAG engine fuses dense vector semantic similarity with sparse lexical BM25 Okapi keyword search.

### Formula & Fusion
Reciprocal Rank Fusion (RRF):
\[
\text{RRF}(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}
\]
where $k = 60$.

Top candidate chunks undergo semantic re-ranking via `cross-reranker.ts` before passing to LLM context synthesis.
