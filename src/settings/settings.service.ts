import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BranchRepository } from './branch.repository';
import { BranchEntity } from './branch.entity';
import { CreateBranchDto, UpdateBranchDto } from './settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly branchRepository: BranchRepository) {}

  async createBranch(
    dto: CreateBranchDto,
    createdById: string,
  ): Promise<BranchEntity> {
    return this.branchRepository.save({
      id: randomUUID(),
      name: dto.name,
      code: dto.code,
      type: dto.type,
      address: dto.address,
      phone: dto.phone ?? null,
      is_active: true,
      created_by: createdById,
      updated_by: null,
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

  async updateBranch(
    id: string,
    dto: UpdateBranchDto,
    updatedById: string,
  ): Promise<BranchEntity> {
    await this.findBranchById(id);
    await this.branchRepository.update(id, { ...dto, updated_by: updatedById });
    return this.findBranchById(id);
  }

  async deactivateBranch(
    id: string,
    updatedById: string,
  ): Promise<BranchEntity> {
    await this.findBranchById(id);
    await this.branchRepository.update(id, {
      is_active: false,
      updated_by: updatedById,
    });
    return this.findBranchById(id);
  }
}
