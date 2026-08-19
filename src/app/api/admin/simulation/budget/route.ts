import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/api/auth-guard";
import { budgetSimulationSchema } from "../../../../../lib/validation/schemas";
import { defaultBudgetSimulator } from "../../../../../lib/simulation/budget-scenario-simulator";

export const POST = requireAuth(async (request: Request) => {
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parse = budgetSimulationSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  try {
    const simulationResult = defaultBudgetSimulator.simulateScenario(parse.data);
    return NextResponse.json(simulationResult, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute budget simulation" },
      { status: 500 }
    );
  }
}, "simulation:budget");
