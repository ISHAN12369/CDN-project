#pragma once
#include "distributed_cache.h"
#include <vector>
#include <thread>
#include <random>
#include <iostream>
#include <iomanip>
#include <fstream>
#include <numeric>
#include <algorithm>
#include <unordered_set>

// ---------------------------------------------------------------------
// Simulator: generates realistic traffic and measures the numbers you
// put on your resume (hit ratio, latency reduction, throughput,
// key-redistribution % on scaling, load balance across nodes).
//
// Traffic pattern: we simulate a "hot content" distribution - a small
// set of popular keys get requested very often (like a trending video),
// mixed with a long tail of rarely-requested keys. This is realistic
// (Zipf-like) and is exactly the pattern where caching helps most.
// ---------------------------------------------------------------------
class Simulator {
public:
    struct RunSummary {
        long totalRequests = 0;
        long hits = 0;
        long misses = 0;
        double avgLatencyMs = 0.0;
        double avgHitLatencyMs = 0.0;
        double avgMissLatencyMs = 0.0;
        double throughputReqPerSec = 0.0;
    };

    // Generates `numKeys` keys where a small "hot set" dominates traffic.
    static std::vector<std::string> generateHotKeyTraffic(int numRequests, int hotSetSize, int totalKeySpace) {
        std::mt19937 rng(42);
        std::vector<std::string> keyPool;
        for (int i = 0; i < totalKeySpace; ++i) keyPool.push_back("asset_" + std::to_string(i));

        // 80% of requests hit the hot set, 20% spread across the rest (Zipf-ish).
        std::uniform_real_distribution<double> coin(0.0, 1.0);
        std::uniform_int_distribution<int> hotIdx(0, hotSetSize - 1);
        std::uniform_int_distribution<int> coldIdx(hotSetSize, totalKeySpace - 1);

        std::vector<std::string> requests;
        requests.reserve(numRequests);
        for (int i = 0; i < numRequests; ++i) {
            int idx = (coin(rng) < 0.8) ? hotIdx(rng) : coldIdx(rng);
            requests.push_back(keyPool[idx]);
        }
        return requests;
    }

    // Runs traffic through the cache using `numThreads` concurrent workers.
    static RunSummary runConcurrent(DistributedCache& cache,
                                     const std::vector<std::string>& requests,
                                     int numThreads) {
        std::vector<std::thread> workers;
        std::mutex resultMutex;
        std::vector<DistributedCache::RequestResult> allResults;
        allResults.reserve(requests.size());

        size_t chunk = requests.size() / numThreads;
        auto start = std::chrono::steady_clock::now();

        for (int t = 0; t < numThreads; ++t) {
            size_t begin = t * chunk;
            size_t end = (t == numThreads - 1) ? requests.size() : begin + chunk;
            workers.emplace_back([&, begin, end]() {
                std::vector<DistributedCache::RequestResult> local;
                local.reserve(end - begin);
                for (size_t i = begin; i < end; ++i) {
                    local.push_back(cache.request(requests[i]));
                }
                std::lock_guard<std::mutex> lock(resultMutex);
                allResults.insert(allResults.end(), local.begin(), local.end());
            });
        }
        for (auto& w : workers) w.join();
        auto end = std::chrono::steady_clock::now();
        double wallSec = std::chrono::duration<double>(end - start).count();

        RunSummary summary;
        summary.totalRequests = (long)allResults.size();
        double hitLatSum = 0, missLatSum = 0, totalLatSum = 0;
        for (auto& r : allResults) {
            totalLatSum += r.latencyMs;
            if (r.hit) { summary.hits++; hitLatSum += r.latencyMs; }
            else       { summary.misses++; missLatSum += r.latencyMs; }
        }
        summary.avgLatencyMs = totalLatSum / std::max<long>(1, summary.totalRequests);
        summary.avgHitLatencyMs = summary.hits ? hitLatSum / summary.hits : 0;
        summary.avgMissLatencyMs = summary.misses ? missLatSum / summary.misses : 0;
        summary.throughputReqPerSec = summary.totalRequests / std::max(wallSec, 0.0001);
        return summary;
    }

    // Baseline: every single request goes straight to origin, no caching at all.
    // This is the number we compare against for "X% latency reduction".
    static RunSummary runOriginOnlyBaseline(OriginServer& origin,
                                             const std::vector<std::string>& requests,
                                             int numThreads) {
        std::vector<std::thread> workers;
        std::vector<double> latencies(requests.size());
        size_t chunk = requests.size() / numThreads;
        auto start = std::chrono::steady_clock::now();

        for (int t = 0; t < numThreads; ++t) {
            size_t begin = t * chunk;
            size_t end = (t == numThreads - 1) ? requests.size() : begin + chunk;
            workers.emplace_back([&, begin, end]() {
                for (size_t i = begin; i < end; ++i) {
                    auto s = std::chrono::steady_clock::now();
                    origin.fetch(requests[i]);
                    auto e = std::chrono::steady_clock::now();
                    latencies[i] = std::chrono::duration<double, std::milli>(e - s).count();
                }
            });
        }
        for (auto& w : workers) w.join();
        auto end = std::chrono::steady_clock::now();
        double wallSec = std::chrono::duration<double>(end - start).count();

        RunSummary summary;
        summary.totalRequests = (long)requests.size();
        summary.misses = summary.totalRequests; // everything is a "miss" (no cache)
        double sum = std::accumulate(latencies.begin(), latencies.end(), 0.0);
        summary.avgLatencyMs = sum / std::max<size_t>(1, latencies.size());
        summary.avgMissLatencyMs = summary.avgLatencyMs;
        summary.throughputReqPerSec = summary.totalRequests / std::max(wallSec, 0.0001);
        return summary;
    }

    // Demonstrates the KEY ADVANTAGE of consistent hashing: measures what
    // % of keys change owner when a node is added, vs. naive hash % N.
    static void demonstrateRedistribution(const std::vector<std::string>& keys) {
        std::cout << "\n=== Key Redistribution on Scaling (4 -> 5 nodes) ===\n";

        // --- Consistent hashing ---
        {
            HashRing ring;
            std::vector<std::string> names = {"node-0","node-1","node-2","node-3"};
            for (auto& n : names) ring.addServer(n);

            std::unordered_map<std::string,std::string> before;
            for (auto& k : keys) before[k] = ring.getServer(k);

            ring.addServer("node-4"); // scale up

            int moved = 0;
            for (auto& k : keys) if (ring.getServer(k) != before[k]) moved++;

            double pct = 100.0 * moved / keys.size();
            std::cout << "Consistent hashing:  " << moved << " / " << keys.size()
                      << " keys moved (" << std::fixed << std::setprecision(1) << pct << "%)\n";
        }

        // --- Naive hash % N ---
        {
            auto ownerNaive = [](const std::string& k, int n) {
                return HashRing::hash(k) % n;
            };
            int moved = 0;
            for (auto& k : keys) {
                if (ownerNaive(k, 4) != ownerNaive(k, 5)) moved++;
            }
            double pct = 100.0 * moved / keys.size();
            std::cout << "Naive hash % N:       " << moved << " / " << keys.size()
                      << " keys moved (" << std::fixed << std::setprecision(1) << pct << "%)\n";
        }
    }

    static void printSummary(const std::string& label, const RunSummary& s) {
        std::cout << "\n--- " << label << " ---\n";
        std::cout << "Total requests:      " << s.totalRequests << "\n";
        if (s.hits + s.misses > 0 && s.hits > 0) {
            double hitRatio = 100.0 * s.hits / s.totalRequests;
            std::cout << "Hits / Misses:       " << s.hits << " / " << s.misses
                      << "  (hit ratio: " << std::fixed << std::setprecision(1) << hitRatio << "%)\n";
            std::cout << "Avg hit latency:     " << std::fixed << std::setprecision(3) << s.avgHitLatencyMs << " ms\n";
            std::cout << "Avg miss latency:    " << std::fixed << std::setprecision(3) << s.avgMissLatencyMs << " ms\n";
        }
        std::cout << "Avg overall latency: " << std::fixed << std::setprecision(3) << s.avgLatencyMs << " ms\n";
        std::cout << "Throughput:          " << std::fixed << std::setprecision(1) << s.throughputReqPerSec << " req/sec\n";
    }

    static void writeCsvRow(std::ofstream& out, const std::string& label, const RunSummary& s) {
        out << label << "," << s.totalRequests << "," << s.hits << "," << s.misses << ","
            << s.avgLatencyMs << "," << s.avgHitLatencyMs << "," << s.avgMissLatencyMs << ","
            << s.throughputReqPerSec << "\n";
    }
};
