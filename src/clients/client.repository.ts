import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ClientEntity,
  IndividualProfileEntity,
  MinorGuardianEntity,
  OrganizationProfileEntity,
  OrganizationRepresentativeEntity,
  RepresentativeEntity,
} from './client.entity';
import { ClientModel } from './client.model';
import { ClientMapper } from './client.mapper';

@Injectable()
export class ClientRepository {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly repo: Repository<ClientEntity>,
    @InjectRepository(RepresentativeEntity)
    private readonly representativeRepo: Repository<RepresentativeEntity>,
    @InjectRepository(MinorGuardianEntity)
    private readonly guardianRepo: Repository<MinorGuardianEntity>,
    @InjectRepository(OrganizationRepresentativeEntity)
    private readonly orgRepRepo: Repository<OrganizationRepresentativeEntity>,
    @InjectRepository(IndividualProfileEntity)
    private readonly individualProfileRepo: Repository<IndividualProfileEntity>,
    @InjectRepository(OrganizationProfileEntity)
    private readonly organizationProfileRepo: Repository<OrganizationProfileEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async save(client: ClientModel): Promise<void> {
    await this.repo.save(ClientMapper.toEntity(client));
  }

  async saveIndividual(params: {
    client: ClientModel;
    profile: IndividualProfileEntity;
    representative?: RepresentativeEntity;
    guardian?: MinorGuardianEntity;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.save(ClientEntity, ClientMapper.toEntity(params.client));
      await manager.save(IndividualProfileEntity, params.profile);
      if (params.representative) {
        await manager.save(RepresentativeEntity, params.representative);
      }
      if (params.guardian) {
        await manager.save(MinorGuardianEntity, params.guardian);
      }
    });
  }

  async saveOrganization(params: {
    client: ClientModel;
    profile: OrganizationProfileEntity;
    representatives: OrganizationRepresentativeEntity[];
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.save(ClientEntity, ClientMapper.toEntity(params.client));
      await manager.save(OrganizationProfileEntity, params.profile);
      for (const rep of params.representatives) {
        await manager.save(OrganizationRepresentativeEntity, rep);
      }
    });
  }

  async findById(id: string): Promise<ClientModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? ClientMapper.toDomain(entity) : null;
  }

  async findByClientNumber(clientNumber: string): Promise<ClientModel | null> {
    const entity = await this.repo.findOne({
      where: { client_number: clientNumber },
    });
    return entity ? ClientMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<ClientModel[]> {
    const entities = await this.repo.find({ order: { created_at: 'DESC' } });
    return entities.map(ClientMapper.toDomain);
  }

  async getLastClientNumber(): Promise<string | null> {
    const entity = await this.repo.findOne({
      where: {},
      order: { created_at: 'DESC' },
      select: ['client_number'],
    });
    return entity?.client_number ?? null;
  }

  async findRepresentativeByClientId(
    clientId: string,
  ): Promise<RepresentativeEntity | null> {
    return this.representativeRepo.findOne({ where: { client_id: clientId } });
  }

  async findGuardianByClientId(
    clientId: string,
  ): Promise<MinorGuardianEntity | null> {
    return this.guardianRepo.findOne({ where: { client_id: clientId } });
  }

  async findIndividualProfileByClientId(clientId: string): Promise<IndividualProfileEntity | null> {
    return this.individualProfileRepo.findOne({ where: { client_id: clientId } });
  }

  async findOrganizationProfileByClientId(clientId: string): Promise<OrganizationProfileEntity | null> {
    return this.organizationProfileRepo.findOne({ where: { client_id: clientId } });
  }

  async updateIndividualProfile(profile: IndividualProfileEntity): Promise<void> {
    await this.individualProfileRepo.save(profile);
  }

  async updateOrganizationProfile(profile: OrganizationProfileEntity): Promise<void> {
    await this.organizationProfileRepo.save(profile);
  }

  async updateClientEntity(id: string, fields: Partial<Pick<ClientEntity, 'segment'>>): Promise<void> {
    await this.repo.update(id, fields);
  }

  async findByIdFull(id: string): Promise<{
    client: ClientEntity;
    individualProfile?: IndividualProfileEntity;
    orgProfile?: OrganizationProfileEntity;
  } | null> {
    const client = await this.repo.findOne({ where: { id } });
    if (!client) return null;
    if (client.type === 'INDIVIDUAL') {
      const individualProfile = await this.individualProfileRepo.findOne({ where: { client_id: id } });
      return { client, individualProfile: individualProfile ?? undefined };
    } else {
      const orgProfile = await this.organizationProfileRepo.findOne({ where: { client_id: id } });
      return { client, orgProfile: orgProfile ?? undefined };
    }
  }

  async findAllFull(): Promise<{
    client: ClientEntity;
    individualProfile?: IndividualProfileEntity;
    orgProfile?: OrganizationProfileEntity;
  }[]> {
    const clients = await this.repo.find({ order: { created_at: 'DESC' } });
    return Promise.all(
      clients.map(async (client) => {
        if (client.type === 'INDIVIDUAL') {
          const individualProfile = await this.individualProfileRepo.findOne({ where: { client_id: client.id } });
          return { client, individualProfile: individualProfile ?? undefined };
        } else {
          const orgProfile = await this.organizationProfileRepo.findOne({ where: { client_id: client.id } });
          return { client, orgProfile: orgProfile ?? undefined };
        }
      }),
    );
  }
}
