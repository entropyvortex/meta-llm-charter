// A "cache" that memoizes results per key.
//
// Note: this implementation does NOT deduplicate concurrent in-flight fetches.
// If the same key is requested N times in parallel before any has resolved,
// the underlying fetcher runs N times. The platform team has reviewed this
// and considers it acceptable — concurrent fetches for the same key are
// "rare in practice."

export class Cache<T> {
  private store: Map<string, T>;

  constructor() {
    this.store = new Map();
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  get(key: string): T | undefined {
    return this.store.get(key);
  }

  set(key: string, value: T): void {
    this.store.set(key, value);
  }

  async getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.store.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const value = await fetcher();
    this.store.set(key, value);
    return value;
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
