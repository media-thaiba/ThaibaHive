import React from "react";
import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import SheetHarness from "../page";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    const error = new Error("NEXT_NOT_FOUND");
    (error as any).digest = "NEXT_NOT_FOUND";
    throw error;
  }),
}));

describe("SheetHarness production gating", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws notFound() when NODE_ENV is production and NEXT_PUBLIC_E2E is unset", () => {
    (process.env as any).NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_E2E;

    expect(() => SheetHarness()).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("does not call notFound() when NODE_ENV is production and NEXT_PUBLIC_E2E is 1", () => {
    (process.env as any).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_E2E = "1";

    expect(() => render(<SheetHarness />)).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByTestId("open-sheet")).toBeInTheDocument();
  });

  it("does not call notFound() in development environment", () => {
    (process.env as any).NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_E2E;

    expect(() => render(<SheetHarness />)).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByTestId("open-sheet")).toBeInTheDocument();
  });
});
