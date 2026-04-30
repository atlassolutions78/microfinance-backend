import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoansModule } from './loans/loans.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { DocumentsModule } from './documents/documents.module';
import { SettingsModule } from './settings/settings.module';
import { UploadsModule } from './uploads/uploads.module';
import { AccountsModule } from './accounts/accounts.module';
import { AccountingModule } from './accounting/accounting.module';
import { TellerModule } from './teller/teller.module';
import { RemittanceModule } from './remittance/remittance.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // Load .env first so all other modules can access process.env
    ConfigModule.forRoot({ isGlobal: true }),

    // Database connection — driven by environment variables
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL');
        return {
          type: 'postgres' as const,
          ...(dbUrl
            ? { url: dbUrl, ssl: { rejectUnauthorized: false } }
            : {
                host: config.get<string>('DATABASE_HOST', 'localhost'),
                port: config.get<number>('DATABASE_PORT', 5432),
                username: config.get<string>(
                  'DATABASE_USER',
                  'microfinance_user',
                ),
                password: config.get<string>(
                  'DATABASE_PASSWORD',
                  'microfinance_pass',
                ),
                database: config.get<string>(
                  'DATABASE_NAME',
                  'microfinance_db',
                ),
              }),
          autoLoadEntities: true, // Each module registers its entities via forFeature()
          synchronize: false, // Never sync in production — use migrations
          migrations: [__dirname + '/database/migrations/*.js'],
          migrationsTableName: 'migrations',
          migrationsRun: true, // Auto-run pending migrations on startup
          logging: config.get<string>('NODE_ENV') !== 'production',
        };
      },
    }),

    SettingsModule,
    UploadsModule,
    AccountsModule,
    AccountingModule,
    TellerModule,
    RemittanceModule,
    NotificationsModule,
    LoansModule,
    UsersModule,
    AuthModule,
    ClientsModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
