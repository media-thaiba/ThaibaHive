import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommandPalette } from "../command-palette";
import React from "react";

// Mock WorkspaceContext
jest.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      id: "my-work",
      label: "My Work",
      description: "Personal tasks and reports",
    },
    availableWorkspaces: [
      { id: "my-work", label: "My Work", description: "Personal tasks", icon: () => null },
      { id: "operations", label: "Operations", description: "Campus operations", icon: () => null },
      { id: "school", label: "School", description: "Academic hub", icon: () => null },
      { id: "admin", label: "Admin", description: "System control", icon: () => null },
    ],
  }),
}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Web CommandPalette Universal Search Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
  });

  it("renders when open is true with combobox role", () => {
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);
    const combobox = screen.getByRole("combobox");
    expect(combobox).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search students, staff, tasks/i)).toBeInTheDocument();
  });

  it("renders navigation items when query is empty", () => {
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByText(/Navigation/i)).toBeInTheDocument();
  });

  it("fetches and renders entity results when query is typed", async () => {
    const mockResults = {
      success: true,
      data: {
        students: [
          {
            id: "stud-1",
            entityType: "students",
            title: "Alice Walker",
            subtitle: "Adm: 1001",
            nativeRoute: "/students/stud-1",
            webRoute: "/school/students/stud-1",
            isWebOnly: false,
          },
        ],
        tasks: [
          {
            id: "task-1",
            entityType: "tasks",
            title: "Review Homework",
            subtitle: "Priority: high",
            nativeRoute: "/tasks/task-1",
            webRoute: "/my-work/tasks?taskId=task-1",
            isWebOnly: false,
          },
        ],
        totalResults: 2,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResults,
    });

    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "Alice" } });

    await waitFor(() => {
      expect(screen.getByText("Alice Walker")).toBeInTheDocument();
    });

    expect(screen.getByText("Review Homework")).toBeInTheDocument();
  });

  it("navigates on Enter key press", async () => {
    const onOpenChange = jest.fn();
    const mockResults = {
      success: true,
      data: {
        students: [
          {
            id: "stud-1",
            entityType: "students",
            title: "Alice Walker",
            subtitle: "Adm: 1001",
            nativeRoute: "/students/stud-1",
            webRoute: "/school/students/stud-1",
            isWebOnly: false,
          },
        ],
        totalResults: 1,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResults,
    });

    render(<CommandPalette open={true} onOpenChange={onOpenChange} />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "Alice" } });

    await waitFor(() => {
      expect(screen.getByText("Alice Walker")).toBeInTheDocument();
    });

    // Press ArrowDown to highlight entity
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockPush).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("loads and displays recent searches from localStorage", async () => {
    localStorage.setItem(
      "thaibahive_recent_searches_v1",
      JSON.stringify(["Physics Lab", "Admission Forms"])
    );

    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);

    expect(screen.getByText("Recent Searches")).toBeInTheDocument();
    expect(screen.getByText("Physics Lab")).toBeInTheDocument();
    expect(screen.getByText("Admission Forms")).toBeInTheDocument();
  });

  it("shows error and allows retry on search failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Server Error" }),
    });

    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "error-query" } });

    await waitFor(() => {
      expect(screen.getByText(/Search failed with status: 500/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Retry/i)).toBeInTheDocument();
  });
});

