import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType, AccountCurrency } from './account.enums';

export class OpenAccountDto {
  @ApiProperty({
    description: 'UUID of the client to open the account for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    enum: AccountType,
    description:
      'SAVINGS or CHECKING for individual clients; BUSINESS_CURRENT for organization clients',
    example: AccountType.SAVINGS,
  })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty({
    enum: AccountCurrency,
    description: 'USD or FC',
    example: AccountCurrency.FC,
  })
  @IsEnum(AccountCurrency)
  currency: AccountCurrency;
}
