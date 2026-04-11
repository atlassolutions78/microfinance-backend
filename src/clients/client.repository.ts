import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { GetClientsQueryDto } from './client.dto';
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
    const result = await this.repo
      .createQueryBuilder('c')
      .select(`MAX(CAST(REPLACE(c.client_number, 'CL-', '') AS INTEGER))`, 'max')
      .getRawOne<{ max: string | null }>();
    if (!result?.max) return null;
    return `CL-${String(result.max).padStart(6, '0')}`;
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

  async findIndividualProfileByClientId(
    clientId: string,
  ): Promise<IndividualProfileEntity | null> {
    return this.individualProfileRepo.findOne({
      where: { client_id: clientId },
    });
  }

  async findOrganizationProfileByClientId(
    clientId: string,
  ): Promise<OrganizationProfileEntity | null> {
    return this.organizationProfileRepo.findOne({
      where: { client_id: clientId },
    });
  }

  async updateIndividualProfile(
    profile: IndividualProfileEntity,
  ): Promise<void> {
    await this.individualProfileRepo.save(profile);
  }

  async updateOrganizationProfile(
    profile: OrganizationProfileEntity,
  ): Promise<void> {
    await this.organizationProfileRepo.save(profile);
  }

  async updateClientEntity(
    id: string,
    fields: Partial<Pick<ClientEntity, 'segment'>>,
  ): Promise<void> {
    await this.repo.update(id, fields);
  }

  async findByIdFull(id: string): Promise<{
    client: ClientEntity;
    individualProfile?: IndividualProfileEntity;
    orgProfile?: OrganizationProfileEntity;
    representative?: RepresentativeEntity;
    guardian?: MinorGuardianEntity;
    orgRepresentatives?: OrganizationRepresentativeEntity[];
  } | null> {
    const client = await this.repo.findOne({ where: { id } });
    if (!client) return null;
    if (client.type === 'INDIVIDUAL') {
      const [individualProfile, representative, guardian] = await Promise.all([
        this.individualProfileRepo.findOne({ where: { client_id: id } }),
        this.findRepresentativeByClientId(id),
        this.findGuardianByClientId(id),
      ]);
      return {
        client,
        individualProfile: individualProfile ?? undefined,
        representative: representative ?? undefined,
        guardian: guardian ?? undefined,
      };
    } else {
      const [orgProfile, orgRepresentatives] = await Promise.all([
        this.organizationProfileRepo.findOne({ where: { client_id: id } }),
        this.orgRepRepo.find({ where: { client_id: id } }),
      ]);
      return {
        client,
        orgProfile: orgProfile ?? undefined,
        orgRepresentatives,
      };
    }
  }

  async findAllFull(query?: GetClientsQueryDto): Promise<{
    rows: {
      client: ClientEntity;
      individualProfile?: IndividualProfileEntity;
      orgProfile?: OrganizationProfileEntity;
    }[];
    total: number;
  }> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const search = query?.search?.trim();

    // Build a QueryBuilder to support search/filter/pagination with profile joins
    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoin(
        IndividualProfileEntity,
        'ip',
        'ip.client_id = c.id',
      )
      .leftJoin(
        OrganizationProfileEntity,
        'op',
        'op.client_id = c.id',
      )
      .orderBy('c.created_at', 'DESC');

    if (query?.type) {
      qb.andWhere('c.type = :type', { type: query.type.toUpperCase() });
    }

    // Status filter maps to kyc_status values
    if (query?.status) {
      const statusMap: Record<string, string[]> = {
        active: ['APPROVED'],
        'kyc-pending': ['PENDING', 'UNDER_REVIEW', 'REQUIRES_UPDATE'],
        rejected: ['REJECTED'],
        inactive: ['PENDING'],
      };
      const kycStatuses = statusMap[query.status.toLowerCase()];
      if (kycStatuses) {
        qb.andWhere('c.kyc_status IN (:...kycStatuses)', { kycStatuses });
      }
    }

    if (search) {
      qb.andWhere(
        `(
          ip.first_name ILIKE :search
          OR ip.last_name ILIKE :search
          OR op.organization_name ILIKE :search
          OR c.client_number ILIKE :search
          OR ip.phone ILIKE :search
          OR ip.email ILIKE :search
          OR ip.id_number ILIKE :search
          OR op.phone ILIKE :search
        )`,
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    const clients = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const rows = await Promise.all(
      clients.map(async (client) => {
        if (client.type === 'INDIVIDUAL') {
          const individualProfile = await this.individualProfileRepo.findOne({
            where: { client_id: client.id },
          });
          return { client, individualProfile: individualProfile ?? undefined };
        } else {
          const orgProfile = await this.organizationProfileRepo.findOne({
            where: { client_id: client.id },
          });
          return { client, orgProfile: orgProfile ?? undefined };
        }
      }),
    );

    return { rows, total };
  }
}
