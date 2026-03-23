import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { basename } from 'path';
import { ClientRepository } from './client.repository';
import { ClientModel } from './client.model';
import { ClientType, KycStatus } from './client.enums';
import {
  CreateIndividualClientDto,
  CreateOrganizationClientDto,
  AttachIndividualDocumentsDto,
  RejectKycDto,
  RequestUpdateDto,
  UpdateClientDto,
} from './client.dto';
import { ClientMapper, ClientApiResponse } from './client.mapper';
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

  async registerOrganization(
    dto: CreateOrganizationClientDto,
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
      type: ClientType.ORGANIZATION,
      kycStatus: KycStatus.PENDING,
      branchId: user.branchId,
      createdBy: user.id,
      kycReviewedBy: null,
      kycReviewedAt: null,
      kycNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const profile = ClientMapper.toOrganizationProfileEntity(clientId, dto);

    const representatives = dto.organizationRepresentatives.map((repDto) =>
      ClientMapper.toOrgRepresentativeEntity(clientId, repDto, user.id),
    );

    await this.clientRepository.saveOrganization({
      client,
      profile,
      representatives,
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
        {
          clientId,
          documentType: ClientDocumentType.PASSPORT_PHOTO,
          fileUrl: key,
          fileName: basename(key),
        },
        uploadedBy,
      );
    }

    // ID document
    await this.documentService.uploadForClient(
      {
        clientId,
        documentType: ClientDocumentType.ID_DOCUMENT,
        fileUrl: dto.identificationDocument,
        fileName: basename(dto.identificationDocument),
      },
      uploadedBy,
    );

    // Signature
    if (dto.signatureFile) {
      await this.documentService.uploadForClient(
        {
          clientId,
          documentType: ClientDocumentType.SIGNATURE,
          fileUrl: dto.signatureFile,
          fileName: basename(dto.signatureFile),
        },
        uploadedBy,
      );
    }

    // Additional documents
    for (const key of dto.additionalDocuments ?? []) {
      await this.documentService.uploadForClient(
        {
          clientId,
          documentType: ClientDocumentType.REGISTRATION_DOC,
          fileUrl: key,
          fileName: basename(key),
        },
        uploadedBy,
      );
    }

    // Representative ID document
    if (dto.representativeIdDocument) {
      const rep =
        await this.clientRepository.findRepresentativeByClientId(clientId);
      if (rep) {
        await this.documentService.uploadForRepresentative(
          {
            representativeId: rep.id,
            documentType: RepresentativeDocumentType.ID_DOCUMENT,
            fileUrl: dto.representativeIdDocument,
            fileName: basename(dto.representativeIdDocument),
          },
          uploadedBy,
        );
      }
    }

    // Guardian ID document
    if (dto.responsiblePersonIdDocument) {
      const guardian =
        await this.clientRepository.findGuardianByClientId(clientId);
      if (guardian) {
        await this.documentService.uploadForGuardian(
          {
            guardianId: guardian.guardian_id,
            documentType: GuardianDocumentType.ID_DOCUMENT,
            fileUrl: dto.responsiblePersonIdDocument,
            fileName: basename(dto.responsiblePersonIdDocument),
          },
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

  async updateClient(clientId: string, dto: UpdateClientDto): Promise<ClientApiResponse> {
    const client = await this.findOrFail(clientId);

    // Segment applies to both client types — stored on the clients table
    if (dto.segment !== undefined) {
      const normalized = dto.segment.toUpperCase();
      await this.clientRepository.updateClientEntity(clientId, { segment: normalized });
    }

    if (client.type === ClientType.INDIVIDUAL) {
      const profile = await this.clientRepository.findIndividualProfileByClientId(clientId);
      if (profile) {
        if (dto.firstName !== undefined) profile.first_name = dto.firstName;
        if (dto.middleName !== undefined) profile.middle_name = dto.middleName;
        if (dto.lastName !== undefined) profile.last_name = dto.lastName;
        if (dto.gender !== undefined) profile.gender = dto.gender;
        if (dto.nationality !== undefined) profile.nationality = dto.nationality;
        if (dto.profession !== undefined) profile.profession = dto.profession;
        if (dto.phoneNumber !== undefined) profile.phone = dto.phoneNumber;
        if (dto.email !== undefined) profile.email = dto.email;
        if (dto.province !== undefined) profile.province = dto.province;
        if (dto.municipality !== undefined) profile.municipality = dto.municipality;
        if (dto.neighborhood !== undefined) profile.neighborhood = dto.neighborhood;
        if (dto.street !== undefined) profile.street = dto.street;
        if (dto.identificationType !== undefined) profile.id_type = dto.identificationType;
        if (dto.identificationNumber !== undefined) profile.id_number = dto.identificationNumber;
        await this.clientRepository.updateIndividualProfile(profile);
        return this.findById(clientId);
      }
    } else {
      const profile = await this.clientRepository.findOrganizationProfileByClientId(clientId);
      if (profile) {
        if (dto.organizationName !== undefined) profile.organization_name = dto.organizationName;
        if (dto.profession !== undefined) profile.industry = dto.profession;
        if (dto.phoneNumber !== undefined) profile.phone = dto.phoneNumber;
        if (dto.email !== undefined) profile.email = dto.email;
        if (dto.province !== undefined) profile.province = dto.province;
        if (dto.municipality !== undefined) profile.municipality = dto.municipality;
        if (dto.identificationType !== undefined) profile.registration_type = dto.identificationType;
        if (dto.identificationNumber !== undefined) profile.registration_number = dto.identificationNumber;
        await this.clientRepository.updateOrganizationProfile(profile);
        return this.findById(clientId);
      }
    }

    return this.findById(clientId);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async findById(clientId: string): Promise<ClientApiResponse> {
    const data = await this.clientRepository.findByIdFull(clientId);
    if (!data) throw new NotFoundException(`Client ${clientId} not found.`);
    return ClientMapper.toApiResponse(data.client, data.individualProfile, data.orgProfile);
  }

  async findAll(): Promise<ClientApiResponse[]> {
    const rows = await this.clientRepository.findAllFull();
    return rows.map((r) => ClientMapper.toApiResponse(r.client, r.individualProfile, r.orgProfile));
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
