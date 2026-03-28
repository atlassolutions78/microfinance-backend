import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { UserModel } from './user.model';
import { UserMapper } from './user.mapper';
import { UserRole } from './user.enums';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async save(user: UserModel): Promise<void> {
    await this.repo.save(UserMapper.toEntity(user));
  }

  async findById(id: string): Promise<UserModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    const entity = await this.repo.findOne({ where: { email } });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<UserModel[]> {
    const entities = await this.repo.find();
    return entities.map(UserMapper.toDomain);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.repo.existsBy({ email });
  }

  async findAllFiltered(filters: {
    branchId?: string;
    role?: UserRole;
    isActive?: boolean;
  }): Promise<UserModel[]> {
    const where: FindOptionsWhere<UserEntity> = {};
    if (filters.branchId !== undefined) where.branch_id = filters.branchId;
    if (filters.role !== undefined) where.role = filters.role;
    if (filters.isActive !== undefined) where.is_active = filters.isActive;
    const entities = await this.repo.find({ where });
    return entities.map(UserMapper.toDomain);
  }
}
