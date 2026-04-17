import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BranchCoaAccountEntity,
  TellerCoaAccountEntity,
  TellerSessionEntity,
  TellerTransactionEntity,
  ClientTransactionEntity,
  TransferEntity,
  SessionDenominationEntity,
} from './teller.entity';
import { TellerRepository } from './teller.repository';
import { TellerService } from './teller.service';
import { TellerController } from './teller.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { AccountingModule } from '../accounting/accounting.module';
import { SequenceModule } from '../sequences/sequence.module';
import { ReceiptModule } from '../receipt/receipt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TellerSessionEntity,
      TellerTransactionEntity,
      BranchCoaAccountEntity,
      TellerCoaAccountEntity,
      ClientTransactionEntity,
      TransferEntity,
      SessionDenominationEntity,
    ]),
    AccountsModule,
    AccountingModule,
    SequenceModule,
    ReceiptModule,
  ],
  providers: [TellerService, TellerRepository],
  controllers: [TellerController],
  exports: [TellerRepository],
})
export class TellerModule {}
