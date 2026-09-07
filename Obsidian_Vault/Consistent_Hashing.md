# Consistent Hashing

Unlike naive modulo hashing (`hash(key) % N`), which remaps almost all keys when a node is added or removed, **Consistent Hashing** places both the caching nodes and the data keys on a virtual ring.

## Benefits for our CDN Architecture

1. **Stability on Scaling**:
   When scaling from 4 to 5 nodes, consistent hashing moves only ~1/N of the keys (about ~19.4% in our [[Benchmark_Results|benchmark]]). This prevents a total cache wipe, which is critical in a CDN to avoid hammering the Origin Server with a "thundering herd" of requests.
   
2. **Virtual Nodes**:
   Each physical node is hashed to multiple points on the ring. This solves the problem of non-uniform data distribution and ensures that load is evenly balanced across the cluster.
