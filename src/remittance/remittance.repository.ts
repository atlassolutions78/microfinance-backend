import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RemittanceEntity } from './remittance.entity';
import { RemittanceMapper } from './remittance.mapper';
import { RemittanceModel } from './remittance.model';
import { RemittanceStatus } from './remittance.enums';

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
  ): Promise<RemittanceModel[]> {
    const entities = await this.repo.find({
      where: { receiving_branch_id: branchId, status: RemittanceStatus.PENDING },
      order: { created_at: 'ASC' },
    });
    return entities.map(RemittanceMapper.toDomain);
  }

  /** All remittances sent from a given branch (any status). */
  async findBySendingBranch(branchId: string): Promise<RemittanceModel[]> {
    const entities = await this.repo.find({
      where: { sending_branch_id: branchId },
      order: { created_at: 'DESC' },
    });
    return entities.map(RemittanceMapper.toDomain);
  }

  /** All remittances across the institution (manager/admin view). */
  async findAll(): Promise<RemittanceModel[]> {
    const entities = await this.repo.find({ order: { created_at: 'DESC' } });
    return entities.map(RemittanceMapper.toDomain);
  }
}
