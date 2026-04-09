import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '../accounts/accounts.module';
import { AccountingModule } from '../accounting/accounting.module';
import { ClientsModule } from '../clients/clients.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  LoanDocumentEntity,
  LoanEntity,
  LoanPaymentEntity,
  LoanPenaltyEntity,
  LoanReminderEntity,
  LoanSequenceEntity,
  RepaymentScheduleEntity,
} from './loan.entity';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LoanRepository } from './loan.repository';

@Module({
  imports: [
    AccountsModule,
    AccountingModule,
    ClientsModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      LoanEntity,
      LoanSequenceEntity,
      RepaymentScheduleEntity,
      LoanPaymentEntity,
      LoanPenaltyEntity,
      LoanDocumentEntity,
      LoanReminderEntity,
    ]),
  ],
  controllers: [LoanController],
  providers: [LoanService, LoanRepository],
  exports: [LoanService],
})
export class LoansModule {}
