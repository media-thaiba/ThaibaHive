import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('ALUMNI-HUB / EndowmentOS Schema Parity & Table Integrity (Sprint-058 - ALUM-001)', () => {
  const alumniTableNames = [
    'alumniProfiles',
    'alumniEducations',
    'alumniExperiences',
    'alumniMentorshipProfiles',
    'alumniMentorshipRequests',
    'alumniMentorshipSessions',
    'alumniJobPostings',
    'alumniJobApplications',
    'alumniDonationCampaigns',
    'alumniDonations',
    'alumniChapters',
    'alumniChapterMembers',
    'alumniEvents',
    'alumniEventRsvps',
    'alumniAuditLogs',
  ];

  it('should export all 15 ALUMNI-HUB tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of alumniTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all ALUMNI-HUB table columns match exactly between SQLite and PostgreSQL dialects', () => {
    for (const tableName of alumniTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
