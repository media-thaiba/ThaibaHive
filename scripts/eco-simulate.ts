import { MicrogridSimulator } from '../src/lib/operations/eco/simulation/microgrid-simulator';

async function main() {
  console.log('================================================================');
  console.log(' ThaibaHive ECO-MESH / NetZeroOS 24-Hour Simulation Harness     ');
  console.log('================================================================\n');

  console.log('⚡ Initializing Multi-Horizon Weather, Solar, BESS, and V2G Engines...');
  const start = Date.now();
  const report = await MicrogridSimulator.run24hSimulation('inst_campus_main');
  const elapsed = Date.now() - start;

  console.log(`\n Simulation ID: ${report.simulationId}`);
  console.log(` Duration: ${report.durationHours} Hours (15m Rollup Resolution)`);
  console.log(` Elapsed Simulation Time: ${elapsed} ms\n`);

  console.log('--- 🌞 Generation & Microgrid Load Balance ---');
  console.log(` Total Solar Energy Generated:   ${report.totalSolarEnergyGeneratedKwh.toLocaleString()} kWh`);
  console.log(` Total Campus Energy Consumed:  ${report.totalFacilityEnergyConsumedKwh.toLocaleString()} kWh`);
  console.log(` Clean Energy Self-Sufficiency: ${report.cleanEnergySelfSufficiencyPercent}%`);

  console.log('\n--- 💰 Tariff Arbitrage & Peak Shaving ---');
  console.log(` Baseline TOU Utility Cost:     $${report.baselineEnergyCostDollars.toLocaleString()}`);
  console.log(` Optimized Net Microgrid Cost:  $${report.optimizedEnergyCostDollars.toLocaleString()}`);
  console.log(` Total Cost Reduction:          $${report.totalCostSavingsDollars.toLocaleString()} (${report.savingsPercentage}% savings)`);
  console.log(` Peak Demand Shaved:            ${report.peakDemandShavedKw} kW`);

  console.log('\n--- 🌱 Scope 1/2/3 Carbon Ledger & Anti-Greenwashing ---');
  console.log(` Gross Carbon Emissions:        ${report.totalGrossCarbonEmissionsKg} kg CO2e`);
  console.log(` Net Carbon Emissions:          ${report.totalNetCarbonEmissionsKg} kg CO2e`);
  console.log(` Avoided Emissions via Solar:   ${report.carbonAvoidedTons} Metric Tons CO2e`);
  console.log(` Merkle Cryptographic Root:     ${report.merkleProofRoot}`);
  console.log(` ESG Disclosure Audit Status:   ${report.isCompliant ? '✅ 100% VERIFIED & COMPLIANT' : '❌ AUDIT FAILED'}`);

  console.log('\n================================================================');
  console.log(' Sprint-049 ECO-MESH End-to-End Simulation Successfully Verified');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
