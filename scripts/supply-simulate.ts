#!/usr/bin/env tsx
import { runSupplyChainSimulation } from './operations/supply-chain-simulation-runner';

runSupplyChainSimulation()
  .then((result) => {
    process.exit(result.passed ? 0 : 1);
  })
  .catch((err) => {
    console.error('Fatal simulation error:', err);
    process.exit(1);
  });
