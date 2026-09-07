# Architecture

This project simulates a **Distributed Cache** commonly found in CDNs (like Cloudflare) and distributed caching systems (like Redis Cluster).

## Components

1. **[[Consistent_Hashing|Consistent Hashing]] (`hash_ring.h`)**:
   Routes each key to a specific cache node. Uses virtual nodes to keep key distribution stable when scaling.

2. **Per-node LRU cache (`cache_node.h`)**:
   Provides O(1) get/put and eviction. Thread-safe via a per-node mutex. Represents the local memory of a single edge server.

3. **Origin Server (`origin_server.h`)**:
   Simulates the slow "true" backend (database or disk). Adds artificial latency (~50-60ms) on cache misses to simulate real-world network trips.

4. **Traffic Simulator (`simulator.h`)**:
   Generates realistic Zipf-like "hot key" traffic where 80% of requests hit a small set of popular assets. Measures the [[Benchmark_Results|Hit Ratio and Latency]].
