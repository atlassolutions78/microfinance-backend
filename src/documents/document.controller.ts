import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import {
  UploadClientDocumentDto,
  UploadRepresentativeDocumentDto,
  UploadGuardianDocumentDto,
  RejectDocumentDto,
} from './document.dto';
import type { DocumentOwnerType } from './document.model';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserModel } from '../users/user.model';
import { UserRole } from '../users/user.enums';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  // --- Upload ---

  @Post('client')
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.ADMIN,
  )
  uploadForClient(
    @Body() dto: UploadClientDocumentDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.documentService.uploadForClient(dto, user.id);
  }

  @Post('representative')
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.ADMIN,
  )
  uploadForRepresentative(
    @Body() dto: UploadRepresentativeDocumentDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.documentService.uploadForRepresentative(dto, user.id);
  }

  @Post('guardian')
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.ADMIN,
  )
  uploadForGuardian(
    @Body() dto: UploadGuardianDocumentDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.documentService.uploadForGuardian(dto, user.id);
  }

  // --- Review ---

  @Patch(':ownerType/:id/accept')
  @Roles(
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ownerType') ownerType: DocumentOwnerType,
    @CurrentUser() user: UserModel,
  ) {
    return this.documentService.accept(id, ownerType, user.id);
  }

  @Patch(':ownerType/:id/reject')
  @Roles(
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ownerType') ownerType: DocumentOwnerType,
    @Body() dto: RejectDocumentDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.documentService.reject(id, ownerType, dto, user.id);
  }

  // --- Queries ---

  @Get('client/:clientId')
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  findByClient(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.documentService.findByClient(clientId);
  }

  @Get('representative/:representativeId')
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  findByRepresentative(
    @Param('representativeId', ParseUUIDPipe) representativeId: string,
  ) {
    return this.documentService.findByRepresentative(representativeId);
  }

  @Get('guardian/:guardianId')
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  findByGuardian(@Param('guardianId', ParseUUIDPipe) guardianId: string) {
    return this.documentService.findByGuardian(guardianId);
  }
}
