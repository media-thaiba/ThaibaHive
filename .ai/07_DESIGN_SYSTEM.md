# 07_DESIGN_SYSTEM.md — ThaibaHive Design System & Visual Specification

> **Classification**: UI/UX Design System & Token Specifications  
> **Source of Truth**: `.ai/07_DESIGN_SYSTEM.md` & `src/app/globals.css`

---

## 1. Design Aesthetics & Visual Philosophy

ThaibaHive Institution OS uses a **Modern, State-of-the-Art Visual Aesthetic** characterized by:
* **Deep Emerald & Slate Palette**: Tailored HSL colors giving an authoritative, enterprise feel.
* **Glassmorphism & Micro-Interactions**: Subtle border glows, backdrop filters, and spring animations.
* **Typography Balance**: Geist / Plus Jakarta Sans fonts with balanced text wrapping (`text-wrap: balance`).
* **Semantic Dark Mode**: Full dual-theme support tuned for reduced eye fatigue during long administrative sessions.

---

## 2. Design Tokens & Color Palette

Defined in `src/app/globals.css`:

```css
:root {
  /* Core Background & Surfaces */
  --background: 150 10% 97%;
  --foreground: 210 12% 23%;
  --card: 0 0% 100%;
  --popover: 0 0% 100%;

  /* Brand Palette (Deep Emerald & Chartreuse) */
  --primary: 152 68% 28%;
  --primary-foreground: 0 0% 100%;
  --secondary: 80 50% 46%;

  /* Semantic Status Colors */
  --success: 152 68% 28%;
  --warning: 38 92% 50%;
  --info: 217 91% 60%;
  --destructive: 0 72% 51%;

  /* Layout Tokens */
  --radius: 0.625rem;
}

.dark {
  --background: 210 14% 10%;
  --foreground: 150 5% 88%;
  --card: 210 14% 13%;
  --primary: 142 71% 45%;
}
```

---

## 3. Typography Scale

Tailwind utility classes defined in `globals.css`:
* `.text-display`: `text-3xl font-bold tracking-tight` (Page Titles, Metric Displays)
* `.text-title`: `text-xl font-semibold tracking-tight` (Section Headers, Card Titles)
* `.text-heading`: `text-lg font-semibold tracking-tight` (Sub-headers)
* `.text-label`: `text-sm font-medium` (Form Labels, Table Headers)
* `.text-caption`: `text-xs text-muted-foreground` (Help text, Timestamps)
* `.text-micro`: `text-[11px] font-medium uppercase tracking-wider` (Badges, Category Pills)

---

## 4. Surfaces & Interactive Card States

### 4.1 Card Elevation & Surfaces
* `.surface-brand`: `bg-[hsl(var(--brand-surface))] border border-[hsl(var(--brand-border))]`
* `.surface-elevated`: `bg-card border shadow-sm`
* `.surface-sunken`: `bg-muted/50`

### 4.2 Interactive Hover Micro-Interactions
```css
.interactive-card {
  @apply rounded-xl border bg-card p-4 transition-all duration-200;
  box-shadow: var(--shadow-xs);
}
.interactive-card:hover {
  box-shadow: var(--shadow-md);
  @apply border-primary/15 -translate-y-0.5;
}
```

---

## 5. Component Usage Standards

### 5.1 Status Badges (`<Badge>`)
Badges MUST use semantic status variants instead of hardcoded colors:
* `<Badge variant="success">Active</Badge>`
* `<Badge variant="warning">Pending Approval</Badge>`
* `<Badge variant="destructive">Overdue</Badge>`
* `<Badge variant="secondary">Inactive</Badge>`

### 5.2 Loading Skeleton Shimmers (`<Skeleton>`)
Replace generic spinners with layout-matching shimmer cards (`animate-shimmer`):
```tsx
<div className="space-y-3">
  <Skeleton className="h-12 w-full" />
  <Skeleton className="h-12 w-full" />
</div>
```

---

## 6. Animation Keyframes

Exposed via Tailwind CSS in `globals.css`:
* `animate-slide-up`: Smooth 250ms spring entrance from bottom (`translateY(12px)`).
* `animate-scale-in`: 200ms scale entrance from 96% to 100%.
* `animate-shimmer`: 1.5s infinite background gradient shimmer for loading states.
* `.stagger-children`: Cascades entrance animation with 40ms stagger per child element.
