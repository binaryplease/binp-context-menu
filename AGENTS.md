# AGENTS.md

Guidance for AI agents working in **binp-context-menu**.

`README.md` is the user-facing documentation and is canonical for the public
API — read it first. This file covers what a session needs to know *before*
changing code: which primitive owns what, how the house rules land here, and
the traps this codebase has already paid for. Several of those rules are held
by `mise run lint` rather than by prose.

## What this project is

A React library of seven context-menu surfaces ("directions") over one command
set, one config, and one persistence seam. It grew out of a single-file
prototype of five of those directions; this repo is the productised take, not a
port — the prototype's globals became a provider, its hard-coded arrays became
Zod schemas, and its per-direction copies became shared primitives.

The prototype is **retired**, and the link it used to serve —
`https://zink.bot/v/h7ma4hjgzkh6ltypzolht7kquu`, recorded in `.zink-slug` at this
repo's root — is now the demo, replaced in place by `mise run publish`. There is
one live "context menu, reinvented" and it is built from `demo/`. Publishing from
anywhere else forks the link in two.

### The project has three names, and they are not interchangeable

A rename here is not a find-and-replace, because `binp-context-menu` is doing
three unrelated jobs and only one of them changed.

| Name | Where it appears | Why |
|---|---|---|
| **context menu** | prose that names the project to a human — the README's H1, the demo's wordmark and board, the `<title>`s, the third-party notices heading | the display name, no prefixes. `binp-` is the owner's repo-naming convention, which is not something a reader of the library needs |
| **`binp-context-menu`** | `package.json`'s `name`, every import specifier and the `theme.css` path, the GitHub repo and every URL into it, `data-binp-context-menu-*`, the default `storageKey`, the demo's four localStorage keys, `[binp-context-menu]` log prefixes | the identifier. Hosts mount this library by aliasing its source, so the manifest name is *their* import specifier; the rest are flat global namespaces (DOM, per-origin storage) that no npm scope reaches and that this library shares with the host app it mounts inside |
| **`@binaryplease/context-menu`** | the README's install section, as the name a registry release will take | reserved, not in force. npm publishing is deferred; nothing is on the registry, and the `@binaryplease` scope is unclaimed |

So: do not rename the manifest, the DOM attributes, the storage keys or the log
prefixes to match the display name. The manifest name moves on the day the
package is first published to npm — that is one breaking change for the host
that aliases it, and it is spent once.

## Stack & commands

Bun + TypeScript + React 19 + Tailwind v4 + Zod, strict, ESM, no build step for
the library (source-exported via `exports`). Vite builds the demo only.

Zod is a **peer on `^3.24 || ^4`**, and that range is load-bearing: hosts mount
this library by aliasing its TypeScript source, so `import { z } from 'zod'`
resolves against *their* copy — and the app this library was first built for is
still on zod 3. Nothing in `src/` may use an API that exists on only one major.
The dev dependency is zod 4, so a zod-4-only call typechecks locally and explodes
at a host's mount; when you touch a schema, check the other major too
(`bun add -d zod@3.24.4 && mise run check`, then put it back).

```fish
bun install
mise run dev         # demo on 127.0.0.1:5173 (or the next free port)
mise run typecheck
mise run test        # bun test
mise run lint        # the surface guard
mise run check       # all three
mise run build       # dist/demo (relative `base` — the demo is served from a subpath)
mise run publish     # build, then replace the hosted demo at the slug in .zink-slug
```

There is no server, no API and no authentication — the library is client-only and
the demo is a static bundle.

## The primitives — compose these, do not re-derive them

This is the part that binds. Seven surfaces share one affordance, and that only
holds while every surface goes through the shared pieces: one descriptor, one
wrapper, one guard. The table below is this repo's list of wrappers.

| Primitive | File | Owns |
|---|---|---|
| `ContextMenuProvider` | `src/runtime/ContextMenuProvider.tsx` | parsed commands/kinds, config store, sound bus, invocation state, **the one `runCommand` path** |
| `useContextMenu` | `src/runtime/useContextMenu.ts` | how a host surface arms itself (right-click + keyboard) |
| `OverlayPortal` | `src/runtime/OverlayPortal.tsx` | **the one mount point** — the only `createPortal` in the library |
| `invocationSurfaceOf` | `src/runtime/invocationSurface.ts` | **the one answer to "which direction does this press open?"** — resolved once, at the press, and carried on the invocation |
| `MenuLayer` | `src/runtime/MenuLayer.tsx` | **the one menu overlay** — scrim, Escape, outside-press, scroll dismissal |
| `ContextMenuSettings` | `src/components/ContextMenuSettings.tsx` | **the one settings panel** — the picker, what applies to every direction, and *only the active direction's* section (Sound rides along under the two scored directions); `scope="direction"` renders that last part alone, for a shell with a picker of its own beside it |
| `ContextMenuSettingsModal` | `src/components/ContextMenuSettingsModal.tsx` | the dialog shell around `ContextMenuSettings` — semantics, focus, dismissal |
| `SettingsRows` | `src/components/SettingsRows.tsx` | **the one control vocabulary** — `Section`, `ToggleRow`, `NumberRow`, `SelectRow`, `TextRow`, `ActionRow`. A knob is one of these six; nothing spells its own label/control geometry |
| `surfaceSettings` | `src/surfaces/surfaceSettings.tsx` | each direction's own knobs, one component per direction, pointed at from its registry entry |
| `CommandButton` | `src/components/CommandButton.tsx` | **the one unavailable treatment** — `aria-disabled`, refusal, hover *and* focus explanation, floated through `OverlayPortal` and placed by `placeExplanation` — and **the one anchor**, for `Command.href` |
| `theme.css` | `src/theme.css` | **the one palette** — every colour as a `light-dark()` pair, plus the `color-scheme` switches both themes resolve through |
| `commandTone` | `src/components/commandTone.ts` | **the one destructive treatment** — `toneColorOf` for coloured paint, `toneStyleOf`/`hoverToneClass`/`activeToneClass` for ink and backgrounds — and **the one kind-colour lift**, `kindColorOf` |
| `resolveColourToken` | `src/runtime/colourTokens.ts` | the seam that gets a token into `strokeStyle` — the Sigil trail is the only thing here that paints without CSS |
| `CommandVisuals` | `src/components/CommandVisuals.tsx` | the leaf pieces — icon tint, label face + tone + highlight, `detail`, kind badge |
| `CommandRow` | `src/components/CommandRow.tsx` | the shared list row (Original + Whisper) |
| `SurfacePicker` | `src/components/SurfacePicker.tsx` | the direction switcher, wherever it appears |
| `SURFACES` | `src/surfaces/registry.ts` | the one descriptor list — names, taglines, pitches, components |
| `createStrokeChannel` | `src/runtime/strokeChannel.ts` | the seam that lets 05B start a stroke before the field exists |
| `runes.ts` | `src/runtime/runes.ts` | **the one answer to "what casts this?"** — `resolveRune` (the user's rune, else the host's `Command.glyph`), and the two recipes that are the only way a binding changes |
| `useLabelMetrics` | `src/runtime/useLabelMetrics.tsx` | **the one measure pass** — renders a hidden, laid-out copy of a surface's labels and hands back their boxes, so a surface sizes itself to real text instead of a character count |
| `radialFit` | `src/lib/radialFit.ts` | the maths both radial surfaces size themselves with — a placed label's reach, the width a rim leaves it, the fixed point that turns those into a radius, and the chord between two neighbours on a ring |
| `lexiconLayout` | `src/lib/lexiconLayout.ts` | **the one answer to "where does the Lexicon go?"** — how wide, how many columns (three at the cap), below the ring or flipped above it, and where the field's prompt line rides, since that is the same question about the same ring |

`scripts/guard-surfaces.ts` (`mise run lint`) fails the build on the six
regressions that matter: a hand-rolled `disabled=` control, a hand-written
`href=`, a hand-rolled `cm-danger` tint, a second `createPortal`, a direct write
to `config.usage`, and a **raw colour literal** under `src/surfaces` or
`src/components` (a hex, an `rgb()`/`oklch()`, a `bg-white`-style utility). Each
failure names the primitive to use instead. Comment lines are skipped, so prose
may name what it is warning you against. A rule may carry a `scope` of path
prefixes when its fix is not everywhere's business — the colour rule does, because
`src/lib` *mixes* colours it is handed and `src/schema` carries the default kind
colour, which is host data by definition. Widen the allowlist deliberately, in one
place, with a comment.

### Adding an eighth surface

1. Add a component under `src/surfaces/` taking `SurfaceComponentProps`. Read
   commands, kinds, config and `runCommand` from `useContextMenuRuntime()` —
   never take them as props from a host.
2. Add its id to `SURFACE_IDS` in `src/schema/config.ts`, and a config sub-object
   if it has knobs (every field with a `.default`).
3. If it has knobs, add a `<YourDirectionSettings>` to
   `src/surfaces/surfaceSettings.tsx`, composed from `SettingsRows` — every field
   of the sub-object gets a row, or it ships unreachable, which
   `test/surface-settings.test.ts` fails on.
4. Add one entry to `SURFACES`, including `scored` (does it play cues?) and
   `settings` (`{ hint, Component }`, `Component: null` for a direction with no
   knobs — the panel then shows the hint as its line of copy). That entry is what
   makes it appear in the picker, the settings panel and the demo — do not add it
   to any of those separately, and never scope the panel with a `switch` on
   `config.surface`.
5. Render commands through `CommandButton` (or `CommandRow`), their labels
   through `CommandLabel` and their colour through `toneColorOf`. Do not write
   your own disabled styling, your own anchor, or your own destructive tint —
   the guard fails on all three.

## Conventions worth knowing before you edit

How the house rules land *in this codebase*: which file is the mechanism, which
defect the rule was bought with, and the local wrinkles the rule on its own
would not tell you.

- **Zod is the type source.** Never hand-write an interface that mirrors a
  schema. Note the cross-major wrinkle that rule does not cover: nested config
  objects use `.default(() => TheSchema.parse({}))`. `.default`'s argument is the *input*
  type on zod 3 (and is parsed) and the *output* type on zod 4 (and is not), so
  neither `.default({})` nor zod 4's `.prefault({})` means the same thing on both
  — but an already-parsed object does: zod 3 re-parses a complete valid object to
  itself, zod 4 passes it straight through. It is a *function* so each parse gets
  its own object rather than one shared reference.
- **Every config field declares a default**, so a stored config from an older
  version parses without migration and
  no read site needs `??`. The exception is `Command.id` / `label` / `kindId`:
  identity and required input, which must fail loudly.
- **Unavailable is never invisible.** `Command.disabledReason` is the contract
  and `CommandButton` is the mechanism. It
  uses `aria-disabled` rather than the native `disabled` attribute on purpose: a
  natively-disabled button is unfocusable and fires no pointer events, so its
  explanation never reaches a keyboard or touch user, which is the whole reason
  the rule asks for hover *and* focus.
  **The explanation is floated, not nested.** It goes through `OverlayPortal` —
  the same mount point the menu layer and the settings dialog use — and
  `placeExplanation` puts it back against the control's own box. A chip
  positioned inside the control is at the mercy of whatever the surface around it
  does: the Lexicon and Whisper's results both scroll, so an `overflow` two
  elements up sliced it in half and left the board showing through the missing
  part, and a Compass label is rotated to its arc, so the chip rotated with it.
  It stays mounted while the command is unavailable and hides with `opacity`, so
  `aria-describedby` always resolves — an explanation that only exists once
  someone has hovered is not one a screen reader can read. It is `position:
  fixed`, which holds because a menu closes on scroll: the anchor it was measured
  against cannot move underneath it.
  The one omission in the codebase — `CastPad` under the other six directions —
  is the *relevance* carve-out (a feature the context does not provide at all),
  and says so at its definition. The settings panel showing one direction's knobs is the same rule:
  another direction's knobs are not *unavailable*, they are irrelevant here, and
  the picker sits above them so switching reveals them. Neither licence extends to
  a disabled **command**, which stays visible and explained.
- **Both palettes are one set of tokens, and `color-scheme` picks the half.**
  Every colour that differs between light and dark is a single
  `light-dark(light, dark)` pair in `src/theme.css` — never a `.dark` block with a
  second copy of the palette. Which half resolves is the inherited `color-scheme`
  property, switched at the bottom of that file by a host's `.dark`/`.light` (or
  `[data-theme]`) and otherwise by `prefers-color-scheme`. That default is written
  `:root:not(.light):not(.dark)…` rather than as a rule a host's class is expected
  to out-cascade: `@layer` order beats specificity, and a host controls the layers.
  It is also the mechanism a `color-scheme`-driven host design system already uses,
  which is why such a host can
  re-point every `cm-*` token at its own pairs and have the menu flip *with* the
  app. When the two themes want the same value, write the plain value with a
  comment saying why — a pair with two identical halves reads as an oversight.
- **A kind's colour is host data, and gets lifted for dark.** `CommandKind.color`
  is picked against a white page, so `kindColorOf` mixes it toward the active ink
  by `--cm-kind-lift` (the identity under light). Every read of `kind.color` goes
  through it — the icon tint, the Compass arc label and hub, the Strata swatch,
  Whisper's badge — so the lane label cannot drift from the icon beside it. The
  danger token is *not* lifted: it already carries both palettes, and lifting it
  would wash it twice.
- **Destructive is a property of the command, not of the surface.**
  `Command.destructive` is the contract, `commandTone.ts` is the mechanism, and
  the guard is the enforcement. Nothing outside that module names the danger
  token — otherwise "cancel" ends up red in the list and green on the wheel.
- **A link command is a real anchor.** `Command.href` renders through
  `CommandButton` as an `<a target="_blank" rel="noopener noreferrer">`, because
  an `onClick` that calls `window.open` swallows middle-click, modifier-click,
  "copy link address" and the status-bar preview. A plain left click is
  `preventDefault`ed and handed to `runCommand`, which performs the navigation
  itself — that keeps the one run path one path, and it is why the Compass slice
  and a cast rune navigate too. Script-executing schemes are refused when the
  command is parsed (`isSafeHref`), tab/newline evasions included; an unavailable
  link falls back to the focusable button, because an `<a>` with no `href` cannot
  take focus and its explanation would never reach a keyboard user.
- **A radial surface is sized by its labels, not the other way round.** The
  Compass wheel and the Orbit field both used to be a fixed frame around variable
  content, and a real host command set — labels the length of "New task in
  context menu" — sailed straight off them.
  `compass.diameter`, `compass.itemRingRadius` and each
  `orbit.rings[].radius` are now *floors*: `useLabelMetrics` measures the labels,
  `radialFit` turns the boxes into a radius, and the field grows until they fit —
  bounded by the viewport, because a field is placed by its own radius and an
  unbounded one only overflows a different edge. At that bound labels clip with an
  ellipsis, which keeps the text whole in the DOM (so the accessible name is
  whole) rather than shortening it. Do not solve a long label by shortening it in
  the library: `Command.label` is the host's text and `shortLabel` is the host's
  call. Both surfaces keep a `fitLabels` opt-out that reproduces the old pixels
  exactly, and the measured-vs-drawn pair goes through *one* component per surface
  (`RingLabel`, `BubbleLabel`) — a second copy of the label markup is a field
  sized for a label nobody renders.
- **The Sigil alphabet belongs to the user, and nothing ships bound.** The
  library ships one rune and it is not a command's: a single stroke top-to-bottom
  (`DISMISS_GLYPH`) closes the field, because leaving is the one thing a
  first-run field needs before it has an alphabet. Every other binding is
  `config.sigil.runes` — drawn on the field or taken from `DEFAULT_GLYPHS`, which
  is a *palette*, not a set of bindings. Do not re-add a `glyph:` to the demo's
  commands to "make Sigil work"; the ＋ beside an unbound command is the feature.
  `Command.glyph` still exists for a host that ships its own alphabet, and
  `resolveRune` puts the user's rune on top of it — a release that re-points a
  learned gesture is the defect that ordering prevents.
- **The demo seeds six runes; that is the other side of the same rule, not an
  exception to it.** `demo/seedRunes.ts` writes `config.sigil.runes` — the
  *user's* array, in the host's own storage, with the shape the field writes when
  someone takes a rune from the palette — on a browser that has never seen the
  demo, and never again (`hasSeededRunes`). Nothing about the library moved: the
  schema default is still `[]`, `runes.test.ts` still fails on a bound default,
  and `demo/commands.ts` still ships no `glyph`. It is there because an empty
  Lexicon is the right first run for a *product* and the wrong one for a *demo*
  whose Sigil direction is otherwise inert until a visitor invents an alphabet.
  Two properties keep it from becoming a binding nobody can shed, and
  `test/demo-seed.test.ts` fails on either: it never overwrites an existing
  binding (by command *or* by rune name — the pair `bindRuneRecipe` maintains),
  and unbinding all six and reloading leaves them gone.
- **05B is the one direction with two ways in, and the layer draws whichever one
  was taken.** The cast pad opens the casting field; every other trigger —
  right-click, `MenuButton`, `Shift+F10` — opens `config['sigil-pad'].secondarySurface`,
  which defaults to the field and so preserves what 05B always did. The rule is
  `invocationSurfaceOf`, the resolved direction rides on `Invocation.surface`, and
  `MenuLayer` reads *that* rather than `config.surface` — so what opened stays what
  is drawn, and the ⋮ button can never disagree with a right-click two pixels away
  from it. A trigger declares where it came from (`OpenOptions.source`) rather than
  having its origin inferred from `padOrigin`. It is also why 05B's settings section
  is `SigilPadSettings` composing `SigilSettings` and not the same component:
  Sigil, having no pad, has no second way in to point anywhere.
- **The Lexicon is laid out *on* the field, not floated over it — and it has no
  card.** It hangs under the casting ring, centred on the point the stroke starts
  from, in up to three columns (`lexiconLayout.ts`), set directly on the veil in the
  page's ink with the field's own halo behind it — the treatment the prompt line
  already used, because it is the same problem. It was a bordered, blurred,
  shadowed panel pinned to one side of the viewport, which made it a thing *over* a
  surface: it sat in the drawing area, it had to be told which half of the board to
  vacate, and its plate was the loudest object on screen. What survived is the part
  that was never chrome — the rune sockets, which are the field's own motif, and the
  mono captions, which are its voice. Three rules come with that and are load-bearing:
  the region is `pointer-events-none` and hands them back only on the controls, so
  the gaps stay castable and a press between two rows starts a stroke; it dims to
  0.22 while you draw, as the prompt line hides, because mid-gesture the crib sheet
  is not the subject; and it flips above the ring when below is a sliver, taking the
  prompt with it.
- **A Lexicon row has no hover plate, and its rune control is revealed rather than
  standing.** A filled rectangle behind one label is the last card left on a surface
  that has none, and a column of twenty-six ＋ signs makes the *controls* the subject
  of a list whose subject is the runes. So hovering a row fades its ＋/✎ in, and that
  is the hover feedback — a state change on what the pointer is offering, not a box
  around what it is over. The control is `opacity-0`, never `hidden`: it keeps its
  place, its tab stop and its accessible name, and `group-focus-within/rune` brings
  it back the moment focus enters the row, which is the distinction *unavailable is
  never invisible* turns on
  (revealed on approach, not hidden). Losing the hover wash cost the row its only
  focus treatment, so the ring is explicit — do not drop it. The group is *named*
  because `CommandButton` owns an unnamed `group` for its explanation and the control
  is its sibling, not its child.
- **A standing rune is unlit.** The trail's glow belongs to a stroke being made; on
  twenty-six runes at rest it read as a haze over the whole alphabet and blunted the
  one distinction the column exists to draw — a socket with a rune in it against one
  without. The reading card and the draft preview keep their glow, because both are
  showing you a single rune at the moment it is cast or struck.
- **The field's blur is 7px because the field carries the alphabet.** It was 2px,
  which was right while the only thing set on the veil was one line of prose; with
  the Lexicon on the field, a host's own headings interleaved with the command
  labels. Blur and not a deeper wash: in the light palette the labels are *dark*
  ink, so darkening what is behind them spends the contrast it was meant to buy —
  what has to go is the competing text, not the light.
- **A direct cast has neither the blur nor the Lexicon, because it carries no
  alphabet.** `directCast` in `SigilSurface` is the 05B press-and-draw path: the
  press on the pad was already the stroke, so the field arrives mid-gesture aimed
  at the object under the pad, and both the veil's blur and an alphabet laid over
  that object hide the target at the one moment the hand is still moving over it.
  It seeds from `invocation.seededStroke` and drops the first time the field
  *stands* — a tap, a twitch, a stroke nothing could read, or a reading that is
  not going to cast (two candidates, or a command that explains why it cannot
  run). It deliberately does **not** drop for a confident reading: that is one
  gesture finishing on its timer, and blurring the board for the beat before it
  closes is a flash of chrome on the way out. So a pad **click** is untouched —
  it degrades to the standing field (`CastPad`'s own contract) and both fade
  back in — and so is every other way in, which never had it true. The Lexicon
  hides through the same `opacity` seam it already dims through, never an unmount
  and never `visibility`, but it also gives its rows' `pointer-events` back:
  an invisible row over the board you are drawing on is a hit target you cannot
  see.
- **Below `READING_CARD_MIN_DELAY_MS` there is no reading card, and the carve-out
  is the point.** The card is the grace period made visible — what was read, how
  sure the field is, and the beat in which to see it. Under 400ms of
  `sigil.autoCastDelayMs` that beat does not exist: the card pops, its bar has no
  time to travel, and it is gone, which is a flash of chrome rather than a
  confirmation. So a field tuned that fast goes stroke → cast, with `sfx.read` as
  the feedback that survives at the speed. The gate is on `willCast` **only** — an
  uncertain reading (two candidates and a question) and a command that cannot run
  (an *unavailable is never invisible* explanation) keep their card at *any* delay,
  because neither is on
  a timer and a knob about speed must not be able to switch an explanation off.
  The delay row's own label says so when it crosses the line, since a card that
  vanishes because of a number elsewhere reads as a defect.
- **What the field puts on itself that *is* still a card is `-cast-plate`.** The
  reading card and the mute toggle are `--color-cm-cast-plate`/`-edge`/`-seam`:
  glass tinted toward the field's hue, edged in the same colour the ring and the
  trail are drawn in, lit by `--shadow-cm-cast-plate`'s glow rather than a neutral
  shadow. Painted in the page's panel colours they read as chrome from another
  screen — a white plate is the brightest object on a lightly veiled board, and a
  slate one is a second, flatter charcoal beside the veil. `-plate` is a
  `light-dark()` pair because the page's ink is what is read on it; `-edge` and
  `-seam` are a `color-mix()` over `cast-accent`, so they follow the hue.
- **The field's hue is `cm-cast-accent`, not `cm-accent`.** Everything the field
  paints — the ring, the runes, the prompt's verb, the reading card, the trail and
  the glows — derives from the field's own token, so a host whose interaction
  colour is not ours re-points one token and gets a field that reads as one thing.
  Sharing `cm-accent` with the menu's chrome forced a choice between the two, and
  the first host to re-theme the library hit it: an interaction-blue accent left a
  violet trail under blue
  instruments. What stays on `cm-accent` inside the field is the keyboard focus
  ring — that is the host app's, not the surface's (*interaction state is a shared
  token*), the same call as the cast pad's below.
- **The ring is chrome that is *read*, so it flips with the page.** Its rim, ticks
  and inner circle are `cm-cast-accent`, its mid circle and centre `cm-ink` — not
  `cast-ink`, a fixed white chosen for a deep veil. On a light board that made the
  ring all but invisible, and the whole Sigil composition now hangs off it. Same
  call, same reason as the prompt line above it; the dark half barely moves. The
  *trail* derives from the same hue and is painted on canvas through
  `resolveColourTokens`, which resolves a `var()` chain and a `color-mix()` alike.
- **The cast pad is chrome on the *host's* card, so it is neutral and its own
  three tokens.** `--color-cm-pad-fill`/`-edge`/`-ink` are aliases of the neutral
  palette (`bg-mute`, `rule-2`, `ink-2`), which is what lets a host re-point the
  pad alone without touching the accent — and what keeps the library from stamping
  its violet across every row of someone else's board. Everything violet about
  casting belongs *inside* the field, which is our surface to own. The pad's focus
  ring stays `cm-accent`: that is the library's focus treatment everywhere
  (*interaction state is a shared token*), and a neutral pad is no reason for a
  keyboard user to lose it.
- **`Command.label` stays a plain string.** Secondary text goes in
  `Command.detail`. Three readers consume the label as text — the fuzzy matcher,
  the Compass hub, the Sigil reading card — and a `ReactNode` breaks all three.
- **Fuzzy matching returns segments, not just a score** (*a fuzzy match must be
  visible*). The matcher hands back where it matched, and Whisper surfaces the
  *field* that matched when the hit came from a keyword rather than the label.
- **Icons are `@tabler/icons-react` components** (*real vector icons, never
  characters*) — never emoji or Unicode glyphs. The Sigil runes are vector paths,
  not characters.
- **Sound is synthesized** (*nothing is fetched from a third party at runtime*).
  No audio files, ever. `src/audio/sfx.ts` is a factory over closures (*factory
  functions over classes*) with a self-measuring harness:
  `sfx.measure()` renders every cue offline through the real bus and reports
  peak/RMS, so a level change can be verified instead of guessed.
- **Descriptive names throughout** (*descriptive names*). `pointerEvent`, not `e`;
  `carrierOscillator`, not `osc`.

### Two Tailwind traps this codebase already hit

Both cost a visible defect; do not re-introduce them.

1. **Conflicting position utilities resolve by stylesheet order, not class
   order.** `relative` is emitted after `absolute`, so appending `relative` to a
   caller's `absolute` silently drops the element into normal flow — it put every
   Compass label and Orbit bubble in a column below the wheel. `CommandButton`
   used to add `relative` only when the caller was not already positioned; it now
   adds no position utility at all, because the one thing that needed the control
   to be a containing block — the unavailable explanation — is floated instead.
   Never merge a position utility into a caller's `className`; if something
   inside a control has to be placed against it, the *surface* positions the
   control.
2. **Opacity multiplies through to children.** Dimming an unavailable control by
   putting `opacity-50` on the button made its explanation the faintest thing on
   screen. The default dims each child box instead — and the explanation is out
   of reach of both now that it is portalled, which is the point below.
3. **The same trap, one property over: two `font-*` weights on one element.**
   Appending `font-extrabold` to a label already carrying `font-semibold` does
   nothing — `font-semibold` is emitted later, so the Compass's focused label
   never changed weight at all. The emphasis belongs *inside* the face
   (`proseClassName={emphasised ? 'font-extrabold' : 'font-semibold'}`), one
   weight utility per element. Read the rule as: never let two utilities of the
   same property meet on one element and expect your order to win.

And two traps that come with a token layer carrying two palettes:

1. **A custom property's computed value is its token stream, not a colour.**
   `getComputedStyle(element).getPropertyValue('--color-cm-cast-ink')` hands back
   the literal text `light-dark(#ffffff, #101010)`, which `strokeStyle` rejects in
   silence — the trail paints black, or keeps the previous colour. `color-mix()`
   tokens are the same. `resolveColourToken` assigns the reference to a real
   `color` property on a live element and reads *that* back, which is a used value
   and therefore already resolved against that element's `color-scheme`.
2. **An SVG presentation attribute does not substitute `var()`.**
   `stroke="var(--color-cm-rule)"` parses and paints nothing. Use the Tailwind
   utility (`stroke-cm-rule`, `fill-cm-bg`, and `/45` for an alpha) or a `style`
   object — both go through CSS, where `var()` works.

And two plain-DOM traps:

1. A `visibility: hidden` subtree cannot take focus, so the measure-then-place
   panel hides with `opacity`, or Whisper's caret never lands. `useFocusTrap`
   filters the same subtrees out of the Tab cycle for the same reason.
2. **A rect is the *transformed* box.** Every surface animates in with a
   `transform`, so `getBoundingClientRect()` during the entrance returns the
   scaled size — a wheel measured mid-pop settles at the wrong diameter, and a
   panel measured mid-pop is clamped as if it were smaller than it ends up, so it
   hangs off the very edge the clamp exists to keep it away from (Strata at the
   bottom of the viewport, once it stopped being centred). `useLabelMetrics` and
   `useAnchoredPanel` both read `offsetWidth`/`offsetHeight`, which are layout,
   and layout does not see transforms. They round to integers, which is why every
   width comparison downstream carries a pixel of slack: an ellipsis on a label
   that fits by a third of a pixel is the defect coming back in miniature.
3. A `mousedown`'s default action moves focus to the deepest focusable ancestor
   of its target — and it runs *after* your handler. Dismissing the settings
   dialog from a backdrop press therefore has to `preventDefault()`, or the focus
   handed back to the opening control is thrown away a tick later and the user
   lands on `body`. Both this and the Shift+Tab escape out of a `tabindex="-1"`
   dialog container were only visible in a browser.

## Where this repo reads the house defaults its own way

Each of these is a house rule applied to a shape the rule itself does not spell
out. None of them is a waiver.

- **The library ships Tailwind utilities plus a token file, not a compiled
  stylesheet.** Consumers merge `binp-context-menu/theme.css` into their own
  Tailwind build and `@source` this package's `src/`. It keeps the stack's
  no-CSS-in-JS rule while letting a host re-theme every surface by overriding custom
  properties, which a compiled stylesheet would not.
- **The demo's Vite config does its own port allocation** (`scripts/port.ts` +
  an async `defineConfig`) rather than a multi-process resolver — there is only
  one process. Allocation still runs *in front of* the strict bind rather than
  as a fallback after it, and the bind is on `127.0.0.1`.
- **The build's `base` is `'./'`.** The hosted demo is served from
  `https://<slug>.zink.bot/` behind `zink.bot/v/<slug>/`, not from a root, so an
  absolute `/assets/…` reference loads the page and none of the bundle. The dev
  server is unaffected. Anything the demo fetches at runtime has to be relative
  for the same reason — and bundled (*nothing is fetched from a third party at
  runtime*), which is why the fonts are a package rather than a Google Fonts link
  like the prototype's.
- **Bundling the fonts is what makes the notices page load-bearing.** Inter and
  JetBrains Mono are OFL-1.1, and clause 2 is a condition on *the copy*: a bundle
  carrying the `.woff2` files carries the copyright notice and the licence text
  with them. So `THIRD-PARTY-NOTICES.md` is emitted into the build as
  `third-party-notices.html` by `scripts/thirdPartyNotices.ts` — with `LICENSE`
  appended, because the built demo is also a distribution of *this* software and
  MIT asks the same — and `demo/Colophon.tsx` is the link a visitor reaches it
  by. One file, two renderings, never two copies. Renaming either end quietly
  turns the link into a 404, which is a licence breach rather than a broken link,
  so `test/third-party-notices.test.ts` asserts the page, the href and the
  wiring. Adding a runtime dependency or a third face means adding its notice
  there in the same commit.

## Verifying a change

`mise run check` is necessary but not sufficient for anything user-facing: these
are seven visual surfaces and the interesting failures are geometric. Run the
demo and *look at each direction you touched* — both Tailwind traps above passed
typecheck, tests and the guard, and were only visible on screen.

**Look at it in both themes.** The demo's header carries a light · dark · system
control, so this is one click per direction. A colour regression is invisible in
whichever theme you happened to be in: an explanation set in `text-white` on a
tooltip whose background is the *ink* token is unreadable in exactly one of them,
and a `fill="#fff"` disc looks perfect until the board goes dark.

**Publishing is a third check, not a formality.** `mise run publish` puts the
build in front of the public link, and the two things that break there break
*only* there: an asset path that assumed a root (see `base` above) and a
first-visit state you never see locally because your browser has been storing
this demo's config for weeks. After publishing, open the link in a clean profile
and confirm the board renders and the Lexicon comes up seeded.
