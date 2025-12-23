
type CacheEntry<T> = {
  data: T;
  expiry: number;
};

export class CacheManager {
  private static cache: Map<string, CacheEntry<any>> = new Map();
  private static pruneInterval: any = null;
  
  // TTLs in milliseconds
  public static readonly TTL = {
    STATIC: 24 * 60 * 60 * 1000, // 24 Hours (Settings, Branches)
    PROFILES: 60 * 60 * 1000,    // 1 Hour (Users)
    MODERATE: 15 * 60 * 1000,    // 15 Minutes (Vacations)
    FREQUENT: 5 * 60 * 1000,     // 5 Minutes (Attendance, Cash)
  };

  /**
   * Initializes the auto-pruning task
   */
  private static ensurePruning() {
    if (this.pruneInterval) return;
    this.pruneInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiry) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Prune every 5 minutes
  }

  /**
   * Retrieves an item from cache or returns null if expired/missing
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Stores data in cache with a specific TTL
   */
  static set<T>(key: string, data: T, ttl: number): void {
    this.ensurePruning();
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  /**
   * Removes specific cache keys or groups
   */
  static invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears entire cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Helper to wrap a promise-based fetch with caching logic
   */
  static async wrap<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      console.debug(`[CACHE] Hit: ${key}`);
      return cached;
    }
    
    console.debug(`[CACHE] Miss: ${key}`);
    const fresh = await fetcher();
    this.set(key, fresh, ttl);
    return fresh;
  }
}
