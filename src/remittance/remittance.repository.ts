import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RemittanceEntity } from './remittance.entity';
import { RemittanceMapper } from './remittance.mapper';
import { RemittanceModel } from './remittance.model';
import { RemittanceStatus } from './remittance.enums';
import { GetRemittancesQueryDto } from './remittance.dto';

@Injectable()
export class RemittanceRepository {
  constructor(
    @InjectRepository(RemittanceEntity)
    private readonly repo: Repository<RemittanceEntity>,
  ) {}

  async save(model: RemittanceModel, em?: EntityManager): Promise<void> {
    const r = em ? em.getRepository(RemittanceEntity) : this.repo;
    await r.save(RemittanceMapper.toEntity(model));
  }

  async findById(id: string): Promise<RemittanceModel | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? RemittanceMapper.toDomain(e) : null;
  }

  async findByReference(reference: string): Promise<RemittanceModel | null> {
    const e = await this.repo.findOne({ where: { reference } });
    return e ? RemittanceMapper.toDomain(e) : null;
  }

  /** Remittances waiting to be collected at a given receiving branch. */
  async findPendingByReceivingBranch(
    branchId: string,
    query?: GetRemittancesQueryDto,
  ): Promise<{ data: RemittanceModel[]; total: number }> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const search = query?.search?.trim();

    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.receiving_branch_id = :branchId', { branchId })
      .andWhere('r.status = :status', { status: RemittanceStatus.PENDING })
      .orderBy('r.created_at', 'ASC');

    if (search) {
      qb.andWhere(
        '(r.reference ILIKE :search OR r.recipient_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    const entities = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return { data: entities.map(RemittanceMapper.toDomain), total };
  }

  /** All remittances sent from a given branch (any status). */
  async findBySendingBranch(
    branchId: string,
    query?: GetRemittancesQueryDto,
  ): Promise<{ data: RemittanceModel[]; total: number }> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const search = query?.search?.trim();

    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.sending_branch_id = :branchId', { branchId })
      .orderBy('r.created_at', 'DESC');

    if (query?.status) {
      qb.andWhere('r.status = :status', { status: query.status.toUpperCase() });
    }

    if (search) {
      qb.andWhere(
        '(r.reference ILIKE :search OR r.recipient_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    const entities = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return { data: entities.map(RemittanceMapper.toDomain), total };
  }

  /** All remittances across the institution (manager/admin view). */
  async findAll(
    query?: GetRemittancesQueryDto,
  ): Promise<{ data: RemittanceModel[]; total: number }> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const search = query?.search?.trim();

    const qb = this.repo
      .createQueryBuilder('r')
      .orderBy('r.created_at', 'DESC');

    if (query?.status) {
      qb.andWhere('r.status = :status', { status: query.status.toUpperCase() });
    }

    if (search) {
      qb.andWhere(
        '(r.reference ILIKE :search OR r.recipient_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    const entities = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return { data: entities.map(RemittanceMapper.toDomain), total };
  }
}
