# Distributed Cache (CDN-style) in C++

A simplified distributed caching system in modern C++ (C++17), modeling the
core mechanics behind real CDNs (Cloudflare, Akamai) and distributed caches
(Redis Cluster, Memcached).

## What it does

1. **Consistent hashing with virtual nodes** (`hash_ring.h`) routes each key
   to a specific cache node, and keeps ~1/N of keys stable when the cluster
   scales up/down (instead of near-total reshuffling with naive `hash % N`).
2. **Per-node LRU cache** (`cache_node.h`) with O(1) get/put and eviction,
   thread-safe via a per-node mutex.
3. **Simulated origin server** (`origin_server.h`) — the slow "true" backend,
   with artificial latency that increases under load (like a real DB/disk).
4. **Multi-threaded traffic simulator** (`simulator.h`) generates realistic
   "hot key" traffic (80% of requests hit a small popular set — like a
   trending video), fires it concurrently, and measures hit ratio, latency,
   and throughput.

## Build & Run

```bash
g++ -std=c++17 -O2 -pthread src/main.cpp -o cdn_benchmark
./cdn_benchmark
```

Results are printed to console and written to `results/benchmark.csv`.

## Sample Output (20,000 requests, 4 nodes, 8 threads)

```
Baseline: Origin-only (no cache)
  Avg latency: 51.3 ms | Throughput: 156 req/sec

Distributed Cache (LRU + Consistent Hashing)
  Hit ratio: 87.2% | Avg latency: 6.6 ms | Throughput: 1081 req/sec

Latency reduction vs. origin-only baseline: 87.2%

Key Redistribution on Scaling (4 -> 5 nodes)
  Consistent hashing: 19.4% of keys moved
  Naive hash % N:     79.2% of keys moved
```

(Numbers vary slightly by machine load and random seed changes, but the
shape of the result is consistent: ~85-90% hit ratio, ~80%+ latency
reduction, and consistent hashing moves close to the theoretical 1/N ≈ 20%
of keys on a 4→5 node scale-up, vs ~80% for naive modulo hashing.)

## Design notes / talking points for interviews

- **Why LRU?** Cheap to implement (O(1) via hashmap + linked list),
  and a reasonable proxy for "recently popular content" in a CDN context.
- **Why consistent hashing + virtual nodes?** Naive `hash(key) % N` remaps
  almost every key when N changes, causing a near-total cache wipe on
  scaling events. Virtual nodes (each physical node hashed to ~100+ points
  on the ring) also prevent uneven load from unlucky hash placement.
- **Why does miss latency stay ~51ms while hit latency is ~0.001ms?**
  A cache hit is just a hashmap lookup + list splice (microseconds). A miss
  pays the full simulated network/disk round-trip to origin.
- **Known simplification:** origin fetches on a miss are synchronous and not
  deduplicated — a production system would use request coalescing so that
  10 simultaneous misses for the same key trigger only 1 origin fetch
  ("thundering herd" protection). Good follow-up to mention if asked
  "what would you improve?".

## File structure

```
distributed-cache/
├── src/
│   ├── cache_node.h        # LRU cache (per node)
│   ├── hash_ring.h         # Consistent hashing ring
│   ├── origin_server.h     # Simulated slow backend
│   ├── distributed_cache.h # Ties everything together
│   ├── simulator.h         # Traffic generation + benchmarking
│   └── main.cpp            # Entry point, runs all experiments
└── results/
    └── benchmark.csv       # Output metrics (generated on run)
```
