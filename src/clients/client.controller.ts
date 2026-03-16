import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientService } from './client.service';
import {
  CreateIndividualClientDto,
  CreateBusinessClientDto,
  VerifyKycDto,
  RejectKycDto,
  SearchClientDto,
} from './client.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserModel } from '../users/user.model';
import { UserRole } from '../users/user.enums';

/**
 * HTTP layer only — parse the request, call the service, return the result.
 * No business logic lives here.
 */
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  // --- Onboarding ---

  @Post('individual')
  @Roles(UserRole.TELLER, UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  registerIndividual(
    @Body() dto: CreateIndividualClientDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.registerIndividual(dto, user.id);
  }

  @Post('business')
  @Roles(UserRole.TELLER, UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  registerBusiness(
    @Body() dto: CreateBusinessClientDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.registerBusiness(dto, user.id);
  }

  // --- KYC lifecycle ---

  @Post(':id/kyc/verify')
  @Roles(UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  verifyKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyKycDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.verifyKyc(id, dto, user.id);
  }

  @Post(':id/kyc/reject')
  @Roles(UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  rejectKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectKycDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.rejectKyc(id, dto, user.id);
  }

  @Post(':id/kyc/reset')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  resetKyc(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.resetKyc(id);
  }

  // --- Client status ---

  @Patch(':id/deactivate')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.reactivate(id);
  }

  @Patch(':id/blacklist')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  blacklist(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.blacklist(id);
  }

  // --- Queries ---

  @Get()
  @Roles(UserRole.TELLER, UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  search(@Query() dto: SearchClientDto) {
    return this.clientService.search(dto);
  }

  @Get(':id')
  @Roles(UserRole.TELLER, UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.findById(id);
  }
}
