/**
 * PROPOS — IndexedDB helper for offline data access
 * Stores properties, analytics snapshots, and agent profiles for offline reading.
 */

const DB_NAME = 'propos-offline'
const DB_VERSION = 1

const STORES = {
  PROPERTIES: 'properties',
  ANALYTICS: 'analytics',
  PROFILE: 'profile',
} as const

type StoreName = (typeof STORES)[keyof typeof STORES]

class OfflineStore {
  private db: IDBDatabase | null = null
  private dbReady: Promise<IDBDatabase>

  constructor() {
    this.dbReady = this.open()
  }

  private open(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db)

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result

        // Properties store — keyed by agentSlug
        if (!db.objectStoreNames.contains(STORES.PROPERTIES)) {
          db.createObjectStore(STORES.PROPERTIES, { keyPath: 'agentSlug' })
        }

        // Analytics store — single record, keyed by 'data'
        if (!db.objectStoreNames.contains(STORES.ANALYTICS)) {
          db.createObjectStore(STORES.ANALYTICS, { keyPath: 'id' })
        }

        // Profile store — keyed by agentSlug
        if (!db.objectStoreNames.contains(STORES.PROFILE)) {
          db.createObjectStore(STORES.PROFILE, { keyPath: 'slug' })
        }
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  /**
   * Get a transaction and object store for the given store name.
   */
  private async getStore(mode: IDBTransactionMode, storeName: StoreName): Promise<IDBObjectStore> {
    const db = await this.dbReady
    const tx = db.transaction(storeName, mode)
    return tx.objectStore(storeName)
  }

  /**
   * Wrap an IDBRequest in a promise.
   */
  private promisify<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Save/update properties for a given agent slug for offline reading.
   */
  async saveProperties(properties: any[]): Promise<void> {
    if (!properties.length) return

    // Group properties by agentSlug from the response wrapper
    // We expect properties come from the portal API which returns an agent slug
    // The caller should pass the parsed properties array along with agentSlug
    // For robustness we store them under a generic key
    const store = await this.getStore('readwrite', STORES.PROPERTIES)
    const tx = store.transaction

    // Find agentSlug from first property's agent reference, or use 'default'
    const agentSlug = (properties[0]?.agentSlug) || 'default'

    const record = {
      agentSlug,
      properties,
      updatedAt: new Date().toISOString(),
    }

    store.put(record)

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Retrieve cached properties for a given agent slug.
   */
  async getProperties(agentSlug: string): Promise<any[]> {
    const store = await this.getStore('readonly', STORES.PROPERTIES)
    const record = await this.promisify(store.get(agentSlug))

    if (!record) return []
    return record.properties || []
  }

  /**
   * Save analytics snapshot for offline access.
   */
  async saveAnalytics(data: any): Promise<void> {
    const store = await this.getStore('readwrite', STORES.ANALYTICS)
    const tx = store.transaction

    const record = {
      id: 'current',
      ...data,
      updatedAt: new Date().toISOString(),
    }

    store.put(record)

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Retrieve cached analytics snapshot.
   */
  async getAnalytics(): Promise<any> {
    const store = await this.getStore('readonly', STORES.ANALYTICS)
    return this.promisify(store.get('current'))
  }

  /**
   * Clear all cached data from all object stores.
   */
  async clearAll(): Promise<void> {
    const db = await this.dbReady
    const storeNames = Object.values(STORES)
    const tx = db.transaction(storeNames, 'readwrite')

    for (const name of storeNames) {
      tx.objectStore(name).clear()
    }

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}

// Singleton export
export const offlineStore = new OfflineStore()
