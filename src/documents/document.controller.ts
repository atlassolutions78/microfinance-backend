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
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import {
  UploadClientDocumentDto,
  UploadRepresentativeDocumentDto,
  UploadGuardianDocumentDto,
  UploadOrgRepresentativeDocumentDto,
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
  @ApiOperation({ summary: 'Upload a document for a client' })
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.ADMIN,
  )
  @ApiBody({
    type: UploadClientDocumentDto,
    examples: {
      default: {
        value: {
          clientId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          documentType: 'ID_DOCUMENT',
          fileUrl: 'clients/a1b2c3d4/id_document.jpg',
          fileName: 'national_id_front.jpg',
        },
      },
    },
  })
  uploadForClient(
    @Body() dto: UploadClientDocumentDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.documentService.uploadForClient(dto, user.id);
  }

  @Post('representative')
  @ApiOperation({ summary: 'Upload a document for a client representative' })
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.ADMIN,
  )
  @ApiBody({
    type: UploadRepresentativeDocumentDto,
    examples: {
      default: {
        value: {
          representativeId: 'e1b2c3d4-e5f6-7890-abcd-ef1234567890',
          documentType: 'ID_DOCUMENT',
          fileUrl: 'representatives/e1b2c3d4/id_document.jpg',
          fileName: 'rep_passport.jpg',
        },
      },
    },
  })
  uploadForRepresentative(
    @Body() dto: UploadRepresentativeDocumentDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.documentService.uploadForRepresentative(dto, user.id);
  }

  @Post('guardian')
  @ApiOperation({ summary: 'Upload a document for a minor guardian' })
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.ADMIN,
  )
  @ApiBody({
    type: UploadGuardianDocumentDto,
    examples: {
      default: {
        value: {
          guardianId: 'f1b2c3d4-e5f6-7890-abcd-ef1234567890',
          documentType: 'ID_DOCUMENT',
          fileUrl: 'guardians/f1b2c3d4/id_document.jpg',
          fileName: 'guardian_id.jpg',
        },
      },
    },
  })
  uploadForGuardian(
    @Body() dto: UploadGuardianDocumentDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.documentService.uploadForGuardian(dto, user.id);
  }

  @Post('org-representative')
  @ApiOperation({
    summary: 'Upload a document for an organisation representative',
  })
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.ADMIN,
  )
  @ApiBody({
    type: UploadOrgRepresentativeDocumentDto,
    examples: {
      default: {
        value: {
          orgRepresentativeId: 'g1b2c3d4-e5f6-7890-abcd-ef1234567890',
          documentType: 'ID_DOCUMENT',
          fileUrl: 'org-reps/g1b2c3d4/id_document.jpg',
          fileName: 'org_rep_id.jpg',
        },
      },
    },
  })
  uploadForOrgRepresentative(
    @Body() dto: UploadOrgRepresentativeDocumentDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.documentService.uploadForOrgRepresentative(dto, user.id);
  }

  // --- Review ---

  @Patch(':ownerType/:id/accept')
  @ApiOperation({ summary: 'Accept a submitted document' })
  @ApiParam({
    name: 'ownerType',
    description:
      'Owner type (client, representative, guardian, org-representative)',
  })
  @ApiParam({ name: 'id', description: 'Document UUID' })
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
  @ApiOperation({ summary: 'Reject a submitted document' })
  @ApiParam({
    name: 'ownerType',
    description:
      'Owner type (client, representative, guardian, org-representative)',
  })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @Roles(
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  @ApiBody({
    type: RejectDocumentDto,
    examples: {
      default: {
        value: {
          reason:
            'Document is blurry and unreadable. Please re-upload a clear photo.',
        },
      },
    },
  })
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
  @ApiOperation({ summary: 'List all documents for a client' })
  @ApiParam({ name: 'clientId', description: 'Client UUID' })
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
  @ApiOperation({ summary: 'List all documents for a representative' })
  @ApiParam({ name: 'representativeId', description: 'Representative UUID' })
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
  @ApiOperation({ summary: 'List all documents for a guardian' })
  @ApiParam({ name: 'guardianId', description: 'Guardian UUID' })
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

  @Get('org-representative/:orgRepresentativeId')
  @ApiOperation({
    summary: 'List all documents for an organisation representative',
  })
  @ApiParam({
    name: 'orgRepresentativeId',
    description: 'Organisation representative UUID',
  })
  @Roles(
    UserRole.TELLER,
    UserRole.LOAN_OFFICER,
    UserRole.BRANCH_MANAGER,
    UserRole.HQ_MANAGER,
    UserRole.ADMIN,
  )
  findByOrgRepresentative(
    @Param('orgRepresentativeId', ParseUUIDPipe) orgRepresentativeId: string,
  ) {
    return this.documentService.findByOrgRepresentative(orgRepresentativeId);
  }
}
