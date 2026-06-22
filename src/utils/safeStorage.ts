/**
 * Safe local storage wrapper that falls back to in-memory storage 
 * when the browser enforces strict privacy/cookie boundaries (e.g. inside Safari iframes).
 */
class SafeStorage {
  private memoryStore: Record<string, string> = {};

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return this.memoryStore[key] || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      this.memoryStore[key] = value;
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete this.memoryStore[key];
    }
  }
}

export const safeStorage = new SafeStorage();
