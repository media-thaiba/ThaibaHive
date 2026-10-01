import { workflowDslSchema, WorkflowDsl } from "./schema";

export function interpolateTemplateString(template: string, scope: Record<string, any>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path) => {
    const parts = path.split(".");
    let current: any = scope;
    for (const part of parts) {
      if (current === undefined || current === null) return match;
      current = current[part];
    }
    return current !== undefined && current !== null ? String(current) : match;
  });
}

export function interpolateStepInput(input: Record<string, any>, scope: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      result[key] = interpolateTemplateString(value, scope);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = interpolateStepInput(value, scope);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function parseWorkflowDsl(raw: string | Record<string, any>): {
  success: boolean;
  data?: WorkflowDsl;
  errors?: string[];
} {
  let parsedObj: any;
  if (typeof raw === "string") {
    try {
      parsedObj = JSON.parse(raw);
    } catch (e: any) {
      return {
        success: false,
        errors: [`JSON parse error: ${e.message}`],
      };
    }
  } else {
    parsedObj = raw;
  }

  // Version routing
  const dslVersion = parsedObj.dslVersion ?? 1;
  if (dslVersion > 1) {
    return {
      success: false,
      errors: [`Unsupported dslVersion ${dslVersion}. Current maximum supported version is 1.`],
    };
  }

  const result = workflowDslSchema.safeParse(parsedObj);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
