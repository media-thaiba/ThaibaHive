import { GraphQLGatewayRequest, GraphQLGatewayResponse, QueryPlanStep } from "./types";
import { generateQueryPlan } from "./query-planner";

/**
 * Core Federated GraphQL Gateway request orchestrator.
 * Parses incoming queries, delegates execution plan to downstream services, and merges payloads.
 */
export async function executeFederatedQuery(
  request: GraphQLGatewayRequest,
  tenantContext?: { tenantId: string; role: string; userId: string }
): Promise<GraphQLGatewayResponse> {
  if (!request.query || request.query.trim() === "") {
    return { errors: [{ message: "Must provide query string" }] };
  }

  try {
    // Generate the Query Plan based on active federated schemas
    const plan = await generateQueryPlan(request.query, request.variables);

    const mergedData: Record<string, any> = {};
    const errors: Array<{ message: string; path?: string[] }> = [];

    // Map step index to response data for variable dependency resolving
    const stepResults: any[] = [];

    // Execute query steps in parallel where possible or sequentially for dependent steps
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      // If step depends on previous step, resolve dependencies first
      let stepVariables = { ...step.variables };
      if (step.dependantOnStepIndex !== undefined) {
        const depResult = stepResults[step.dependantOnStepIndex];
        if (!depResult) {
          errors.push({ message: `Parent step ${step.dependantOnStepIndex} execution failed, skipping step ${i}` });
          continue;
        }
        // Extract dependent variables (mock query dependency propagation)
        if (depResult.id) {
          stepVariables = { ...stepVariables, parentId: depResult.id };
        }
      }

      try {
        const responseData = await fetchDownstream(step, stepVariables, tenantContext);
        stepResults[i] = responseData.data;

        if (responseData.errors) {
          responseData.errors.forEach((e: any) => {
            errors.push({ message: `[Service: ${step.serviceName}] ${e.message}`, path: e.path });
          });
        }

        // Merge response fields into root data map
        if (responseData.data) {
          Object.assign(mergedData, responseData.data);
        }
      } catch (err: any) {
        errors.push({ message: `Failed to contact service ${step.serviceName}: ${err.message}` });
      }
    }

    return {
      data: Object.keys(mergedData).length > 0 ? mergedData : null,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    return {
      errors: [{ message: `GraphQL Query Orchestration Error: ${error.message}` }],
    };
  }
}

/**
 * Execute request to downstream federated service.
 */
async function fetchDownstream(
  step: QueryPlanStep,
  variables: Record<string, any> | undefined,
  tenantContext?: { tenantId: string; role: string; userId: string }
): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (tenantContext) {
    headers["x-tenant-id"] = tenantContext.tenantId;
    headers["x-user-id"] = tenantContext.userId;
    headers["x-user-role"] = tenantContext.role;
  }

  // Construct standard downstream GraphQL post body
  const query = `query { ${step.selectionSet} }`;
  
  // Real fetch invocation simulation / actual fetch
  const response = await fetch(step.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status} from ${step.serviceName}`);
  }

  return response.json();
}
