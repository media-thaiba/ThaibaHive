#!/usr/bin/env tsx
import { runDocGenSimulation } from './operations/docgen-simulation-runner';

runDocGenSimulation()
  .then((result) => {
    process.exit(result.passed ? 0 : 1);
  })
  .catch((err) => {
    console.error('Fatal docgen simulation error:', err);
    process.exit(1);
  });
