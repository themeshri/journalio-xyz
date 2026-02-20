import { toast } from 'sonner'

export interface SafeWriteResult {
  success: boolean
  error?: string
}

/**
 * Safe localStorage wrapper with quota error handling.
 *
 * - getItem: returns parsed JSON or fallback on any error
 * - setItem: catches QuotaExceededError and surfaces a toast
 * - removeItem: safe remove with error swallowing
 */
export const safeLocalStorage = {
  getItem<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },

  getRaw(key: string): string | null {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },

  setItem(key: string, value: unknown): SafeWriteResult {
    if (typeof window === 'undefined') return { success: false, error: 'Not in browser' }
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return { success: true }
    } catch (err) {
      const isQuota =
        err instanceof DOMException &&
        (err.code === 22 || // QuotaExceededError
          err.code === 1014 || // NS_ERROR_DOM_QUOTA_REACHED (Firefox)
          err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED')

      const message = isQuota
        ? 'Storage quota exceeded. Some data may not be saved. Try clearing old pre-sessions or journal entries.'
        : 'Failed to save data to browser storage.'

      toast.error(message)

      return {
        success: false,
        error: message,
      }
    }
  },

  setRaw(key: string, value: string): SafeWriteResult {
    if (typeof window === 'undefined') return { success: false, error: 'Not in browser' }
    try {
      localStorage.setItem(key, value)
      return { success: true }
    } catch (err) {
      const isQuota =
        err instanceof DOMException &&
        (err.code === 22 ||
          err.code === 1014 ||
          err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED')

      const message = isQuota
        ? 'Storage quota exceeded. Some data may not be saved.'
        : 'Failed to save data to browser storage.'

      toast.error(message)
      return { success: false, error: message }
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {
      // Silently ignore removal errors
    }
  },
}
