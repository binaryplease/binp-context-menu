<!--
Nothing ceremonial — one focused change, a green gate, and a description that
says what changed and why. CONTRIBUTING.md has the longer version.
-->

## What this changes, and why

<!-- The why is the part the diff cannot show. -->

## The gate

- [ ] `mise run check` is green (typecheck + surface guard + tests)
- [ ] If I touched a Zod schema, I checked the **other** zod major
      (`bun add -d zod@3.24.4 && mise run check`, then put zod 4 back) — the
      peer range `^3.24 || ^4` is load-bearing and a zod-4-only API passes CI
      and explodes at a host's mount.

## What I looked at

<!--
Delete this section if the change is not user-facing.

These are seven *visual* surfaces and the interesting failures are geometric or
chromatic — a clipped label, a wheel sized wrong, a panel off the viewport edge,
a colour that only breaks in one theme. The gate passes happily on all of them.
So: which directions did you open, and in which themes? This is the part nobody
else can reproduce from the diff.
-->

- **Directions opened:**
- **Themes checked:** light · dark

## Primitives

<!--
The premise is that seven surfaces share one affordance, which only holds while
every surface goes through the shared pieces. If this PR adds a control, a
colour, a portal or an anchor, say which primitive it went through — or why it
could not, if you widened a guard allowlist.
-->

- [ ] New controls go through `CommandButton` / `CommandRow` / `SettingsRows`
- [ ] New colours are `cm-*` tokens in `src/theme.css`, not literals
- [ ] I did not widen a `scripts/guard-surfaces.ts` allowlist — or I did, in one
      place, deliberately, with a comment
