export interface FederatedServiceInfo {
  id: string;
  serviceName: string;
  endpoint: string;
  schemaDefinition: string;
  status: "ACTIVE" | "INACTIVE";
  lastReloadedAt?: string;
}

export interface QueryPlanStep {
  serviceName: string;
  endpoint: string;
  selectionSet: string;
  variables?: Record<string, any>;
  dependantOnStepIndex?: number;
}

export interface QueryPlan {
  steps: QueryPlanStep[];
}

export interface GraphQLGatewayRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface GraphQLGatewayResponse {
  data?: any;
  errors?: Array<{ message: string; path?: string[] }>;
}
