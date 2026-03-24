import {
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
  findChartAccounts() {
    return this.accountingService.findChartAccounts();
  }

  @Get('entries')
  @ApiOperation({ summary: 'List journal entries' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'grouped', required: false, type: Boolean })
  findEntries(
    @Query('branchId') branchId?: string,
    @Query('grouped') grouped?: string,
  ) {
    if (grouped === 'true') {
      return this.accountingService.findGroupedEntries(branchId);
    }
    return this.accountingService.findEntries(branchId);
  }

  @Get('entries/:id')
  @ApiOperation({ summary: 'Get a single journal entry with its lines' })
  async findEntry(@Param('id', ParseUUIDPipe) id: string) {
    const entry = await this.accountingService.findEntryById(id);
    if (!entry) throw new NotFoundException(`Journal entry ${id} not found`);
    return entry;
  }
}
