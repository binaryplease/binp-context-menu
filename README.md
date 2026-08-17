# context menu

**Seven context-menu directions as one React library — configurable, and
persistable through your own persist functions.**

A flat menu of twenty unlike things — object actions, shell scripts, app
launchers, product verbs — costs a full re-read on every invocation. This
library ships seven answers to that, behind one API, so the choice is a
*setting* rather than a rewrite:

| # | Direction | The idea |
|---|---|---|
| 00 | **Original** | The flat list you started with. The floor the rest depart from — and still right for four items. |
| 01 | **Whisper** | A caret drops where you clicked. Type two letters; reading cost collapses to the keys your fingers know. |
| 02 | **Compass** | Every command on its kind's arc, all at once. Flick toward a kind, slide out to the command — a gesture replaces the scan. |
| 03 | **Strata** | Four labelled, colour-coded lanes side by side. Throw your eyes at the zone you mean; a 2-D map beats a scroll. |
| 04 | **Orbit** | Bubbles pulled toward the cursor and sized by your own usage. The thing you want is the biggest, closest target. |
| 05 | **Sigil** | No list, no wheel. Give a command a rune — draw it or take one from the palette — then trace it over the object and the system reads your intent. |
| 05B | **Sigil Pad** | The same field, reached without the click: press the pad at a row's end and the ink is already flowing. A right-click misses the pad, so it can be pointed at any other direction. |

**[Try all seven →](https://zink.bot/v/h7ma4hjgzkh6ltypzolht7kquu)** — the demo in
`demo/`, published from this repo with `mise run publish`.

It began as a single-file prototype of five of these directions, under the name
*the context menu, reinvented*. That prototype is retired and this repo is the
productised take on it — its globals became a provider, its hard-coded arrays
became Zod schemas, and its per-direction copies became shared primitives. The
link above is the one it used to occupy.

## Install and mount

**Not on npm yet.** Install it from the repository:

```bash
bun add github:binaryplease/binp-context-menu    # peers: react, react-dom, zod (^3.24 || ^4)
```

There is no build step to run after it lands: the package exports its
TypeScript source directly (`exports` points at `src/`), which is also how hosts
are expected to mount it. When a registry release happens the package lands as
**`@binaryplease/context-menu`** — the specifiers move with it, to
`@binaryplease/context-menu` and `@binaryplease/context-menu/theme.css`, and
nothing else about the mount does. Until then the manifest name is
`binp-context-menu` and the imports below are what a host writes.

Zod resolves against **your** copy, so the library works on either major — a host
still on zod 3 mounts it without upgrading, and nothing in `src/` uses an API
that exists on only one of them.

```tsx
import { ContextMenuProvider, useContextMenu, MenuButton, CastPad } from 'binp-context-menu'
import { IconPlayerPlay, IconPin } from '@tabler/icons-react'

const KINDS = [
  { id: 'act', label: 'Act', description: 'do something to this task', color: '#7c3aed' },
  { id: 'run', label: 'Run', description: 'project scripts', color: '#16a34a' },
]

const COMMANDS = [
  { id: 'pin', label: 'Pin to rail', kindId: 'act', icon: IconPin },
  { id: 'build', label: 'build', kindId: 'run', icon: IconPlayerPlay, monospace: true },
]

function Board() {
  return (
    <ContextMenuProvider
      commands={COMMANDS}
      kinds={KINDS}
      onRun={(command, target) => runIt(command.id, target)}
    >
      {tasks.map((task) => <Row key={task.id} task={task} />)}
    </ContextMenuProvider>
  )
}

function Row({ task }) {
  const { triggerProps } = useContextMenu({ target: task, label: task.title })
  return (
    <div {...triggerProps} tabIndex={0} className="relative …">
      {task.title}
      <MenuButton target={task} targetLabel={task.title} />
      <CastPad target={task} targetLabel={task.title} />
    </div>
  )
}
```

That is the whole integration. Spreading `triggerProps` arms right-click plus
the keyboard equivalents (`Shift+F10`, the Menu key); `<MenuButton>` is the
visible trigger for everyone who never right-clicks; `<CastPad>` is the 05B
affordance, and renders only under the Sigil Pad direction — painted in neutrals,
because it sits on *your* card rather than on one of our surfaces, and re-pointed
with three tokens if you want it in your own colour.

### Styles

The components are styled with Tailwind v4 utilities over `cm-*` tokens. Import
the token file into your Tailwind build and point `@source` at the package, so
the utilities are emitted:

```css
@import "tailwindcss";
@import "binp-context-menu/theme.css";
@source "../node_modules/binp-context-menu/src";
```

Every token is a CSS custom property — override any `--color-cm-*` in your own
CSS and all seven surfaces follow. Nothing in the library paints a colour any
other way: there is no `theme` prop, no context, no JavaScript colour map, and no
literal hex in any surface — a guard in `mise run lint` fails the build on one.

### Light and dark

Both palettes ship. Every colour that differs is one `light-dark(light, dark)`
token, so there is no second copy to keep in sync, and which half resolves is
decided by the inherited CSS `color-scheme` property. Two mechanisms, in this
order of authority:

| | Where the theme comes from |
|---|---|
| **1. You pin it** | `.dark` / `.light`, or `[data-theme="dark"]` / `[data-theme="light"]`, on any ancestor — usually `<html>`. |
| **2. Nobody pinned it** | `prefers-color-scheme`, i.e. the operating system. |

```tsx
document.documentElement.classList.add('dark')     // dark
document.documentElement.classList.add('light')    // light, even on a dark OS
document.documentElement.classList.remove('dark', 'light')   // follow the OS
```

That is the whole integration — there is nothing to pass to the provider, and no
listener to register: mechanism 2 is CSS, so an OS theme change lands live. If
your design system already writes `.dark`/`.light` onto `<html>` — a very common
shape — there is nothing to wire at all, and a follow-the-OS mode that sets
neither class lands on mechanism 2, which is exactly what it means.
`color-scheme` is declared rather
than merely relied on, so the pieces the browser paints for us follow too: the
`<select>` and the checkboxes in the settings panel, the scrollbars on the
Lexicon and the settings body, the default focus ring.

The demo's header carries a light · dark · system control; it is fourteen lines
of class-writing on `<html>` (`demo/ThemeControl.tsx`) and is the reference
implementation.

#### A kind's colour is data, so it gets a legibility lift

`CommandKind.color` is the one colour in this library that is **yours**, not a
token — and it is almost always chosen against a white page. Dropped unchanged
onto the dark palette, a mid-tone violet or a forest green sinks into the
charcoal, and the lane it labels stops being findable. So every surface paints it
through one mix:

```css
color-mix(in oklab, <your colour>, var(--cm-kind-lift))
```

`--cm-kind-lift` is `transparent 0%` under light — the mix is the identity, so
your colour is used exactly as given — and 30% of `--color-cm-ink` under dark.
Two ways to take control, both token-only:

```css
:root { --cm-kind-lift-dark: var(--color-cm-ink) 45%; }   /* lift harder */
:root { --cm-kind-lift-dark: transparent 0%; }            /* lift not at all */
```

The second is what you want if you supply dark-aware kind colours yourself —
`color` is any CSS colour, so `light-dark(#7c3aed, #a78bfa)` is a valid kind
colour and flips with everything else.

#### Re-theming onto your own tokens

The supported alternative to accepting our palette is to re-point it at yours.
Because the tokens are read through `var()` at the use site, mapping them at
`light-dark()` pairs of your own means the menu flips *with* your app rather than
alongside it:

```css
@theme {
  --color-cm-bg: var(--color-bg);          /* your own light-dark pair */
  --color-cm-ink: var(--color-ink);
  --color-cm-accent: var(--color-blue);
  --color-cm-danger: var(--color-err);     /* the menu's Cancel row, in your red */
  …
}
```

Seven tokens are worth knowing about when you do, because they are the ones whose
role is *not* "a colour on the page":

| Token | What it is |
|---|---|
| `--color-cm-cast-accent` | The **casting field's own hue** — deliberately separate from `--color-cm-accent`, though the two ship the same violet. The accent is chrome laid over *your* board, so you re-point it at your interaction colour; the field is a takeover surface with none of your board left on it, and its hue is the material the whole thing is made of. One token for both would force you to choose between a menu that reads as your app and a field that reads as one thing. Everything the field paints derives from this — the trail, the ring, the runes, the instrument edges, the glows — so re-pointing it alone carries the surface. Keyboard focus rings on the field stay `--color-cm-accent`, because a focus ring is your app's. |
| `--color-cm-pad-fill` · `-edge` · `-ink` | The cast pad, and the only part of this library that is painted *on your surface* — a patch at the end of your own card, on screen whether or not a menu is ever invoked. So it ships neutral: the three are aliases of `--color-cm-bg-mute`, `--color-cm-rule-2` and `--color-cm-ink-2`, which means they follow a re-pointed palette for free. Override them to give the pad its own colour — `--color-cm-pad-ink: var(--color-cm-accent)` is the old violet pad back, in one line. |
| `--color-cm-on-accent` | Ink on a filled accent — the cast button's caption. It flips with the accent, not with the page: our dark accent is a light violet, and white on light violet is unreadable. Re-point this if you re-point `--color-cm-accent`. |
| `--color-cm-on-tone` | Ink on a filled kind colour — an Orbit bubble's icon and rim, and the specular highlight on it. Deliberately scheme-independent. |
| `--color-cm-cast-*` | The casting field's veil, ink, runes, trail and glow. The trail and the glow derive from `--color-cm-cast-accent` above, so re-point that rather than these; the veil and the white-hot trail core are the field's own material and stay put. The three trail colours are read back imperatively by the canvas painter, so they resolve through a live element rather than through `getPropertyValue` — any CSS colour works, `light-dark()` and `color-mix()` included. |
| `--color-cm-cast-plate` · `-edge` · `-seam` | The two things the casting field still puts on a card — the reading card and the mute toggle. Glass tinted toward the field's hue rather than the page's panel colour, so they read as objects on the field instead of chrome from another screen. `-edge` and `-seam` derive from `--color-cm-cast-accent`; `-plate` is a pair of its own, because what is read on it is the page's ink — re-point it alone to sit them on your own surface colour. (The Lexicon is *not* one of these: it is set directly on the veil — see below.) |
| `--color-cm-tip` · `-edge` (and `--shadow-cm-tip`) | The chip that explains an unavailable command — the one piece of chrome that can appear on any of the seven surfaces, since a command that cannot run is unavailable on all of them. Aliases of the `cast-plate` trio above, because it is the same kind of object: a small instrument floated over a surface. (It used to be the ink token inverted, which on a light board is a black slab that reads as a browser tooltip from another application.) Re-point these three to give the explanation your own colour without touching the field's instruments. |
| `--cm-kind-lift-dark` | The kind-colour lift above. Not a colour: a `color-mix` tail. |

## Configuration

Everything a user can change lives in one Zod-validated config object, read
through `useContextMenuConfig()` and written with a recipe:

```tsx
const { config, updateConfig, resetConfig } = useContextMenuConfig()

updateConfig((current) => ({ ...current, surface: 'compass' }))
updateConfig((current) => ({ ...current, sound: { ...current.sound, enabled: false } }))
```

Or drop in the shipped UI, which covers every knob and grows with the schema:

```tsx
<ContextMenuSettings />                    // the whole panel, inline
<ContextMenuSettings scope="direction" />  // just the active direction's half
<SurfacePicker showDescription />          // just the direction switcher
```

### The panel is scoped to the direction you are using

Seven directions' knobs at once means someone on Orbit scrolls past Whisper's
grouping toggles and Compass's wheel diameter to reach nothing of their own. So
the panel shows three things, in this order:

| | |
|---|---|
| **The direction picker** | Always. It is the first thing in the panel, so the control you switch with never moves when a taller or shorter section replaces the one below it. |
| **What applies to every direction** | Learning: the switch, the rate, the ceiling, and what has been learned so far. |
| **The active direction's own knobs** | One section — Whisper's grouping, Compass's geometry, Strata's lanes, Orbit's rings, Sigil's confidence and rune count — plus **Sound**, which appears only under the two casting directions, because they are the only ones that play anything. |

Switching direction swaps that last part in place. `Original` has no knobs of its
own and says so in a line of copy, rather than showing an empty box.

`scope="direction"` renders that last part *alone* — the active direction's
section, and Sound under a scored one — for a shell that already carries a picker
beside it and would otherwise show a second one two hundred pixels from the
first. It is the same panel and the same rows either way; the prop chooses how
much of it is on screen, never a second spelling of a knob. Two conditions come
with it: a picker has to be visible next to it (that is what makes this
information architecture rather than a hidden control), and the shared half —
Learning, Restore defaults — has to be reachable somewhere else. The demo meets
both: the picker is the column to its left, and the whole panel is one click away
behind Configure.

This is the *relevance* carve-out in *unavailable is never invisible*, not a
breach of it: another direction's knobs are not an *unavailable* control, they
are irrelevant to the current context, which is information architecture — and
nothing is unreachable, because the picker is right there and switching reveals
them. It does not extend to disabled **commands**, which stay visible and
explained on all seven surfaces.

Which section belongs to which direction is a property of the direction —
`SURFACES[].settings` — so a new direction cannot reach the picker with its knobs
orphaned:

```tsx
{
  id: 'orbit',
  name: 'Orbit',
  scored: false,                       // ⇒ no Sound section under it
  settings: { hint: 'The field: how many rings, …', Component: OrbitSettings },
  Component: OrbitSurface,
}
```

### The settings dialog

Hosts that keep preferences in a modal get the same panel in a dialog shell,
rather than hand-rolling one around it:

```tsx
const [isSettingsOpen, setIsSettingsOpen] = useState(false)

<button aria-haspopup="dialog" onClick={() => setIsSettingsOpen(true)}>Configure</button>

<ContextMenuSettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
```

| Prop | Default | |
|---|---|---|
| `open` | — | Renders nothing when false. |
| `onClose` | — | Called by Escape, a press on the backdrop, and the close button. |
| `title` | `'Configuration'` | The visible heading, which is also the dialog's accessible name. |
| `showSound` | `true` | Forwarded to the panel — `false` suppresses the sound section outright, for a host that never wants the menu to make a noise. Left `true`, it still appears only under the two casting directions. |

It is `<ContextMenuSettings>` in a frame, not a second settings UI: the knobs,
their order, their layout and the direction-scoping above are the panel's, so a
knob added to the schema appears in both, and a slider turned in one shows its new
value in the other. (The demo runs both shells at once — the dialog behind
Configure for the whole panel, and its direction-scoped half mounted inline as a
column against the picker, which is what you want while you are actually invoking
the menu.) The shell adds what a dialog owes a keyboard user — `role="dialog"`
with `aria-modal`, focus moved into the dialog on open and trapped while it is
open, and focus handed back to the control that opened it on close. Both it and
the menu layer mount through the library's single portal, so neither can be
clipped by a host's `overflow: hidden`.

The config covers: the active direction · learned usage and whether to keep
learning · hidden commands · the sound palette (master gain, summon/cast takes,
carrier bed, reverb, repeat-ducking) · Whisper's grouping, width and wording ·
Compass's radii, label rotation and sizing · Strata's lanes · Orbit's rings,
bubble sizes and learning rate · Sigil's bound runes, lexicon visibility,
confidence threshold and auto-cast delay · and, under Sigil Pad, which direction a
right-click opens and how loudly the pad announces itself.

### 05B has two ways in, and they need not open the same thing

Six of the seven directions have one way in, so "which surface opens" is answered
by `config.surface` and there is nothing to decide. **Sigil Pad has two**: the pad,
where the press is already the first millimetre of the stroke, and every other
trigger you armed — a right-click on the card around it, `<MenuButton>`,
`Shift+F10`. A right-click cannot land on the pad, so it is free to open something
else:

```tsx
updateConfig((current) => ({
  ...current,
  surface: 'sigil-pad',
  'sigil-pad': { secondarySurface: 'whisper' },
}))
```

The pad still casts; the right-click now drops Whisper's caret. That is the
configuration that makes the gesture an *expert* path instead of the only path —
the hand that has learned its runes uses the pad, the one that has not gets a menu
it can read, and neither has to switch direction to reach the other. Any direction
is accepted (the settings panel offers all of them but 05B itself, which as a
secondary is just `sigil`).

The default is `'sigil'` — the casting field, which is what a right-click under
05B has always opened, so the knob adds a path and takes none away. The panel
shows it as **Right-click opens**, above the field's own knobs, whenever Sigil Pad
is the active direction.

Which direction answers a given press is one function, and it is exported for a
host arming its own trigger:

```tsx
import { invocationSurfaceOf } from 'binp-context-menu'

invocationSurfaceOf(config, 'trigger')    // 'whisper' — a right-click, the ⋮ button, Shift+F10
invocationSurfaceOf(config, 'cast-pad')   // 'sigil-pad' — the pad, always the field
```

### The pad says as much as its user still needs

`<CastPad>` is the one piece of this library that stands on **your** card — on
screen before any menu is invoked and whether or not one ever is. A first-run pad
has to say what it is; the hand that has cast a hundred glyphs off it is being
told something it already knows, every time it looks at the row. So how loudly it
announces itself is a knob, not a constant:

```tsx
updateConfig((current) => ({
  ...current,
  'sigil-pad': { ...current['sigil-pad'], background: 'ruled', showSignal: false },
}))
```

| | |
|---|---|
| `background` | The patch's grain: `dots` (the default, and what the pad has always carried) · `ruled` · `grid` · `hatch` · `none`. Every pattern is one colour mixed from `--color-cm-pad-ink`, so a re-pointed pad takes all five with it. The names and the paint are one list, `PAD_BACKGROUNDS`, exported for a host writing its own settings UI. |
| `showSignal` | The **cast signalling** — the traced mark and the word beneath it, which together are how the patch says *casting happens here*. Off, it is a ruled patch and nothing more. |

Turning the signalling off is not hiding a control. The pad keeps its
dashed edge, its grain, its crosshair cursor, its hover and focus treatments, its
place in the tab order — and its accessible name, which is unconditional: the mark
and the caption were never what carried this affordance to a screen reader, so a
sighted user putting them away must not take a blind user's only explanation with
them.

### The radial surfaces size themselves to your labels

`Command.label` is your text, and the library's job is to draw what it is handed
— so the two radial surfaces measure the labels before they place them, and grow
to hold them:

| | |
|---|---|
| **Compass** | `compass.diameter` and `compass.itemRingRadius` are *floors*. The rim moves out until the longest label — at its own angle, in its own face — sits inside it. A command set that already fitted comes out at exactly the size it did before. |
| **Orbit** | `orbit.rings[].radius` is a floor. Each ring is pushed out until the chord between two neighbouring bubbles clears the widest caption on that ring, and the rings outside it move with it, keeping the gaps you configured. |

Growth stops at the viewport (or at `compass.maxDiameter`, if you set one): the
field is placed by its own radius, so one that outgrew the screen would only
overflow a different edge. Past that point labels are clipped with an ellipsis —
their full text stays in the DOM, so the accessible name is complete, `title`
carries it, and on the Compass the hub names it in full under the pointer.

Set `compass.fitLabels: false` / `orbit.fitLabels: false` to pin the geometry
instead, if you have tuned your own radii around a command set you control.

Seed it per app with `defaultConfig`:

```tsx
<ContextMenuProvider defaultConfig={{ surface: 'orbit', whisper: { placeholder: 'Run a command…' } }} … />
```

## Persistence — bring your own functions

The library never reaches for a storage backend on its own. Hand it a `load`
and a `save` and it remembers; hand it nothing and the config lives as long as
the page.

```tsx
<ContextMenuProvider
  persistence={{
    load: () => fetch('/api/menu-config').then((response) => response.json()),
    save: (config) => fetch('/api/menu-config', { method: 'PUT', body: JSON.stringify(config) }),
  }}
  onPersistError={(error, phase) => reportToSentry(error, { phase })}
  …
/>
```

Both functions may be async, so `save` can post to a server, write a file over
IPC, or push into a sync engine. Two adapters ship for the common cases:

```tsx
import { createLocalStoragePersistence, createMemoryPersistence } from 'binp-context-menu'

persistence={createLocalStoragePersistence({ storageKey: 'my-app.menu' })}
persistence={createMemoryPersistence()}   // the default
```

What you get for free, whatever the backend:

- **A stored config written by an older version still parses.** Every field in
  the schema declares a default, so a config from before a knob existed comes
  back fully populated — no migration, no `??` at any read site.
- **Nothing is written before the first load completes,** so the value you are
  about to read is never clobbered by the seed.
- **A local change during a slow load wins.** The load does not undo it.
- **A failing backend is reported, not fatal.** A full quota or a corrupt value
  reaches `onPersistError`; the menu carries on with the config it has.

## What the menu learns

Running a command raises its weight. That is what sizes Orbit's bubbles and
ranks Whisper's "most used", and it is the main reason persistence exists —
without somewhere to keep it, Orbit resets to a stranger's menu on every reload.
Learning is a switch (`config.learnFromUsage`), the rate is a number
(`config.orbit.learnIncrement`), and there is a ceiling so one command cannot
swallow the field.

## Commands

```ts
type Command = {
  id: string                 // identity — no default, fails loud if missing
  label: string              // always a plain string — see below
  kindId: string             // must match a CommandKind you supplied
  icon: ComponentType | null // a @tabler/icons-react component
  shortLabel: string | null  // used where space is tight (Compass, Strata)
  hint: string | null        // trailing affordance, e.g. '⏎'
  detail: string | null      // secondary text beside the label
  monospace: boolean         // shell slugs and app names
  keywords: string[]         // extra terms the fuzzy matcher may consider
  weight: number             // starting weight, before learned usage
  glyph: string | null       // a rune you ship for it, by palette name — the
                             // user's own binding overrides it (see The Lexicon)
  disabledReason: string | null   // non-null ⇒ disabled *and explained*, never hidden
  href: string | null        // opens a URL — rendered as a real anchor
  destructive: boolean       // cancel/delete — tinted with the danger token everywhere
  run: (() => void) | null
}
```

`disabledReason` is the interesting one: a command that cannot run right now
stays visible on all seven surfaces, keeps its place, and explains itself on
hover **and** on keyboard focus. The explanation is floated out to the end of
`<body>` and placed against the control's own box, so it is not sliced by
whatever the surface around it scrolls or rotates — a Lexicon row and a Compass
label are both clipping contexts, and a chip inside them showed you half a
sentence at an angle.

**`destructive`** is a property of the command, not of the surface drawing it, so
it survives the trip to every direction: a cancel row is red in the list, a red
wedge on the Compass wheel, a red planet in the Orbit field, and red on the Sigil
reading card the half-second before that card casts itself. Override
`--color-cm-danger` and all five follow.

**`href`** makes the command a real `<a>`, not a button that calls `window.open`.
That is what keeps middle-click, ⌘/ctrl-click, "copy link address" and the
status-bar preview working — an `onClick` swallows every one of them. A plain
left click still goes through `runCommand`, so usage is learned and the menu
closes; the surfaces that never touch an anchor (a Compass slice, a cast rune,
Whisper's ⏎) navigate through the same path. Schemes that execute script
(`javascript:`, `data:`, `vbscript:`) are refused when the command is parsed,
including the tab-and-newline spellings a browser would still honour — a URL
scraped out of a log is not trusted input. An unavailable link renders as an
inert, focusable button with no `href` at all.

**`detail`** is the dim half of a two-part row — the line a URL was scraped
from, what a transition will do, which branch a command acts on. It is separate
from `label` because `label` has three text-only readers: the fuzzy matcher
segments it character by character, the Compass hub prints it as the wheel's one
sentence, and the Sigil card sets it in the accent face. Detail is *not* searched
— put words that should match in `keywords`, which Whisper surfaces when they are
what produced the hit.

### The Lexicon — the alphabet is the user's

**Nothing ships bound.** Out of the box no command has a rune: the Sigil field's
Lexicon lists every command with an empty slot beside it, and the stroke that
fills it is drawn on the field or taken from the palette, by the person who will
be casting it. An alphabet somebody else chose is one more thing to memorise, and
`Pin to rail` is not obviously `∧` to anyone but the author.

The library ships exactly one rune, and it is not a command's: **a single stroke
from the top straight down closes the field**. Leaving is the one thing every
casting session needs and no host command provides, so it cannot wait on a
binding the user has not made yet — a first-run field can always get out by
drawing. It is pinned above the Lexicon's list rather than sitting in it — the
way out of a surface should not be the thing that scrolls off the top of it — and
it is not editable.

The Lexicon itself is laid out **on the field, under the casting ring**, centred on
the point the stroke starts from, in up to three columns. There is no panel: it is
set directly on the veil, so the gaps between its columns and rows are still field —
press one and you start a stroke — and it dims out of the way while you draw. Near
the bottom edge of the board it flips above the ring, taking the field's prompt line
with it. Turn it off entirely with `config.sigil.showLexicon`.

Binding happens where casting happens. Press ＋ beside a command and
the whole field becomes the input: draw the stroke at the size and speed you will
draw it for real, release, and the panel shows what it read with **Keep rune** and
**Redraw** — nothing is written until you keep it. If the stroke is close enough
to an existing rune that the recognizer would have to guess between them, the
panel says so, naming the rune it collides with, before you commit. Or skip
drawing and take one of the fifteen shipped runes (`DEFAULT_GLYPHS`) from the
palette; a named rune has one owner, so taking one that already casts something
else moves it.

Bindings live in `config.sigil.runes` — `{ commandId, name, points }` — so they
go through your `save` with everything else and come back on the next load. They
are keyed by command id, which is what lets a host add, remove and re-add a
command without a user losing the gesture they learned for it.

A host can still ship an alphabet by naming a palette rune in `Command.glyph`,
and pass its own `glyphs` to the provider to replace the palette entirely. The
user's own rune always wins over the host's: a rune is muscle memory, and a
release that silently re-points a learned gesture is a defect.

### Sound

The Sigil directions are scored, and every cue is synthesized in code — there
are no audio assets. Pitches are all partials of one 55 Hz string, including the
7th and 11th (385/605 Hz), which are perfectly in tune with the series and exist
nowhere on a piano: *in tune with itself, out of tune with Earth*. Summon blooms
up the ladder; cast collapses down it into the only 55 Hz fundamental in the
score. Repeat-ducking makes the hundredth hearing a whisper. All of it is off
one switch, and the switch is persisted.

## Develop

```fish
bun install
mise run dev         # the demo — all seven directions on a real board
mise run check       # typecheck + surface guard + tests — the gate CI runs
mise run publish     # build it and replace the hosted demo in place
```

[mise](https://mise.jdx.dev) pins the toolchain and is what these docs quote, but
every task has a `bun run` equivalent in `package.json` — `bun run dev`,
`bun run check` — for anyone who does not have it.
[`CONTRIBUTING.md`](./CONTRIBUTING.md) is the short version of this section: the
gate, what the surface guard is for, and the two things it cannot check for you.
Conduct in the project's spaces is [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

[`AGENTS.md`](./AGENTS.md) is the document behind the code — which primitive
owns what, how the house rules land here and what enforces each one, and the
traps this codebase already paid for.

The demo (`demo/`) is also the reference host: it wires a custom persist pair,
composes `SurfacePicker` into its own sidebar, mounts
`<ContextMenuSettings scope="direction">` as a live column against that sidebar
*and* opens the same panel whole as a dialog from its Configure button, carries
the light · dark · system switch, and shows what the seam looks like from the
outside.

It also seeds six runes on a browser's first visit (`demo/seedRunes.ts`), so the
casting field can be *cast on* before anyone has invented an alphabet. That is a
host writing a user's config, once, and the library still ships nothing bound —
no command in `demo/commands.ts` carries a `glyph`, and the twenty other rows in
the Lexicon still show the ＋ that is the point.

`mise run publish` builds `dist/demo` and replaces one hosted zink entry in
place — the slug in `.zink-slug`, which is the same entry the retired prototype
used to serve. Same link, new version; the script fails loudly rather
than hosting a second entry if the sidecar goes missing or comes back changed.

Its theme control is how you check colour work, and you should: `mise run check`
passes happily on a menu that is a white plate on a black page. Open each
direction you touched in **both** themes.

## Security

Please report a vulnerability through [private vulnerability
reporting](https://github.com/binaryplease/binp-context-menu/security/advisories/new)
rather than a public issue. [`SECURITY.md`](./SECURITY.md) has the scope, which
is narrow by construction: this is a client-side library with no server, no API
client and no runtime fetch, so the realistic surface is `Command.href` scheme
handling, host data rendered as content, and what comes back through your own
persist functions.

## License

MIT — see [`LICENSE`](./LICENSE).

The third-party software that travels with it is listed in
[`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md): every dependency is MIT,
and the two faces the demo self-hosts rather than fetching from a font CDN —
Inter and JetBrains Mono — are under the SIL Open Font License 1.1,
which asks for the copyright notice *and* the licence text wherever the font
files go. `dist/demo` is one of the places they go, so `mise run build` emits
that file as `third-party-notices.html` beside `index.html` and the demo's
sidebar links to it. It is one file with two renderings, not two copies —
`scripts/thirdPartyNotices.ts`, guarded by `test/third-party-notices.test.ts`.
