/**
 * 05B is the one direction with two ways in, so it is the one place where "which
 * surface opens" is a decision rather than a lookup — and a decision that is
 * wrong in one of the two paths is invisible until someone actually right-clicks
 * beside the pad, or presses the pad after pointing the right-click somewhere
 * else. Both paths are asserted here, in both directions.
 */
import { describe, expect, test } from 'bun:test'
import { invocationSurfaceOf } from '../src/runtime/invocationSurface.ts'
import { ContextMenuConfigSchema, defaultConfig } from '../src/schema/config.ts'

describe('which direction answers an invocation', () => {
  test('the six directions with one way in ignore the source entirely', () => {
    for (const surface of ['original', 'whisper', 'compass', 'strata', 'orbit', 'sigil'] as const) {
      const config = ContextMenuConfigSchema.parse({ surface })
      expect(invocationSurfaceOf(config, 'trigger')).toBe(surface)
      expect(invocationSurfaceOf(config, 'cast-pad')).toBe(surface)
    }
  })

  test('05B answers the pad with the casting field, whatever the secondary says', () => {
    const config = ContextMenuConfigSchema.parse({
      surface: 'sigil-pad',
      'sigil-pad': { secondarySurface: 'original' },
    })
    // The pad's press *is* the first millimetre of a stroke — there is nowhere
    // else for it to go, and a list opening under a moving finger is the defect.
    expect(invocationSurfaceOf(config, 'cast-pad')).toBe('sigil-pad')
  })

  test('05B answers every other trigger with the configured secondary', () => {
    const config = ContextMenuConfigSchema.parse({
      surface: 'sigil-pad',
      'sigil-pad': { secondarySurface: 'whisper' },
    })
    expect(invocationSurfaceOf(config, 'trigger')).toBe('whisper')
  })

  test('out of the box a right-click still opens the field, as it always did', () => {
    // Adding the knob must not change what an existing install does: a stored
    // config from before it existed parses to this.
    const config = ContextMenuConfigSchema.parse({ surface: 'sigil-pad' })
    expect(config['sigil-pad'].secondarySurface).toBe('sigil')
    expect(invocationSurfaceOf(config, 'trigger')).toBe('sigil')
    expect(defaultConfig()['sigil-pad'].secondarySurface).toBe('sigil')
  })

  test('a secondary of 05B itself is the field, not a pad without a card', () => {
    // Legal in the type and left out of the panel's options: it resolves to the
    // same surface component `sigil` does, with no padOrigin to echo.
    const config = ContextMenuConfigSchema.parse({
      surface: 'sigil-pad',
      'sigil-pad': { secondarySurface: 'sigil-pad' },
    })
    expect(invocationSurfaceOf(config, 'trigger')).toBe('sigil-pad')
  })
})
