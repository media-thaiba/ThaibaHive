import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetDragHandle,
} from "../sheet";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../table";
import { Badge } from "../badge";
import { Button } from "../button";
import { Providers } from "@/components/layout/Providers";

describe("Apple Design UI Primitives", () => {
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
  describe("Sheet Component", () => {
    it("renders composable trigger, drag handle, opens sheet content, and wires ARIA dialog role/modal/labelledby", async () => {
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetDragHandle data-testid="sheet-drag-handle" />
              <SheetTitle>Test Sheet Title</SheetTitle>
              <SheetDescription>Test Sheet Description</SheetDescription>
            </SheetHeader>
            <div data-testid="sheet-body">Sheet Content Body</div>
            <SheetClose data-testid="sheet-close-btn">Dismiss</SheetClose>
          </SheetContent>
        </Sheet>
      );

      // Initially closed
      expect(screen.queryByText("Test Sheet Title")).not.toBeInTheDocument();

      // Open via trigger
      fireEvent.click(screen.getByText("Open Sheet"));
      const dialog = screen.getByRole("dialog", { name: "Test Sheet Title" });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-describedby");

      expect(screen.getByText("Test Sheet Title")).toBeInTheDocument();
      expect(screen.getByText("Test Sheet Description")).toBeInTheDocument();
      expect(screen.getByTestId("sheet-body")).toBeInTheDocument();
      expect(screen.getAllByTestId("sheet-drag-handle")[0]).toBeInTheDocument();

      // Close via SheetClose
      fireEvent.click(screen.getByTestId("sheet-close-btn"));
      await waitFor(() => {
        expect(screen.queryByText("Test Sheet Title")).not.toBeInTheDocument();
      });
    });

    it("locks body scroll when open, restores focus to trigger, and closes on Escape key", async () => {
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open Dialog Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle>Esc Sheet</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      const triggerBtn = screen.getByText("Open Dialog Sheet");
      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);
      fireEvent.click(triggerBtn);
      expect(screen.getByText("Esc Sheet")).toBeInTheDocument();
      expect(document.body.style.overflow).toBe("hidden");

      fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByText("Esc Sheet")).not.toBeInTheDocument();
      });
      expect(document.body.style.overflow).toBe("");
      expect(document.activeElement).toBe(triggerBtn);
    });

    it("handles stacked nested sheets without releasing scroll-lock prematurely and closes only top sheet on Esc", async () => {
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open First</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle>First Sheet</SheetTitle>
            <Sheet>
              <SheetTrigger asChild>
                <Button>Open Second</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetTitle>Second Sheet</SheetTitle>
                <SheetClose data-testid="close-second">Close Second</SheetClose>
              </SheetContent>
            </Sheet>
            <SheetClose data-testid="close-first">Close First</SheetClose>
          </SheetContent>
        </Sheet>
      );

      fireEvent.click(screen.getByText("Open First"));
      expect(screen.getByText("First Sheet")).toBeInTheDocument();
      expect(document.body.style.overflow).toBe("hidden");

      fireEvent.click(screen.getByText("Open Second"));
      expect(screen.getByText("Second Sheet")).toBeInTheDocument();
      expect(document.body.style.overflow).toBe("hidden");

      // Pressing Escape closes ONLY the second sheet (top of stack)
      fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByText("Second Sheet")).not.toBeInTheDocument();
      });
      // First sheet remains open and body remains locked
      expect(screen.getByText("First Sheet")).toBeInTheDocument();
      expect(document.body.style.overflow).toBe("hidden");

      // Pressing Escape again closes the first sheet and releases the body scroll-lock
      fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByText("First Sheet")).not.toBeInTheDocument();
      });
      expect(document.body.style.overflow).toBe("");
    });

    it("traps keyboard Tab and Shift+Tab focus cycling inside sheet content", async () => {
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open Trapped Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle>Trapped Sheet</SheetTitle>
            <button data-testid="first-input">First Button</button>
            <button data-testid="last-input">Last Button</button>
          </SheetContent>
        </Sheet>
      );

      fireEvent.click(screen.getByText("Open Trapped Sheet"));
      expect(screen.getByText("Trapped Sheet")).toBeInTheDocument();

      const closeBtn = screen.getByLabelText("Close");
      const lastBtn = screen.getByTestId("last-input");

      // Test reverse wrap: Shift+Tab on first element (close button) wraps to last element
      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);
      fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(lastBtn);

      // Test forward wrap: Tab on last element wraps to first element (close button)
      fireEvent.keyDown(window, { key: "Tab", shiftKey: false });
      expect(document.activeElement).toBe(closeBtn);
    });

    it("applies inert to background siblings when sheet is open and removes it on close", async () => {
      const backgroundEl = document.createElement("div");
      backgroundEl.setAttribute("data-testid", "bg-content");
      backgroundEl.textContent = "Background Page Content";
      document.body.appendChild(backgroundEl);

      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open Inert Test Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle>Inert Test Sheet</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(backgroundEl).not.toHaveAttribute("inert");

      fireEvent.click(screen.getByText("Open Inert Test Sheet"));
      expect(screen.getByText("Inert Test Sheet")).toBeInTheDocument();
      expect(backgroundEl).toHaveAttribute("inert");

      fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByText("Inert Test Sheet")).not.toBeInTheDocument();
      });
      expect(backgroundEl).not.toHaveAttribute("inert");

      document.body.removeChild(backgroundEl);
    });
  });

  describe("Table Component with Tabular Numbers", () => {
    it("renders table cells and headers with tabular-nums class", () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="th-balance">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell data-testid="td-balance">1,234.56</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByTestId("th-balance").className).toContain("tabular-nums");
      expect(screen.getByTestId("td-balance").className).toContain("tabular-nums");
    });
  });

  describe("Badge Component", () => {
    it("defaults to 11px rem-scaled typography and tabular-nums", () => {
      const { container } = render(<Badge>Verified</Badge>);
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("text-[0.6875rem]");
      expect(badge?.className).toContain("tabular-nums");
      expect(badge?.className).toContain("tracking-wider");
    });

    it("applies 10px typography when dense variant is explicitly chosen", () => {
      const { container } = render(<Badge size="dense">Telemetry HUD</Badge>);
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("text-[10px]");
      expect(badge?.className).toContain("tabular-nums");
    });
  });

  describe("Button Touch Targets", () => {
    it("includes 44px hit expansion classes for coarse pointers on small sizes", () => {
      const { container } = render(<Button size="icon-sm">Icon</Button>);
      const button = container.querySelector("button");
      expect(button?.className).toContain("[@media(pointer:coarse)]:relative");
      expect(button?.className).toContain("[@media(pointer:coarse)]:after:absolute");
      expect(button?.className).toContain("[@media(pointer:coarse)]:after:content-['']");
      expect(button?.className).toContain("[@media(pointer:coarse)]:after:left-1/2");
      expect(button?.className).toContain("[@media(pointer:coarse)]:after:top-1/2");
      expect(button?.className).toContain("[@media(pointer:coarse)]:after:-translate-x-1/2");
      expect(button?.className).toContain("[@media(pointer:coarse)]:after:-translate-y-1/2");
      expect(button?.className).toContain("[@media(pointer:coarse)]:after:min-h-[44px]");
      expect(button?.className).toContain("[@media(pointer:coarse)]:after:min-w-[44px]");
    });
  });

  describe("MotionConfig Integration", () => {
    it("renders Providers wrapper without crashing and mounts children", () => {
      const { container } = render(
        <Providers>
          <div data-testid="child-element">App Content</div>
        </Providers>
      );
      expect(screen.getByTestId("child-element")).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });
  });
});
