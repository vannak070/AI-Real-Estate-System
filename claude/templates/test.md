# Test: <flow name>

`<name>`: <same slug as the feature>
Type: manual walkthrough | automated (vitest / API script) | both

## Flow under test

<One line: the user-visible flow or the API sequence being verified.>

## Preconditions / seed data

- DB: `pnpm --filter @era/api db:seed` (or the specific rows needed)
- Env: `EVENT_BUS=inprocess`
- Signed in as: <role>

## Steps

1. <action> → <expected immediate result>
2. <action> → <expected result>
3. <...>

## Assertions

- API: `GET <path>` returns `<shape / values>`
- DB: `<table>.<field>` = `<value>`
- Events: `<module>.<event>` published once, payload matches `@era/contracts`
- UI: `<page>` shows `<element / text>`

## Eventual-consistency notes

<If the flow crosses modules via events, state what may lag and how long to wait
before asserting (see the saga section of ARCHITECTURE.md).>

## Cleanup

<Rows to delete / how to reset, so the test can run again.>

## How to run

```bash
<commands>
```
