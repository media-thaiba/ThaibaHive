import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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

      expect(screen.getByText("Active")).toHaveClass("bg-success/10");
      expect(screen.getByText("Suspended")).toHaveClass("bg-destructive/10");
      expect(screen.getByText("Pending")).toHaveClass("bg-warning/10");
    });
  });

  describe("2. Interactive Focus & Keyboard Operability", () => {
    it("renders Button with focus-visible and aria attributes", () => {
      render(<Button aria-label="Submit Approval">Submit</Button>);

      const btn = screen.getByRole("button", { name: "Submit Approval" });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass("focus-visible:ring-3");
    });

    it("handles disabled state with aria-disabled semantics", () => {
      render(<Button disabled>Processing...</Button>);

      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass("disabled:pointer-events-none");
    });
  });
});
