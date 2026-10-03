/**
 * O5 — Accessibility & performance baseline guards.
 *
 * Part 1: static scans over src/app + src/components
 *   a11y: every raw <img> must declare an alt attribute
 *   perf: every next/image <Image> must declare width/height or fill
 *         (guards against layout shift)
 * Part 2: runtime WCAG scan (jest-axe) of the shared UI primitives that
 *         every page composes.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SCAN_ROOTS = ["src/app", "src/components"];

function collectTsxFiles(dir: string, out: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      collectTsxFiles(full, out);
    } else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
}

const sourceFiles = SCAN_ROOTS.flatMap((root) => collectTsxFiles(root));

function relative(p: string): string {
  const cwd = process.cwd().replace(/\\/g, "/");
  return p.replace(/\\/g, "/").replace(`${cwd}/`, "");
}

describe("static a11y scan (O5)", () => {
  test("scanner sees a non-trivial source set", () => {
    expect(sourceFiles.length).toBeGreaterThan(50);
  });

  test("every <img> declares an alt attribute", () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/<img\b[\s\S]*?>/g)) {
        if (!/\salt\s*=/.test(m[0])) {
          violations.push(`${relative(file)}: ${m[0].slice(0, 120)}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("static perf scan (O5)", () => {
  test("every next/image <Image> declares width/height or fill (no CLS)", () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      const src = readFileSync(file, "utf8");
      if (!/from\s+["']next\/image["']/.test(src)) continue;
      for (const m of src.matchAll(/<Image\b[\s\S]*?\/>/g)) {
        if (!/\b(width|height|fill)\s*=/.test(m[0])) {
          violations.push(`${relative(file)}: ${m[0].slice(0, 120)}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("WCAG runtime scan of shared UI primitives (O5, jest-axe)", () => {
  it("Button variants expose accessible names", async () => {
    const { container } = render(
      <div>
        <Button>Save changes</Button>
        <Button variant="destructive">Delete item</Button>
        <Button variant="ghost" size="icon" aria-label="Open settings">
          S
        </Button>
        <Button disabled>Disabled</Button>
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("Badge and Alert render without violations", async () => {
    const { container } = render(
      <div>
        <Badge variant="success">Passed</Badge>
        <Badge variant="warning">Pending</Badge>
        <Badge variant="info">Info</Badge>
        <Alert variant="error" onDismiss={() => undefined}>
          Something went wrong
        </Alert>
        <Alert variant="success">All good</Alert>
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("Input + Label association passes label rule", async () => {
    const { container } = render(
      <div>
        <Label htmlFor="o5-email">Email address</Label>
        <Input id="o5-email" type="email" placeholder="name@example.com" />
        <Label htmlFor="o5-search">Search</Label>
        <Input id="o5-search" aria-label="Search sites" />
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
