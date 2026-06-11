# Scrutiny — Design System

Binding reference for everything visual in `apps/web`. Components and tokens live in
`apps/web/src/components/ui/` and `apps/web/src/styles/theme.css`. Reuse them — never
write one-off colors, shadows, or spacing.

## 1. Personality

Scrutiny is a professional tool auditors stare at for eight hours a day. The design is
**calm, dense, and exact**: generous information density in tables, restrained color
(color means something — status, risk, money), no decoration that doesn't carry meaning.
Think "well-typeset financial report", not "marketing site".

## 2. Tokens (CSS variables, defined in `theme.css` via Tailwind 4 `@theme`)

### Color — light theme (default; dark theme ships later, tokens already semantic)

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#f4f5f7` | App background |
| `--color-surface` | `#ffffff` | Cards, tables, panels |
| `--color-sunken` | `#eceef1` | Table header fills, wells |
| `--color-border` | `#d8dce2` | Hairlines, table rules |
| `--color-border-strong` | `#b6bdc7` | Inputs, focused table rules |
| `--color-ink` | `#16212e` | Primary text |
| `--color-ink-muted` | `#5b6878` | Secondary text, labels |
| `--color-ink-faint` | `#8b97a5` | Placeholders, disabled |
| `--color-primary` | `#15514a` | Brand: deep pine green. Buttons, active nav, links |
| `--color-primary-hover` | `#0f3f3a` | |
| `--color-primary-tint` | `#e3efed` | Selected rows, active nav bg |
| `--color-accent` | `#b98a2f` | Sparingly: sign-off gold, highlights |
| `--color-danger` | `#b3382e` / tint `#f9e9e7` | Errors, negative amounts |
| `--color-warning` | `#9a6b1f` / tint `#f8f0dd` | Warnings, NEAR_MATERIALITY |
| `--color-success` | `#2e7d4f` / tint `#e5f2ea` | Pass states, balanced badges |
| `--color-info` | `#2f5e9e` / tint `#e7eef8` | Info banners, REVIEWED chips |

Risk/RMM scale: LOW `--color-success`, MODERATE `--color-warning`, HIGH `--color-danger`.

### Typography

- UI face: **Inter** (`@fontsource-variable/inter`), system-ui fallback.
- Numeric face: Inter with `font-variant-numeric: tabular-nums` — utility class `.tnum`
  applied by the `<Amount>` component and all table numeric cells.
- Scale: 12 (meta), 13 (table body), 14 (body/default), 16 (section titles),
  20 (page titles), 28 (only the login wordmark). Weights: 400/500/600 only.

### Spacing, radius, elevation

- 4px base grid. Table row height 36px; compact 32px.
- Radius: 6px controls, 10px cards/dialogs. No pill buttons except Badge.
- Shadows: `--shadow-card: 0 1px 2px rgb(22 33 46 / 0.06)`,
  `--shadow-pop: 0 4px 16px rgb(22 33 46 / 0.14)`. Nothing heavier.

## 3. Money formatting (non-negotiable)

`<Amount value={minorUnits} />`:
- Divides by engagement `minorUnitsPerMajor`, groups thousands, two decimals when
  minorUnitsPerMajor > 1, zero decimals otherwise.
- **Negative amounts render in parentheses** — `(1,234.50)` — colored `--color-danger`.
- Always right-aligned, always `.tnum`. Null/undefined renders an em dash `—`.

## 4. Layout

- **AppShell**: fixed sidebar 248px (logo block, primary nav, user block at bottom),
  topbar 56px (page context + actions), content area `--color-canvas` with 24px padding.
- **Engagement context**: inside an engagement, the sidebar swaps to engagement nav
  (Overview, Trial balance, Journal entries, Leadsheets, Planning, Analytics, Sampling,
  Working papers, Completion) with a back-to-firm link on top.
- **PageHeader** component: title (20px/600), optional description, right-side action
  slot. Every page starts with one.
- Forms: single column, max-width 560px, labels above inputs (13px/500 muted).
- Tables: full-width cards; header row `--color-sunken`, 12px/600 uppercase tracking-wide
  labels; numeric columns right-aligned; totals rows 600 weight with top border
  `--color-border-strong`.

## 5. Component inventory (`components/ui/`)

`Button` (primary | secondary | ghost | danger; sm | md), `Input`, `Select`, `Textarea`,
`Label` + `Field` (label+control+error), `Card` (+ CardHeader/CardBody), `Badge`
(neutral | success | warning | danger | info | accent), `Table` primitives (Table, THead,
TR, TH, TD with `numeric` prop), `Dialog` (native `<dialog>`-based), `Tabs`,
`EmptyState` (icon, title, hint, action), `Spinner`, `Amount`, `StatusChip`
(engagement status), `PageHeader`, `Sidebar` parts.

Rules:
- Focus visible everywhere: 2px `--color-primary` ring, offset 2px.
- Disabled = 50% opacity + `cursor-not-allowed`, never hidden.
- Destructive actions: danger button + confirm dialog naming the object.
- Empty tables always render `EmptyState` with the next action, never a blank card.
- Loading: skeleton rows for tables, `Spinner` only for sub-second blocking actions.

## 6. Voice

UI copy is sentence case, verb-first buttons ("Import trial balance", not "TB Import!").
Errors say what happened and what to do next. No jargon the DOMAIN.md glossary doesn't use.
