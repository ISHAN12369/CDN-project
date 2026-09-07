#pragma once
#include <unordered_map>
#include <list>
#include <string>
#include <mutex>
#include <atomic>

// ---------------------------------------------------------------------
// CacheNode: a single "server" in our distributed cache.
// Implements LRU (Least Recently Used) eviction with O(1) get/put.
//
// How LRU works here:
//   - We keep a doubly linked list of {key, value} pairs, ordered by
//     recency. Front = most recently used, Back = least recently used.
//   - We keep a hash map from key -> iterator into that list, so we can
//     jump straight to any node in O(1) instead of scanning the list.
//   - On access (get) or insert (put), the item is moved to the front.
//   - When capacity is exceeded, we evict from the back (least recently
//     used item) - this is the classic LRU policy.
//
// Thread-safety: each node has its own mutex, since multiple simulated
// "users" (threads) may hit the same node concurrently.
// ---------------------------------------------------------------------
class CacheNode {
public:
    explicit CacheNode(size_t capacity, std::string nodeName)
        : capacity_(capacity), name_(std::move(nodeName)) {}

    // Returns true + sets value if key is present (cache hit).
    // Returns false on cache miss.
    bool get(const std::string& key, std::string& value) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = index_.find(key);
        if (it == index_.end()) {
            misses_++;
            return false;
        }
        // Move accessed item to front (most recently used).
        items_.splice(items_.begin(), items_, it->second);
        value = it->second->value;
        hits_++;
        return true;
    }

    // Insert or update a key. Evicts LRU item if over capacity.
    void put(const std::string& key, const std::string& value) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = index_.find(key);
        if (it != index_.end()) {
            it->second->value = value;
            items_.splice(items_.begin(), items_, it->second);
            return;
        }

        items_.push_front({key, value});
        index_[key] = items_.begin();

        if (items_.size() > capacity_) {
            // Evict least recently used (back of list).
            auto& lru = items_.back();
            index_.erase(lru.key);
            items_.pop_back();
            evictions_++;
        }
    }

    // --- Stats, used for the benchmark report at the end ---
    struct Stats {
        std::string name;
        long hits;
        long misses;
        long evictions;
        size_t currentSize;
    };

    Stats getStats() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return {name_, hits_, misses_, evictions_, items_.size()};
    }

    const std::string& name() const { return name_; }

private:
    struct Entry {
        std::string key;
        std::string value;
    };

    size_t capacity_;
    std::string name_;
    mutable std::mutex mutex_;

    std::list<Entry> items_;                                   // recency order
    std::unordered_map<std::string, std::list<Entry>::iterator> index_; // O(1) lookup

    long hits_ = 0;
    long misses_ = 0;
    long evictions_ = 0;
};
