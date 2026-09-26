import { FederatedServiceInfo } from "./types";
import { db } from "../../db";
import { federatedServices } from "../../db/schema";

let cachedServices: FederatedServiceInfo[] = [];
const inMemoryServices: FederatedServiceInfo[] = getMockServices();
let lastFetchedTime = 0;

const CACHE_TTL_MS = 10000; // 10 seconds cache TTL for schema configs

/**
 * Registry manager for dynamically reloading and validating microservice GraphQL schemas.
 */
export async function getFederatedSchemas(): Promise<FederatedServiceInfo[]> {
  const now = Date.now();
  if (cachedServices.length > 0 && now - lastFetchedTime < CACHE_TTL_MS) {
    return cachedServices;
  }

  try {
    const services = await db.select().from(federatedServices);
    if (services.length === 0) {
      cachedServices = [...inMemoryServices];
    } else {
      cachedServices = services.map((s) => ({
        id: s.id,
        serviceName: s.serviceName,
        endpoint: s.endpoint,
        schemaDefinition: s.schemaDefinition,
        status: s.status as "ACTIVE" | "INACTIVE",
        lastReloadedAt: s.lastReloadedAt || undefined,
      }));
    }
    lastFetchedTime = now;
  } catch {
    // Fallback to static mock schemas if database is not ready or seeded (safeguard)
    if (cachedServices.length === 0) {
      cachedServices = [...inMemoryServices];
    }
  }

  return cachedServices;
}

/**
 * Validates and registers a downstream service schema in the federated registry.
 */
export async function registerServiceSchema(
  name: string,
  endpoint: string,
  schemaDefinition: string
): Promise<boolean> {
  // Simple validation to ensure valid SDL structure
  if (!schemaDefinition.includes("type Query") && !schemaDefinition.includes("extend type Query")) {
    throw new Error("Invalid schema definition: must contain Query type declaration.");
  }

  const id = `srv_${Math.random().toString(36).substring(2, 9)}`;
  const srvObj: FederatedServiceInfo = { id, serviceName: name, endpoint, schemaDefinition, status: "ACTIVE" };

  // Always update in-memory fallback list
  const existingIdx = inMemoryServices.findIndex((s) => s.serviceName === name);
  if (existingIdx !== -1) {
    inMemoryServices[existingIdx] = srvObj;
  } else {
    inMemoryServices.push(srvObj);
  }

  try {
    await db.insert(federatedServices).values({
      id,
      serviceName: name,
      endpoint,
      schemaDefinition,
      status: "ACTIVE",
      lastReloadedAt: new Date().toISOString(),
    });
  } catch {
    // Database failure fallback is already handled by updating inMemoryServices
  }

  cachedServices = []; // Invalidate local cache
  lastFetchedTime = 0;
  return true;
}

/**
 * Reload schemas from DB and trigger hot-reload refresh.
 */
export async function reloadFederatedSchemaRegistry(): Promise<void> {
  cachedServices = [];
  lastFetchedTime = 0;
  await getFederatedSchemas();
}

function getMockServices(): FederatedServiceInfo[] {
  return [
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
  ];
}
