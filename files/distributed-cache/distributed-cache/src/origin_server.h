#pragma once
#include <string>
#include <thread>
#include <chrono>
#include <atomic>

// ---------------------------------------------------------------------
// OriginServer: simulates the real, slow backend (e.g. a database or
// file store far from the user). Every CDN/cache exists to avoid
// hitting this as much as possible.
//
// We simulate real-world delay with sleep_for(), and also simulate
// origin getting slower under heavy concurrent load (queueing delay),
// which is realistic - a real DB/disk does degrade under load.
// ---------------------------------------------------------------------
class OriginServer {
public:
    explicit OriginServer(int baseLatencyMs = 50) : baseLatencyMs_(baseLatencyMs) {}

    // Simulates fetching content from the true origin.
    std::string fetch(const std::string& key) {
        int active = ++inFlight_;
        // Extra delay grows with concurrent load (simulates origin strain).
        int loadPenalty = active / 5;   // every 5 concurrent requests adds 1ms
        std::this_thread::sleep_for(std::chrono::milliseconds(baseLatencyMs_ + loadPenalty));
        --inFlight_;

        totalFetches_++;
        return "content-for-" + key;    // fake payload
    }

    long totalFetches() const { return totalFetches_.load(); }

private:
    int baseLatencyMs_;
    std::atomic<int> inFlight_{0};
    std::atomic<long> totalFetches_{0};
};
