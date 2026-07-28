import { api } from "../api/client";
import { toast } from "sonner";

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("Unified API Client Wrapper", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("should perform GET request and return parsed JSON data", async () => {
    const mockData = { id: 1, name: "Test Item" };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockData,
    });

    const res = await api.get<{ id: number; name: string }>("/api/test", {
      params: { search: "test", page: 1 },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/test?search=test&page=1",
      expect.objectContaining({
        method: "GET",
      })
    );
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual(mockData);
  });

  it("should perform POST request with JSON body", async () => {
    const mockResult = { success: true };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockResult,
    });

    const payload = { title: "New Task", priority: "high" };
    const res = await api.post("/api/tasks", payload);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/tasks",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      })
    );
    expect(res.ok).toBe(true);
    expect(res.data).toEqual(mockResult);
  });

  it("should trigger toast error on 401 Unauthorized", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ error: "Unauthorized" }),
    });

    const res = await api.get("/api/protected");

    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(toast.error).toHaveBeenCalledWith("Session expired. Please log in again.");
  });

  it("should trigger toast error on API failure response", async () => {
    const errorResponse = { error: "Validation failed" };
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => errorResponse,
    });

    const res = await api.post("/api/expenses", { amount: -50 });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(toast.error).toHaveBeenCalledWith("Validation failed");
  });

  it("should handle network failure gracefully with fallback error message", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network disconnect"));

    const res = await api.get("/api/reports");

    expect(res.ok).toBe(false);
    expect(res.status).toBe(0);
    expect(toast.error).toHaveBeenCalledWith("Network error. Please try again.");
  });
});
