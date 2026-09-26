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
