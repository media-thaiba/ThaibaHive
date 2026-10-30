/**
 * Place at: src/components/ui/__tests__/sheet-dropdown.test.tsx
 *
 * Covers the interaction between the sheet's inert/focus/Escape logic and a
 * portaled dropdown menu:
 *  1. menu opened INSIDE a sheet is interactive (not inert) and selectable
 *  2. Escape with a menu open closes the menu only, not the sheet
 *  3. a sheet opened FROM a menu item takes focus and leaves nothing inert
 */
import { useState } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  // jsdom gaps that Radix popper/menu rely on
  const proto = window.HTMLElement.prototype as any;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
  (global as any).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const SHEET_NAME = "Sheet title";
const getDialog = () =>
  screen.getByRole("dialog", { name: SHEET_NAME, hidden: true });
const queryDialog = () =>
  screen.queryByRole("dialog", { name: SHEET_NAME, hidden: true });

/* ---------- Case 1 & 2: menu inside a sheet ---------- */

function MenuInsideSheet({ onArchive }: { onArchive: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>open-sheet</button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetTitle>{SHEET_NAME}</SheetTitle>
          <SheetDescription>description</SheetDescription>
          <DropdownMenu>
            <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={onArchive}>Archive</DropdownMenuItem>
              <DropdownMenuItem>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SheetContent>
      </Sheet>
    </>
  );
}

describe("Dropdown menu inside a Sheet", () => {
  it("menu content is interactive (not inert) and an item can be selected", async () => {
    const onArchive = jest.fn();
    render(<MenuInsideSheet onArchive={onArchive} />);

    fireEvent.click(screen.getByText("open-sheet"));
    const trigger = screen.getByRole("button", { name: "Actions" });
    fireEvent.keyDown(trigger, { key: "Enter" });

    const item = await screen.findByRole("menuitem", { name: "Archive" });
    // The portaled menu mounts after the inert pass: neither it nor any ancestor may be inert
    expect(item.closest("[inert]")).toBeNull();

    fireEvent.click(item);
    expect(onArchive).toHaveBeenCalledTimes(1);

    // Sheet survives the selection
    expect(getDialog()).toBeInTheDocument();
  });

  it("Escape with a menu open closes the menu only, not the sheet", async () => {
    render(<MenuInsideSheet onArchive={jest.fn()} />);

    fireEvent.click(screen.getByText("open-sheet"));
    const trigger = screen.getByRole("button", { name: "Actions" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    const menu = await screen.findByRole("menu");

    fireEvent.keyDown(menu, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    // Escape closed only the menu; the sheet remains open
    expect(queryDialog()).toBeInTheDocument();
  });

  it("ignores Escape when defaultPrevented is true (e.g. inner component consumed it)", async () => {
    const onOpenChange = jest.fn();
    render(
      <Sheet open={true} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetTitle>{SHEET_NAME}</SheetTitle>
          <SheetDescription>description</SheetDescription>
        </SheetContent>
      </Sheet>
    );

    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true });
    event.preventDefault();
    window.dispatchEvent(event);

    // If defaultPrevented is ignored, onOpenChange would have been called with false!
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

/* ---------- Case 3: sheet opened from a menu item ---------- */

function SheetFromMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>Page menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            Open details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetTitle>{SHEET_NAME}</SheetTitle>
          <SheetDescription>description</SheetDescription>
          <button>inside-sheet</button>
        </SheetContent>
      </Sheet>
    </>
  );
}

describe("Sheet opened from a dropdown item", () => {
  it("focus lands inside the sheet and nothing stays inert after close", async () => {
    render(<SheetFromMenu />);

    const trigger = screen.getByRole("button", { name: "Page menu" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    const menuItem = await screen.findByRole("menuitem", { name: "Open details" });
    fireEvent.click(menuItem);

    await waitFor(() => expect(queryDialog()).toBeInTheDocument());

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(queryDialog()).toBeNull());

    // Nothing the sheet marked may survive
    expect(document.querySelectorAll("[data-sheet-inert]")).toHaveLength(0);
    expect(document.querySelectorAll("[inert]")).toHaveLength(0);
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
