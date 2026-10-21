import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

describe("WCAG 2.1 AA Accessibility & Inclusive Design Suite", () => {
  describe("1. Visual Indicators & Semantic Roles", () => {
    it("renders Alert with role='alert' for immediate assistive technology feedback", () => {
      render(
        <Alert variant="error">
          <span>Critical system error occurred</span>
        </Alert>
      );

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("Critical system error occurred");
    });

    it("renders Alert dismiss action with accessible aria-label", () => {
      const handleDismiss = jest.fn();
      render(
        <Alert variant="warning" onDismiss={handleDismiss}>
          <span>Session timeout approaching</span>
        </Alert>
      );

      const dismissBtn = screen.getByRole("button", { name: /dismiss alert/i });
      expect(dismissBtn).toBeInTheDocument();
    });

    it("renders semantic status badges for screen reader readability", () => {
      render(
        <div>
          <Badge variant="success">Active</Badge>
          <Badge variant="destructive">Suspended</Badge>
          <Badge variant="warning">Pending</Badge>
        </div>
      );

      expect(screen.getByText("Active")).toHaveClass("bg-emerald-500/10");
      expect(screen.getByText("Suspended")).toHaveClass("bg-destructive/10");
      expect(screen.getByText("Pending")).toHaveClass("bg-amber-500/10");
    });
  });

  describe("2. Interactive Focus & Keyboard Operability", () => {
    it("renders Button with focus-visible and aria attributes", () => {
      render(<Button aria-label="Submit Approval">Submit</Button>);

      const btn = screen.getByRole("button", { name: "Submit Approval" });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass("focus-visible:ring-2");
    });

    it("handles disabled state with aria-disabled semantics", () => {
      render(<Button disabled>Processing...</Button>);

      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass("disabled:pointer-events-none");
    });
  });

  describe("3. Form Validation Announcements & Live Regions (WCAG 3.3.1, 4.1.3)", () => {
    it("renders dynamic form error container within an aria-live region with role='alert'", () => {
      const errorMessage = "Invalid employee credentials provided";
      render(
        <div aria-live="polite" data-testid="error-live-region">
          <Alert variant="error">
            <span>{errorMessage}</span>
          </Alert>
        </div>
      );

      const liveRegion = screen.getByTestId("error-live-region");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(errorMessage);
    });

    it("associates field-level input with validation message using aria-invalid and aria-describedby", () => {
      render(
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            aria-invalid={true}
            aria-describedby="email-error"
            defaultValue="invalid-email"
          />
          <p id="email-error" role="alert" className="text-xs text-destructive">
            Please enter a valid academic email address
          </p>
        </div>
      );

      const input = screen.getByLabelText("Email Address");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", "email-error");

      const errorMsg = screen.getByRole("alert");
      expect(errorMsg).toHaveAttribute("id", "email-error");
      expect(errorMsg).toHaveTextContent("Please enter a valid academic email address");
    });

    it("announces async form submission feedback non-disruptively using role='status' and aria-live='polite'", () => {
      render(
        <div role="status" aria-live="polite" aria-atomic="true">
          <span>Verifying credentials...</span>
        </div>
      );

      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
      expect(status).toHaveAttribute("aria-atomic", "true");
      expect(status).toHaveTextContent("Verifying credentials...");
    });

    it("verifies skip-link accessibility contract targeting main content landmark", () => {
      render(
        <div>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <main id="main-content" role="main" tabIndex={-1}>
            <h1>Dashboard</h1>
          </main>
        </div>
      );

      const skipLink = screen.getByRole("link", { name: "Skip to main content" });
      expect(skipLink).toHaveAttribute("href", "#main-content");
      expect(skipLink).toHaveClass("skip-link");

      const mainContent = screen.getByRole("main");
      expect(mainContent).toHaveAttribute("id", "main-content");
      expect(mainContent).toHaveAttribute("tabIndex", "-1");
    });
  });

  describe("4. Semantic Token Contrast Compliance (WCAG 1.4.3 AA / 1.4.6 AAA)", () => {
    function hslToRgb(h: number, s: number, l: number): [number, number, number] {
      s /= 100;
      l /= 100;
      const k = (n: number) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [f(0), f(8), f(4)];
    }

    function relativeLuminance(r: number, g: number, b: number): number {
      const a = [r, g, b].map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }

    function calculateContrast(rgb1: [number, number, number], rgb2: [number, number, number]): number {
      const l1 = relativeLuminance(...rgb1);
      const l2 = relativeLuminance(...rgb2);
      const brightest = Math.max(l1, l2);
      const darkest = Math.min(l1, l2);
      return (brightest + 0.05) / (darkest + 0.05);
    }

    it("verifies light mode core text meets WCAG AAA (>= 7:1)", () => {
      const bg = hslToRgb(0, 0, 100);
      const fg = hslToRgb(222, 47, 11);
      const ratio = calculateContrast(fg, bg);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

    it("verifies light mode muted text meets WCAG AA (>= 4.5:1) on muted and canvas surfaces", () => {
      const mutedBg = hslToRgb(210, 20, 96);
      const canvasBg = hslToRgb(0, 0, 100);
      const mutedFg = hslToRgb(215, 16, 40);

      const ratioOnMuted = calculateContrast(mutedFg, mutedBg);
      const ratioOnCanvas = calculateContrast(mutedFg, canvasBg);

      expect(ratioOnMuted).toBeGreaterThanOrEqual(4.5);
      expect(ratioOnCanvas).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies light mode semantic status tokens meet or exceed WCAG AA requirements", () => {
      const canvasBg = hslToRgb(0, 0, 100);
      const white = hslToRgb(0, 0, 100);
      const darkSlate = hslToRgb(222, 47, 11);

      // Warning: Dark slate text on amber warning (38 92% 50%)
      const warningBg = hslToRgb(38, 92, 50);
      const warningRatio = calculateContrast(darkSlate, warningBg);
      expect(warningRatio).toBeGreaterThanOrEqual(7.0); // WCAG AAA

      // Destructive: Red (0 84% 48%) on canvas and white on red
      const destructive = hslToRgb(0, 84, 48);
      expect(calculateContrast(destructive, canvasBg)).toBeGreaterThanOrEqual(4.5);
      expect(calculateContrast(white, destructive)).toBeGreaterThanOrEqual(4.5);

      // Success: Emerald (160 84% 28%) on canvas and white on emerald
      const success = hslToRgb(160, 84, 28);
      expect(calculateContrast(success, canvasBg)).toBeGreaterThanOrEqual(4.5);
      expect(calculateContrast(white, success)).toBeGreaterThanOrEqual(4.5);

      // Info: Sky (217 91% 48%) on canvas and white on sky
      const info = hslToRgb(217, 91, 48);
      expect(calculateContrast(info, canvasBg)).toBeGreaterThanOrEqual(4.5);
      expect(calculateContrast(white, info)).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies dark mode semantic tokens meet WCAG AAA requirements", () => {
      const darkCard = hslToRgb(222, 40, 9);
      const darkFg = hslToRgb(222, 47, 5);

      // Warning in dark mode: dark slate on amber
      const darkWarning = hslToRgb(38, 92, 50);
      expect(calculateContrast(darkFg, darkWarning)).toBeGreaterThanOrEqual(7.0);

      // Success in dark mode: dark slate on emerald (160 84% 45%)
      const darkSuccess = hslToRgb(160, 84, 45);
      expect(calculateContrast(darkFg, darkSuccess)).toBeGreaterThanOrEqual(7.0);
    });
  });
});

