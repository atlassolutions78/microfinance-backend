import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity, AccountSequenceEntity } from './account.entity';
import { AccountRepository } from './account.repository';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [
    ClientsModule,
    TypeOrmModule.forFeature([AccountEntity, AccountSequenceEntity]),
  ],
  controllers: [AccountController],
  providers: [AccountService, AccountRepository],
  exports: [AccountService],
})
export class AccountsModule {}
