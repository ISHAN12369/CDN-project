# ⚡ Distributed CDN & High-Performance C++ Cache Simulation Engine

[![C++17](https://img.shields.io/badge/C%2B%2B-17-00599C?logo=c%2B%2B)](https://en.cppreference.com/w/cpp/17)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite)](https://vitejs.dev/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-2ea44f?logo=github)](https://ishan12369.github.io/CDN-project/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An end-to-end, multi-threaded **Content Delivery Network (CDN) & Distributed Caching System** modeled after real-world production architectures (e.g., Cloudflare, Akamai, Memcached, Redis Cluster). 

The system pairs a **high-throughput C++17 core engine** (LRU caching, consistent hashing ring, Zipfian traffic simulator) with a modern **interactive telemetry and comparison dashboard**.

---

## 📑 Table of Contents

- [Overview & Key Metrics](#-overview--key-metrics)
- [System Architecture](#-system-architecture)
- [Empirical Benchmark Results](#-empirical-benchmark-results)
- [Without CDN vs. With CDN Comparison](#-without-cdn-vs-with-cdn-comparison)
- [Interactive Dashboard Features](#-interactive-dashboard-features)
- [Project Directory Structure](#-project-directory-structure)
- [Quick Start & Setup](#-quick-start--setup)
- [System Design & Technical Deep-Dive](#-system-design--technical-deep-dive)
- [License](#-license)

---

## 🚀 Overview & Key Metrics

When serving high-traffic web assets (e.g., trending videos, images, API payloads), querying a centralized origin server introduces massive database queueing latency, thread contention, and risk of catastrophic collapse under load.

This project implements a multi-node edge caching tier that intercepts incoming requests, routes them via a **consistent hashing ring with virtual nodes**, and serves them from local **O(1) in-memory LRU caches**.

### 🌟 Headline Benchmark Results (20,000 Concurrent Requests)

| Metric | Without CDN (Origin Only) | With Distributed CDN | Performance Delta |
| :--- | :--- | :--- | :--- |
| **Average Response Latency** | `63.21 ms` | `8.08 ms` | **⚡ 87.2% Reduction (7.8x Faster)** |
| **Cache Hit Latency (RAM)** | *N/A (0% hits)* | `0.001 ms` | **⚡ Sub-microsecond edge response** |
| **Cache Miss Latency** | `63.21 ms` | `63.25 ms` | Pays origin cost only on cold miss |
| **Throughput (Capacity)** | `126.5 req/sec` | `893.2 req/sec` | **🚀 +706% Throughput (+7.1x traffic)** |
| **Cache Hit Ratio** | `0.0%` (All miss) | `87.2%` (17,446 hits) | **87.2% absorbed by edge RAM** |
| **Origin Backend Load** | `20,000` fetches (100%) | `2,554` fetches (12.8%) | **🛡️ 87.3% origin traffic shielded** |
| **Cluster Scaling Invalidation** | `79.2%` keys lost (`% N`) | `19.4%` keys moved | **4x fewer cache invalidations** |

---

## 🏗️ System Architecture

```
[ Client Requests (Concurrent Threads) ]
                  │
                  ▼
   ┌──────────────────────────────┐
   │ Consistent Hash Ring         │
   │ (Virtual Nodes: 100/node)    │  ─── Routes key: "video_42" -> Node-2
   └──────────────┬───────────────┘
                  │
                  ▼
   ┌──────────────────────────────┐
   │ Edge Node Cluster (0 .. 3)   │
   │ Thread-Safe O(1) LRU Cache   │
   └──────────────┬───────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    (Cache HIT)       (Cache MISS)
   [ 0.001 ms RAM ]        │
   Instant Return          ▼
              ┌──────────────────────────────┐
              │ Origin Server                │
              │ (Simulated DB / Disk Latency)│
              │ 50ms + Concurrency Queue Pen.│
              └──────────────┬───────────────┘
                             │
                      Populates LRU Cache
                             │
                      Returns to Client
```

### Core Components (`files/`)

1. **Consistent Hashing Ring (`hash_ring.h`)**:
   - Resolves keys across $N$ physical nodes via a sorted token ring (`std::map<uint32_t, string>`).
   - Employs **100 virtual nodes per physical cache node** to guarantee smooth, uniform distribution without clustering or hotspot skew.
   - Implements $O(\log M)$ binary lookup using `std::upper_bound` and wraps around at $2^{32}-1$.

2. **Per-Node Thread-Safe LRU Cache (`cache_node.h`)**:
   - $O(1)$ lookup, insertion, and eviction via a **Hash Map** (`std::unordered_map`) paired with a **Doubly-Linked List** (`std::list`).
   - Thread safety achieved via granular, per-node mutex locks (`std::mutex`), ensuring nodes scale independently across CPU cores without global lock contention.

3. **Realistic Origin Server (`origin_server.h`)**:
   - Models a slow database or file store with an intrinsic base latency ($50\text{ ms}$).
   - Includes dynamic queueing delay: as concurrent in-flight requests increase (`atomic<int> inFlight_`), latency scales proportionally ($+1\text{ ms}$ for every 5 concurrent fetches), replicating real-world disk/DB degradation.

4. **Zipfian Traffic Generator & Multi-Threaded Simulator (`simulator.h`)**:
   - Models realistic internet traffic: **80% of incoming requests target a hot set of popular assets** (Pareto principle / 80-20 rule), mixed with a long tail of rarely accessed assets.
   - Uses `std::thread` pools with barrier synchronization to hammer the cluster under true concurrent stress.

---

## ⚖️ Without CDN vs. With CDN Comparison

### Direct Architectural Breakdown

```
WITHOUT CDN:
Client ──[ 63.2 ms wire + queue delay ]──▶ Origin DB 🐢
(100% of all client requests hammer the origin database, creating thread exhaustion)

WITH DISTRIBUTED CDN:
Client ──[ 0.001 ms RAM ]──▶ Edge Hash Ring ⚡ (87.2% HIT - instant return)
                                   └──[ Only 12.8% miss ]──▶ Origin DB (Protected)
```

### Key Quantitative Takeaways:
- **Response Latency dropped from `63.2ms` to `8.08ms`**: Real users experience near-instant page renders because 87.2% of assets are retrieved from RAM in under 1 microsecond.
- **Throughput jumped from `126.5` to `893.2 req/s`**: By eliminating synchronous thread wait states at the database, the edge cluster handles over 7x more concurrent requests.
- **Origin Server shielded by `87.3%`**: Only cold misses reach the origin (2,554 out of 20,000). The backend database is completely insulated from traffic surges and flash crowds.

---

## 🌐 Interactive Dashboard Features

The web frontend (`dashboard/`) is a high-contrast, responsive React application built with modern engineering aesthetics:

1. **Side-by-Side Architecture Cards**:
   - Immediate visual comparison of Direct Architecture vs. Edge Distributed CDN.
   - Real-time progress bars depicting backend strain (100% critical vs. 12.8% shielded).

2. **Interactive Benchmark Switcher**:
   - **01 LATENCY**: Visual bar chart highlighting the 87.2% latency plunge (`63.2ms` → `8.08ms` → `0.001ms`).
   - **02 THROUGHPUT**: Capacity multiplier visualization showing +706% throughput gain.
   - **03 SHIELDING**: Stacked bar comparison of origin fetches prevented by edge memory.

3. **Interactive Request Simulator**:
   - Live buttons to trigger simulated requests:
     - `▶ Request Hot Key (video_42)` ➔ Instant **EDGE_CACHE_HIT (0.001 ms)** in local RAM.
     - `▶ Request Cold Key (archive_499)` ➔ **CACHE_MISS (63.2 ms)**, fetched from origin and ingested into LRU.

4. **Cluster Scaling & Topology Inspector**:
   - Visual comparison of **Consistent Hashing** (19.4% keys moved) vs. **Naive `% N` Hashing** (79.2% keys invalidated, causing a cache stampede).
   - Uniform traffic distribution gauges across all 4 cache nodes (~4.3k to 5.8k requests each).

5. **Theme Toggle**:
   - Capsule switch supporting **Obsidian Dark Mode** (`#07080B`) and **Studio Light Mode** (`#F6F7F9`).

---

## 📁 Project Directory Structure

```
CDN-project/
├── .gitignore                     # Git exclusion rules (builds, binaries, modules)
├── README.md                      # Comprehensive project documentation
├── start_all.bat                  # One-click Windows launcher (compiles C++ & starts React)
│
├── files/                         # Core C++17 Distributed Caching Engine
│   ├── main.cpp                   # Benchmark runner & multi-experiment harness
│   ├── cache_node.h               # Thread-safe O(1) LRU Cache (Hashmap + Doubly-linked list)
│   ├── hash_ring.h                # Consistent Hashing ring with virtual nodes
│   ├── origin_server.h            # Simulated high-latency origin database
│   ├── distributed_cache.h        # Routing tier tying cache nodes & hash ring together
│   ├── simulator.h                # Zipfian traffic generator & concurrency benchmarking
│   └── results/
│       └── benchmark.csv          # Output benchmark numbers from simulation
│
├── dashboard/                     # Interactive React 19 + Vite Web Application
│   ├── package.json               # Frontend dependencies (React, Recharts, Anime.js)
│   ├── vite.config.js             # Vite configuration
│   ├── index.html                 # Main application HTML entry point
│   └── src/
│       ├── main.jsx               # React DOM bootstrap
│       ├── App.jsx                # Complete dashboard application & 3D canvas
│       └── index.css              # Design tokens, typography, grid, and animations
│
└── Obsidian_Vault/                # Architecture design notes & technical write-ups
    ├── Architecture.md            # System component breakdown
    ├── Benchmark_Results.md       # Raw empirical results analysis
    └── Consistent_Hashing.md      # Mathematical proofs for virtual node scaling
```

---

## 💻 Quick Start & Setup

### Prerequisites

- **C++ Compiler**: Modern GCC (MinGW / MSYS2), Clang, or MSVC supporting **C++17** and pthreads.
- **Node.js**: `v18+` or `v20+` and `npm`.

---

### Option A: One-Click Windows Launcher (`run.bat`)

Simply double-click or run from command prompt:
```bat
run.bat
```
This automated script will:
1. Detect your C++17 compiler (`g++` in PATH or MSYS2/MinGW).
2. Compile and launch the 20,000-request benchmark engine.
3. Automatically verify/install Node dependencies and start the Vite dev server.
4. Auto-launch your default web browser to `http://localhost:5173/`.

*(Alternatively, you can also run `start_all.bat`)*

---

### Option B: Manual Execution

#### 1. Compile & Run the C++ Core Simulator

```bash
cd files
g++ -std=c++17 -O2 -pthread main.cpp -o cdn_benchmark
./cdn_benchmark
```

Output:
```text
=========================================
 Distributed Cache Benchmark (CDN-style)
=========================================
Nodes: 4 | Capacity/node: 50 | Requests: 20000 | Threads: 8

--- Baseline: Origin-only (no cache) ---
Total requests:      20000
Avg overall latency: 63.214 ms
Throughput:          126.5 req/sec

--- Distributed Cache (LRU + Consistent Hashing) ---
Total requests:      20000
Hits / Misses:       17446 / 2554  (hit ratio: 87.2%)
Avg hit latency:     0.001 ms
Avg miss latency:    63.257 ms
Avg overall latency: 8.079 ms
Throughput:          893.2 req/sec

>>> Latency reduction vs. origin-only baseline: 87.2%

=== Per-Node Load Distribution ===
node-3: 5240 requests handled (hits=4732, misses=508, evictions=439, finalSize=50)
node-2: 5889 requests handled (hits=5146, misses=743, evictions=672, finalSize=50)
node-1: 4315 requests handled (hits=3545, misses=770, evictions=703, finalSize=50)
node-0: 4556 requests handled (hits=4023, misses=533, evictions=467, finalSize=50)

=== Key Redistribution on Scaling (4 -> 5 nodes) ===
Consistent hashing:  97 / 500 keys moved (19.4%)
Naive hash % N:       396 / 500 keys moved (79.2%)

Done. Detailed numbers written to results/benchmark.csv
```

#### 2. Run the React Web Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173/
```

---

## 🧠 System Design & Technical Deep-Dive

### 1. Why Consistent Hashing instead of Naive `hash(key) % N`?
In standard modulo hashing, when a cluster scales from $N$ to $N+1$ nodes, almost every single key is mapped to a new node ($\frac{N}{N+1}$ keys relocated). For a 4-to-5 node scale-up, **79.2% of keys miss**, destroying the cache and creating an immediate thundering herd on the database.

With **Consistent Hashing**, keys are mapped along a circular $2^{32}$ ring. Adding a node only takes a fraction of keys from its immediate successor:
$$\text{Keys Moved} \approx \frac{1}{N+1}$$
In our empirical benchmark, **only 19.4% of keys moved**, preserving 80.6% of the cache intact.

### 2. Why Virtual Nodes?
Without virtual nodes, randomly placing 4 physical nodes on a hash ring results in massive variance in arc length, causing one node to receive 50%+ of all requests while others sit idle. By creating **100 virtual tokens per physical node**, each server owns multiple interleaved segments across the ring, producing a near-perfect uniform distribution (our benchmark shows 21.6% to 29.4% balance across all 4 nodes).

### 3. Granular Locking vs. Global Mutex
A naive distributed cache uses a single global lock around all get/put operations, which completely destroys multi-core scaling. In this architecture, **each cache node possesses its own independent `std::mutex`**. Because consistent hashing partitions keys deterministically, concurrent user requests hitting different nodes execute in parallel without lock contention.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
