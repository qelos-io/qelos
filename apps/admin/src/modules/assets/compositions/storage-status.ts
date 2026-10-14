import { reactive } from 'vue'
import { getAssetInStorage } from './assets'

export type StorageStatusState = 'idle' | 'checking' | 'ok' | 'error'

export interface StorageStatus {
  state: StorageStatusState
  checkedAt?: number
  fileCount?: number
  message?: string
}

const STORAGE_KEY = 'qelos:storage-status'
const TEST_TIMEOUT_MS = 15000

function load(): Record<string, StorageStatus> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

const statuses = reactive<Record<string, StorageStatus>>(load())

function persist() {
  try {
    const settled = Object.fromEntries(Object.entries(statuses).filter(([, s]) => s.state === 'ok' || s.state === 'error'))
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settled))
  } catch {
    // statuses are a convenience; ignore private mode / quota errors
  }
}

export function describeStorageError(error: any): string {
  if (error?.code === 'ECONNABORTED') {
    return `Timed out after ${TEST_TIMEOUT_MS / 1000}s`
  }
  return error?.response?.data?.message || error?.message || 'Unknown error'
}

export function getStorageStatus(id: string): StorageStatus {
  return statuses[id] ?? { state: 'idle' }
}

/**
 * Checks a storage by listing its root. A failed check makes the assets service
 * record a platform event, so tests are always user-initiated, never automatic.
 */
export async function testStorage(id: string): Promise<StorageStatus> {
  statuses[id] = { state: 'checking' }
  try {
    const list = await getAssetInStorage(id, '/', { timeout: TEST_TIMEOUT_MS })
    statuses[id] = { state: 'ok', checkedAt: Date.now(), fileCount: Array.isArray(list) ? list.length : 0 }
  } catch (error) {
    statuses[id] = { state: 'error', checkedAt: Date.now(), message: describeStorageError(error) }
  }
  persist()
  return statuses[id]
}

export async function testStorages(ids: string[], concurrency = 3) {
  const queue = [...ids]
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) {
        await testStorage(queue.shift() as string)
      }
    }),
  )
}

export function forgetStorageStatus(id: string) {
  delete statuses[id]
  persist()
}
