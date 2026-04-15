import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountingService } from './accounting.service';

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
  findChartAccounts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.accountingService.findChartAccounts(pageNum, limitNum, search);
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
  @ApiOperation({
    summary:
      'General ledger — all posted lines grouped by account with running balances',
  })
  @ApiQuery({ name: 'branchId', required: false })
  getGeneralLedger(@Query('branchId') branchId?: string) {
    return this.accountingService.getGeneralLedger(branchId);
  }

  @Get('reports/balance-sheet')
  @ApiOperation({
    summary:
      'Balance sheet — assets vs liabilities + equity as of a given date',
  })
  @ApiQuery({
    name: 'asOf',
    required: false,
    description: 'ISO date (YYYY-MM-DD). Defaults to today.',
  })
  @ApiQuery({ name: 'branchId', required: false })
  getBalanceSheet(
    @Query('asOf') asOf?: string,
    @Query('branchId') branchId?: string,
  ) {
    const date = asOf ? new Date(asOf) : new Date();
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date: ${asOf}`);
    }
    return this.accountingService.getBalanceSheet(date, branchId);
  }

  @Get('reports/income-statement')
  @ApiOperation({
    summary: 'Income statement — revenue vs expenses over a date range',
  })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Start date ISO (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'End date ISO (YYYY-MM-DD)',
  })
  @ApiQuery({ name: 'branchId', required: false })
  getIncomeStatement(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException(
        'Invalid date range. Use YYYY-MM-DD format.',
      );
    }
    if (fromDate > toDate) {
      throw new BadRequestException('"from" must be before or equal to "to".');
    }
    return this.accountingService.getIncomeStatement(
      fromDate,
      toDate,
      branchId,
    );
  }
}
