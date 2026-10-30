/**
 * Place at: src/components/ui/__tests__/sheet-inert-nesting.test.tsx
 *
 * Covers the inert logic in sheet.tsx:
 *  - single sheet marks page siblings inert and restores them
 *  - nested sheets: closing the child un-inerts the parent but NOT the page
 *  - exemptions (toaster, route announcer) stay interactive
 *  - pre-existing inert elements are never "restored" by us
 *  - abrupt unmount leaves nothing inert and does not leak lock/escape state
 *
 * Uses fireEvent from @testing-library/react without requiring external user-event package.
 */
import { useState } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

/** inert is applied at <body>-child level, so walk up to that element. */
function bodyChildOf(el: Element): Element {
  let node: Element = el;
  while (node.parentElement && node.parentElement !== document.body) {
    node = node.parentElement;
  }
  return node;
}

// hidden: true because Testing Library treats aria-hidden subtrees as inaccessible
const dialogByName = (name: string) =>
  screen.getByRole("dialog", { name, hidden: true });
const queryDialogByName = (name: string) =>
  screen.queryByRole("dialog", { name, hidden: true });
const isInert = (el: Element) => el.hasAttribute("inert");
const sheetInertCount = () =>
  document.querySelectorAll("[data-sheet-inert]").length;

function Harness({ initialOuter = false }: { initialOuter?: boolean }) {
  const [outer, setOuter] = useState(initialOuter);
  const [inner, setInner] = useState(false);
  return (
    <>
      <button onClick={() => setOuter(true)}>open-outer</button>

      <Sheet open={outer} onOpenChange={setOuter}>
        <SheetContent>
          <SheetTitle>Outer</SheetTitle>
          <SheetDescription>outer description</SheetDescription>
          <button onClick={() => setInner(true)}>open-inner</button>
        </SheetContent>
      </Sheet>

      <Sheet open={inner} onOpenChange={setInner}>
        <SheetContent>
          <SheetTitle>Inner</SheetTitle>
          <SheetDescription>inner description</SheetDescription>
        </SheetContent>
      </Sheet>
    </>
  );
}

describe("Sheet inert isolation", () => {
  let extras: HTMLElement[] = [];
  let toaster: HTMLElement;
  let announcer: HTMLElement;
  let preexisting: HTMLElement;
  let plain: HTMLElement;

  function addBodyChild(id: string, attrs: Record<string, string> = {}) {
    const el = document.createElement("div");
    el.id = id;
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.body.appendChild(el);
    extras.push(el);
    return el;
  }

  beforeEach(() => {
    toaster = addBodyChild("toaster", { "data-sonner-toaster": "" });
    announcer = addBodyChild("next-route-announcer", {
      "aria-live": "assertive",
    });
    preexisting = addBodyChild("preexisting-inert", { inert: "" });
    plain = addBodyChild("plain-sibling");
  });

  afterEach(() => {
    extras.forEach((el) => el.remove());
    extras = [];
  });

  it("marks page siblings inert while open and restores them on close", async () => {
    const { container } = render(<Harness />);
    const appRoot = bodyChildOf(container);

    fireEvent.click(screen.getByText("open-outer"));
    const outerTop = bodyChildOf(dialogByName("Outer"));

    expect(isInert(appRoot)).toBe(true);
    expect(isInert(plain)).toBe(true);
    expect(isInert(outerTop)).toBe(false); // the sheet itself must stay live

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(queryDialogByName("Outer")).toBeNull());

    expect(isInert(appRoot)).toBe(false);
    expect(isInert(plain)).toBe(false);
    expect(sheetInertCount()).toBe(0);
  });

  it("nested: closing the child un-inerts the parent but keeps the page inert", async () => {
    const { container } = render(<Harness />);
    const appRoot = bodyChildOf(container);

    fireEvent.click(screen.getByText("open-outer"));
    const outerTop = bodyChildOf(dialogByName("Outer"));

    fireEvent.click(screen.getByText("open-inner"));
    const innerTop = bodyChildOf(dialogByName("Inner"));

    // Both open: parent + page inert, only the top sheet is live
    expect(isInert(innerTop)).toBe(false);
    expect(isInert(outerTop)).toBe(true);
    expect(isInert(appRoot)).toBe(true);
    expect(isInert(plain)).toBe(true);

    // First Escape closes ONLY the child
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(queryDialogByName("Inner")).toBeNull());
    expect(queryDialogByName("Outer")).toBeInTheDocument();

    // Parent live again, page STILL inert
    expect(isInert(outerTop)).toBe(false);
    expect(isInert(appRoot)).toBe(true);
    expect(isInert(plain)).toBe(true);

    // Second Escape closes the parent and fully restores the page
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(queryDialogByName("Outer")).toBeNull());
    expect(isInert(appRoot)).toBe(false);
    expect(isInert(plain)).toBe(false);
    expect(sheetInertCount()).toBe(0);
  });

  it("keeps toast and route-announcer containers interactive while open", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("open-outer"));

    expect(isInert(toaster)).toBe(false);
    expect(isInert(announcer)).toBe(false);
    expect(isInert(plain)).toBe(true); // control: a normal sibling IS inert
  });

  it("never removes inert that existed before the sheet opened", async () => {
    render(<Harness />);

    expect(isInert(preexisting)).toBe(true);
    fireEvent.click(screen.getByText("open-outer"));
    expect(isInert(preexisting)).toBe(true);
    // we must not claim ownership of something we did not mark
    expect(preexisting.hasAttribute("data-sheet-inert")).toBe(false);

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(queryDialogByName("Outer")).toBeNull());

    expect(isInert(preexisting)).toBe(true); // still inert after close
    expect(preexisting.hasAttribute("data-sheet-inert")).toBe(false);
  });

  it("abrupt unmount while open leaks no inert, scroll lock, or escape handler", async () => {
    const { unmount } = render(<Harness initialOuter />);
    await waitFor(() => expect(dialogByName("Outer")).toBeInTheDocument());
    expect(sheetInertCount()).toBeGreaterThan(0);
    expect(document.body.style.overflow).toBe("hidden");

    unmount(); // simulates a route change while the sheet is open

    expect(sheetInertCount()).toBe(0);
    expect(isInert(plain)).toBe(false);
    expect(isInert(preexisting)).toBe(true); // still not ours to touch
    expect(document.body.style.overflow).not.toBe("hidden");

    // A stale escape-stack entry would call a dead closer here
    expect(() => fireEvent.keyDown(window, { key: "Escape" })).not.toThrow();
  });

  it("scroll-lock counter is not stuck after an abrupt unmount", async () => {
    const first = render(<Harness initialOuter />);
    await waitFor(() => expect(dialogByName("Outer")).toBeInTheDocument());
    first.unmount();

    // Fresh mount: open then close must fully release the lock
    render(<Harness />);
    fireEvent.click(screen.getByText("open-outer"));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(queryDialogByName("Outer")).toBeNull());
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
