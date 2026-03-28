import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BranchEntity } from './branch.entity';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class BranchRepository {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly repo: Repository<BranchEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async save(branch: Partial<BranchEntity>): Promise<BranchEntity> {
    return this.repo.save(branch);
  }

  async findById(id: string): Promise<BranchEntity | null> {
    const branch = await this.repo.findOne({ where: { id } });
    if (!branch) return null;
    const userIds = [branch.created_by, branch.updated_by].filter(
      Boolean,
    ) as string[];
    const nameMap = await this.resolveUserNames(userIds);
    branch.createdByName = nameMap.get(branch.created_by);
    branch.updatedByName = branch.updated_by
      ? (nameMap.get(branch.updated_by) ?? null)
      : null;
    return branch;
  }

  async findAll(): Promise<BranchEntity[]> {
    const branches = await this.repo.find({ order: { created_at: 'ASC' } });
    const userIds = new Set<string>();
    for (const b of branches) {
      if (b.created_by) userIds.add(b.created_by);
      if (b.updated_by) userIds.add(b.updated_by);
    }
    const nameMap = await this.resolveUserNames([...userIds]);
    for (const b of branches) {
      b.createdByName = nameMap.get(b.created_by);
      b.updatedByName = b.updated_by ? (nameMap.get(b.updated_by) ?? null) : null;
    }
    return branches;
  }

  async update(id: string, data: Partial<BranchEntity>): Promise<void> {
    await this.repo.update(id, data);
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
