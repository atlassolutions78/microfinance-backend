import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ClientService } from './client.service';
import {
  AttachIndividualDocumentsDto,
  CreateIndividualClientDto,
  CreateOrganizationClientDto,
  RejectKycDto,
  RequestUpdateDto,
  UpdateClientDto,
} from './client.dto';
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

  @Post('individual')
  @ApiOperation({ summary: 'Register a new individual client' })
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.ADMIN,
  )
  @ApiBody({
    type: CreateIndividualClientDto,
    examples: {
      default: {
        value: {
          firstName: 'Marie',
          middleName: 'Claire',
          lastName: 'Kabongo',
          gender: 'FEMALE',
          nationality: 'Congolese',
          dateOfBirth: '1990-06-15',
          placeOfBirth: 'Lubumbashi',
          maritalStatus: 'MARRIED',
          profession: 'Nurse',
          provinceOfOrigin: 'Katanga',
          identificationType: 'NATIONAL_ID',
          identificationNumber: '1-9012-34567890-12',
          province: 'Kinshasa',
          municipality: 'Gombe',
          neighborhood: 'Lingwala',
          street: 'Avenue des Aviateurs',
          plotNumber: '42B',
          phoneNumber: '+243812345678',
          email: 'marie.kabongo@example.com',
          addRepresentative: false,
        },
      },
    },
  })
  registerIndividual(
    @Body() dto: CreateIndividualClientDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.registerIndividual(dto, user);
  }

  @Post('organization')
  @ApiOperation({ summary: 'Register a new organization client' })
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.ADMIN,
  )
  registerOrganization(
    @Body() dto: CreateOrganizationClientDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.registerOrganization(dto, user);
  }

  @Patch(':id/documents')
  @ApiOperation({
    summary: 'Attach identity documents to an individual client',
  })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.ADMIN,
  )
  attachDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachIndividualDocumentsDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.attachIndividualDocuments(id, dto, user.id);
  }

  // --- KYC lifecycle ---

  @Post(':id/kyc/submit')
  @ApiOperation({ summary: 'Submit a client for KYC review' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.ADMIN,
  )
  submitForReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.submitForReview(id);
  }

  @Post(':id/kyc/approve')
  @ApiOperation({ summary: 'Approve a client KYC review' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @Roles(
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  approveKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.approveKyc(id, user.id);
  }

  @Post(':id/kyc/reject')
  @ApiOperation({ summary: 'Reject a client KYC review' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @Roles(
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  @ApiBody({
    type: RejectKycDto,
    examples: {
      default: {
        value: { reason: 'Identity document is expired or unreadable' },
      },
    },
  })
  rejectKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectKycDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.rejectKyc(id, dto, user.id);
  }

  @Post(':id/kyc/request-update')
  @ApiOperation({
    summary: 'Request additional information from the client during KYC',
  })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @Roles(
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  @ApiBody({
    type: RequestUpdateDto,
    examples: {
      default: {
        value: {
          message:
            'Please provide a clearer copy of your national ID and proof of address.',
        },
      },
    },
  })
  requestUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestUpdateDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.clientService.requestUpdate(id, dto, user.id);
  }

  // --- Updates ---

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clientService.updateClient(id, dto);
  }

  // --- Queries ---

  @Get()
  @ApiOperation({ summary: 'List all clients' })
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  findAll() {
    return this.clientService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single client by ID' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.findById(id);
  }
}
