/**
 * One-off script: activate an existing PENDING account for client CL-000005
 * and backdate created_at so it satisfies the 6-month loan eligibility rule.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/database/activate-account.ts
 */

import { DataSource } from 'typeorm';

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: '1996',
    database: 'microfinance_db',
  });

  await ds.initialize();

  // SAVINGS / USD account for CL-000005 (Honoré Bwira Amani)
  const accountId = '6f75c5b7-760f-4fc7-8eda-2189b4231975';
  const backdatedDate = new Date('2023-01-15T08:00:00Z');

  await ds.query(
    `UPDATE accounts
        SET status     = 'ACTIVE',
            balance    = '500000.0000',
            created_at = $1,
            updated_at = NOW()
      WHERE id = $2`,
    [backdatedDate, accountId],
  );

  const [result] = await ds.query(
    `SELECT id, account_number, account_type, currency, balance, status, created_at
       FROM accounts WHERE id = $1`,
    [accountId],
  );

  console.log('Account activated:');
  console.log(JSON.stringify(result, null, 2));

  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
