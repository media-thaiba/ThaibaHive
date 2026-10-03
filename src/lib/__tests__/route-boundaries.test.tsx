/**
 * O2 — Route boundary coverage and contracts.
 *
 * Guarantees every route segment inherits a loading, error and not-found
 * boundary (nearest-ancestor rule), that error boundaries satisfy the
 * Next.js client-component contract, and that each boundary renders.
 */
import fs from "fs";
import path from "path";
import { render, screen, fireEvent } from "@testing-library/react";
import RootLoading from "@/app/loading";
import ShellLoading from "@/app/(shell)/loading";
import RootError from "@/app/error";
import ShellError from "@/app/(shell)/error";
import RootNotFound from "@/app/not-found";
import GlobalError from "@/app/global-error";

const APP_DIR = path.join(__dirname, "..", "..", "app");

const REQUIRED_BOUNDARIES: { file: string; mustBeClient: boolean }[] = [
  { file: "loading.tsx", mustBeClient: false },
  { file: "error.tsx", mustBeClient: true },
  { file: "global-error.tsx", mustBeClient: true },
  { file: "not-found.tsx", mustBeClient: false },
  { file: "(shell)/loading.tsx", mustBeClient: false },
  { file: "(shell)/error.tsx", mustBeClient: true },
];

function read(rel: string): string {
  return fs.readFileSync(path.join(APP_DIR, rel), "utf8");
}

function listSegmentDirs(dir: string, out: string[] = []): string[] {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const full = path.join(dir, item.name);
    const hasRouteFile = ["page.tsx", "route.ts", "layout.tsx"].some((f) =>
      fs.existsSync(path.join(full, f))
    );
    if (hasRouteFile) out.push(full);
    listSegmentDirs(full, out);
  }
  return out;
}

function hasAncestorBoundary(dir: string, boundary: string): boolean {
  let current = dir;
  for (;;) {
    if (fs.existsSync(path.join(current, boundary))) return true;
    if (current === APP_DIR) return false;
    current = path.dirname(current);
  }
}

describe("required route boundaries exist with Next contracts", () => {
  for (const boundary of REQUIRED_BOUNDARIES) {
    it(`${boundary.file} exists with a default-exported component`, () => {
      const source = read(boundary.file);
      expect(source).toMatch(/export default function \w+/);
      if (boundary.mustBeClient) {
        expect(source).toContain('"use client"');
      }
    });
  }
});

describe("every route segment inherits loading/error/not-found boundaries", () => {
  const segments = listSegmentDirs(APP_DIR);
  const boundaries = ["loading.tsx", "error.tsx", "not-found.tsx"];

  it("discovers route segments under src/app", () => {
    expect(segments.length).toBeGreaterThan(50);
  });

  for (const boundary of boundaries) {
    it(`every segment resolves ${boundary} via nearest ancestor`, () => {
      const uncovered = segments
        .filter((dir) => !hasAncestorBoundary(dir, boundary))
        .map((dir) => path.relative(APP_DIR, dir));
      expect(uncovered).toEqual([]);
    });
  }
});

describe("boundary render smoke", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("root error boundary shows message and calls reset on retry", () => {
    const reset = jest.fn();
    render(<RootError error={new Error("boom")} reset={reset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("shell error boundary shows message and calls reset on retry", () => {
    const reset = jest.fn();
    render(<ShellError error={new Error("boom")} reset={reset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("global error boundary shows message and calls reset on retry", () => {
    const reset = jest.fn();
    render(<GlobalError error={new Error("boom")} reset={reset} />);
    expect(screen.getByText("Application Error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("not-found boundary renders the 404 copy", () => {
    render(<RootNotFound />);
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to dashboard/i })).toBeInTheDocument();
  });

  it("root loading boundary renders skeletons", () => {
    const { container } = render(<RootLoading />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shell loading boundary renders skeletons", () => {
    const { container } = render(<ShellLoading />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
