import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  open(@Body() dto: OpenAccountDto, @CurrentUser() user: UserModel) {
    return this.accountService.open(dto, user);
  }

  @Get()
  findAll() {
    return this.accountService.findAll();
  }

  @Get('client/:clientId')
  findByClient(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.accountService.findByClientId(clientId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.findById(id);
  }

  @Post(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.activate(id);
  }

  @Post(':id/suspend')
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.suspend(id);
  }

  @Post(':id/dormant')
  markDormant(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.markDormant(id);
  }

  @Post(':id/reactivate')
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.reactivate(id);
  }

  @Post(':id/close')
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.close(id);
  }
}
