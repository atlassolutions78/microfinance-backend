import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  deposit(@Body() dto: DepositDto) {
    return this.transactionService.deposit(dto);
  }

  @Post('withdraw')
  withdraw(@Body() dto: WithdrawalDto) {
    return this.transactionService.withdraw(dto);
  }

  @Post('transfer/internal')
  internalTransfer(@Body() dto: InternalTransferDto) {
    return this.transactionService.internalTransfer(dto);
  }

  @Post('transfer/external')
  externalTransfer(@Body() dto: ExternalTransferDto) {
    return this.transactionService.externalTransfer(dto);
  }

  @Get()
  findAll() {
    return this.transactionService.findAll();
  }

  @Get('account/:accountId')
  findByAccount(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.transactionService.findByAccount(accountId);
  }

  @Get(':id/transfer')
  getTransfer(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionService.findTransferByTransaction(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionService.findById(id);
  }
}
