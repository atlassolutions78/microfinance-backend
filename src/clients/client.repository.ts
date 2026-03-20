import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ClientEntity,
  IndividualProfileEntity,
  MinorGuardianEntity,
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

  async findById(id: string): Promise<ClientModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? ClientMapper.toDomain(entity) : null;
  }

  async findByClientNumber(clientNumber: string): Promise<ClientModel | null> {
    const entity = await this.repo.findOne({ where: { client_number: clientNumber } });
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
}
