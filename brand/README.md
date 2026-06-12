# Scrutiny Brand Assets

The mark is a **magnifying lens with an assurance check** — scrutiny is close
examination; the check is the auditor's sign-off. Geometry only, no font needed
(except the horizontal lockup's wordmark, which falls back to system fonts).

| File | Use |
|---|---|
| `logo.svg` | App tile / avatar / social — dark pine tile, white lens, gold handle |
| `logo-mark.svg` | Mark alone on light backgrounds |
| `logo-mono.svg` | Single color via `currentColor` (footers, docs, embeds) |
| `logo-horizontal.svg` | Mark + wordmark lockup |

## Colors

- Pine `#15514a` (primary — docs/DESIGN.md token `--color-primary`)
- Gold `#b98a2f` on light backgrounds / `#d9ab4a` on the dark tile (accent)
- Ink `#16212e` for the wordmark

## Rules

- Keep clear space of at least 25% of the mark's height on all sides.
- Do not recolor, outline, rotate, or add effects.
- On photos or colored backgrounds use `logo.svg` (the tile) or `logo-mono.svg` in white.
- The in-app component is `apps/web/src/components/Logo.tsx` — keep it in sync with
  these files.
