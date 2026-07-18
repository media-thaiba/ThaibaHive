# Global Security Conventions

Security guidelines to protect credentials, validate user inputs, and enforce authentication boundaries.

---

## 1. Credentials & Secrets Management
- **Never hardcode secrets**: Do not place API keys, encryption tokens, or passwords directly in code. Always load them via `process.env` (web) or configurations/secure store (mobile).
- **Environment variables**: Use `.env.local` for local execution. Provide references in `.env.example`.
- **API Responses**: Always sanitize DB models before rendering them to the client. Do not leak sensitive columns (e.g. `passwordHash`).

## 2. Input Validation
- **All web API endpoints** accepting request bodies must validate input using a corresponding Zod schema (stored in `src/lib/validation/schemas.ts`). Use `safeParse()` and yield detailed error objects if constraints are violated.
- **Parametric Database Queries**: Always use parametric inputs. Drizzle ORM handles this natively. Avoid raw SQL strings.

## 3. Cookie Management
- Set `httpOnly`, `secure`, and `sameSite` parameters on all authentication JWT session cookies to prevent XSS script access.
