# Benchmark Results

The simulation runs 20,000 requests distributed over 8 threads using an 80/20 Zipf-like distribution to mimic "hot content".

## Findings

* **Hit Ratio**: 87.2%
* **Latency Reduction vs Baseline**: 87.2% reduction.
* **Average Hit Latency**: ~0.003 ms (memory lookup).
* **Average Miss Latency**: ~62-63 ms (simulated network/disk IO to Origin).
* **Throughput**: ~905 req/sec (up from ~127 req/sec in baseline).

## Key Redistribution (Scaling 4 -> 5 Nodes)

Consistent hashing proves its worth over naive modulo hashing:
* **[[Consistent_Hashing|Consistent Hashing]]**: ~19.4% of keys moved.
* **Naive Hash % N**: ~79.2% of keys moved.
