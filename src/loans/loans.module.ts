import { Module } from '@nestjs/common';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LoanRepository } from './loan.repository';

@Module({
  controllers: [LoanController],
  providers: [LoanService, LoanRepository],
})
export class LoansModule {}
