# React Framework Conventions

Coding conventions and patterns for building components in React 19.

---

## 1. Client Boundaries
- Next.js 16 components are Server Components by default.
- Place `"use client"` exclusively at the top of files that require browser APIs (e.g. `useEffect`, `useState`, click event listeners, Framer Motion animations).
- Minimize Client Component boundaries to maximize initial load performance.

## 2. Component Design & Forms
- **UI Primitives**: Always use standard UI components from `src/components/ui/` (e.g. `<Button>`, `<Input>`, `<Select>`, `<Dialog>`). Never use raw HTML components like `<input>`, `<select>`, `<button>`.
- **Forms**: Use `react-hook-form` integrated with `zodResolver` for data parsing and validation.

## 3. Safe State & Data Fetching
- **Array Parsing**: Never use inline `Array.isArray(x) ? x : []` statements. Import and use `ensureArray` from `@/lib/utils`.
- **useEffect Safety**: Ensure all `useEffect` fetch processes have an attached `.catch()` block to resolve loading screens and avoid stuck skeleton frames.
- **Dependency Arrays**: Provide accurate dependencies in all `useEffect` arrays to prevent memory leaks and redundant execution loops.
- **Modals**: Never write custom `fixed inset-0 z-50` layers. Use the standard `<Dialog>` primitives.
