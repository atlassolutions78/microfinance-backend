import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity, TransferEntity } from './transaction.entity';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { TransactionRepository } from './transaction.repository';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionEntity, TransferEntity])],
  controllers: [TransactionController],
  providers: [TransactionService, TransactionRepository],
})
export class TransactionsModule {}
