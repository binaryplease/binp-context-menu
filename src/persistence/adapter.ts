/**
 * Persistence is a pair of functions the host supplies. That is the whole
 * contract.
 *
 * The library never reaches for a storage backend on its own — no implicit
 * `localStorage`, no IndexedDB, no cookie. A host that wants the menu to
 * remember anything hands over `load` and `save`; a host that hands over
 * nothing gets an in-memory config that lives as long as the page. Writing to a
 * user's browser storage is a side effect the host opts into, not a default it
 * has to discover and turn off.
 *
 * Both functions may be async, so `save` can post to a server, write a file over
 * IPC, or push into a sync engine. `load` returns whatever it stored — the store
 * parses it back through the Zod schema, so a value written by an older version
 * of the library (or a hand-edited file) still yields a complete config.
 */
import type { ContextMenuConfig } from '../schema/config.ts'

export type ContextMenuPersistence = {
  /** Return the stored value, or `null` when nothing has been stored yet. */
  load: () => unknown | Promise<unknown>
  /** Persist the complete config. Throwing is reported, never swallowed. */
  save: (config: ContextMenuConfig) => void | Promise<void>
}

/**
 * The default: config lives for the lifetime of the page and goes nowhere.
 * `initialValue` lets a test seed a "previous session".
 */
export function createMemoryPersistence(initialValue: unknown = null): ContextMenuPersistence {
  let storedValue = initialValue
  return {
    load: () => storedValue,
    save: (config) => {
      storedValue = config
    },
  }
}

export type LocalStoragePersistenceOptions = {
  /** Key under which the config JSON is written. */
  storageKey?: string
  /** Defaults to `globalThis.localStorage`; pass any `Storage`-shaped object. */
  storage?: Storage
}

/**
 * Opt-in browser persistence. Explicitly constructed by the host — see the note
 * at the top of this file on why this is not the default.
 */
export function createLocalStoragePersistence(
  options: LocalStoragePersistenceOptions = {},
): ContextMenuPersistence {
  const { storageKey = 'binp-context-menu', storage = globalThis.localStorage } = options
  return {
    load: () => {
      const rawValue = storage.getItem(storageKey)
      if (rawValue === null) return null
      // A non-JSON value here means something else owns this key. Report it as a
      // load failure rather than pretending the config was empty.
      return JSON.parse(rawValue) as unknown
    },
    save: (config) => {
      storage.setItem(storageKey, JSON.stringify(config))
    },
  }
}
