# Next.js 16 App Router Conventions

Rules for routes and API handlers under Next.js 16 and React 19.

---

## 1. Directory Structure & Routing
- Place all authenticated routes inside the `src/app/(shell)/` directory to inherit the standard layouts, header, sidebar, and command palettes.
- Define public landing pages (e.g. login, signup) in `src/app/(public)/` or `src/app/auth/`.
- Use Next.js `loading.tsx` and `error.tsx` templates to handle routing suspensions.

## 2. API Routes Conventions
- **Route Handlers**: Put handlers inside `src/app/api/.../route.ts` files.
- **Authentication Wrapper**: Wrap all authenticated endpoints using `requireAuth(handler, "permission:string")`.
- **Validation**: All API routes that receive POST/PATCH payloads must validate the request body using a Zod schema from `src/lib/validation/schemas.ts`.
- **Response Format**: On failure, return JSON payloads containing an `error` string with a proper HTTP status code (e.g., `return Response.json({ error: "Unauthorized" }, { status: 401 })`).
- **DELETE handlers**: Check the resource's existence before executing the database delete operation. Return a `404 Not Found` response if the resource is missing.
