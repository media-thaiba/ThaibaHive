import React from "react";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const ProblemComponent: React.FC = () => {
  throw new Error("Test component crash");
};

describe("ErrorBoundary Component", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Normal Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Normal Content")).toBeInTheDocument();
  });

  it("renders fallback UI when child component throws error", () => {
    render(
      <ErrorBoundary>
        <ProblemComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Component Error")).toBeInTheDocument();
    expect(screen.getByText("Failed to render this section.")).toBeInTheDocument();
  });
});
