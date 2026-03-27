import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  DepositDto,
  ExternalTransferDto,
  InternalTransferDto,
  WithdrawalDto,
} from './transaction.dto';
import { TransactionService } from './transaction.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit funds into an account' })
  @ApiBody({
    type: DepositDto,
    examples: {
      default: {
        value: {
          accountId: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
          branchId: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
          amount: 50000,
          currency: 'FC',
          description: 'Monthly salary deposit',
          performedBy: 'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
      },
    },
  })
  deposit(@Body() dto: DepositDto) {
    return this.transactionService.deposit(dto);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw funds from an account' })
  @ApiBody({
    type: WithdrawalDto,
    examples: {
      default: {
        value: {
          accountId: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
          branchId: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
          amount: 20000,
          currency: 'FC',
          description: 'School fees payment',
          performedBy: 'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
      },
    },
  })
  withdraw(@Body() dto: WithdrawalDto) {
    return this.transactionService.withdraw(dto);
  }

  @Post('transfer/internal')
  @ApiOperation({ summary: 'Transfer funds between two internal accounts' })
  @ApiBody({
    type: InternalTransferDto,
    examples: {
      default: {
        value: {
          sourceAccountId: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
          destinationAccountId: 'c2b2c3d4-e5f6-7890-abcd-ef1234567890',
          branchId: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
          amount: 10000,
          currency: 'USD',
          description: 'Transfer to savings account',
          performedBy: 'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
      },
    },
  })
  internalTransfer(@Body() dto: InternalTransferDto) {
    return this.transactionService.internalTransfer(dto);
  }

  @Post('transfer/external')
  @ApiOperation({ summary: 'Transfer funds to an external recipient' })
  @ApiBody({
    type: ExternalTransferDto,
    examples: {
      default: {
        value: {
          sourceAccountId: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
          branchId: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
          amount: 5000,
          currency: 'USD',
          recipientName: 'Jean Mutombo',
          recipientBank: 'Rawbank',
          recipientAccount: 'RW-00123456789',
          description: 'Business payment',
          performedBy: 'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
      },
    },
  })
  externalTransfer(@Body() dto: ExternalTransferDto) {
    return this.transactionService.externalTransfer(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all transactions' })
  findAll() {
    return this.transactionService.findAll();
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'List all transactions for a specific account' })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  findByAccount(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.transactionService.findByAccount(accountId);
  }

  @Get(':id/transfer')
  @ApiOperation({ summary: 'Get the transfer record linked to a transaction' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  getTransfer(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionService.findTransferByTransaction(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionService.findById(id);
  }
}
