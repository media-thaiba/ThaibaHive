import { runVisionShieldSimulation } from './operations/vision-shield-simulation-runner';

async function main() {
  const scenario = process.argv[2] || 'all';
  const start = Date.now();
  const result = await runVisionShieldSimulation({ scenario });
  const elapsed = Date.now() - start;

  console.log('\n================================================================');
  console.log(` VISION-SHIELD Simulation Summary [${result.passedStages}/${result.totalStages} Stages Passed in ${elapsed}ms]`);
  console.log(` Status: ${result.passed ? '✅ 100% SUCCESS' : '❌ FAILED'}`);
  console.log('================================================================\n');

  if (!result.passed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Simulation execution error:', err);
  process.exit(1);
});
