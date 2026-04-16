import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SequenceModule } from '../sequences/sequence.module';
import {
  ChartOfAccountsEntity,
  JournalEntryEntity,
  JournalLineEntity,
} from './accounting.entity';
import { AccountingRepository } from './accounting.repository';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { UserEntity } from 'src/users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChartOfAccountsEntity,
      JournalEntryEntity,
      JournalLineEntity,
      UserEntity,
    ]),
    SequenceModule,
  ],
  providers: [AccountingService, AccountingRepository],
  controllers: [AccountingController],
  exports: [AccountingService],
})
export class AccountingModule {}
