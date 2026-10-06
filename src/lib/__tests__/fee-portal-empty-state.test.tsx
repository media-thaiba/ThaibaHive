/**
 * O2 — Empty-state contracts for portal list pages.
 *
 * Guards the "no outstanding fees" EmptyState on the parent fee portal:
 * shown when the student has no allocation and no fetch error, hidden
 * while an error Alert is already displayed.
 */
import { render, screen } from "@testing-library/react";

const useParentFeesMock = jest.fn();

jest.mock("@/lib/hooks/use-parent-fees", () => ({
  useParentFees: () => useParentFeesMock(),
}));

jest.mock("@/lib/hooks/use-permissions", () => ({
  useUnifiedPermissions: () => ({
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    isLoading: false,
    role: "admin",
    isOneOf: () => true,
  }),
}));

import ParentFeesPortalPage from "@/app/(shell)/portal/fees/page";

function setHookState(overrides: {
  allocation?: unknown;
  paymentHistory?: unknown[];
  loading?: boolean;
  error?: string | null;
  refresh?: () => void;
} = {}) {
  useParentFeesMock.mockReturnValue({
    allocation: null,
    paymentHistory: [],
    loading: false,
    error: null,
    refresh: jest.fn(),
    ...overrides,
  });
}

describe("parent fees portal empty state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the no-outstanding-fees EmptyState when there is no allocation and no error", () => {
    setHookState();
    render(<ParentFeesPortalPage />);
    expect(screen.getByText("No outstanding fees")).toBeInTheDocument();
    expect(
      screen.getByText(/New invoices and installments will appear here/)
    ).toBeInTheDocument();
  });

  it("hides the EmptyState when a fetch error is displayed instead", () => {
    setHookState({ error: "Failed to fetch student fee details" });
    render(<ParentFeesPortalPage />);
    expect(screen.queryByText("No outstanding fees")).not.toBeInTheDocument();
    expect(
      screen.getByText("Failed to fetch student fee details")
    ).toBeInTheDocument();
  });

  it("does not render the EmptyState while loading", () => {
    setHookState({ loading: true });
    render(<ParentFeesPortalPage />);
    expect(screen.queryByText("No outstanding fees")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
