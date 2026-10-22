# Lumière Tools — Design System (Master)

**Direction:** Luxury Dark · glassmorphism on warm stone, champagne-gold accent, editorial serif display.
**Source of truth:** `css/tokens.css`. Living style guide: `style-guide.html`.
Page-specific overrides go in `design-system/lumiere-tools/pages/<page>.md` and win over this file.

## Provenance

Built with the `ui-ux-pro-max` skill. Each decision is labelled with where it came from.

| Decision | Source |
|---|---|
| Style: Glassmorphism (dark supported; requires 4.5:1 text, visible focus, reduced motion) | `--domain style` → `glassmorphism` |
| Palette roles: stone neutrals `#0C0A09 / #1C1917 / #44403C` + gold accent `#CA8A04` | `--domain color` → "Luxury/Premium Brand: premium black + gold accent" |
| Dark adaptation: lighter, desaturated gold tones instead of inverted colours | `references/quick-reference.md` → `color-dark-mode` |
| Display font: Cormorant (Garamond cut) | `--domain typography` → "Luxury Serif" pairing |
| Body font: IBM Plex Sans Thai *(adapted)* — the pairing's Montserrat has no Thai glyphs | `--domain google-fonts` → IBM Plex Sans Thai, subsets include `thai` |
| Touch target ≥ 44×44 px, focus ring, exits faster than entrances | `references/quick-reference.md` §2 / §7 |

The generic `--design-system` query for "luxury dark productivity toolkit" returned a light teal/orange
palette that did not fit the brief; per the skill's query contract it was **not** persisted.

## Colour (semantic roles)

All ratios measured against `--color-bg` (#0C0A09). WCAG AA requires 4.5:1 for text, 3:1 for UI boundaries.

| Token | Value | Contrast | Use |
|---|---|---|---|
| `--color-bg` | `#0C0A09` | — | Page background |
| `--color-surface` | `#1C1917` | — | Solid surfaces, select options |
| `--color-text` | `#F5F0E6` | 17.4:1 | Primary text |
| `--color-text-muted` | `#C9C0B1` | 11.0:1 | Secondary copy, descriptions |
| `--color-text-subtle` | `#A39A8C` | 7.1:1 | Captions, labels, placeholders, hints |
| `--color-accent` | `#D8B46A` | 10.0:1 | Links, icons, active state |
| `--color-accent-strong` | `#ECD29A` | 13.4:1 | Hover, emphasis, focus ring |
| `--color-accent-deep` | `#A8843F` | 5.7:1 | Gradient end, pressed |
| `--color-on-accent` | `#1A1408` | 9.3:1 on accent | Text on gold buttons/chips |
| `--color-danger` | `#FF8A80` | 8.7:1 | Errors (always with text, never colour alone) |
| `--color-success` | `#8FD9A8` | 11.9:1 | Success / savings |
| `--color-border` | white 10% | decorative | Card and divider hairlines |
| `--color-border-strong` | cream 32% | ≥ 3:1 | Input and control outlines |

**Changed from v1:** the old `--faint` text colour (cream 38%) measured **3.2:1** and was used on small labels,
placeholders and hints — below AA. It is replaced by `--color-text-subtle` (7.1:1).

**Accent gradient** `--accent-grad`: `#ECD29A → #D8B46A → #A8843F` at 135°. Use for primary buttons,
active chips and display highlights only — never for body text.

## Typography

| Token | Value | Use |
|---|---|---|
| `--font-display` | Cormorant Garamond → IBM Plex Sans Thai | Hero, section and panel titles (Latin glyphs serif; Thai falls back to Plex) |
| `--font-body` | IBM Plex Sans Thai | All UI and body text |
| `--font-mono` | ui-monospace, SF Mono, Menlo | Code, hashes, swatches |
| `--text-xs` | 13px | **Minimum** for any readable text |
| `--text-sm` / `--text-base` | 14px / 16px | Small UI / body |
| `--text-display` | clamp(2.8rem, 7vw, 5.6rem) | Hero |

Rules: body line-height 1.6; uppercase eyebrows use `--tracking-caps` (0.28em); numbers in timers and
calculators use the body font at weight 300 (Cormorant's old-style figures read "0" as "O").

## Space, radius, elevation

- Spacing scale (4px base): `--space-1…8` = 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: `--radius-sm` 10 · `--radius-md` 14 (inputs) · `--radius-lg` 22 (cards, panels) · `--radius-pill` (buttons, chips).
- Elevation: `--shadow-glass` for every glass surface; `--shadow-accent` / `-hover` for gold buttons only.

## Glass surfaces

| Token | Use |
|---|---|
| `--surface-glass-grad` + `--glass-blur` | Cards, nav, footer (`.glass`) |
| `--surface-glass` / `-hover` | Ghost buttons, chips |
| `--surface-panel` (96–97% opaque) | Modal panels — must stay near-opaque so text never sits on blurred page content |
| `--surface-input` | Form fields |

## Motion

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 150ms | Hover, colour, exits |
| `--dur-base` | 250ms | Buttons, modal fade-in |
| `--dur-slow` | 400ms | Card lift, panel slide |
| `--ease-out` | cubic-bezier(.2,.8,.2,1) | Entrances |
| `--ease-in` | cubic-bezier(.4,0,1,1) | Exits |

Exits are faster than entrances (modal closes at 150ms, opens at 250ms). `prefers-reduced-motion`
disables all animation and transition.

## Components

| Component | Spec |
|---|---|
| Button | min-height `--control-height` (44px), pill radius, 24px horizontal padding. Variants: `.btn-gold` (primary, one per view), `.btn-ghost` (secondary). Small `.btn-sm` is 40px on mouse, 44px on touch. |
| Chip / filter | min-height `--control-height-sm`, pill; active = gold gradient + `--color-on-accent`. |
| Card (`.tool-card`) | `--card-radius`, `--card-padding`, glass; hover lifts 6px and swaps border to `--color-border-accent`. |
| Input | min-height 44px, `--input-radius`, `--color-border-strong` outline; focus = gold border + soft glow. Labels always visible above the field. |
| Modal | Scrim `--color-scrim`, near-opaque `--surface-panel`, close button 44×44 top-right, Esc closes, focus returns to the opener. |
| Icon | SVG stroke 1.6px, `currentColor`, inside a 50px gold-tinted tile. No emoji as icons in chrome. |

### Feedback & guidance components (added with Smart Paste / Backup / Money tools)

| Component | Spec |
|---|---|
| Toast | `role="status"` + `aria-live="polite"`, visible 3.5 s (UX guideline: 3–5 s, auto-dismiss). |
| Field message `.field-msg` | Directly under its input, linked with `aria-describedby`; neutral → `.err` (danger) → `.warn` (accent-strong). Never only a top-level error. |
| Empty state `.empty-hint` | Dashed `--color-border-strong` box: one bold line saying what is missing + one line saying what to do. Never a blank area. |
| Callout `.callout` | Accent-tinted box with 40 px icon tile for important context (e.g. “data lives only on this device”). |
| Steps `.step` | Numbered sections (gold 28 px badge) for multi-part tools: people → expenses → summary. |
| Smart suggestions `.smart` | Header names what was detected; each row = icon tile, action title, inline answer in `--color-accent-strong` when available, chevron; optional “คัดลอก”. Rows are ≥ 56 px tall. |
| Reminder banner `.banner` | Accent border, icon, two lines, primary + “ไว้ทีหลัง” (snoozes 7 days). Only for risk of data loss. |
| Destructive / overwrite | Confirm dialog first; restore keeps a one-step undo. |
| Delete-row `.rm` | 40 px (44 px on touch), subtle ink, danger on hover; always has an `aria-label` naming the item. |

Printable documents (receipts, invoices, PromptPay card) use the light override in `pages/document.md`.

## Accessibility contract

- Every interactive element shows a 2px gold `--focus-ring` (offset by 2px of background) on `:focus-visible`.
- Touch targets ≥ 44×44px on coarse pointers.
- Skip link "ข้ามไปที่เครื่องมือ" is the first focusable element.
- Text ≥ 13px and ≥ 4.5:1; status colours always paired with text.
- `forced-colors` mode keeps glass surfaces outlined.

## Pre-delivery checklist

- [ ] Uses tokens only — no raw hex in components (exceptions: QR canvas white, video letterbox black)
- [ ] New text colours checked at ≥ 4.5:1 against `--color-bg` and `--color-surface`
- [ ] Focus visible on every new control; Esc / back behave predictably
- [ ] Works at 375, 768, 1024, 1440px with no horizontal scroll
- [ ] `prefers-reduced-motion` respected
- [ ] `VERSION` bumped in `sw.js`
