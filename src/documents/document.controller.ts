import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentService } from './document.service';
import { UploadDocumentDto } from './document.dto';
import { DocumentOwnerType } from './document.enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserModel } from '../users/user.model';
import { UserRole } from '../users/user.enums';
import { IsEnum, IsUUID } from 'class-validator';

class OwnerQueryDto {
  @IsEnum(DocumentOwnerType)
  ownerType: DocumentOwnerType;

  @IsUUID()
  ownerId: string;
}

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Upload a document file.
   * multipart/form-data fields: documentType, ownerType, ownerId, file (binary)
   */
  @Post('upload')
  @Roles(UserRole.TELLER, UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserModel,
  ) {
    return this.documentService.upload(dto, file, user.id);
  }

  /** Verify a document after officer review */
  @Patch(':id/verify')
  @Roles(UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    return this.documentService.verify(id, user.id);
  }

  /** List all documents belonging to an owner (client, representative, or guardian) */
  @Get()
  @Roles(UserRole.TELLER, UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  findByOwner(@Query() query: OwnerQueryDto) {
    return this.documentService.findByOwner(query.ownerType, query.ownerId);
  }

  @Get(':id')
  @Roles(UserRole.TELLER, UserRole.LOAN_OFFICER, UserRole.MANAGER, UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.findById(id);
  }
}
