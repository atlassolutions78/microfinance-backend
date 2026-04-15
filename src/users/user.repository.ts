import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    search?: string;
    branchId?: string;
    role?: UserRole;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: UserModel[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const search = filters.search?.trim();

    const qb = this.repo
      .createQueryBuilder('u')
      .orderBy('u.created_at', 'DESC');

    if (filters.branchId !== undefined) {
      qb.andWhere('u.branch_id = :branchId', { branchId: filters.branchId });
    }
    if (filters.role !== undefined) {
      qb.andWhere('u.role = :role', { role: filters.role });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('u.is_active = :isActive', { isActive: filters.isActive });
    }
    if (search) {
      qb.andWhere(
        '(u.first_name ILIKE :search OR u.last_name ILIKE :search OR u.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    const entities = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data: entities.map(UserMapper.toDomain), total };
  }

  async updateById(
    id: string,
    fields: Partial<{
      role: UserRole;
      branch_id: string | null;
      password_hash: string;
      is_active: boolean;
      must_change_password: boolean;
    }>,
  ): Promise<void> {
    await this.repo.update(id, fields);
  }
}
