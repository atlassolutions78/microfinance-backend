import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountingService } from './accounting.service';
import { AccountingFormatter } from './accounting.formatter';
import { ChartAccountType } from './accounting.enums';

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'List chart of accounts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ChartAccountType, description: 'Filter by account type: ASSET | LIABILITY | EQUITY | INCOME | EXPENSE' })
  findChartAccounts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: ChartAccountType,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.accountingService.findChartAccounts(pageNum, limitNum, search, type);
  }

  @Get('entries')
  @ApiOperation({ summary: 'List journal entries with their lines' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'grouped', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findEntries(
    @Query('branchId') branchId?: string,
    @Query('grouped') grouped?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    if (grouped === 'true') {
      return this.accountingService.findGroupedEntries(
        branchId,
        search,
        pageNum,
        limitNum,
      );
    }
    return this.accountingService.findEntries(
      branchId,
      search,
      pageNum,
      limitNum,
    );
  }

  @Get('entries/:id')
  @ApiOperation({ summary: 'Get a single journal entry with its lines' })
  async findEntry(@Param('id', ParseUUIDPipe) id: string) {
    const entry = await this.accountingService.findEntryById(id);
    if (!entry) throw new NotFoundException(`Journal entry ${id} not found`);
    return entry;
  }

  @Get('ledger')
  @ApiOperation({ summary: 'General ledger — posted lines grouped by account with running balances' })
  @ApiQuery({ name: 'branchId',  required: false })
  @ApiQuery({ name: 'from',      required: false, description: 'Start date YYYY-MM-DD' })
  @ApiQuery({ name: 'to',        required: false, description: 'End date YYYY-MM-DD' })
  @ApiQuery({ name: 'currency',  required: false, description: 'FC or USD' })
  @ApiQuery({ name: 'format',    required: false, description: 'json (default) | html | csv' })
  async getGeneralLedger(
    @Res() res: Response,
    @Query('branchId')  branchId?: string,
    @Query('from')      from?: string,
    @Query('to')        to?: string,
    @Query('currency')  currency?: string,
    @Query('format')    format?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate   = to   ? new Date(to)   : undefined;
    if (fromDate && isNaN(fromDate.getTime())) throw new BadRequestException(`Invalid from date: ${from}`);
    if (toDate   && isNaN(toDate.getTime()))   throw new BadRequestException(`Invalid to date: ${to}`);

    const data = await this.accountingService.getGeneralLedger(branchId, fromDate, toDate, currency);
    const filename = `general-ledger-${(toDate ?? new Date()).toISOString().split('T')[0]}.csv`;
    AccountingFormatter.respond(res, format, data,
      () => AccountingFormatter.generalLedgerHtml(data, currency, fromDate, toDate, branchId),
      () => AccountingFormatter.generalLedgerCsv(data),
      filename,
    );
  }

  @Get('reports/trial-balance')
  @ApiOperation({ summary: 'Trial balance — cumulative debits and credits per account as of a date' })
  @ApiQuery({ name: 'asOf',     required: false, description: 'ISO date YYYY-MM-DD. Defaults to today.' })
  @ApiQuery({ name: 'currency', required: false, description: 'FC or USD' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'format',   required: false, description: 'json (default) | html | csv' })
  async getTrialBalance(
    @Res() res: Response,
    @Query('asOf')     asOf?: string,
    @Query('currency') currency?: string,
    @Query('branchId') branchId?: string,
    @Query('format')   format?: string,
  ) {
    const date = asOf ? new Date(asOf) : new Date();
    if (isNaN(date.getTime())) throw new BadRequestException(`Invalid date: ${asOf}`);

    const data = await this.accountingService.getTrialBalance(date, branchId, currency);
    const filename = `trial-balance-${date.toISOString().split('T')[0]}.csv`;
    AccountingFormatter.respond(res, format, data,
      () => AccountingFormatter.trialBalanceHtml(data, currency, branchId),
      () => AccountingFormatter.trialBalanceCsv(data),
      filename,
    );
  }

  @Get('reports/balance-sheet')
  @ApiOperation({ summary: 'Balance sheet — assets vs liabilities + equity as of a given date' })
  @ApiQuery({ name: 'asOf',     required: false, description: 'ISO date YYYY-MM-DD. Defaults to today.' })
  @ApiQuery({ name: 'currency', required: false, description: 'FC or USD' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'format',   required: false, description: 'json (default) | html | csv' })
  async getBalanceSheet(
    @Res() res: Response,
    @Query('asOf')     asOf?: string,
    @Query('currency') currency?: string,
    @Query('branchId') branchId?: string,
    @Query('format')   format?: string,
  ) {
    const date = asOf ? new Date(asOf) : new Date();
    if (isNaN(date.getTime())) throw new BadRequestException(`Invalid date: ${asOf}`);

    const data = await this.accountingService.getBalanceSheet(date, branchId, currency);
    const filename = `balance-sheet-${date.toISOString().split('T')[0]}.csv`;
    AccountingFormatter.respond(res, format, data,
      () => AccountingFormatter.balanceSheetHtml(data, currency, branchId),
      () => AccountingFormatter.balanceSheetCsv(data),
      filename,
    );
  }

  @Get('reports/income-statement')
  @ApiOperation({ summary: 'Income statement — revenue vs expenses over a date range' })
  @ApiQuery({ name: 'from',     required: true,  description: 'Start date YYYY-MM-DD' })
  @ApiQuery({ name: 'to',       required: true,  description: 'End date YYYY-MM-DD' })
  @ApiQuery({ name: 'currency', required: false, description: 'FC or USD' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'format',   required: false, description: 'json (default) | html | csv' })
  async getIncomeStatement(
    @Res() res: Response,
    @Query('from')     from: string,
    @Query('to')       to: string,
    @Query('currency') currency?: string,
    @Query('branchId') branchId?: string,
    @Query('format')   format?: string,
  ) {
    const fromDate = new Date(from);
    const toDate   = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date range. Use YYYY-MM-DD format.');
    }
    if (fromDate > toDate) throw new BadRequestException('"from" must be before or equal to "to".');

    const data = await this.accountingService.getIncomeStatement(fromDate, toDate, branchId, currency);
    const filename = `income-statement-${toDate.toISOString().split('T')[0]}.csv`;
    AccountingFormatter.respond(res, format, data,
      () => AccountingFormatter.incomeStatementHtml(data, currency, branchId),
      () => AccountingFormatter.incomeStatementCsv(data),
      filename,
    );
  }
}
