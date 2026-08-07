import { GET, POST } from "../scheduled-jobs/route";
import { PATCH } from "../scheduled-jobs/[id]/route";
import { db } from "@/db";

jest.mock("@/lib/auth/require-auth", () => ({
  requireAuth: (handler: any) => (req: any, session: any, context?: any) => handler(req, session || { role: "super_admin" }, context),
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    all: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue({ count: 0 }),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    run: jest.fn().mockResolvedValue({ changes: 1 }),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  },
}));

jest.mock("@/lib/services/report-queue", () => ({
  ReportQueue: {
    addJob: jest.fn().mockResolvedValue("job-uuid-123"),
    processQueue: jest.fn().mockResolvedValue(undefined),
    publishQueueMetrics: jest.fn().mockResolvedValue(undefined),
  },
}));

function createMockRequest(url: string, method: string = "GET", body?: any): Request {
  return new Request(url, {
    method,
    headers: new Headers({
      "Content-Type": "application/json",
    }),
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("API-002, API-003, API-004: Scheduled Jobs API Endpoint Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists scheduled jobs via GET", async () => {
    const req = createMockRequest("http://localhost/api/admin/scheduled-jobs?page=1&limit=10&status=queued");
    const session = { role: "super_admin" };
    
    // Setup db.all mock data
    const mockJobs = [
      { id: "1", type: "attendance", format: "pdf", status: "queued", createdAt: "2026-08-06T12:00:00Z" }
    ];
    (db.all as jest.Mock).mockResolvedValueOnce(mockJobs);
    (db.get as jest.Mock).mockResolvedValueOnce({ count: 1 });

    const res = await (GET as any)(req, session);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.jobs).toHaveLength(1);
  });

  it("rejects unauthorized users with Forbidden", async () => {
    const req = createMockRequest("http://localhost/api/admin/scheduled-jobs");
    const session = { role: "staff" };

    const res = await (GET as any)(req, session);
    expect(res.status).toBe(403);
  });

  it("triggers manual report job execution via POST", async () => {
    const body = {
      type: "attendance",
      format: "pdf",
      institutionId: "inst_test_01",
      options: { dateRange: "today" }
    };
    const req = createMockRequest("http://localhost/api/admin/scheduled-jobs", "POST", body);
    const session = { role: "super_admin" };

    const res = await (POST as any)(req, session);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.job).toBeDefined();
  });

  it("updates job status to paused via PATCH", async () => {
    const req = createMockRequest("http://localhost/api/admin/scheduled-jobs/job-123", "PATCH", { status: "paused" });
    const session = { role: "super_admin" };
    const context = { params: Promise.resolve({ id: "job-123" }) };

    (db.get as jest.Mock).mockResolvedValueOnce({ id: "job-123", status: "queued" });

    const res = await (PATCH as any)(req, session, context);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.newStatus).toBe("paused");
  });

  it("rejects schema-violation request on POST", async () => {
    const body = {
      type: "invalid_type",
      format: "xyz",
      institutionId: ""
    };
    const req = createMockRequest("http://localhost/api/admin/scheduled-jobs", "POST", body);
    const session = { role: "super_admin" };

    const res = await (POST as any)(req, session);
    expect(res.status).toBe(400);
  });

  it("resumes a paused job via PATCH queued status", async () => {
    const req = createMockRequest("http://localhost/api/admin/scheduled-jobs/job-123", "PATCH", { status: "queued" });
    const session = { role: "super_admin" };
    const context = { params: Promise.resolve({ id: "job-123" }) };

    (db.get as jest.Mock).mockResolvedValueOnce({ id: "job-123", status: "paused" });

    const res = await (PATCH as any)(req, session, context);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.newStatus).toBe("queued");
  });

  it("cancels a queued job via PATCH cancelled status", async () => {
    const req = createMockRequest("http://localhost/api/admin/scheduled-jobs/job-123", "PATCH", { status: "cancelled" });
    const session = { role: "super_admin" };
    const context = { params: Promise.resolve({ id: "job-123" }) };

    (db.get as jest.Mock).mockResolvedValueOnce({ id: "job-123", status: "queued" });

    const res = await (PATCH as any)(req, session, context);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.newStatus).toBe("cancelled");
  });

  it("rejects invalid status transitions via PATCH", async () => {
    const req = createMockRequest("http://localhost/api/admin/scheduled-jobs/job-123", "PATCH", { status: "paused" });
    const session = { role: "super_admin" };
    const context = { params: Promise.resolve({ id: "job-123" }) };

    (db.get as jest.Mock).mockResolvedValueOnce({ id: "job-123", status: "success" });

    const res = await (PATCH as any)(req, session, context);
    expect(res.status).toBe(400);
  });
});

