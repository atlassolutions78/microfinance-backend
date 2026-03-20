import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { basename } from 'path';
import { ClientRepository } from './client.repository';
import { ClientModel } from './client.model';
import { ClientType, KycStatus } from './client.enums';
import {
  CreateIndividualClientDto,
  AttachIndividualDocumentsDto,
  RejectKycDto,
  RequestUpdateDto,
} from './client.dto';
import { ClientMapper } from './client.mapper';
import { UserModel } from '../users/user.model';
import { DocumentService } from '../documents/document.service';
import {
  ClientDocumentType,
  RepresentativeDocumentType,
  GuardianDocumentType,
} from '../documents/document.enums';

@Injectable()
export class ClientService {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly documentService: DocumentService,
  ) {}

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  async registerIndividual(
    dto: CreateIndividualClientDto,
    user: UserModel,
  ): Promise<ClientModel> {
    if (!user.branchId) {
      throw new ForbiddenException('User has no assigned branch.');
    }

    const clientId = randomUUID();
    const clientNumber = await this.generateClientNumber();

    const client = new ClientModel({
      id: clientId,
      clientNumber,
      type: ClientType.INDIVIDUAL,
      kycStatus: KycStatus.PENDING,
      branchId: user.branchId,
      createdBy: user.id,
      kycReviewedBy: null,
      kycReviewedAt: null,
      kycNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const profile = ClientMapper.toIndividualProfileEntity(clientId, dto);

    const representative = dto.addRepresentative
      ? ClientMapper.toRepresentativeEntity(clientId, dto, user.id)
      : undefined;

    const guardian = dto.isMinor
      ? ClientMapper.toMinorGuardianEntity(clientId, dto)
      : undefined;

    await this.clientRepository.saveIndividual({
      client,
      profile,
      representative,
      guardian,
    });

    return client;
  }

  async attachIndividualDocuments(
    clientId: string,
    dto: AttachIndividualDocumentsDto,
    uploadedBy: string,
  ): Promise<void> {
    await this.findOrFail(clientId);

    // Passport photos
    for (const key of dto.passportPhotos) {
      await this.documentService.uploadForClient(
        { clientId, documentType: ClientDocumentType.PASSPORT_PHOTO, fileUrl: key, fileName: basename(key) },
        uploadedBy,
      );
    }

    // ID document
    await this.documentService.uploadForClient(
      { clientId, documentType: ClientDocumentType.ID_DOCUMENT, fileUrl: dto.identificationDocument, fileName: basename(dto.identificationDocument) },
      uploadedBy,
    );

    // Signature
    if (dto.signatureFile) {
      await this.documentService.uploadForClient(
        { clientId, documentType: ClientDocumentType.SIGNATURE, fileUrl: dto.signatureFile, fileName: basename(dto.signatureFile) },
        uploadedBy,
      );
    }

    // Additional documents
    for (const key of dto.additionalDocuments ?? []) {
      await this.documentService.uploadForClient(
        { clientId, documentType: ClientDocumentType.REGISTRATION_DOC, fileUrl: key, fileName: basename(key) },
        uploadedBy,
      );
    }

    // Representative ID document
    if (dto.representativeIdDocument) {
      const rep = await this.clientRepository.findRepresentativeByClientId(clientId);
      if (rep) {
        await this.documentService.uploadForRepresentative(
          { representativeId: rep.id, documentType: RepresentativeDocumentType.ID_DOCUMENT, fileUrl: dto.representativeIdDocument, fileName: basename(dto.representativeIdDocument) },
          uploadedBy,
        );
      }
    }

    // Guardian ID document
    if (dto.responsiblePersonIdDocument) {
      const guardian = await this.clientRepository.findGuardianByClientId(clientId);
      if (guardian) {
        await this.documentService.uploadForGuardian(
          { guardianId: guardian.guardian_id, documentType: GuardianDocumentType.ID_DOCUMENT, fileUrl: dto.responsiblePersonIdDocument, fileName: basename(dto.responsiblePersonIdDocument) },
          uploadedBy,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // KYC lifecycle
  // ---------------------------------------------------------------------------

  async submitForReview(clientId: string): Promise<ClientModel> {
    const client = await this.findOrFail(clientId);
    client.submitForReview();
    await this.clientRepository.save(client);
    return client;
  }

  async approveKyc(clientId: string, officerId: string): Promise<ClientModel> {
    const client = await this.findOrFail(clientId);
    client.approveKyc(officerId);
    await this.clientRepository.save(client);
    return client;
  }

  async rejectKyc(
    clientId: string,
    dto: RejectKycDto,
    officerId: string,
  ): Promise<ClientModel> {
    const client = await this.findOrFail(clientId);
    client.rejectKyc(officerId, dto.notes);
    await this.clientRepository.save(client);
    return client;
  }

  async requestUpdate(
    clientId: string,
    dto: RequestUpdateDto,
    officerId: string,
  ): Promise<ClientModel> {
    const client = await this.findOrFail(clientId);
    client.requestUpdate(officerId, dto.notes);
    await this.clientRepository.save(client);
    return client;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async findById(clientId: string): Promise<ClientModel> {
    return this.findOrFail(clientId);
  }

  async findAll(): Promise<ClientModel[]> {
    return this.clientRepository.findAll();
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async findOrFail(clientId: string): Promise<ClientModel> {
    const client = await this.clientRepository.findById(clientId);
    if (!client) throw new NotFoundException(`Client ${clientId} not found.`);
    return client;
  }

  private async generateClientNumber(): Promise<string> {
    const last = await this.clientRepository.getLastClientNumber();
    const lastSeq = last ? parseInt(last.replace('CL-', ''), 10) : 0;
    return `CL-${String(lastSeq + 1).padStart(6, '0')}`;
  }
}
