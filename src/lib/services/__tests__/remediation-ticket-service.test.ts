import { RemediationTicketService } from "../remediation-ticket-service";

jest.mock("@thaiba/db", () => {
  return {
    db: {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(true),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ id: "rem_101", status: "open" }),
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([]),
              }),
            }),
            limit: jest.fn().mockResolvedValue([{ staffId: "stf_101" }]),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(true),
        }),
      }),
    },
    remediationTickets: { id: "id" },
    staffInstitutions: { institutionId: "institutionId", staffId: "staffId" },
  };
});

describe("RemediationTicketService", () => {
  it("creates remediation ticket with auto-reassigned lowest loaded staff", async () => {
    const ticket = await RemediationTicketService.createTicket({
      title: "Fee collection velocity below threshold",
      severity: "high",
      category: "finance",
      institutionId: "inst_101",
      autoAssign: true,
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.title).toBe("Fee collection velocity below threshold");
    expect(ticket.assignedStaffId).toBe("stf_101");
  });

  it("updates remediation ticket status", async () => {
    const updated = await RemediationTicketService.updateTicket("rem_101", {
      status: "resolved",
      resolutionSummary: "Fee collected successfully",
    });
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("resolved");
  });
});
