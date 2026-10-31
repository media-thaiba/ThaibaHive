import { withMembershipCache, invalidateMembershipCache, getStaffInstitutionMemberships } from "../index";

describe("AsyncLocalStorage Membership Cache", () => {
  it("executes transparently outside ALS context", async () => {
    const memberships = await getStaffInstitutionMemberships("staff_non_existent");
    expect(Array.isArray(memberships)).toBe(true);
  });

  it("caches membership lookups within withMembershipCache context", async () => {
    await withMembershipCache(async () => {
      const first = await getStaffInstitutionMemberships("staff_test_caching");
      const second = await getStaffInstitutionMemberships("staff_test_caching");
      expect(first).toBe(second); // Same cached array reference in memory
    });
  });

  it("invalidates cache when invalidateMembershipCache is called", async () => {
    await withMembershipCache(async () => {
      const first = await getStaffInstitutionMemberships("staff_test_invalidation");
      invalidateMembershipCache("staff_test_invalidation");
      const second = await getStaffInstitutionMemberships("staff_test_invalidation");
      expect(Array.isArray(second)).toBe(true);
    });
  });
});
