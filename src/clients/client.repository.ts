import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ClientEntity } from './client.entity';
import { ClientModel } from './client.model';
import { ClientMapper } from './client.mapper';
import { ClientStatus, KycStatus } from './client.enums';

export interface ClientSearchOptions {
  nameOrId?: string;
  status?: ClientStatus;
  kycStatus?: KycStatus;
  limit?: number;
  offset?: number;
}

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

  async search(opts: ClientSearchOptions): Promise<ClientModel[]> {
    const qb = this.repo.createQueryBuilder('c')
      .leftJoinAndSelect('c.individual_details', 'ind')
      .leftJoinAndSelect('c.business_details', 'biz')
      .leftJoinAndSelect('c.guardian', 'guardian')
      .leftJoinAndSelect('c.representatives', 'rep');

    if (opts.nameOrId) {
      const term = `%${opts.nameOrId}%`;
      qb.andWhere(
        `(c.client_number ILIKE :term
          OR ind.first_name ILIKE :term
          OR ind.last_name ILIKE :term
          OR ind.id_number ILIKE :term
          OR biz.company_name ILIKE :term
          OR biz.registration_number ILIKE :term)`,
        { term },
      );
    }

    if (opts.status) {
      qb.andWhere('c.status = :status', { status: opts.status });
    }

    if (opts.kycStatus) {
      qb.andWhere('c.kyc_status = :kycStatus', { kycStatus: opts.kycStatus });
    }

    qb.orderBy('c.created_at', 'DESC')
      .take(opts.limit ?? 50)
      .skip(opts.offset ?? 0);

    const entities = await qb.getMany();
    return entities.map(ClientMapper.toDomain);
  }

  async countAll(): Promise<number> {
    return this.repo.count();
  }

  async existsByIdNumber(idNumber: string): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('c')
      .innerJoin('c.individual_details', 'ind')
      .where('ind.id_number = :idNumber', { idNumber })
      .getCount();
    return count > 0;
  }

  async existsByRegistrationNumber(registrationNumber: string): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('c')
      .innerJoin('c.business_details', 'biz')
      .where('biz.registration_number = :registrationNumber', { registrationNumber })
      .getCount();
    return count > 0;
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
