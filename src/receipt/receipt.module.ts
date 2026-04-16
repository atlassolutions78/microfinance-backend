import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ClientTransactionEntity,
  TransferEntity,
} from '../teller/teller.entity';
import { AccountEntity } from '../accounts/account.entity';
import { BranchEntity } from '../settings/branch.entity';
import { UserEntity } from '../users/user.entity';
import { RemittanceEntity } from '../remittance/remittance.entity';
import {
  IndividualProfileEntity,
  OrganizationProfileEntity,
} from '../clients/client.entity';
import { ReceiptService } from './receipt.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientTransactionEntity,
      TransferEntity,
      AccountEntity,
      BranchEntity,
      UserEntity,
      RemittanceEntity,
      IndividualProfileEntity,
      OrganizationProfileEntity,
    ]),
  ],
  providers: [ReceiptService],
  exports: [ReceiptService],
})
export class ReceiptModule {}
