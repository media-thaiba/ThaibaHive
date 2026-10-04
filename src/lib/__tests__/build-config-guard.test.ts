import * as fs from "fs";
import * as path from "path";

describe("Build Configuration Validation Guard (R9-2)", () => {
  const nextConfigPath = path.resolve(process.cwd(), "next.config.ts");
  const nextConfigJsPath = path.resolve(process.cwd(), "next.config.js");
  const nextConfigMjsPath = path.resolve(process.cwd(), "next.config.mjs");

  it("ensures next.config does not contain flags that bypass TypeScript or ESLint validation", () => {
    const configPaths = [nextConfigPath, nextConfigJsPath, nextConfigMjsPath].filter(fs.existsSync);
    expect(configPaths.length).toBeGreaterThan(0);

    const forbiddenPatterns = [
      { pattern: /ignoreBuildErrors\s*:\s*true/, name: "typescript.ignoreBuildErrors: true" },
      { pattern: /ignoreDuringBuilds\s*:\s*true/, name: "eslint.ignoreDuringBuilds: true" },
      { pattern: /ignoreBuildErrors/, name: "ignoreBuildErrors key" },
      { pattern: /ignoreDuringBuilds/, name: "ignoreDuringBuilds key" },
    ];

    const violations: string[] = [];

    for (const filePath of configPaths) {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const { pattern, name } of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push(`${path.basename(filePath)} contains forbidden validation-bypass flag: "${name}"`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Build Configuration Guard Failure:\n${violations.join("\n")}\nProduction builds must perform full type validation.`
      );
    }

    expect(violations).toHaveLength(0);
  });
});
