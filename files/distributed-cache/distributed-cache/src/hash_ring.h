#pragma once
#include <map>
#include <vector>
#include <string>
#include <functional>
#include <mutex>
#include <cstdint>

// ---------------------------------------------------------------------
// HashRing: implements CONSISTENT HASHING with virtual nodes.
//
// The core problem it solves:
//   With naive routing (hash(key) % N), adding/removing ONE server
//   changes almost every key's owner, because N changed for everyone.
//   That means a near-total cache wipeout every time you scale.
//
// Consistent hashing fixes this:
//   - Both servers and keys are hashed onto the same circular space
//     (0 -> 2^32-1, imagined as a ring).
//   - A key belongs to the first server found walking clockwise from
//     the key's position on the ring.
//   - Adding/removing a server only affects the small arc of keys
//     between it and its neighbor - NOT the whole ring.
//
// Virtual nodes:
//   - A single physical server is placed at MANY points on the ring
//     (e.g. 100 virtual points), not just one.
//   - This spreads load evenly; without virtual nodes, one server
//     could randomly own a huge arc (bad luck in hashing) while
//     another owns almost nothing.
// ---------------------------------------------------------------------
class HashRing {
public:
    explicit HashRing(int virtualNodesPerServer = 100)
        : vnodes_(virtualNodesPerServer) {}

    void addServer(const std::string& serverName) {
        std::lock_guard<std::mutex> lock(mutex_);
        for (int i = 0; i < vnodes_; ++i) {
            uint32_t h = hash(serverName + "#vn" + std::to_string(i));
            ring_[h] = serverName;
        }
    }

    void removeServer(const std::string& serverName) {
        std::lock_guard<std::mutex> lock(mutex_);
        for (int i = 0; i < vnodes_; ++i) {
            uint32_t h = hash(serverName + "#vn" + std::to_string(i));
            ring_.erase(h);
        }
    }

    // Returns which server owns a given key.
    std::string getServer(const std::string& key) const {
        std::lock_guard<std::mutex> lock(mutex_);
        if (ring_.empty()) return "";
        uint32_t h = hash(key);
        auto it = ring_.lower_bound(h);   // first server >= key's hash
        if (it == ring_.end()) it = ring_.begin(); // wrap around the ring
        return it->second;
    }

    size_t ringSize() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return ring_.size();
    }

    // FNV-1a hash + an avalanche "finalizer" mixing step (same idea as
    // MurmurHash3's fmix32). Plain FNV-1a alone hashes near-sequential
    // strings like "asset_0", "asset_1", ... into near-linear, clustered
    // values (each differs by a near-constant delta), which breaks the
    // even spread consistent hashing depends on. The finalizer scrambles
    // bits thoroughly so similar inputs land in unrelated ring positions.
    static uint32_t hash(const std::string& s) {
        uint32_t h = 2166136261u;
        for (unsigned char c : s) {
            h ^= c;
            h *= 16777619u;
        }
        // Avalanche finalizer (Murmur3 fmix32).
        h ^= h >> 16;
        h *= 0x85ebca6bu;
        h ^= h >> 13;
        h *= 0xc2b2ae35u;
        h ^= h >> 16;
        return h;
    }

private:
    int vnodes_;
    mutable std::mutex mutex_;
    std::map<uint32_t, std::string> ring_;  // sorted ring: hash -> server name
};
