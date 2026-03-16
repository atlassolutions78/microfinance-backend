import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClientRepository } from './client.repository';
import { ClientPolicy } from './client.policy';
import { ClientModel, RepresentativeDetails } from './client.model';
import { ClientStatus, ClientType, KycStatus, SignaturePolicy } from './client.enums';
import {
  CreateIndividualClientDto,
  CreateBusinessClientDto,
  VerifyKycDto,
  RejectKycDto,
  SearchClientDto,
} from './client.dto';

@Injectable()
export class ClientService {
  constructor(private readonly clientRepository: ClientRepository) {}

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  async registerIndividual(
    dto: CreateIndividualClientDto,
    createdBy: string,
  ): Promise<ClientModel> {
    const exists = await this.clientRepository.existsByIdNumber(dto.idNumber);
    ClientPolicy.assertUniqueIdNumber(exists, dto.idNumber);
    ClientPolicy.assertMinorHasGuardian(dto.isMinor, !!dto.guardian);

    const clientNumber = await this.generateClientNumber();
    const idExpiryDate = new Date(dto.idExpiryDate);

    const client = new ClientModel({
      id: randomUUID(),
      clientNumber,
      type: ClientType.INDIVIDUAL,
      status: ClientStatus.ACTIVE,
      kycStatus: KycStatus.PENDING,
      individualDetails: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        nationality: dto.nationality,
        phone: dto.phone,
        email: dto.email,
        addressLine1: dto.address.addressLine1,
        addressLine2: dto.address.addressLine2,
        city: dto.address.city,
        stateProvince: dto.address.stateProvince,
        country: dto.address.country,
        postalCode: dto.address.postalCode,
        idType: dto.idType,
        idNumber: dto.idNumber,
        idExpiryDate,
        isMinor: dto.isMinor,
      },
      guardian: dto.guardian
        ? {
            firstName: dto.guardian.firstName,
            lastName: dto.guardian.lastName,
            relationship: dto.guardian.relationship,
            phone: dto.guardian.phone,
            email: dto.guardian.email,
            idType: dto.guardian.idType,
            idNumber: dto.guardian.idNumber,
            idExpiryDate: new Date(dto.guardian.idExpiryDate),
          }
        : undefined,
      representatives: [],
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.clientRepository.save(client);
    return client;
  }

  async registerBusiness(
    dto: CreateBusinessClientDto,
    createdBy: string,
  ): Promise<ClientModel> {
    const exists = await this.clientRepository.existsByRegistrationNumber(
      dto.registrationNumber,
    );
    ClientPolicy.assertUniqueRegistrationNumber(exists, dto.registrationNumber);
    ClientPolicy.assertBusinessHasRepresentatives(
      ClientType.BUSINESS,
      dto.representatives.length,
    );

    const clientNumber = await this.generateClientNumber();

    const representatives: RepresentativeDetails[] = dto.representatives.map(
      (r) => ({
        id: randomUUID(),
        firstName: r.firstName,
        lastName: r.lastName,
        role: r.role,
        phone: r.phone,
        email: r.email,
        idType: r.idType,
        idNumber: r.idNumber,
        idExpiryDate: new Date(r.idExpiryDate),
        isPrimarySignatory: r.isPrimarySignatory,
        createdAt: new Date(),
      }),
    );

    const client = new ClientModel({
      id: randomUUID(),
      clientNumber,
      type: ClientType.BUSINESS,
      status: ClientStatus.ACTIVE,
      kycStatus: KycStatus.PENDING,
      businessDetails: {
        companyName: dto.companyName,
        registrationNumber: dto.registrationNumber,
        taxId: dto.taxId,
        businessType: dto.businessType,
        phone: dto.phone,
        email: dto.email,
        addressLine1: dto.address.addressLine1,
        addressLine2: dto.address.addressLine2,
        city: dto.address.city,
        stateProvince: dto.address.stateProvince,
        country: dto.address.country,
        postalCode: dto.address.postalCode,
        signaturePolicy: dto.signaturePolicy,
      },
      representatives,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.clientRepository.save(client);
    return client;
  }

  // ---------------------------------------------------------------------------
  // KYC lifecycle
  // ---------------------------------------------------------------------------

  async verifyKyc(
    clientId: string,
    dto: VerifyKycDto,
    officerId: string,
  ): Promise<ClientModel> {
    const client = await this.findOrFail(clientId);
    ClientPolicy.assertKycCanBeReviewed(client.kycStatus);
    client.verifyKyc(officerId, new Date(dto.expiryDate));
    await this.clientRepository.save(client);
    return client;
  }

  async rejectKyc(
    clientId: string,
    dto: RejectKycDto,
    officerId: string,
  ): Promise<ClientModel> {
    const client = await this.findOrFail(clientId);
    client.rejectKyc(dto.reason);
    await this.clientRepository.save(client);
    return client;
  }

  async resetKyc(clientId: string): Promise<ClientModel> {
    const client = await this.findOrFail(clientId);
    client.resetKyc();
    await this.clientRepository.save(client);
    return client;
  }

  /** Check and expire any clients whose KYC expiry date has passed */
  async expireKycIfDue(clientId: string): Promise<ClientModel> {
    const client = await this.findOrFail(clientId);
    if (client.kycStatus === KycStatus.VERIFIED && client.hasKycExpired()) {
      client.expireKyc();
      await this.clientRepository.save(client);
    }
    return client;
  }

  // ---------------------------------------------------------------------------
  // Client status
  // ---------------------------------------------------------------------------

  async deactivate(clientId: string): Promise<ClientModel> {
    const client = await this.findOrFail(clientId);
    client.deactivate();
    await this.clientRepository.save(client);
    return client;
  }

  async reactivate(clientId: string): Promise<ClientModel> {
    const client = await this.findOrFail(clientId);
    client.reactivate();
    await this.clientRepository.save(client);
    return client;
  }

  async blacklist(clientId: string): Promise<ClientModel> {
    const client = await this.findOrFail(clientId);
    client.blacklist();
    await this.clientRepository.save(client);
    return client;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async findById(clientId: string): Promise<ClientModel> {
    return this.findOrFail(clientId);
  }

  async search(dto: SearchClientDto): Promise<ClientModel[]> {
    return this.clientRepository.search({ nameOrId: dto.q });
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async findOrFail(clientId: string): Promise<ClientModel> {
    const client = await this.clientRepository.findById(clientId);
    if (!client) throw new NotFoundException(`Client ${clientId} not found.`);
    return client;
  }

  /**
   * Generates the next sequential client number, e.g. CLT-000042.
   * Uses the last inserted record as a reference point.
   */
  private async generateClientNumber(): Promise<string> {
    const last = await this.clientRepository.getLastClientNumber();
    const lastSeq = last ? parseInt(last.replace('CLT-', ''), 10) : 0;
    const nextSeq = lastSeq + 1;
    return `CLT-${String(nextSeq).padStart(6, '0')}`;
  }
}
