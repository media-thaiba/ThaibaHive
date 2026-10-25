import pg from "pg";
import { validateSpikeDatabaseUrl } from "../src/guard.js";
import * as pgSchema from "../src/schema.pg.js";
import * as sqliteSchema from "../src/schema.js";

const { Client } = pg;

export async function runTest1(spikeDbUrl: string): Promise<{
  parityPassed: boolean;
  tableCount: number;
  totalFkCount: number;
  compositeFkCount: number;
  singleFkCount: number;
  pgPartialIndexCount: number;
  timestampCheckCount: number;
  totalCheckCount: number;
  fkDetails: Array<{ table: string; conname: string; def: string }>;
  indexDetails: Array<{ table: string; indexname: string; def: string }>;
  checkDetails: Array<{ table: string; conname: string; def: string }>;
}> {
  validateSpikeDatabaseUrl(spikeDbUrl);

  // 1. AST Export Parity Check
  const pgKeys = Object.keys(pgSchema).sort();
  const sqliteKeys = Object.keys(sqliteSchema).sort();

  if (pgKeys.length !== sqliteKeys.length) {
    throw new Error(
      `AST Parity mismatch: PG has ${pgKeys.length} exports, SQLite has ${sqliteKeys.length} exports.`
    );
  }

  for (let i = 0; i < pgKeys.length; i++) {
    if (pgKeys[i] !== sqliteKeys[i]) {
      throw new Error(`Export key mismatch at index ${i}: PG='${pgKeys[i]}', SQLite='${sqliteKeys[i]}'`);
    }
  }

  // 2. Connect to PG as maintenance role and inspect schema
  const client = new Client({ connectionString: spikeDbUrl });
  await client.connect();

  try {
    // Check foreign keys strictly on the 11 hostel tables (scoped)
    const fkRes = await client.query(`
      SELECT c.conrelid::regclass::text as table_name, conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' 
        AND c.contype = 'f'
        AND c.conrelid = ANY(ARRAY[
          'hostel_settings', 'hostel_blocks', 'hostel_block_wardens', 
          'hostel_rooms', 'hostel_beds', 'hostel_bed_allocations', 
          'hostel_leaves', 'hostel_gate_passes', 'hostel_gate_logs', 
          'hostel_fines', 'hostel_fine_actions'
        ]::regclass[])
      ORDER BY table_name, conname;
    `);

    // Check partial indexes in PostgreSQL strictly on the 11 hostel tables
    const idxRes = await client.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND indexdef LIKE '%WHERE%'
        AND tablename = ANY(ARRAY[
          'hostel_settings', 'hostel_blocks', 'hostel_block_wardens', 
          'hostel_rooms', 'hostel_beds', 'hostel_bed_allocations', 
          'hostel_leaves', 'hostel_gate_passes', 'hostel_gate_logs', 
          'hostel_fines', 'hostel_fine_actions'
        ])
      ORDER BY tablename, indexname;
    `);

    // Check all check constraints on the 11 hostel tables (specifically chk_ts_*)
    const chkRes = await client.query(`
      SELECT c.conrelid::regclass::text as table_name, conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' 
        AND c.contype = 'c'
        AND c.conrelid = ANY(ARRAY[
          'hostel_settings', 'hostel_blocks', 'hostel_block_wardens', 
          'hostel_rooms', 'hostel_beds', 'hostel_bed_allocations', 
          'hostel_leaves', 'hostel_gate_passes', 'hostel_gate_logs', 
          'hostel_fines', 'hostel_fine_actions'
        ]::regclass[])
      ORDER BY table_name, conname;
    `);

    const tsChecks = chkRes.rows.filter(r => r.conname.startsWith("chk_ts_"));
    const compositeFks = fkRes.rows.filter(r => r.def.includes(",") || r.def.includes("(institution_id,"));
    const singleFks = fkRes.rows.filter(r => !compositeFks.includes(r));

    return {
      parityPassed: true,
      tableCount: pgKeys.length,
      totalFkCount: fkRes.rows.length,
      compositeFkCount: compositeFks.length,
      singleFkCount: singleFks.length,
      pgPartialIndexCount: idxRes.rows.length,
      timestampCheckCount: tsChecks.length,
      totalCheckCount: chkRes.rows.length,
      fkDetails: fkRes.rows.map(r => ({ table: r.table_name, conname: r.conname, def: r.def })),
      indexDetails: idxRes.rows.map(r => ({ table: r.tablename, indexname: r.indexname, def: r.indexdef })),
      checkDetails: chkRes.rows.map(r => ({ table: r.table_name, conname: r.conname, def: r.def })),
    };
  } finally {
    await client.end();
  }
}
