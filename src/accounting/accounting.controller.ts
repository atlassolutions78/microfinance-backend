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
  @ApiQuery({ name: 'branchId', required: false })
  findChartAccounts(@Query('branchId') branchId?: string) {
    return this.accountingService.findChartAccounts(branchId);
  }

  @Get('entries')
  @ApiOperation({ summary: 'List journal entries' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'operationType', required: false })
  @ApiQuery({ name: 'grouped', required: false, type: Boolean })
  findEntries(
    @Query('branchId') branchId?: string,
    @Query('operationType') operationType?: string,
    @Query('grouped') grouped?: string,
  ) {
    if (grouped === 'true') {
      return this.accountingService.findGroupedEntries(branchId, operationType);
    }
    return this.accountingService.findEntries(branchId, operationType);
  }

  @Get('entries/:id')
  @ApiOperation({ summary: 'Get a single journal entry with its lines' })
  async findEntry(@Param('id', ParseUUIDPipe) id: string) {
    const entry = await this.accountingService.findEntryById(id);
    if (!entry) throw new NotFoundException(`Journal entry ${id} not found`);
    return entry;
  }
}
