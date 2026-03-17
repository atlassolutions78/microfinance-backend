import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClientRepository } from './client.repository';
import { ClientModel } from './client.model';
import { KycStatus } from './client.enums';
import { CreateClientDto, RejectKycDto, RequestUpdateDto } from './client.dto';

@Injectable()
export class ClientService {
  constructor(private readonly clientRepository: ClientRepository) {}

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  async register(
    dto: CreateClientDto,
    createdBy: string,
  ): Promise<ClientModel> {
    const clientNumber = await this.generateClientNumber();

    const client = new ClientModel({
      id: randomUUID(),
      clientNumber,
      type: dto.type,
      kycStatus: KycStatus.PENDING,
      branchId: dto.branchId,
      createdBy,
      kycReviewedBy: null,
      kycReviewedAt: null,
      kycNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.clientRepository.save(client);
    return client;
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
