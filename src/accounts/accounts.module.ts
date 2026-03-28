import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity, AccountSequenceEntity } from './account.entity';
import { AccountRepository } from './account.repository';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { ClientsModule } from '../clients/clients.module';
import { UserEntity } from '../users/user.entity';

@Module({
  imports: [
    ClientsModule,
    TypeOrmModule.forFeature([AccountEntity, AccountSequenceEntity, UserEntity]),
  ],
  controllers: [AccountController],
  providers: [AccountService, AccountRepository],
  exports: [AccountService],
})
export class AccountsModule {}
