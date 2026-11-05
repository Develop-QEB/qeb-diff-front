# qeb-diff — Design System

Internal diff / diagnostic dashboard for the QEB engineering team (3–5 senior devs). The screen is read in 30–90 minute incident-triage sessions.

Source of truth for how `qeb-diff` looks and behaves. If something on screen conflicts with this file, this file wins — fix the screen, not the file. Change this file only with cause written down (new brief, new finding, rule that could not survive contact).

---

## 1. Brief

- **Mode**: Operate. The visitor completes a task (figure out why an ambiente is drifting). Scanability, consistency, native expectations outrank expression. Brand lives in precise details.
- **Audience**: senior devs familiar with git, SQL and dev tools. They skip onboarding and look for shortcuts.
- **One question per screen**. Every screen opens with a 26px noun title (`Ramas`, `Bases de datos`, `Anomalías de flujo`, `Matriz BD`, `Diagnóstico`) and a 14px muted *finding* line on the right. The finding answers the question the title names, in < 5 seconds, with the numbers inline in mono.
- **Fatigue budget**: oscuro todo (dark-only). Color share ≤ 3%. Nothing pulses. No motion beyond standard hover/focus and the `select-line` indicator.

---

## 2. Face

| Family | File face | Use | Loaded as |
|---|---|---|---|
| Public Sans | sans-serif | UI chrome, labels, running text | `index.html` `<link>` + Tailwind `font-sans` default |
| JetBrains Mono | monospace | **Every** numeric value, hash, SHA, column name, table name, branch name, env name, path | `font-mono` / `.mono` utility |

`tabular-nums` is always on when a digit updates (`.num` utility sets `font-variant-numeric: tabular-nums`). Right-align numeric cells with `th.num` / `td.num` (DataTable's `numeric` prop does this for you).

**Never**: use default system sans for data. **Never**: use JetBrains Mono for running prose. **Never**: a third family.

---

## 3. Color

Dark, neutral, almost grayscale. The one hue (accent) earns its pixels. Red/green only when the row is actually broken / actually OK.

### Primitives (locked by taste-skill)

| Role | Value | Where |
|---|---|---|
| ground | `#171719` | body, outside of cards, the icon rail |
| surface | `#131217` | the `card` level (one step darker than ground) |
| raised | `#212023` | nested panels, chip backgrounds, inputs |
| border | `#222224` | card edges |
| rule | `#1b1a1f` | hairlines between rows / sections |
| control | `#3a3a3e` | control borders (inputs, selects) |
| ink | `#ffffff` | primary text |
| muted | `#8a8c92` | secondary text (passes 4.5:1 on ground and on surface) |
| faint | `#636469` | tertiary text / "no existe" italics |
| accent | `#4a8ad6` | **only** as the 1px selection line and the caret color |
| positive | `#44a282` / `#5fc39c` / bg `#1b2828` | row / badge that is confirmed OK |
| negative | `#e5566f` / bg `#2c1a20` | row / badge that is actually broken (ETIMEDOUT, anomaly, divergence) |
| warning | `#d9a441` / bg `#2a2416` | notice (unused for now, reserved) |
| pill-bg / pill-ink | `#212023` / `#bdbdc0` | neutral status pill (merge, revert, ignored, equivalent) |

### Rules

- **Color on data, never on chrome**. Nav/toolbar never carries a brand fill. The active tab in the icon rail switches icon color `muted → ink`, not a pill.
- **Sign, not hue, carries polarity in numbers**. Write `+5` or `-2` in ink; only switch to `--positive` / `--negative` when the row is objectively ok/broken.
- **`diff-hl` only on real divergence**. Reserved for tokens that actually differ between two values after normalization (not MySQL↔MariaDB cosmetic differences such as `int(11)` vs `int`).
- **Never** gradients, glass, glow, backdrop blur. Taste-skill lock.

---

## 4. Type Scale

| Role | Size / line | Weight | Token (Tailwind) |
|---|---|---|---|
| Page title (h1 noun per screen) | 26 / 32, -0.01em | 600 | `text-title` |
| Section heading (h2) | 20 / 26 | 500 | `text-section` |
| KPI value | 20 / 24 | 500 (mono + tabular) | `text-kpi .mono .num` |
| Card / block heading (h3) | 14 / 20 | 600 | default h3 |
| Body / cell | 13 / 18 | 400 | `text-body` |
| Meta / label / badge | 12 / 16 | 400 | `text-meta` |

Nothing at 48px or above. The h1 at 26px is the ceiling; a finding line at 14px sits beside it.

Letter spacing: `-0.01em` on the title only. Everything else 0. **Never** uppercase tracked caps as a chrome label.

---

## 5. Spacing & Radius

Base 4px. One gutter value per surface.

| Token | Value | Use |
|---|---|---|
| `gap` (Tailwind `gap-6`) | 24px | gutter between columns, between KPIs |
| `pad` (Tailwind `px-8`) | 32px | canvas horizontal padding |
| `row` | 42px | table row height |
| `row-tight` | 36px | compact list row |
| `rail` | 50px | icon rail width |
| `radius-card` | 6px | panels / blocks |
| `radius-control` | 999px | pill controls (buttons, pills, inputs sometimes) |
| `radius-chip` | 4px | small chips, status pills |

Nesting: panels keep **one** radius. If a card contains a chip, the chip is `rounded-chip` (4px); never 4+ different radii.

---

## 6. Shell

```
┌────┬────────────────────────────────────────────┐
│ ⇄  │  Ramas                           finding   │
│    │  ────────────────────────────────────────  │
│ G  │  <filter bar>                              │
│ D  │  <filter row 2>                            │
│ W  │  <main grid>                               │
│ G  │                                            │
│ S  │                                            │
│    │                                            │
│ ⤴  │                                            │
└────┴────────────────────────────────────────────┘
```

- **Icon rail** `IconRail` (50px, left). Product mark (⇄) top; 5 outline icons (Phosphor); logout bottom.
- **Active tab**: icon color `muted → ink`, weight `regular → bold`. **No pill, no bar, no fill**.
- **Canvas**: `max-w-[1600px] mx-auto px-8`. Vertical rhythm managed by `PageTitle` (`pt-8 pb-6`) and section `hairline-b pb-2`.
- **No top bar**.

---

## 7. Signature Visual Element

The flow ladder `stage → dev → release → main`. This is unique to `qeb-diff` and must appear in the surface wherever presence across environments is a dimension of the data.

- `<LadderBadge slots={[...]} />`: 4-cell ▮▯ compact badge. `present` = ink fill. `equivalent` = muted dot inside a muted-border circle. `absent` = raised fill with a border. Optional `showText` renders `s·d·r·m` in mono with underscores for absent slots.
- `<FlowLadder slots={[...]} />`: horizontal ladder with a hairline rail, labels under each node, optional annotations below.

Use LadderBadge in **every** table row where the row exists across environments (anomalías, matriz BD, ideally also in commits en Ramas). Use FlowLadder as a header for sections that explain the flow once (e.g. the top of Anomalías explaining what's expected).

The `s·d·r·m` mono notation is a shorthand you can drop inline in text: `commit 9e17cd2 lives in _·_·r·m`.

---

## 8. Components

All in `src/ds/`. Import from `src/ds` (barrel).

| Component | Use when |
|---|---|
| `IconRail` | The only app-level navigation. |
| `PageTitle` | Every tab opens with it. Props: `title`, `finding`, `actions`. |
| `FlowLadder` | Explaining the flow once as a header. |
| `LadderBadge` | **Every row** that has a 4-environment presence dimension. |
| `KpiStrip` | Sibling KPIs. Divided container, no card per KPI. Not yet used — reserved for Anomalías finding row expansion. |
| `Table` + `THead` + `TBody` + `TR` + `TH` + `TD` | Every data table. `<TH numeric>` and `<TD numeric>` right-align and set tabular. `<TD mono muted>` for secondary mono cells. |
| `StatusPill` | Per-row status. Tones: `positive` (confirmed ok), `negative` (actually broken), `warning` (notice), `neutral` (merge / revert / ignored / equivalent). |
| `UnderlineTabs` | Sub-navigation **inside** a page (not top-level). Indicator 2px in `--accent` as wide as the label. Not yet used. |
| `FilterBar`, `Segment`, `Checkbox` | Filter bars across the top of a screen. The surface between `PageTitle` and the main grid. |
| `EmptyBlock` | Empty results. Dashed border, no illustration, no "No data yet" picture. |
| `DiffTokens` | Char-by-char token highlight in a diff value. Wraps `<span className="diff-hl">` around tokens that are not present in any of the "others". |
| `Button` | Primary (`bg-ink text-ground`), secondary (border ink, hover border control), ghost, danger. 1 primary per screen. |
| `Select` | Dropdown with chevron icon, label to the left. |

### Composition rules

- Tables sit on `ground`, no card around them. Headers are `12px grey sentence-case, no fill, no rule` under them.
- Row height `42px` (default via `TR h-row`).
- Filter bars are `py-3 hairline-b` strips directly under `PageTitle`.
- `PageTitle` is the only h1. Section h2s use the section sans style. No eyebrows.

---

## 9. Diff Semantics

Three visual signals, used strictly:

| Signal | Means | Fires on |
|---|---|---|
| `diff-hl` (red translucent background on a token) | a single token truly diverges from the siblings after normalization | column type cell, index type cell, env value cell, dep version cell |
| `LadderBadge` cell = absent | the element does not exist in this environment | commits across branches, elements across BDs |
| `StatusPill tone="negative"` | the entire row describes a real problem | anomaly row, ETIMEDOUT chip, cell with no sibling |
| `StatusPill tone="positive"` | the row is confirmed ok | "HEADs iguales" chip when branches match |
| `StatusPill tone="neutral"` | the row is a non-finding (merge, revert, ignored, equivalent) | per-commit metadata chips |

**Never** color something green just because it's "the baseline". Grey is the baseline.

---

## 10. States

### Empty
- `EmptyBlock` dashed border, one sentence of plain copy. No illustration, no emoji, no "no data yet" picture.
- When a filter yields 0 rows, the block spans the row (`grid-column: 1 / -1` equivalent).

### Loading
- Preserve layout. Replace values with their label plus "cargando…" in `text-muted`. Do not show a shimmer gradient.

### Error (per section, not per screen)
- Inline in the block that failed. Red tint pill `bg-negative-bg text-negative-ink`, one sentence saying what failed, a `Retry` ghost button or an inline hint pointing at the fix (e.g. ETIMEDOUT → "tu IP cambió, agrégala en Trusted Sources de DigitalOcean"). The screen's other blocks keep rendering.

### Zero
- Print `0` in ink. Never dim a real zero. Never render `—` at value size (24px) — a dash at value size reads as loading.

---

## 11. Accessibility Floor

- Contrast ≥ 4.5:1 for every text, placeholders included. All default tokens pass this.
- Focus visible everywhere: 2px `--accent` outline + 2px offset (set globally in `index.css :focus-visible`).
- Icon-only buttons (icon rail, filter bar icons) carry `aria-label` + `title` + `sr-only` text.
- Form controls have `<label>` wrappers (`Select`, `Checkbox`) or `<label htmlFor>` (`LoginScreen` password).
- Tables use `<th>` and `<td>`; rows are `<tr>`. The header row carries no fill, only a 1px rule under it.
- No meaning conveyed by color alone: every pill tone has a text label; `LadderBadge` cells carry a composite `aria-label`.

**Known gap (fix soon)**: the `Checkbox` uses a 12x12 native checkbox. WCAG AA 2.5.8 (touch targets) requires 24x24 unless spacing exception applies. Either ship a styled checkbox at 16x16 inside a 24x24 hit target, or rely on the spacing exception by keeping 24px gaps between consecutive checkboxes.

---

## 12. Motion

Operate mode. Motion is feedback only.

- Hover: `transition-colors` on nav and buttons. No translation.
- Selection: the `.select-line` utility (inset 2px accent bottom shadow) renders in place; no motion.
- Nothing performs an entrance. Nothing pulses. No skeleton shimmer.
- Respect `prefers-reduced-motion`: honestly already honored because we have ~no motion.

---

## 13. Responsiveness

Desktop-first. The incident-triage sessions happen on a developer's primary monitor. The canvas is fluid and caps at `max-w-[1600px]`.

**Phone fold** is not a current goal but should not break. Known gaps:
- `BranchesTab` uses `grid-cols-12 gap-0`; below ~900px the 4 columns cram. A future `md:grid-cols-12` / `grid-cols-1` pass is required to fold cleanly.
- Tables don't wrap; they'll scroll horizontally inside their frame. That is the right fallback for a data tool.
- The icon rail at 50px is fine on phone (15% of a 390px viewport).

---

## 14. No-slop Rules (locked)

Things the house does **not** do. The detector catches some of these; a human review catches the rest.

- No gradients on anything.
- No glass / backdrop blur / glow.
- No shadows on things at rest. Shadow only on what truly floats (none in this app yet).
- No icon-topped feature cards, no icons in coloured circles, no sparklines on KPIs, no rainbow charts.
- No emoji in UI chrome, labels, nav or empty states.
- No lorem ipsum, no Acme, no John Doe, no vanity totals, no "+12%" from a day-old account.
- No tracked uppercase labels as chrome.
- No pill tabs, no floating pill navigation, no bar chrome.
- No full-width dark saturated bars / banners.
- No "Welcome back, Alex" greeting.
- No decorative shapes or blobs.
- No illustration in an empty chart or empty table.
- No two typefaces where one would do; no three.

---

## 15. File Layout

```
frontend/
  index.html                — preconnect + font loads
  tailwind.config.js        — tokens & theme extension
  src/
    index.css               — CSS vars, utilities (.num, .mono, .diff-hl, .hairline-b, .select-line)
    main.tsx                — entry
    App.tsx                 — auth gate + shell + tab routing
    lib/api.ts              — backend bindings + token store
    ds/                     — design system
      index.ts              — barrel
      cn.ts
      Button.tsx
      Select.tsx
      IconRail.tsx
      PageTitle.tsx
      FlowLadder.tsx
      LadderBadge.tsx
      KpiStrip.tsx
      DataTable.tsx         — Table/THead/TBody/TR/TH/TD
      StatusPill.tsx
      UnderlineTabs.tsx
      FilterBar.tsx         — FilterBar, Segment, Checkbox
      EmptyBlock.tsx
      DiffTokens.tsx
    components/
      LoginScreen.tsx
      BranchesTab.tsx
      SchemaTab.tsx
      AnomaliasTab.tsx
      MatrizBdTab.tsx
      DiagnosticoTab.tsx
```

Any new component goes in `src/ds/` only when it is reused (or will be) across 2+ screens. Screen-local fragments live inside the screen file.

---

## 16. When This File Changes

- A new signal or diff semantic → §9 updated and every screen that renders it updated in the same pass.
- A new signature element → §7 updated; it also has to appear on at least two screens.
- A token change → update `tailwind.config.js` + `src/index.css :root` + this file in one commit. Never leave the three out of sync.
- A relax of a no-slop rule → write *why* in §14. Delete nothing silently.
