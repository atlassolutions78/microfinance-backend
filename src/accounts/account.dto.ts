import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType, AccountCurrency } from './account.enums';

export class OpenAccountDto {
  @ApiProperty({ description: 'UUID of the client to open the account for' })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    enum: AccountType,
    description:
      'SAVINGS or CHECKING for individual clients; BUSINESS_CURRENT for organization clients',
  })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty({ enum: AccountCurrency, description: 'USD or FC' })
  @IsEnum(AccountCurrency)
  currency: AccountCurrency;
}
