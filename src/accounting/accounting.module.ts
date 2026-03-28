import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
  ],
  providers: [AccountingService, AccountingRepository],
  controllers: [AccountingController],
  exports: [AccountingService],
})
export class AccountingModule {}
