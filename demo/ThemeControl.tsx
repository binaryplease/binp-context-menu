/**
 * The demo's theme switch — light · dark · system.
 *
 * This is *host* code, deliberately. The library ships no theme prop, no theme
 * context and no JavaScript colour map: `src/theme.css` carries both palettes as
 * `light-dark()` token pairs and reads which one to resolve off the inherited
 * `color-scheme` property. So switching themes is three lines of class-writing on
 * `<html>`, and every one of the seven directions follows without being told.
 *
 * The two mechanisms the token file documents are both visible here:
 *
 *   • **light** / **dark** write `.light` / `.dark` onto `<html>` — the same
 *     classes most design systems already write, which is why such a host needs
 *     no wiring at all beyond what it already does.
 *   • **system** writes *neither*, and the token file's `prefers-color-scheme`
 *     fallback takes over. Nothing here reads `matchMedia`, so an OS theme change
 *     lands live, with no listener and no re-render.
 *
 * Affordances live next to what they change, and placement must match scope:
 * this one re-themes the whole page, so the page's own global chrome is where it
 * has earned a seat.
 */
import { useEffect, useState } from 'react'
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react'
import { z } from 'zod'

const STORAGE_KEY = 'binp-context-menu-demo.theme'

/**
 * Parsed rather than cast, because `localStorage` is a boundary and a stale or
 * hand-edited value must not decide what class lands on `<html>` ("Zod is the
 * type source").
 * `.catch` makes an unreadable value mean "system", which is also the default.
 */
const ThemeChoiceSchema = z.enum(['light', 'dark', 'system']).catch('system')

type ThemeChoice = z.infer<typeof ThemeChoiceSchema>

const CHOICES: { id: ThemeChoice; label: string; Icon: typeof IconSun }[] = [
  { id: 'light', label: 'Light', Icon: IconSun },
  { id: 'dark', label: 'Dark', Icon: IconMoon },
  { id: 'system', label: 'System', Icon: IconDeviceDesktop },
]

function readStoredChoice(): ThemeChoice {
  return ThemeChoiceSchema.parse(window.localStorage.getItem(STORAGE_KEY))
}

/**
 * Write the choice onto `<html>`. `system` is the *absence* of a pin rather than
 * a third class: with neither set, the token file's
 * `:root:not(.light):not(.dark)` rule follows `prefers-color-scheme`.
 */
function applyChoice(choice: ThemeChoice): void {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')
  if (choice !== 'system') root.classList.add(choice)
}

/**
 * Called from `main.tsx` before the first render, so a reload into the dark
 * palette does not flash the light one for a frame. Same function the control
 * uses, so the two cannot disagree.
 */
export function applyStoredTheme(): void {
  applyChoice(readStoredChoice())
}

export function ThemeControl() {
  const [choice, setChoice] = useState<ThemeChoice>(readStoredChoice)

  useEffect(() => {
    applyChoice(choice)
    window.localStorage.setItem(STORAGE_KEY, choice)
  }, [choice])

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex shrink-0 items-center gap-0.5 rounded-cm-lg border border-cm-rule bg-cm-bg p-0.5"
    >
      {CHOICES.map(({ id, label, Icon }) => {
        const isActive = choice === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isActive}
            // The icon is decoration ("real vector icons, never characters"), so
            // the accessible name is the button's, not the glyph's.
            aria-label={label}
            title={label}
            className={`grid size-[30px] cursor-pointer place-items-center rounded-cm-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cm-accent ${
              isActive
                ? 'bg-cm-accent-soft text-cm-accent'
                : 'text-cm-ink-3 hover:bg-cm-hover hover:text-cm-ink'
            }`}
            onClick={() => setChoice(id)}
          >
            <Icon size={15} stroke={1.9} />
          </button>
        )
      })}
    </div>
  )
}
