# Design System — ThaibaHive

## Brand Personality
- **Trustworthy but warm** — precision of a tool, friendliness of a colleague
- **Quietly capable** — it works without needing to prove it works
- **Institution-appropriate but not institutional** — serious enough for HR compliance, comfortable enough for daily use

## Anti-References (Avoid)
1. **ERP gray** — dense tables, muted everything, no hierarchy, feels like punishment
2. **Bootcamp shadcn** — default card grid, unstyled selects, placeholder gradients
3. **Cartoon admin** — oversized icons, bright primary colors, childish typography

---

## Color System

### Light Mode
| Token | HSL | Hex (approx) | Usage |
|-------|-----|---------------|-------|
| `--background` | `150 10% 97%` | `#f5f7f5` | Page background |
| `--foreground` | `210 9% 33%` | `#4a4e52` | Primary text |
| `--card` | `0 0% 100%` | `#ffffff` | Card background |
| `--primary` | `147 85% 32%` | `#1a8a3e` | Primary actions, links |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | Text on primary |
| `--secondary` | `66 75% 52%` | `#8bc34a` | Secondary actions |
| `--muted` | `150 10% 94%` | `#e8ebe8` | Muted backgrounds |
| `--muted-foreground` | `210 9% 46%` | `#6b7280` | Secondary text |
| `--accent` | `150 35% 72%` | `#7cc48a` | Accents, highlights |
| `--destructive` | `0 72% 56%` | `#dc3545` | Destructive actions |
| `--border` | `150 10% 88%` | `#d4dbd4` | Borders |
| `--success` | `143 64% 24%` | `#1a7a2e` | Success states |
| `--warning` | `38 92% 50%` | `#e6a817` | Warning states |
| `--info` | `217 91% 60%` | `#3b82f6` | Info states |

### Dark Mode
| Token | HSL | Hex (approx) | Usage |
|-------|-----|---------------|-------|
| `--background` | `210 13% 11%` | `#1a1d21` | Page background |
| `--foreground` | `150 5% 87%` | `#d1d5d1` | Primary text |
| `--card` | `210 13% 14%` | `#22262b` | Card background |
| `--primary` | `147 70% 45%` | `#2ea44f` | Primary actions |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | Text on primary |
| `--secondary` | `66 60% 45%` | `#7a9a2e` | Secondary actions |
| `--muted` | `210 13% 18%` | `#2a2e33` | Muted backgrounds |
| `--accent` | `150 30% 25%` | `#2e4a33` | Accents |
| `--destructive` | `0 65% 50%` | `#c62828` | Destructive |
| `--border` | `210 13% 22%` | `#333840` | Borders |
| `--success` | `143 70% 55%` | `#34c759` | Success |
| `--warning` | `38 90% 55%` | `#f0a830` | Warning |
| `--info` | `217 80% 60%` | `#4a9af5` | Info |

### Brand Surfaces
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--brand-surface` | `150 35% 92%` | `150 30% 16%` | Brand-tinted backgrounds |
| `--brand-border` | `150 35% 80%` | `150 30% 25%` | Brand-tinted borders |

### Named Colors (Tailwind)
| Name | Light | Dark | Usage |
|------|-------|------|-------|
| `--color-slate` | `210 9% 33%` | `150 5% 87%` | Neutral text |
| `--color-green-bright` | `107 52% 54%` | `107 52% 54%` | Active indicators |
| `--color-green-dark` | `147 85% 32%` | `147 70% 45%` | Primary green |
| `--color-green-light` | `150 35% 72%` | `150 30% 30%` | Light green |
| `--color-chartreuse` | `66 75% 52%` | `66 60% 45%` | Chartreuse accent |

---

## Typography

### Font
- **Primary**: Geist (Sans-serif)
- **Fallback**: system-ui, sans-serif
- **Variable**: `--font-sans` (set via `next/font/google`)

### Type Scale
| Class | Size | Weight | Tracking | Usage |
|-------|------|--------|----------|-------|
| `text-display` | 3xl (30px) | bold | tight | Page titles |
| `text-title` | xl (20px) | semibold | tight | Section headers |
| `text-label` | sm (14px) | medium | normal | Labels, captions |
| `text-caption` | xs (12px) | normal | normal | Secondary text |
| `h1` | default | semibold | tight | Heading 1 |
| `h2` | default | semibold | tight | Heading 2 |
| `h3` | default | semibold | tight | Heading 3 |
| `h4` | default | semibold | tight | Heading 4 |

### Font Features
```css
font-feature-settings: "cv02", "cv03", "cv04", "cv11";
```
- `cv02`: Alternate lowercase `a`
- `cv03`: Alternate lowercase `g`
- `cv04`: Alternate lowercase `i`
- `cv11`: Tabular figures

---

## Spacing & Layout

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `0.5rem` (8px) | Base radius |
| `lg` | `var(--radius)` | Large radius (cards) |
| `md` | `calc(var(--radius) - 2px)` | Medium radius (buttons) |
| `sm` | `calc(var(--radius) - 4px)` | Small radius (badges) |

### Spacing System (Tailwind)
- Base unit: 4px
- Common values: `p-4` (16px), `p-6` (24px), `gap-4` (16px), `gap-6` (24px)

### Layout Breakpoints
| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, bottom nav |
| Tablet | 640px – 1024px | Two columns, collapsible sidebar |
| Desktop | > 1024px | Full sidebar, multi-column |

---

## Component Patterns

### Cards
```css
/* Default card */
.rounded-xl border bg-card p-4

/* Interactive card (hover effect) */
.interactive-card
/* → rounded-xl border bg-card p-4 transition-all duration-200 
   hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 */

/* Interactive row */
.interactive-row
/* → rounded-lg border bg-card p-3 transition-all duration-150 
   hover:shadow-sm hover:bg-muted/50 */
```

### Brand Surfaces
```css
.surface-brand     /* bg-[hsl(var(--brand-surface))] border border-[hsl(var(--brand-border))] */
.surface-brand-strong /* bg-primary/10 border border-primary/20 */
```

### Buttons
- Use shadcn/ui `Button` component
- Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- Sizes: `default`, `sm`, `lg`, `icon`

---

## Animations

### Keyframes
| Name | Duration | Effect |
|------|----------|--------|
| `fade-in` | 200ms | Opacity 0 → 1 |
| `slide-up` | 200ms | Opacity + translateY(10px) → 0 |
| `slide-down` | 200ms | Opacity + translateY(-10px) → 0 |
| `scale-in` | 150ms | Opacity + scale(0.95) → 1 |
| `pulse-subtle` | 2s loop | Opacity 1 → 0.7 → 1 |

### Utility Classes
```css
.animate-fade-in      /* fade-in 200ms ease-out */
.animate-slide-up     /* slide-up 200ms ease-out */
.animate-slide-down   /* slide-down 200ms ease-out */
.animate-scale-in     /* scale-in 150ms ease-out */
.animate-pulse-subtle /* pulse-subtle 2s ease-in-out infinite */
```

### Staggered Children
```css
.stagger-children > * { animation: slide-up 200ms ease-out backwards; }
.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 40ms; }
/* ... up to 8th child at 280ms */
```

### Transition Utilities
```css
.transition-default /* all 200ms ease-out */
.transition-fast    /* all 150ms ease-out */
.transition-slow    /* all 300ms ease-out */
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Focus & Accessibility

### Focus Ring
```css
:focus-visible {
  outline-none ring-2 ring-ring ring-offset-2 ring-offset-background;
}
```

### Touch Targets
```css
@media (pointer: coarse) {
  .min-w-[44px] { min-width: 44px; }
  .min-h-[44px] { min-height: 44px; }
}
```

### Selection
```css
::selection { bg-primary/15 text-primary; }
```

---

## Status Colors

| Status | Background | Text | Usage |
|--------|-----------|------|-------|
| Present/Success | `bg-success/10` | `text-success` | Attendance, completed |
| Warning/Late | `bg-warning/10` | `text-warning` | Late arrivals |
| Destructive/Error | `bg-destructive/10` | `text-destructive` | Errors, deletions |
| Info/Pending | `bg-info/10` | `text-info` | Pending states |
| Muted/Inactive | `bg-muted` | `text-muted-foreground` | Inactive items |

---

## Design Principles (from PRODUCT.md)
1. **Reduce decisions** — surface the one thing the user needs to do next
2. **Information scent** — labels, headings, and links tell the user what they'll find
3. **Visual rhythm** — consistent spacing, balanced content density, intentional whitespace
4. **Feedback before failure** — show success/error states inline, not in disappearing toasts
5. **Device-respecting** — desktop-first but not desktop-only
