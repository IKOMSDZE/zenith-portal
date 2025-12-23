
export const PerformanceMonitor = {
  trace: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      // Log performance data
      if (duration > 400) {
        console.warn(`[PERF] Slow Query: ${name} took ${duration.toFixed(2)}ms`);
      } else {
        console.debug(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[PERF] Failed Query: ${name} after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  },

  /**
   * Use this to measure component mount to data-ready time
   */
  mark: (name: string) => {
    performance.mark(name);
  },

  measure: (name: string, startMark: string) => {
    try {
      performance.measure(name, startMark);
      const entries = performance.getEntriesByName(name);
      console.log(`[USER-CENTRIC] ${name}: ${entries[0].duration.toFixed(2)}ms`);
      performance.clearMarks(startMark);
      performance.clearMeasures(name);
    } catch (e) {
      // Mark might not exist
    }
  }
};
