#include "distributed_cache.h"
#include "simulator.h"
#include <iostream>
#include <fstream>

// ---------------------------------------------------------------------
// main.cpp - runs three experiments and prints the numbers that go on
// your resume:
//
//   1. Origin-only baseline  (no cache at all - the "before" picture)
//   2. Distributed cache     (the "after" picture - hit ratio, latency)
//   3. Key redistribution %  (proves consistent hashing over naive %N)
//
// Also writes results/benchmark.csv so you can plot graphs later.
// ---------------------------------------------------------------------
int main() {
    const int NUM_NODES        = 4;
    const int CAPACITY_PER_NODE = 50;     // small on purpose -> forces evictions
    const int ORIGIN_LATENCY_MS = 50;     // simulate a "slow" origin fetch
    const int NUM_REQUESTS      = 20000;
    const int HOT_SET_SIZE      = 30;     // popular assets (like trending videos)
    const int TOTAL_KEY_SPACE   = 500;    // total distinct assets that exist
    const int NUM_THREADS       = 8;      // simulated concurrent users

    std::cout << "=========================================\n";
    std::cout << " Distributed Cache Benchmark (CDN-style)\n";
    std::cout << "=========================================\n";
    std::cout << "Nodes: " << NUM_NODES << " | Capacity/node: " << CAPACITY_PER_NODE
              << " | Requests: " << NUM_REQUESTS << " | Threads: " << NUM_THREADS << "\n";

    // Generate realistic traffic: 80% of requests hit a small "hot set".
    auto requests = Simulator::generateHotKeyTraffic(NUM_REQUESTS, HOT_SET_SIZE, TOTAL_KEY_SPACE);

    std::ofstream csv("results/benchmark.csv");
    csv << "label,total_requests,hits,misses,avg_latency_ms,avg_hit_latency_ms,avg_miss_latency_ms,throughput_rps\n";

    // ---------------------------------------------------------
    // Experiment 1: Origin-only baseline (no caching at all)
    // ---------------------------------------------------------
    {
        OriginServer origin(ORIGIN_LATENCY_MS);
        auto baseline = Simulator::runOriginOnlyBaseline(origin, requests, NUM_THREADS);
        Simulator::printSummary("Baseline: Origin-only (no cache)", baseline);
        Simulator::writeCsvRow(csv, "origin_only_baseline", baseline);

        // ---------------------------------------------------------
        // Experiment 2: Distributed cache (our system)
        // ---------------------------------------------------------
        DistributedCache cache(NUM_NODES, CAPACITY_PER_NODE, ORIGIN_LATENCY_MS);
        auto result = Simulator::runConcurrent(cache, requests, NUM_THREADS);
        Simulator::printSummary("Distributed Cache (LRU + Consistent Hashing)", result);
        Simulator::writeCsvRow(csv, "distributed_cache", result);

        // Headline resume number: latency reduction %
        double reduction = 100.0 * (baseline.avgLatencyMs - result.avgLatencyMs) / baseline.avgLatencyMs;
        std::cout << "\n>>> Latency reduction vs. origin-only baseline: "
                  << std::fixed << std::setprecision(1) << reduction << "%\n";

        // Load distribution across nodes - proves even spread, not one hot node.
        std::cout << "\n=== Per-Node Load Distribution ===\n";
        for (auto& s : cache.allNodeStats()) {
            long total = s.hits + s.misses;
            std::cout << s.name << ": " << total << " requests handled "
                      << "(hits=" << s.hits << ", misses=" << s.misses
                      << ", evictions=" << s.evictions << ", finalSize=" << s.currentSize << ")\n";
        }
    }

    // ---------------------------------------------------------
    // Experiment 3: Key redistribution % when scaling 4 -> 5 nodes
    // (Consistent hashing vs. naive hash % N)
    // ---------------------------------------------------------
    std::vector<std::string> allKeys;
    for (int i = 0; i < TOTAL_KEY_SPACE; ++i) allKeys.push_back("asset_" + std::to_string(i));
    Simulator::demonstrateRedistribution(allKeys);

    std::cout << "\nDone. Detailed numbers written to results/benchmark.csv\n";
    return 0;
}
