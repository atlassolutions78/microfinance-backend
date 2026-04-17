import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AccountService } from './account.service';
import { AccountFormatter } from './account.formatter';
import { OpenAccountDto, GetAccountsQueryDto } from './account.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserModel } from '../users/user.model';

/**
 * HTTP layer only — parse the request, call the service, return the result.
 * No business logic lives here.
 */
@ApiTags('Accounts')
@ApiBearerAuth()
@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @ApiOperation({ summary: 'Open a new account for a client' })
  @ApiBody({
    type: OpenAccountDto,
    examples: {
      default: {
        value: {
          clientId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          accountType: 'SAVINGS',
          currency: 'FC',
        },
      },
    },
  })
  open(@Body() dto: OpenAccountDto, @CurrentUser() user: UserModel) {
    return this.accountService.open(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List all accounts' })
  findAll(@Query() query: GetAccountsQueryDto) {
    return this.accountService.findAll(query);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'List all accounts belonging to a client' })
  @ApiParam({ name: 'clientId', description: 'Client UUID' })
  findByClient(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.accountService.findByClientId(clientId);
  }

  @Get('by-number/:accountNumber')
  @ApiOperation({ summary: 'Find an account by its account number' })
  @ApiParam({ name: 'accountNumber', description: 'Account number string' })
  findByNumber(@Param('accountNumber') accountNumber: string) {
    return this.accountService.findByAccountNumber(accountNumber);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search accounts by account number (partial match)',
  })
  search(@Query('q') q: string) {
    return this.accountService.searchByAccountNumber(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single account by ID' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.findById(id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a pending account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.activate(id);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend an active account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.suspend(id);
  }

  @Post(':id/dormant')
  @ApiOperation({ summary: 'Mark an account as dormant' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  markDormant(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.markDormant(id);
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate a dormant or suspended account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.reactivate(id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close an account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.close(id);
  }

  @Get(':id/statement')
  @ApiOperation({ summary: 'Generate an account statement for a given period' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiQuery({ name: 'from',   required: true,  description: 'Start date YYYY-MM-DD' })
  @ApiQuery({ name: 'to',     required: true,  description: 'End date YYYY-MM-DD' })
  @ApiQuery({ name: 'format', required: false, description: 'json (default) | html | csv' })
  async getStatement(
    @Res() res: Response,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from')   from: string,
    @Query('to')     to: string,
    @Query('format') format?: string,
  ) {
    const fromDate = new Date(from);
    const toDate   = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date range. Use YYYY-MM-DD format.');
    }
    if (fromDate > toDate) {
      throw new BadRequestException('"from" must be before or equal to "to".');
    }

    const data = await this.accountService.getStatement(id, fromDate, toDate);
    const filename = `statement-${data.account.accountNumber.replace(/[^a-zA-Z0-9]/g, '-')}-${toDate.toISOString().split('T')[0]}.csv`;

    AccountFormatter.respond(res, format, data,
      () => AccountFormatter.statementHtml(data),
      () => AccountFormatter.statementCsv(data),
      filename,
    );
  }
}
