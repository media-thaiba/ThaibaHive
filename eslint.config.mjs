import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "jest.setup.ts", "**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "thaibahive_mobile_app/**",
    "scratch/**",
    ".opencode/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
