#pragma once
#include "cache_node.h"
#include "hash_ring.h"
#include "origin_server.h"
#include <unordered_map>
#include <memory>
#include <string>
#include <chrono>

// ---------------------------------------------------------------------
// DistributedCache: the "front door" of the whole system.
//
// Flow for every request:
//   1. Ask the HashRing: "which node owns this key?"
//   2. Ask that node's CacheNode: "do you have it?"
//        - HIT  -> return immediately (fast path)
//        - MISS -> fetch from OriginServer (slow path), then store
//                  it in that node's cache for next time.
//
// This class is what the benchmark/simulator talks to - it doesn't
// need to know about hashing or eviction internals.
// ---------------------------------------------------------------------
class DistributedCache {
public:
    DistributedCache(int numNodes, size_t capacityPerNode, int originBaseLatencyMs)
        : origin_(originBaseLatencyMs) {
        for (int i = 0; i < numNodes; ++i) {
            std::string name = "node-" + std::to_string(i);
            nodes_[name] = std::make_unique<CacheNode>(capacityPerNode, name);
            ring_.addServer(name);
        }
    }

    // Result of one request, used for latency/hit-ratio stats.
    struct RequestResult {
        bool hit;
        double latencyMs;
        std::string servedBy;
    };

    RequestResult request(const std::string& key) {
        auto start = std::chrono::steady_clock::now();

        std::string ownerName = ring_.getServer(key);
        CacheNode* node = nodes_.at(ownerName).get();

        std::string value;
        bool hit = node->get(key, value);

        if (!hit) {
            value = origin_.fetch(key);   // slow path
            node->put(key, value);
        }

        auto end = std::chrono::steady_clock::now();
        double ms = std::chrono::duration<double, std::milli>(end - start).count();
        return {hit, ms, ownerName};
    }

    // --- Scaling operations, used to demonstrate consistent hashing ---
    void addNode(const std::string& name, size_t capacityPerNode) {
        nodes_[name] = std::make_unique<CacheNode>(capacityPerNode, name);
        ring_.addServer(name);
    }

    void removeNode(const std::string& name) {
        ring_.removeServer(name);
        nodes_.erase(name);
    }

    std::string ownerOf(const std::string& key) const {
        return ring_.getServer(key);
    }

    std::vector<CacheNode::Stats> allNodeStats() const {
        std::vector<CacheNode::Stats> out;
        for (auto& [name, node] : nodes_) out.push_back(node->getStats());
        return out;
    }

    long originFetches() const { return origin_.totalFetches(); }

private:
    HashRing ring_;
    OriginServer origin_;
    std::unordered_map<std::string, std::unique_ptr<CacheNode>> nodes_;
};
