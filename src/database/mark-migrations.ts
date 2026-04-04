/**
 * One-shot script: inserts migration records for every migration that was
 * already applied to the DB manually but never tracked in the migrations table.
 * Run with: ts-node -r tsconfig-paths/register src/database/mark-migrations.ts
 */
import dataSource from '../../typeorm.config';

const ALREADY_APPLIED = [
  { timestamp: 1773771287585, name: 'CreateAllTables1773771287585' },
  { timestamp: 1773800000000, name: 'AddBranchTypeAndRoles1773800000000' },
  { timestamp: 1773925430605, name: 'UpdateSchema1773925430605' },
  { timestamp: 1773996940885, name: 'Migration1773996940885' },
  { timestamp: 1774100000000, name: 'UpdateMinorGuardians1774100000000' },
  { timestamp: 1774200000000, name: 'AddSignatureDocumentType1774200000000' },
  { timestamp: 1774300000000, name: 'CreateAccountsTables1774300000000' },
  { timestamp: 1774300000001, name: 'CreateTransactionsTables1774300000000' },
];

async function main() {
  await dataSource.initialize();

  for (const m of ALREADY_APPLIED) {
    const exists = await dataSource.query(
      `SELECT 1 FROM migrations WHERE name = $1`,
      [m.name],
    );
    if (exists.length === 0) {
      await dataSource.query(
        `INSERT INTO migrations (timestamp, name) VALUES ($1, $2)`,
        [m.timestamp, m.name],
      );
      console.log(`✓ Marked ${m.name}`);
    } else {
      console.log(`- Already tracked: ${m.name}`);
    }
  }

  await dataSource.destroy();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
