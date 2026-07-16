import { isAuthorizedToViewLeave } from "../leaves/utils";
import { db } from "@/db";

jest.mock("@/db", () => {
  const mockAll = jest.fn();
  const mockFrom = jest.fn(() => ({
    where: jest.fn(() => ({
      all: mockAll,
    })),
  }));
  const mockSelect = jest.fn(() => ({
    from: mockFrom,
  }));
  return {
    db: {
      select: mockSelect,
    },
  };
});

const mockDb = db as any;

describe("isAuthorizedToViewLeave", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true if requester and reviewer are the same person", async () => {
    const res = await isAuthorizedToViewLeave("staff-1", "staff", "staff-1");
    expect(res).toBe(true);
  });

  it("should return true if reviewer is admin or super_admin", async () => {
    const resAdmin = await isAuthorizedToViewLeave("reviewer-1", "admin", "staff-1");
    const resSuper = await isAuthorizedToViewLeave("reviewer-1", "super_admin", "staff-1");
    expect(resAdmin).toBe(true);
    expect(resSuper).toBe(true);
  });

  it("should return false if requester is not in any department", async () => {
    mockDb.select().from().where().all.mockResolvedValueOnce([]);
    
    const res = await isAuthorizedToViewLeave("reviewer-1", "hod", "staff-1");
    expect(res).toBe(false);
  });

  it("should return true if reviewer is HOD of the requester's department", async () => {
    mockDb.select().from().where().all.mockResolvedValueOnce([{ departmentId: "dept-1" }]);
    mockDb.select().from().where().all.mockResolvedValueOnce([{ id: "dept-1" }]);

    const res = await isAuthorizedToViewLeave("hod-1", "hod", "staff-1");
    expect(res).toBe(true);
  });

  it("should return false if reviewer is HOD of a different department", async () => {
    mockDb.select().from().where().all.mockResolvedValueOnce([{ departmentId: "dept-1" }]);
    mockDb.select().from().where().all.mockResolvedValueOnce([]);

    const res = await isAuthorizedToViewLeave("hod-2", "hod", "staff-1");
    expect(res).toBe(false);
  });
});
