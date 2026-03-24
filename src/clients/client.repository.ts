import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
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
import { UserEntity } from '../users/user.entity';

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
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
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
    if (!entity) return null;
    const model = ClientMapper.toDomain(entity);
    const userIds = [entity.created_by, entity.kyc_reviewed_by].filter(
      Boolean,
    ) as string[];
    const nameMap = await this.resolveUserNames(userIds);
    model.createdByName = nameMap.get(entity.created_by);
    model.kycReviewedByName = entity.kyc_reviewed_by
      ? (nameMap.get(entity.kyc_reviewed_by) ?? null)
      : null;
    return model;
  }

  async findByClientNumber(clientNumber: string): Promise<ClientModel | null> {
    const entity = await this.repo.findOne({
      where: { client_number: clientNumber },
    });
    return entity ? ClientMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<ClientModel[]> {
    const entities = await this.repo.find({ order: { created_at: 'DESC' } });
    const userIds = new Set<string>();
    for (const e of entities) {
      if (e.created_by) userIds.add(e.created_by);
      if (e.kyc_reviewed_by) userIds.add(e.kyc_reviewed_by);
    }
    const nameMap = await this.resolveUserNames([...userIds]);
    return entities.map((e) => {
      const model = ClientMapper.toDomain(e);
      model.createdByName = nameMap.get(e.created_by);
      model.kycReviewedByName = e.kyc_reviewed_by
        ? (nameMap.get(e.kyc_reviewed_by) ?? null)
        : null;
      return model;
    });
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

  private async resolveUserNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: { id: true, first_name: true, last_name: true },
    });
    return new Map(users.map((u) => [u.id, `${u.first_name} ${u.last_name}`]));
  }
}
