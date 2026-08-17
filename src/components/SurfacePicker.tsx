/**
 * The direction switcher — one control, wherever it appears.
 *
 * It shows up in at least two places (the library's settings panel and a host's
 * own navigation), which is the rule of two, so it is a shared component that
 * owns its own layout, ordering and wording rather than a shape each surface
 * re-lays-out — the shared wrapper owns placement, not just the markup inside
 * it. The only thing that varies between the
 * two is whether the full pitch is shown — a value, so it is a prop, not a second
 * copy ("the unit of sharing is the invariant", rule 2).
 *
 * "Affordances live next to what they change" — this one changes the menu
 * everywhere, so it is rule 2's global case and a host is right to put it in
 * global chrome.
 */
import { useContextMenuConfig } from '../runtime/context.ts'
import { SURFACES } from '../surfaces/registry.ts'
import type { SurfaceId } from '../schema/config.ts'

export type SurfacePickerProps = {
  className?: string
  /** Show each direction's full pitch under its name. */
  showDescription?: boolean
}

export function SurfacePicker({ className = '', showDescription = false }: SurfacePickerProps) {
  const { config, updateConfig } = useContextMenuConfig()

  return (
    <div className={`flex flex-col gap-0.5 font-cm-sans ${className}`} role="radiogroup">
      {SURFACES.map((surface, surfaceIndex) => {
        const isActive = config.surface === surface.id
        return (
          <button
            key={surface.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`flex w-full cursor-pointer items-start gap-2.5 rounded-cm-md px-2.5 py-2 text-left transition-colors ${
              isActive ? 'bg-cm-accent-soft text-cm-ink' : 'text-cm-ink-2 hover:bg-cm-hover'
            }`}
            onClick={() =>
              updateConfig((current) => ({ ...current, surface: surface.id as SurfaceId }))
            }
          >
            <span
              className={`w-[22px] shrink-0 pt-0.5 font-cm-mono text-[11px] ${
                isActive ? 'text-cm-accent' : 'text-cm-ink-4'
              }`}
            >
              {String(surfaceIndex).padStart(2, '0')}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[13px] leading-tight font-semibold tracking-[-0.01em]">
                {surface.name}
              </span>
              <span
                className={`mt-0.5 text-[11px] leading-snug ${isActive ? 'text-cm-ink-2' : 'text-cm-ink-3'}`}
              >
                {surface.tagline}
              </span>
              {showDescription && isActive ? (
                <span className="mt-1.5 text-[11.5px] leading-relaxed text-cm-ink-2">
                  {surface.description}
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
