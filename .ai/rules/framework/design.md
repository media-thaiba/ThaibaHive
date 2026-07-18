# Premium UI/UX Design Conventions

Visual aesthetics, styling constraints, and design systems conventions.

---

## 1. Visual Aesthetics
- **Color Scheme**: Warm green serves as the primary brand color, conveying institutional trust and clarity.
- **Dark Mode**: Integrate dark theme rules alongside default light rules.
- **Default Elements**: Never use standard browser inputs or native layouts. Implement shadcn/ui components wrapper configurations.
- **Tailwind Rules**: Write styling definitions using utility classes inside JSX files. Do not create raw inline `style={{ ... }}` objects.

## 2. Dynamic Transitions & Micro-Animations
- Add micro-animations (e.g. spring transitions, hover scales, active opacity reductions) using Framer Motion to make UI layouts feel responsive and alive.
- Enable touch target sizes of at least 44x44 pixels for optimal mobile and tablet interactivity.

## 3. Status Indicators & Loading States
- **Badges**: Use `<Badge variant="success|warning|destructive|info|secondary">` for status colors. Do not write custom Tailwind colors for statuses (e.g. do not hardcode `bg-green-500` or `bg-red-500`).
- **Loading states**: Always show loading layouts using `<Skeleton>` overlays from shadcn/ui. Do not render static "Loading..." text blocks or custom pulsing divs.
