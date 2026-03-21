import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '../accounts/accounts.module';
import { ClientsModule } from '../clients/clients.module';
import {
  LoanDocumentEntity,
  LoanEntity,
  LoanPaymentEntity,
  LoanPenaltyEntity,
  LoanSequenceEntity,
  RepaymentScheduleEntity,
} from './loan.entity';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LoanRepository } from './loan.repository';

@Module({
  imports: [
    AccountsModule,
    ClientsModule,
    TypeOrmModule.forFeature([
      LoanEntity,
      LoanSequenceEntity,
      RepaymentScheduleEntity,
      LoanPaymentEntity,
      LoanPenaltyEntity,
      LoanDocumentEntity,
    ]),
  ],
  controllers: [LoanController],
  providers: [LoanService, LoanRepository],
  exports: [LoanService],
})
export class LoansModule {}
