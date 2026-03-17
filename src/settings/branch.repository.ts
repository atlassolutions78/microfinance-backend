import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from './branch.entity';

@Injectable()
export class BranchRepository {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly repo: Repository<BranchEntity>,
  ) {}

  async save(branch: Partial<BranchEntity>): Promise<BranchEntity> {
    return this.repo.save(branch);
  }

  async findById(id: string): Promise<BranchEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<BranchEntity[]> {
    return this.repo.find({ order: { created_at: 'ASC' } });
  }

  async update(id: string, data: Partial<BranchEntity>): Promise<void> {
    await this.repo.update(id, data);
  }
}
