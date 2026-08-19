import { serializeMobileUser, serializeMobileDashboard, serializeMobileProfile } from "@/lib/mobile/mobile-serializer";

describe("Mobile Lightweight API Serializers", () => {
  it("should serialize user payload accurately", () => {
    const user = serializeMobileUser({
      id: "usr_55",
      firstName: "Amina",
      lastName: "Khan",
      email: "amina@thaibahive.edu",
      role: "principal",
      employeeId: "EMP-9001",
    });

    expect(user.id).toBe("usr_55");
    expect(user.name).toBe("Amina Khan");
    expect(user.role).toBe("principal");
    expect(user.employeeId).toBe("EMP-9001");
  });

  it("should serialize lightweight dashboard response under 5KB", () => {
    const userSummary = serializeMobileUser({
      id: "usr_55",
      name: "Amina Khan",
      email: "amina@thaibahive.edu",
      role: "principal",
    });

    const dashboard = serializeMobileDashboard({
      user: userSummary,
      pendingApprovalsCount: 3,
      upcomingExamsCount: 2,
    });

    const jsonStr = JSON.stringify(dashboard);
    const sizeInKB = Buffer.byteLength(jsonStr, "utf-8") / 1024;

    expect(dashboard.pendingApprovalsCount).toBe(3);
    expect(dashboard.upcomingExamsCount).toBe(2);
    expect(dashboard.quickActions.length).toBeGreaterThan(0);
    expect(sizeInKB).toBeLessThan(5);
  });

  it("should serialize mobile profile payload cleanly", () => {
    const profile = serializeMobileProfile({
      id: "usr_99",
      name: "Tariq Ali",
      email: "tariq@thaibahive.edu",
      role: "hod",
      department: "Computer Science",
      institutionName: "Thaiba City Campus",
    });

    expect(profile.id).toBe("usr_99");
    expect(profile.department).toBe("Computer Science");
    expect(profile.institutionName).toBe("Thaiba City Campus");
    expect(profile.activeStatus).toBe(true);
  });

  it("should handle null or optional fields gracefully", () => {
    const user = serializeMobileUser({
      id: "usr_00",
      email: "plain@thaibahive.edu",
      role: "staff",
    });

    expect(user.name).toBe("plain@thaibahive.edu");
    expect(user.employeeId).toBeNull();
  });
});
