# Feature: <short title>

`<name>`: <kebab-case slug — reuse for updates/ and tests/>
Status: draft | ready for agent | in review | done

## Summary

<2–4 sentences: what the user can do after this ships, and why.>

## Screens & images

<Attach or link mockups/screenshots. Describe each: which page, which state.>
- `claude/features/assets/<name>-<n>.png` — <what it shows>

## Jira

- <PROJ-123> — <title> — <link>
<Acceptance criteria from the ticket, pasted, not summarised.>

## Figma

- <link to frame> — <frame name / node id>
<Note the exact components/tokens to match.>

## APIs / functions involved

<Existing functions this builds on, and new ones to add. Full paths.>
- `apps/api/src/modules/<m>/<m>.service.ts` → `<fn>()` — <change>
- `@era/contracts` → new event `<Module>Events.<Name>` — <payload>
- web: `apps/<app>/src/api/<resource>.ts` → `<fn>()` — <new/changed>

## Base-code paths

<Every file expected to change or be created.>
- `apps/api/src/modules/<m>/...`
- `apps/api/prisma/schema/<m>.prisma`
- `apps/<app>/src/app/pages/<Page>.tsx`

## Acceptance criteria

- [ ] <observable behaviour 1>
- [ ] <observable behaviour 2>
- [ ] Boundary rules in `claude/config.md` §3 respected

## Out of scope

<Explicitly not this feature.>

## Open questions

<Anything the agent must not guess: missing ticket detail, undecided copy,
unknown endpoint shape. The agent stops here if these block implementation.>
