/**
 * The settings panel's control vocabulary — a section, and four kinds of row.
 *
 * It lives in its own module because a *direction's* knobs are declared beside
 * that direction (`surfaces/surfaceSettings.tsx`) rather than inside the panel,
 * and both need these. One vocabulary is the point: every knob in this library
 * reads as `label on the left, control on the right`, whichever direction owns
 * it, so a new section is composed from these four and never spells its own
 * label/control geometry. The shared unit is sized to the invariant, and the
 * invariant here is the row rather than the panel; the interaction states these
 * carry are shared tokens for the same reason.
 *
 * Deliberately un-exported from the package index: these are how the library's
 * own sections are written, not a host-facing form kit.
 */
import type { ReactNode } from 'react'

export function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children?: ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="font-cm-mono text-[10px] tracking-[0.09em] text-cm-ink-3 uppercase">{title}</h3>
      <p className="text-[11.5px] leading-snug text-cm-ink-3">{hint}</p>
      {children === undefined ? null : <div className="mt-1 flex flex-col gap-1">{children}</div>}
    </section>
  )
}

export function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-cm-ink-2">{label}</span>
      <input
        type="checkbox"
        className="size-4 accent-cm-accent"
        checked={checked}
        onChange={(changeEvent) => onChange(changeEvent.target.checked)}
      />
    </label>
  )
}

export function NumberRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="min-w-0 text-cm-ink-2">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        <input
          type="range"
          className="w-24 accent-cm-accent"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(changeEvent) => onChange(Number(changeEvent.target.value))}
        />
        <span className="w-10 text-right font-cm-mono text-[11px] text-cm-ink-3">{value}</span>
      </span>
    </label>
  )
}

export function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-cm-ink-2">{label}</span>
      <select
        className="max-w-[190px] cursor-pointer rounded-cm-sm border border-cm-rule bg-cm-bg px-2 py-1 text-[12px]"
        value={value}
        onChange={(changeEvent) => onChange(changeEvent.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * The row for a knob that is not a value but a *deed* — forget the learned
 * usage, forget the bound runes. Same geometry as the four above, with the
 * standing count where a control would be, because "3 runes · Forget" is the
 * only way the button says what it will cost.
 *
 * It exists so the two of them are one row rather than two hand-written
 * flex/justify-between blocks that drift apart (the invariant is the row, not
 * the panel).
 */
export function ActionRow({
  label,
  value,
  actionLabel,
  onAction,
}: {
  label: string
  value: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-cm-ink-2">
        {label}
        <span className="ml-1.5 font-cm-mono text-[11px] text-cm-ink-3">{value}</span>
      </span>
      <button
        type="button"
        className="shrink-0 cursor-pointer rounded-cm-md border border-cm-rule px-2 py-1 text-[11.5px] font-medium hover:bg-cm-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cm-accent"
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  )
}

/**
 * The row for a knob whose value is wording — Strata's caption, Whisper's
 * placeholder and scope label. Same geometry as the other three, so a string
 * knob does not arrive as a second control language; it is only ever a
 * *hostable* default, which is why the label says so.
 */
export function TextRow({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="shrink-0 text-cm-ink-2">{label}</span>
      <input
        type="text"
        className="w-[190px] min-w-0 rounded-cm-sm border border-cm-rule bg-cm-bg px-2 py-1 text-[12px] text-cm-ink placeholder:text-cm-ink-4"
        value={value}
        placeholder={placeholder}
        onChange={(changeEvent) => onChange(changeEvent.target.value)}
      />
    </label>
  )
}
