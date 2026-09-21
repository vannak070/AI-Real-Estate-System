# @era/ui

Shared React primitives for `apps/client` and `apps/admin`, themed with the
`@era/theme` CSS variables (`--era-navy`, `--era-red`, …).

Starter set: `cn`, `Button`, `Card`. Grow this by extracting the repeated
inline-styled patterns from the apps (Field, DataTable, Badge, Modal, StatCard).

## Tailwind scanning

Because these components carry their own class names, each app's
`src/styles/tailwind.css` must add this package to its `@source` list:

```css
@source '../../../../packages/ui/src/**/*.{ts,tsx}';
```

(already added to both apps).
