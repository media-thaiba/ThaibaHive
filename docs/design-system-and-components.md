# ThaibaHive Design System & Component Architecture

**Version:** 3.31.0  
**Design Standards:** WCAG 2.1 AA Compliant, Radix UI Primitives, Tailwind CSS 3.4

---

## 1. Design Tokens & Visual Hierarchy

ThaibaHive follows a modern enterprise visual system configured via Tailwind CSS custom properties:

### 1.1. Color Tokens
- **`primary` / `primary-foreground`**: Brand accent color (institutional themeable).
- **`background` / `foreground`**: Main canvas and text hierarchy.
- **`card` / `card-foreground`**: Elevated panels and container surfaces.
- **`muted` / `muted-foreground`**: Secondary descriptions and subdued backgrounds.
- **`border` / `input` / `ring`**: Structural dividers and high-contrast focus rings.

### 1.2. Status Badges & Semantic Colors
Always use `<Badge variant="...">` rather than arbitrary Tailwind utility colors:
- `variant="success"`: Approved, Active, Present, Connected.
- `variant="warning"`: Pending, Review, Late, Attention.
- `variant="destructive"` / `variant="error"`: Rejected, Absent, Overdue, Critical Alert.
- `variant="info"`: In Progress, Upcoming, Informational.
- `variant="secondary"`: Neutral, Draft, Inactive.

---

## 2. UI Primitive Contracts

All primitives reside in `src/components/ui/` and wrap accessible Radix UI primitives:

| Component | Path | Core Features & Usage |
| :--- | :--- | :--- |
| `<Button>` | `src/components/ui/button.tsx` | Variants: `default`, `outline`, `ghost`, `destructive`, `secondary`. Built-in loading states and focus-visible rings. |
| `<Input>` | `src/components/ui/input.tsx` | Text, email, search, password inputs with accessible label pairing. |
| `<Dialog>` | `src/components/ui/dialog.tsx` | Accessible modal dialog with focus traps, escape-key closing, and portal mounting. |
| `<Card>` | `src/components/ui/card.tsx` | `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<CardFooter>`. |
| `<Skeleton>` | `src/components/ui/skeleton.tsx` | Smooth loading state placeholders with pulse animation. |
| `<EmptyState>` | `src/components/ui/empty-state.tsx` | Standardized empty view with icon, title, description, and primary CTA. |
| `<Badge>` | `src/components/ui/badge.tsx` | Standardized status indicators. |
| `<Alert>` | `src/components/ui/alert.tsx` | Accessible feedback banners with `role="alert"` / `aria-live`. |

---

## 3. Extracted Domain Components (Wave 2)

Oversized monolith pages have been extracted into specialized, modular sub-components:

### 3.1. Media Library (`src/components/media-library/`)
- `MediaToolbar`: Search input, category filter, view mode toggle (grid vs list), and upload trigger.
- `MediaGridView`: Responsive asset thumbnail grid with file type previews and multi-select.
- `MediaListView`: Detailed metadata table with sorting and file details.
- `MediaModals`: Dynamic modal container for upload queues, file details preview, and rename/delete dialogs.

### 3.2. Vehicle Fleet & Logistics (`src/components/vehicles/`)
- `VehicleStats`: Fleet utilization, active trips, fuel metrics, and maintenance alerts.
- `FleetTable`: Vehicle registry with status badges, capacity, and driver assignment.
- `BookingsTable`: Trip schedule, approval workflows, and passenger manifest.
- `LogsTable`: Mileage, fuel refills, service history, and inspection logs.

### 3.3. Circulars & Bulletins (`src/components/circulars/`)
- `CircularFilterBar`: Search input, department selection, priority filter.
- `CircularPublishForm`: Dynamic form dialog for authoring institutional circulars with audience targeting.
- `CircularFeedGrid`: Card feed with read receipts, urgency indicators, and attachment links.

### 3.4. Grievance Redressal (`src/components/grievances/`)
- `GrievanceStatCards`: Open cases, resolution rate, average turnaround time, SLA breach alerts.
- `GrievanceList`: Filterable table with priority badges, tracking IDs, and category indicators.
- `GrievanceSubmitDialog`: Confidential intake form with category tags and file attachment.
- `GrievanceDetailDialog`: Investigation history, administrative notes, and status transition actions.

---

## 4. Accessibility (WCAG 2.1 AA) Compliance Rules

When creating or modifying UI components:
1. **Form Labels**: Every input **must** have an associated `<label htmlFor="id">` or `aria-label`.
2. **Icons**: Decorative Lucide / SVG icons must have `aria-hidden="true"`.
3. **Interactive Elements**: Buttons and links without visible text must provide `aria-label`.
4. **Focus Rings**: Interactive elements must support `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden`.
5. **Live Regions**: Dynamic counts and error updates must be wrapped in `aria-live="polite"` or `role="alert"`.
6. **Landmarks**: Tab navigation must implement `role="tablist"`, `role="tab"`, and `role="tabpanel"`.
