import { describe, expect, test } from 'bun:test'
import { createConfigStore } from '../src/persistence/store.ts'
import { createMemoryPersistence } from '../src/persistence/adapter.ts'
import { defaultConfig, parseConfig } from '../src/schema/config.ts'

describe('config schema', () => {
  test('an empty object parses to a complete config', () => {
    const config = parseConfig({})
    expect(config.surface).toBe('whisper')
    expect(config.sound.masterGain).toBe(2.6)
    expect(config.orbit.rings).toHaveLength(3)
    expect(config.usage).toEqual({})
  })

  test('a config written before a knob existed still parses', () => {
    // Exactly what a stored value from an older version looks like: a couple of
    // known fields, nothing else.
    const stored = { surface: 'orbit', usage: { build: 32 } }
    const config = parseConfig(stored)
    expect(config.surface).toBe('orbit')
    expect(config.usage['build']).toBe(32)
    // Everything the old value never heard of arrives populated, not undefined.
    expect(config.sigil.autoCastDelayMs).toBe(760)
    expect(config.whisper.groupByKind).toBe(true)
  })

  test('a wheel stored before it could grow parses to one that can', () => {
    // The shape a host has in storage from before the Compass measured
    // anything: the five geometry knobs, no sizing switches. It comes back with
    // its radii untouched — a command set that fitted must not move — and with
    // the fitting on, because a wheel that overhangs its labels is the defect.
    const stored = {
      surface: 'compass',
      compass: { diameter: 376, hubRadius: 58, kindRingRadius: 98, itemRingRadius: 178, radialLabels: true },
      orbit: { minDiameter: 34, maxDiameter: 74 },
    }
    const config = parseConfig(stored)
    expect(config.compass.diameter).toBe(376)
    expect(config.compass.itemRingRadius).toBe(178)
    expect(config.compass.fitLabels).toBe(true)
    expect(config.compass.maxDiameter).toBe(0)
    expect(config.orbit.fitLabels).toBe(true)
    expect(config.orbit.rings).toHaveLength(3)
  })

  test('a partially-specified nested object keeps its siblings', () => {
    const config = parseConfig({ sound: { enabled: false } })
    expect(config.sound.enabled).toBe(false)
    expect(config.sound.castTake).toBe('collapse')
  })

  test('each parse gets its own nested objects, not one shared reference', () => {
    // The nested defaults are factories (`.default(() => X.parse({}))`) rather
    // than literals. A literal would be *one* object handed to every parse on
    // both zod majors, so a host mutating its own config would reach into
    // everyone else's — and the library's own `resetConfig` would hand back the
    // object the caller had already written through.
    const first = parseConfig({})
    const second = parseConfig({})
    expect(first.orbit).not.toBe(second.orbit)
    expect(first.orbit.rings).not.toBe(second.orbit.rings)
    expect(first.sound.repeatDuck).not.toBe(second.sound.repeatDuck)
    expect(first).toEqual(second)
  })

  test('unparseable storage falls back to defaults and reports', () => {
    let reportedError: unknown = null
    const config = parseConfig({ surface: 'not-a-surface' }, (error) => {
      reportedError = error
    })
    expect(reportedError).not.toBeNull()
    expect(config).toEqual(defaultConfig())
  })
})

describe('config store', () => {
  test('updates notify subscribers and reach the host save function', async () => {
    const saved: unknown[] = []
    const store = createConfigStore({
      persistence: { load: () => null, save: (config) => void saved.push(config) },
    })
    await store.hydrate()

    let notifications = 0
    store.subscribe(() => {
      notifications++
    })

    store.update((current) => ({ ...current, surface: 'compass' }))
    expect(store.getSnapshot().surface).toBe('compass')
    expect(notifications).toBe(1)
    expect(saved).toHaveLength(1)
  })

  test('nothing is saved before hydration — the stored value is not clobbered', () => {
    const saved: unknown[] = []
    const store = createConfigStore({
      persistence: { load: () => ({ surface: 'orbit' }), save: (config) => void saved.push(config) },
      seed: { surface: 'strata' },
    })
    store.update((current) => ({ ...current, learnFromUsage: false }))
    expect(saved).toHaveLength(0)
  })

  test('a stored config wins over the seed, field by field', async () => {
    const store = createConfigStore({
      persistence: createMemoryPersistence({ surface: 'orbit' }),
      seed: { surface: 'compass', whisper: { placeholder: 'Run a thing…' } },
    })
    await store.hydrate()
    expect(store.getSnapshot().surface).toBe('orbit')
    // The seed still supplies what the stored value never mentioned.
    expect(store.getSnapshot().whisper.placeholder).toBe('Run a thing…')
  })

  test('a local write during a slow load is not undone by it', async () => {
    let releaseLoad: (value: unknown) => void = () => {}
    const store = createConfigStore({
      persistence: {
        load: () => new Promise((resolvePromise) => (releaseLoad = resolvePromise)),
        save: () => {},
      },
    })
    const hydration = store.hydrate()
    store.update((current) => ({ ...current, surface: 'sigil' }))
    releaseLoad({ surface: 'original' })
    await hydration
    expect(store.getSnapshot().surface).toBe('sigil')
  })

  test('a failing save is reported, not thrown, and the config stands', async () => {
    const failures: string[] = []
    const store = createConfigStore({
      persistence: {
        load: () => null,
        save: () => {
          throw new Error('quota exceeded')
        },
      },
      onPersistError: (_error, phase) => failures.push(phase),
    })
    await store.hydrate()
    store.update((current) => ({ ...current, surface: 'strata' }))
    expect(failures).toEqual(['save'])
    expect(store.getSnapshot().surface).toBe('strata')
  })

  test('a failing load leaves the seed in place and still marks hydration done', async () => {
    const failures: string[] = []
    const store = createConfigStore({
      persistence: {
        load: () => {
          throw new Error('storage unavailable')
        },
        save: () => {},
      },
      seed: { surface: 'compass' },
      onPersistError: (_error, phase) => failures.push(phase),
    })
    await store.hydrate()
    expect(failures).toEqual(['load'])
    expect(store.isHydrated()).toBe(true)
    expect(store.getSnapshot().surface).toBe('compass')
  })

  test('reset returns to the seed, not to the library defaults', async () => {
    const store = createConfigStore({
      persistence: createMemoryPersistence(),
      seed: { surface: 'sigil-pad' },
    })
    await store.hydrate()
    store.update((current) => ({ ...current, surface: 'original' }))
    store.reset()
    expect(store.getSnapshot().surface).toBe('sigil-pad')
  })
})
