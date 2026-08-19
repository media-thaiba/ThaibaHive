import { handleEdgeRequest } from "../edge/worker";
import { getCachedResponse, setCachedResponse } from "../cache/edge-cache";
import { generateQueryPlan } from "../federation/query-planner";

import { db } from "../../db";
import { federatedServices } from "../../db/schema";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Sprint-018 SLA Performance Benchmark Tests", () => {
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
    mockFetch.mockReset();
  });

  it("should respond from Edge Cache in under 100ms globally (SLA validation)", async () => {
    const key = "tenant_1:dashboard:performance";
    await setCachedResponse(key, JSON.stringify({ ok: true }), 30);

    const start = performance.now();
    const result = await getCachedResponse(key);
    const end = performance.now();

    const duration = end - start;
    expect(result).toBeDefined();
    expect(duration).toBeLessThan(100); // Must retrieve cached data under 100ms SLA
  });

  it("should process GraphQL query plan generation in under 200ms parsing overhead", async () => {
    const query = `
      query {
        student(id: "usr_student_01") { id name email }
        transactions(studentId: "usr_student_01") { id amount }
      }
    `;

    const start = performance.now();
    const plan = await generateQueryPlan(query, { id: "usr_student_01" });
    const end = performance.now();

    const duration = end - start;
    expect(plan.steps.length).toBe(2);
    expect(duration).toBeLessThan(200); // AST schema extraction & plan compile under 200ms
  });
});
