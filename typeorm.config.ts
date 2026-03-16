import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config(); // load .env for the CLI

/**
 * TypeORM DataSource used by the CLI for migration:generate and migration:run.
 * The application uses TypeOrmModule.forRootAsync() in AppModule instead.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'microfinance_user',
  password: process.env.DATABASE_PASSWORD ?? 'microfinance_pass',
  database: process.env.DATABASE_NAME ?? 'microfinance_db',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
});
