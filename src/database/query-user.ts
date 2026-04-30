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

  const clientId = '2279d441-e4f5-45e0-91a5-5094f288c6a1';

  const client = await ds.query(
    `SELECT id, client_number, kyc_status, branch_id FROM clients WHERE id = $1`,
    [clientId],
  );
  console.log('CLIENT:', JSON.stringify(client, null, 2));

  const existing = await ds.query(
    `SELECT id, account_number, account_type, currency, status, created_at FROM accounts WHERE client_id = $1`,
    [clientId],
  );
  console.log(
    'EXISTING ACCOUNTS FOR CLIENT:',
    JSON.stringify(existing, null, 2),
  );

  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
