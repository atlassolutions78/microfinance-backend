import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DocumentRepository } from './document.repository';
import { DocumentModel, DocumentOwnerType } from './document.model';
import { DocumentStatus } from './document.enums';
import { UploadsService } from '../uploads/uploads.service';
import {
  UploadClientDocumentDto,
  UploadRepresentativeDocumentDto,
  UploadGuardianDocumentDto,
  UploadOrgRepresentativeDocumentDto,
  RejectDocumentDto,
} from './document.dto';

@Injectable()
export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly uploadsService: UploadsService,
  ) {}

  async uploadForClient(
    dto: UploadClientDocumentDto,
    uploadedBy: string,
  ): Promise<DocumentModel> {
    const doc = new DocumentModel({
      id: randomUUID(),
      ownerType: 'CLIENT',
      ownerId: dto.clientId,
      documentType: dto.documentType,
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      status: DocumentStatus.PENDING,
      rejectionReason: null,
      uploadedBy,
      reviewedBy: null,
      reviewedAt: null,
      uploadedAt: new Date(),
    });
    await this.documentRepository.save(doc);
    return doc;
  }

  async uploadForRepresentative(
    dto: UploadRepresentativeDocumentDto,
    uploadedBy: string,
  ): Promise<DocumentModel> {
    const doc = new DocumentModel({
      id: randomUUID(),
      ownerType: 'REPRESENTATIVE',
      ownerId: dto.representativeId,
      documentType: dto.documentType,
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      status: DocumentStatus.PENDING,
      rejectionReason: null,
      uploadedBy,
      reviewedBy: null,
      reviewedAt: null,
      uploadedAt: new Date(),
    });
    await this.documentRepository.save(doc);
    return doc;
  }

  async uploadForGuardian(
    dto: UploadGuardianDocumentDto,
    uploadedBy: string,
  ): Promise<DocumentModel> {
    const doc = new DocumentModel({
      id: randomUUID(),
      ownerType: 'GUARDIAN',
      ownerId: dto.guardianId,
      documentType: dto.documentType,
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      status: DocumentStatus.PENDING,
      rejectionReason: null,
      uploadedBy,
      reviewedBy: null,
      reviewedAt: null,
      uploadedAt: new Date(),
    });
    await this.documentRepository.save(doc);
    return doc;
  }

  async accept(
    id: string,
    ownerType: string,
    officerId: string,
  ): Promise<DocumentModel> {
    const doc = await this.findOrFail(id, ownerType);
    doc.accept(officerId);
    await this.documentRepository.save(doc);
    return doc;
  }

  async reject(
    id: string,
    ownerType: string,
    dto: RejectDocumentDto,
    officerId: string,
  ): Promise<DocumentModel> {
    const doc = await this.findOrFail(id, ownerType);
    doc.reject(officerId, dto.reason);
    await this.documentRepository.save(doc);
    return doc;
  }

  async delete(id: string, ownerType: string): Promise<void> {
    const doc = await this.findOrFail(id, ownerType);
    await this.uploadsService.deleteFile(doc.fileUrl);
    await this.documentRepository.deleteById(doc.id, doc.ownerType);
  }

  async findByClient(clientId: string): Promise<DocumentModel[]> {
    return this.documentRepository.findByClient(clientId);
  }

  async findByRepresentative(
    representativeId: string,
  ): Promise<DocumentModel[]> {
    return this.documentRepository.findByRepresentative(representativeId);
  }

  async findByGuardian(guardianId: string): Promise<DocumentModel[]> {
    return this.documentRepository.findByGuardian(guardianId);
  }

  async uploadForOrgRepresentative(
    dto: UploadOrgRepresentativeDocumentDto,
    uploadedBy: string,
  ): Promise<DocumentModel> {
    const doc = new DocumentModel({
      id: randomUUID(),
      ownerType: 'ORG_REPRESENTATIVE',
      ownerId: dto.orgRepresentativeId,
      documentType: dto.documentType,
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      status: DocumentStatus.PENDING,
      rejectionReason: null,
      uploadedBy,
      reviewedBy: null,
      reviewedAt: null,
      uploadedAt: new Date(),
    });
    await this.documentRepository.save(doc);
    return doc;
  }

  async findByOrgRepresentative(
    orgRepresentativeId: string,
  ): Promise<DocumentModel[]> {
    return this.documentRepository.findByOrgRepresentative(orgRepresentativeId);
  }

  private async findOrFail(
    id: string,
    ownerType: string,
  ): Promise<DocumentModel> {
    const normalizedOwnerType = this.normalizeOwnerType(ownerType);
    const doc = await this.documentRepository.findById(id, normalizedOwnerType);
    if (!doc) throw new NotFoundException(`Document ${id} not found.`);
    return doc;
  }

  private normalizeOwnerType(ownerType: string): DocumentOwnerType {
    const normalized = ownerType.toUpperCase().replace(/-/g, '_');
    if (
      normalized === 'CLIENT' ||
      normalized === 'REPRESENTATIVE' ||
      normalized === 'GUARDIAN' ||
      normalized === 'ORG_REPRESENTATIVE'
    ) {
      return normalized;
    }

    throw new NotFoundException(`Unsupported document owner type: ${ownerType}`);
  }
}
