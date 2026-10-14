import { EdFiAdapter } from "../adapters/edfi";
import { OneRosterAdapter } from "../adapters/oneroster";
import { CsvAdapter } from "../adapters/csv";
import { TokenLifecycle } from "../token-lifecycle";
import { EgressGuard } from "../egress-guard";
import type { SisConnectorRecord } from "../connector-registry";

describe("Wave 3: SIS Adapters (Ed-Fi, OneRoster, CSV)", () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
    TokenLifecycle.clearCache();
    EgressGuard.clearDnsMocks();
    EgressGuard.setDnsMock("sis.myschool.edu", ["93.184.216.34"]);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    TokenLifecycle.clearCache();
    EgressGuard.clearDnsMocks();
  });

  describe("EdFiAdapter", () => {
    const connector: SisConnectorRecord = {
      id: "sisc_edfi_1",
      institutionId: "inst_alpha",
      standard: "edfi",
      name: "EdFi Hub",
      baseUrl: "https://sis.myschool.edu/data/v1",
      credentialRef: "KEY",
      authMode: "oauth2",
      enabled: true,
      scheduleCron: null,
      fieldMappingJson: JSON.stringify({ customGrade: "gradeLevelDescriptor" }),
      lastSyncAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("pulls students, staff, and sections and applies field mappings", async () => {
      TokenLifecycle.setCachedToken(connector.id, "mock_token", 3600 * 1000);

      const fetchMock = jest.fn().mockImplementation((url: any) => {
        const u = String(url);
        if (u.includes("/ed-fi/students")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                studentUniqueId: "STU_1001",
                firstName: "Amina",
                lastSurname: "Rahman",
                electronicMailAddress: "amina@school.edu",
                gradeLevelDescriptor: "Grade 10",
              },
            ],
          } as any);
        }
        if (u.includes("/ed-fi/staffs")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                staffUniqueId: "STF_2001",
                firstName: "Rashid",
                lastSurname: "Khan",
                electronicMailAddress: "rashid@school.edu",
                department: "Mathematics",
              },
            ],
          } as any);
        }
        if (u.includes("/ed-fi/sections")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                sectionIdentifier: "SEC_3001",
                sectionName: "Algebra I",
                courseCode: "MATH-101",
              },
            ],
          } as any);
        }
        return Promise.resolve({ ok: false, status: 404 } as any);
      });
      global.fetch = fetchMock;

      const adapter = new EdFiAdapter();
      const result = await adapter.sync(connector, { mode: "full" });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(result.records).toHaveLength(3);

      const student = result.records.find((r) => r.entityType === "students");
      expect(student).toBeDefined();
      expect(student?.externalId).toBe("STU_1001");
      expect(student?.payload.firstName).toBe("Amina");
      expect(student?.payload.customGrade).toBe("Grade 10"); // Field mapping applied!

      const staff = result.records.find((r) => r.entityType === "staff");
      expect(staff).toBeDefined();
      expect(staff?.externalId).toBe("STF_2001");

      const section = result.records.find((r) => r.entityType === "sections");
      expect(section).toBeDefined();
      expect(section?.externalId).toBe("SEC_3001");
    });

    it("passes minChangeVersion on delta sync", async () => {
      TokenLifecycle.setCachedToken(connector.id, "mock_token", 3600 * 1000);

      const fetchMock = jest.fn().mockImplementation((url: any) => {
        expect(String(url)).toContain("minChangeVersion=5000");
        return Promise.resolve({
          ok: true,
          json: async () => [],
        } as any);
      });
      global.fetch = fetchMock;

      const adapter = new EdFiAdapter();
      await adapter.sync(connector, { mode: "delta", checkpoint: "5000" });
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe("OneRosterAdapter", () => {
    const connector: SisConnectorRecord = {
      id: "sisc_or_1",
      institutionId: "inst_alpha",
      standard: "oneroster",
      name: "OneRoster Hub",
      baseUrl: "https://sis.myschool.edu/ims/oneroster/v1p2",
      credentialRef: "KEY",
      authMode: "oauth2",
      enabled: true,
      scheduleCron: null,
      fieldMappingJson: null,
      lastSyncAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("distinguishes student and staff roles correctly", async () => {
      TokenLifecycle.setCachedToken(connector.id, "mock_token", 3600 * 1000);

      const fetchMock = jest.fn().mockImplementation((url: any) => {
        const u = String(url);
        if (u.includes("/users")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              users: [
                {
                  sourcedId: "OR_STU_1",
                  givenName: "Bilal",
                  familyName: "Ahmed",
                  email: "bilal@school.edu",
                  role: "student",
                },
                {
                  sourcedId: "OR_TEA_1",
                  givenName: "Fatima",
                  familyName: "Zahra",
                  email: "fatima@school.edu",
                  role: "teacher",
                },
              ],
            }),
          } as any);
        }
        if (u.includes("/classes")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              classes: [
                {
                  sourcedId: "CLS_101",
                  title: "Biology Grade 9",
                  classCode: "BIO-9",
                },
              ],
            }),
          } as any);
        }
        return Promise.resolve({ ok: false, status: 404 } as any);
      });
      global.fetch = fetchMock;

      const adapter = new OneRosterAdapter();
      const result = await adapter.sync(connector, { mode: "full" });

      expect(result.records).toHaveLength(3);
      const student = result.records.find((r) => r.externalId === "OR_STU_1");
      expect(student?.entityType).toBe("students");

      const teacher = result.records.find((r) => r.externalId === "OR_TEA_1");
      expect(teacher?.entityType).toBe("staff");

      const cls = result.records.find((r) => r.externalId === "CLS_101");
      expect(cls?.entityType).toBe("sections");
    });
  });

  describe("CsvAdapter", () => {
    it("parses comma-separated student records correctly", () => {
      const adapter = new CsvAdapter();
      const csv = `student_id,first_name,last_name,email
STU_001,Zayd,Mansoor,zayd@school.edu
STU_002,Mariam,Ali,mariam@school.edu`;

      const records = adapter.parseCsv(csv);
      expect(records).toHaveLength(2);
      expect(records[0].entityType).toBe("students");
      expect(records[0].externalId).toBe("STU_001");
      expect(records[0].payload.first_name).toBe("Zayd");
    });

    it("parses semicolon-delimited staff records correctly", () => {
      const adapter = new CsvAdapter();
      const csv = `staff_id;name;department
STF_99;Dr. Hameed;Physics
STF_98;Prof. Sara;Chemistry`;

      const records = adapter.parseCsv(csv);
      expect(records).toHaveLength(2);
      expect(records[0].entityType).toBe("staff");
      expect(records[0].externalId).toBe("STF_99");
      expect(records[0].payload.department).toBe("Physics");
    });
  });
});
