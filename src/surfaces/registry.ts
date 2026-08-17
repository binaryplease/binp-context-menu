/**
 * The surface registry — one descriptor list for all seven directions.
 *
 * Everything that needs to *talk about* a surface reads this: the layer picks
 * the component, the picker lists the names and pitches, the settings panel
 * takes the section of knobs to show, a host builds its own switcher from it.
 * Nothing re-types "Whisper — type-to-command at the cursor" a second time,
 * which is what keeps a new surface from being half-added. One descriptor, one
 * wrapper, one guard — and this file is the descriptor.
 *
 * `settings` is here for exactly that reason. The panel shows one direction's
 * knobs — the active one's — and the alternative spelling, a `switch` on
 * `config.surface` inside the panel, is a second list of the seven that a new
 * entry here does not update. Declared beside the component, a direction cannot
 * reach the picker without its knobs coming along.
 */
import type { SurfaceId } from '../schema/config.ts'
import type { SurfaceDefinition } from './types.ts'
import { OriginalSurface } from './OriginalSurface.tsx'
import { WhisperSurface } from './WhisperSurface.tsx'
import { CompassSurface } from './CompassSurface.tsx'
import { StrataSurface } from './StrataSurface.tsx'
import { OrbitSurface } from './OrbitSurface.tsx'
import { SigilSurface } from './SigilSurface.tsx'
import {
  CompassSettings,
  OrbitSettings,
  SigilPadSettings,
  SigilSettings,
  StrataSettings,
  WhisperSettings,
} from './surfaceSettings.tsx'

export const SURFACES: SurfaceDefinition[] = [
  {
    id: 'original',
    name: 'Original',
    tagline: 'the flat list',
    description:
      'Every command stacked in one scannable column. Each invocation costs a full re-read — the floor the other six depart from, and still the right answer for four items.',
    scrim: false,
    scored: false,
    settings: {
      // No "above": the panel's shared half is not always on screen with this
      // section (`ContextMenuSettings scope="direction"`), so a hint that points
      // at where a knob sits is wrong in one of the two shells. Name the section,
      // not its position.
      hint: 'No knobs of its own — the flat list is the baseline the other six depart from, and it is deliberately the one direction with nothing to tune. What every direction learns, under Learning, still applies to it.',
      Component: null,
    },
    Component: OriginalSurface,
  },
  {
    id: 'whisper',
    name: 'Whisper',
    tagline: 'type-to-command at the cursor',
    description:
      'A caret drops where you clicked, already blinking. Type two letters and the command is selected; ranked by how often you use it, grouped by kind only while you browse.',
    scrim: false,
    scored: false,
    settings: {
      hint: 'What the browse list leads with, and the field’s size and wording. Search results stay ranked flat whatever the grouping says.',
      Component: WhisperSettings,
    },
    Component: WhisperSurface,
  },
  {
    id: 'compass',
    name: 'Compass',
    tagline: 'radial marking menu, one flick',
    description:
      'Every command sits on its kind’s arc, all of them on the wheel at once. Flick toward a kind, slide out to the command. After a week the hand knows the gesture and stops reading.',
    scrim: false,
    scored: false,
    settings: {
      hint: 'The wheel’s geometry — the three radii run hub, then kinds, then commands, so keep them in that order.',
      Component: CompassSettings,
    },
    Component: CompassSurface,
  },
  {
    id: 'strata',
    name: 'Strata',
    tagline: 'kind-segmented zones you glance',
    description:
      'The wall splits into labelled, colour-coded lanes side by side. You throw your eyes at the zone you mean and land on shape plus colour — a 2-D map instead of a scroll.',
    scrim: true,
    scored: false,
    settings: {
      hint: 'How wide a lane is and the line above the lanes. One lane per kind, so their number is your command set’s, not a setting — and where the wall opens is not one either: it is under the pointer, like any other menu.',
      Component: StrataSettings,
    },
    Component: StrataSurface,
  },
  {
    id: 'orbit',
    name: 'Orbit',
    tagline: 'self-sizing by your own usage',
    description:
      'Commands are pulled toward the cursor and sized by how often you use them. Run one and it grows for next time — the thing you want becomes the biggest, closest target.',
    scrim: false,
    scored: false,
    settings: {
      hint: 'The field: how many rings, how far out each one sits, how many commands it holds, and the size a bubble grows between. What it learns is a shared knob, under Learning.',
      Component: OrbitSettings,
    },
    Component: OrbitSurface,
  },
  {
    id: 'sigil',
    name: 'Sigil',
    tagline: 'cast a glyph — no menu at all',
    description:
      'No list, no wheel, nothing to scan. Give a command a rune — draw it, or take one from the palette — then trace it over the object and the system reads your intent.',
    scrim: false,
    scored: true,
    settings: {
      hint: 'The alphabet is yours: the Lexicon on the field lists every command, and a rune is drawn there or taken from the palette. These are how readily a reading is trusted, how long you get to take it back, and what counts as a stroke rather than a slip.',
      Component: SigilSettings,
    },
    Component: SigilSurface,
  },
  {
    id: 'sigil-pad',
    name: 'Sigil Pad',
    tagline: 'draw on the card, no click first',
    description:
      'The same casting field, reached without the click. Every row ends in a ruled pad: press it and the ink is already flowing. Summon and trace collapse into one unbroken gesture — and a right-click, which never touches the pad, can be pointed at any other direction.',
    scrim: false,
    scored: true,
    // The same field, so the same knobs — 05B adds the pad, not a second lexicon.
    // What it does add is a second *way in*, so its section is the field's knobs
    // plus the one question only this direction has: where the way in that is not
    // the pad goes. `SigilPadSettings` composes `SigilSettings` for that reason.
    settings: {
      hint: 'The same casting field as Sigil, so the same knobs and the same Lexicon — plus the one question only this direction has: a right-click never lands on the pad, so it can open any other direction instead of the field.',
      Component: SigilPadSettings,
    },
    Component: SigilSurface,
  },
]

export const SURFACES_BY_ID: Record<SurfaceId, SurfaceDefinition> = Object.fromEntries(
  SURFACES.map((surface) => [surface.id, surface]),
) as Record<SurfaceId, SurfaceDefinition>
