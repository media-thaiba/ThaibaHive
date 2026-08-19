import { getCachedResponse, setCachedResponse, evictCacheKey, clearLocalMemoryCache } from "../cache/edge-cache";
import { invalidateCacheKey } from "../cache/invalidation";
import { preWarmEndpointCache } from "../cache/warming";
import { MediaAccelerator } from "../cdn/media-accelerator";

describe("Phase 3: Intelligent Caching & Media Optimization Tests", () => {
  beforeEach(() => {
    clearLocalMemoryCache();
  });

  describe("Multi-Tier Cache Manager", () => {
    it("should store and retrieve values correctly across caching tiers", async () => {
      const key = "test_key";
      const val = "cached_payload";

      await setCachedResponse(key, val, 10);
      const retrieved = await getCachedResponse(key);
      expect(retrieved).toBe(val);

      await evictCacheKey(key);
      const evicted = await getCachedResponse(key);
      expect(evicted).toBeNull();
    });
  });

  describe("Global Cache Invalidation Coordinator", () => {
    it("should evict keys and register SUCCESS logs", async () => {
      const key = "tenant_1:dashboard";
      await setCachedResponse(key, "data", 30);

      const success = await invalidateCacheKey("tenant_1", key);
      expect(success).toBe(true);

      const cached = await getCachedResponse(key);
      expect(cached).toBeNull();
    });
  });

  describe("Predictive Cache Warming", () => {
    it("should prefetch payloads and populate caches before requests hit", async () => {
      const key = "tenant_1:analytics:prewarm";
      const mockFetchFn = jest.fn().mockResolvedValue(JSON.stringify({ score: 98 }));

      const warmed = await preWarmEndpointCache("tenant_1", key, mockFetchFn, 30);
      expect(warmed).toBe(true);
      expect(mockFetchFn).toHaveBeenCalledTimes(1);

      const cached = await getCachedResponse(key);
      expect(cached).toBeDefined();
      expect(JSON.parse(cached!)).toEqual({ score: 98 });
    });
  });

  describe("Media Accelerator", () => {
    it("should rewrite URLs to point to closest CDN edge with adaptivity parameters", () => {
      const original = "https://media.thaibahive.local/videos/lesson1.mp4";
      const optimizedLow = MediaAccelerator.getOptimizedMediaUrl(original, { networkSpeed: "low", viewportWidth: 320 });
      const optimizedHigh = MediaAccelerator.getOptimizedMediaUrl(original, { networkSpeed: "high", viewportWidth: 1024 });

      expect(optimizedLow).toContain("quality%3D480p");
      expect(optimizedLow).toContain("width%3D320");
      expect(optimizedHigh).toContain("quality%3D1080p");
      expect(optimizedHigh).not.toContain("width%3D");
    });

    it("should compress images by ~35% on edge execution", async () => {
      const fakeBuffer = new ArrayBuffer(1000);
      const result = await MediaAccelerator.compressImageBufferAtEdge(fakeBuffer);

      expect(result.compressionRatio).toBeLessThan(0.70);
      expect(result.data.byteLength).toBe(650);
    });
  });
});
