import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "jest.setup.ts",
      "**/__tests__/**",
      "e2e/**",
      "k6/**",
      "load-tests/**",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // O3: security-critical auth/session/DPoP/guard/validation code must stay `any`-free.
    // Declared after the test override so packages/auth tests are covered too.
    // O3-R ratchet: extended to the API client layer, tenant isolation code,
    // finance gateway/security/telemetry code, and all NFC surfaces.
    files: [
      "src/lib/api/**/*.ts",
      "src/lib/api/**/*.tsx",
      "src/lib/tenant/**/*.ts",
      "src/lib/tenant/**/*.tsx",
      "src/lib/operations/finance/**/*.ts",
      "src/lib/operations/finance/**/*.tsx",
      "src/components/nfc/**/*.tsx",
      "src/app/api/admin/nfc/**/*.ts",
      "src/app/api/staff/[id]/nfc-card/**/*.ts",
      "src/app/(shell)/admin/nfc/**/*.tsx",
      "src/lib/api/auth-guard.ts",
      "src/lib/api/public-apm.ts",
      "src/lib/identity/*.ts",
      "src/lib/validation/soar-schemas.ts",
      "packages/auth/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Architectural Boundary: Restrict database client/schema imports in client components and client hooks
    files: [
      "src/components/**/*.ts",
      "src/components/**/*.tsx",
      "src/hooks/**/*.ts",
      "src/hooks/**/*.tsx"
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@thaiba/db",
              message: "Database imports are only allowed in server components, API routes, or server actions. Import from service layers or API client wrappers instead."
            },
            {
              name: "@/db",
              message: "Database imports are only allowed in server components, API routes, or server actions. Import from service layers or API client wrappers instead."
            }
          ],
          patterns: [
            {
              group: ["@thaiba/db/*", "@/db/*"],
              message: "Database imports are only allowed in server components, API routes, or server actions. Import from service layers or API client wrappers instead."
            }
          ]
        }
      ]
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "thaibahive_mobile_app/**",
    "scratch/**",
    ".opencode/**",
  ]),
]);

export default eslintConfig;
