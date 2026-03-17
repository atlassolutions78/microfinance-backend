import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientEntity } from './client.entity';
import { ClientModel } from './client.model';
import { ClientMapper } from './client.mapper';

@Injectable()
export class ClientRepository {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly repo: Repository<ClientEntity>,
  ) {}

  async save(client: ClientModel): Promise<void> {
    await this.repo.save(ClientMapper.toEntity(client));
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
}
