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
import { ClientService } from './client.service';
import { CreateClientDto, RejectKycDto, RequestUpdateDto } from './client.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserModel } from '../users/user.model';
import { UserRole } from '../users/user.enums';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  // --- Onboarding ---

  @Post()
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.MANAGER,
    UserRole.ADMIN,
  )
  register(@Body() dto: CreateClientDto, @CurrentUser() user: UserModel) {
    return this.clientService.register(dto, user.id);
  }

  // --- KYC lifecycle ---

  @Post(':id/kyc/submit')
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.MANAGER,
    UserRole.ADMIN,
  )
  submitForReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.submitForReview(id);
  }

  @Post(':id/kyc/approve')
  @Roles(UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  approveKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.approveKyc(id, user.id);
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

  @Post(':id/kyc/request-update')
  @Roles(UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  requestUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestUpdateDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.requestUpdate(id, dto, user.id);
  }

  // --- Queries ---

  @Get()
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.MANAGER,
    UserRole.ADMIN,
  )
  findAll() {
    return this.clientService.findAll();
  }

  @Get(':id')
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.MANAGER,
    UserRole.ADMIN,
  )
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.findById(id);
  }
}
