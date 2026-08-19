import { executeFederatedQuery } from "../federation/gateway";
import { registerServiceSchema, getFederatedSchemas } from "../federation/schema-manager";
import { generateQueryPlan } from "../federation/query-planner";

import { db } from "../../db";
import { federatedServices } from "../../db/schema";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Phase 2: Federated GraphQL API Gateway Tests", () => {
  beforeAll(async () => {
    await db.delete(federatedServices).run();
    await db
      .insert(federatedServices)
      .values([
        {
          id: "srv_1",
          serviceName: "academics",
          endpoint: "http://localhost:3000/api/graphql/academics",
          schemaDefinition: `
            type Student { id: ID!, name: String!, email: String! }
            type Query { student(id: ID!): Student }
          `,
          status: "ACTIVE",
        },
        {
          id: "srv_2",
          serviceName: "finance",
          endpoint: "http://localhost:3000/api/graphql/finance",
          schemaDefinition: `
            type Transaction { id: ID!, amount: Float!, category: String! }
            type Query { transactions(studentId: ID!): [Transaction] }
          `,
          status: "ACTIVE",
        },
      ])
      .run();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("Schema Registry Manager", () => {
    it("should successfully register valid SDL schemas and retrieve them", async () => {
      const initialServices = await getFederatedSchemas();
      expect(initialServices.length).toBeGreaterThan(0);

      const newSchema = `
        type Grade { id: ID!, score: Int! }
        type Query { grade(id: ID!): Grade }
      `;
      const success = await registerServiceSchema("grades", "http://localhost:3000/api/graphql/grades", newSchema);
      expect(success).toBe(true);

      const services = await getFederatedSchemas();
      const gradesService = services.find((s) => s.serviceName === "grades");
      expect(gradesService).toBeDefined();
      expect(gradesService?.endpoint).toBe("http://localhost:3000/api/graphql/grades");
    });

    it("should reject schemas without a query entry definition", async () => {
      const invalidSchema = `
        type Grade { id: ID!, score: Int! }
      `;
      await expect(
        registerServiceSchema("invalid", "http://localhost:3000/api/graphql/invalid", invalidSchema)
      ).rejects.toThrow("Invalid schema definition");
    });
  });

  describe("Query Planner", () => {
    it("should split query containing nested academics and finance references into multiple steps", async () => {
      const query = `
        query {
          student(id: "usr_student_01") { id name email }
          transactions(studentId: "usr_student_01") { id amount }
        }
      `;
      const variables = { id: "usr_student_01" };
      const plan = await generateQueryPlan(query, variables);

      expect(plan.steps.length).toBe(2);
      expect(plan.steps[0].serviceName).toBe("academics");
      expect(plan.steps[1].serviceName).toBe("finance");
      expect(plan.steps[1].dependantOnStepIndex).toBe(0);
    });
  });

  describe("Federated Query Gateway Orchestration", () => {
    it("should execute plan steps, mock fetch downstream, and merge fields into response data", async () => {
      // 1. Mock fetch returns for both downstream calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: { student: { id: "usr_student_01", name: "Aisha", email: "aisha@local" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: { transactions: [{ id: "tx_01", amount: 50.0, category: "books" }] },
          }),
        });

      const query = `
        query {
          student(id: "usr_student_01") { id name email }
          transactions(studentId: "usr_student_01") { id amount }
        }
      `;

      const response = await executeFederatedQuery({ query, variables: { id: "usr_student_01" } });

      expect(response.errors).toBeUndefined();
      expect(response.data.student.name).toBe("Aisha");
      expect(response.data.transactions[0].id).toBe("tx_01");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should propagate downstream service error logs gracefully in response errors array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [{ message: "Database read timeout exception" }],
        }),
      });

      const query = `
        query {
          student(id: "usr_student_01") { id name email }
        }
      `;

      const response = await executeFederatedQuery({ query, variables: { id: "usr_student_01" } });

      expect(response.data).toBeNull();
      expect(response.errors).toBeDefined();
      expect(response.errors?.[0].message).toContain("Database read timeout exception");
    });
  });
});
