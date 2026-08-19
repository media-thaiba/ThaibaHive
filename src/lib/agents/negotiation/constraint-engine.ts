export class ConstraintEngine {
  evaluate(constraints: { budget?: number, capacity?: number }, actual: { cost: number, usage: number }) {
    if (constraints.budget !== undefined && actual.cost > constraints.budget) return { status: 'infeasible' };
    if (constraints.capacity !== undefined && actual.usage > constraints.capacity) return { status: 'infeasible' };
    return { status: 'feasible' };
  }
}