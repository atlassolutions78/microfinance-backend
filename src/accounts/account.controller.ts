import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { AccountService } from './account.service';
import { OpenAccountDto } from './account.dto';
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
  findAll() {
    return this.accountService.findAll();
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
  @ApiOperation({ summary: 'Search accounts by account number (partial match)' })
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
}
