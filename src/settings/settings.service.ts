import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BranchRepository } from './branch.repository';
import { BranchEntity } from './branch.entity';
import { CreateBranchDto, UpdateBranchDto } from './settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly branchRepository: BranchRepository) {}

  async createBranch(dto: CreateBranchDto): Promise<BranchEntity> {
    return this.branchRepository.save({
      id: randomUUID(),
      name: dto.name,
      address: dto.address,
    });
  }

  async findAllBranches(): Promise<BranchEntity[]> {
    return this.branchRepository.findAll();
  }

  async findBranchById(id: string): Promise<BranchEntity> {
    const branch = await this.branchRepository.findById(id);
    if (!branch) throw new NotFoundException(`Branch ${id} not found.`);
    return branch;
  }

  async updateBranch(id: string, dto: UpdateBranchDto): Promise<BranchEntity> {
    await this.findBranchById(id);
    await this.branchRepository.update(id, dto);
    return this.findBranchById(id);
  }
}
