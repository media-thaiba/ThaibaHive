import { getMigrationStats } from '../../src/lib/identity/migration-layer';

async function main() {
  try {
    const stats = await getMigrationStats();
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error fetching migration stats:', error);
    process.exit(1);
  }
}

main();
