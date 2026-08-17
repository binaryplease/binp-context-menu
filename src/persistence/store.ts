/**
 * The config store — a factory returning closures over private state, not a
 * class — a factory function over closures, with no `this` to bind.
 *
 * It owns three things and nothing else: the current parsed config, the
 * subscriber list `useSyncExternalStore` reads through, and the trip to the
 * host's persist functions. Surfaces never touch it directly; they read config
 * through the provider and write through `useContextMenuConfig`.
 */
import {
  parseConfig,
  type ContextMenuConfig,
  type ContextMenuConfigInput,
} from '../schema/config.ts'
import { createMemoryPersistence, type ContextMenuPersistence } from './adapter.ts'

export type ConfigRecipe = (current: ContextMenuConfig) => ContextMenuConfigInput

export type ConfigStoreOptions = {
  /** Where the config comes from and goes to. Defaults to in-memory. */
  persistence?: ContextMenuPersistence
  /** Starting config, before anything is loaded. Partial input is fine. */
  seed?: ContextMenuConfigInput
  /**
   * Called when a load, a save, or a parse fails. Storage failing is a real
   * fault worth surfacing — a full quota, a revoked permission, a corrupt
   * value — but it must not take the menu down with it, so the store reports and
   * carries on with the config it already has.
   */
  onPersistError?: (error: unknown, phase: 'load' | 'save' | 'parse') => void
}

export type ConfigStore = {
  getSnapshot: () => ContextMenuConfig
  subscribe: (listener: () => void) => () => void
  /** Apply a recipe, re-parse the result, notify, then persist. */
  update: (recipe: ConfigRecipe) => void
  /** Back to the seed — the "restore defaults" a settings panel needs. */
  reset: () => void
  /** Pull the stored config in. Safe to call once; later calls re-read. */
  hydrate: () => Promise<void>
  /** False until the first `hydrate()` settles. Nothing is saved before then. */
  isHydrated: () => boolean
}

export function createConfigStore(options: ConfigStoreOptions = {}): ConfigStore {
  const {
    persistence = createMemoryPersistence(),
    seed = {},
    onPersistError = (error, phase) => console.error(`[binp-context-menu] config ${phase} failed`, error),
  } = options

  let current = parseConfig(seed, (error) => onPersistError(error, 'parse'))
  let hydrated = false
  // Bumped on every local write. A hydrate that started before a write must not
  // undo it when the storage backend answers late.
  let writeCount = 0
  const listeners = new Set<() => void>()

  function notify() {
    for (const listener of listeners) listener()
  }

  function persist(config: ContextMenuConfig) {
    // Before hydration the current config is still the seed; writing it back
    // would overwrite the very value we are about to read.
    if (!hydrated) return
    try {
      const saved = persistence.save(config)
      if (saved instanceof Promise) saved.catch((error) => onPersistError(error, 'save'))
    } catch (error) {
      onPersistError(error, 'save')
    }
  }

  function commit(next: ContextMenuConfig) {
    current = next
    writeCount += 1
    notify()
    persist(next)
  }

  return {
    getSnapshot: () => current,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    update(recipe) {
      commit(parseConfig(recipe(current), (error) => onPersistError(error, 'parse')))
    },
    reset() {
      commit(parseConfig(seed, (error) => onPersistError(error, 'parse')))
    },
    async hydrate() {
      const writeCountAtStart = writeCount
      let loaded: unknown = null
      try {
        loaded = await persistence.load()
      } catch (error) {
        onPersistError(error, 'load')
        hydrated = true
        return
      }
      hydrated = true
      if (loaded === null || loaded === undefined) return
      if (writeCount !== writeCountAtStart) return // a local write won the race
      // The seed stays underneath: a stored config written before a knob existed
      // inherits the host's seed for it rather than the library's bare default.
      const isMergeable = typeof loaded === 'object' && !Array.isArray(loaded)
      current = parseConfig(
        isMergeable ? { ...seed, ...loaded } : loaded,
        (error) => onPersistError(error, 'parse'),
      )
      notify()
    },
    isHydrated: () => hydrated,
  }
}
