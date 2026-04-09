import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemittanceEntity } from './remittance.entity';
import { RemittanceRepository } from './remittance.repository';
import { RemittanceService } from './remittance.service';
import { RemittanceController } from './remittance.controller';
import { TellerModule } from '../teller/teller.module';
import { AccountingModule } from '../accounting/accounting.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RemittanceEntity]),
    TellerModule,
    AccountingModule,
    SettingsModule,
  ],
  providers: [RemittanceService, RemittanceRepository],
  controllers: [RemittanceController],
})
export class RemittanceModule {}
