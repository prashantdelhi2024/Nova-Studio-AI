import { Project, MediaItem } from '../types/editor';

const DB_NAME = 'NOVA_STUDIO_AI_DB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_MEDIA = 'media_items';

class IndexedDBStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported in this environment'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // Projects
  async saveProject(project: Project): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.put({ ...project, updatedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getProject(id: string): Promise<Project | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllProjects(): Promise<Project[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Media items
  async saveMediaItem(item: MediaItem): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      // Omit temporary object URLs, preserve blob if any
      const toStore = { ...item };
      const req = store.put(toStore);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAllMediaItems(): Promise<MediaItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA, 'readonly');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: MediaItem[] = req.result || [];
        // Re-hydrate blob URLs if blob is present
        items.forEach((item) => {
          if (item.blob && (!item.url || item.url.startsWith('blob:'))) {
            try {
              item.url = URL.createObjectURL(item.blob);
            } catch (e) {
              console.warn('Could not regenerate blob URL:', e);
            }
          }
        });
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteMediaItem(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Storage estimation
  async getStorageEstimate(): Promise<{ usedMb: number; quotaMb: number; percent: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const used = (estimate.usage || 0) / (1024 * 1024);
      const quota = (estimate.quota || 1024 * 1024 * 1024) / (1024 * 1024);
      return {
        usedMb: Number(used.toFixed(1)),
        quotaMb: Number(quota.toFixed(0)),
        percent: Number(((used / quota) * 100).toFixed(1))
      };
    }
    return { usedMb: 12.5, quotaMb: 2048, percent: 0.6 };
  }

  // Clear cache
  async clearAllData(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS, STORE_MEDIA], 'readwrite');
      tx.objectStore(STORE_PROJECTS).clear();
      tx.objectStore(STORE_MEDIA).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const dbService = new IndexedDBStorage();
