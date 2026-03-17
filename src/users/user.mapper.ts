import { UserEntity } from './user.entity';
import { UserModel } from './user.model';

/**
 * Translates between UserEntity (DB) and UserModel (domain).
 * The only file that knows about both shapes.
 */
export class UserMapper {
  static toDomain(entity: UserEntity): UserModel {
    return new UserModel({
      id: entity.id,
      branchId: entity.branch_id,
      firstName: entity.first_name,
      middleName: entity.middle_name,
      lastName: entity.last_name,
      email: entity.email,
      passwordHash: entity.password_hash,
      role: entity.role,
      isActive: entity.is_active,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    });
  }

  static toEntity(model: UserModel): UserEntity {
    const entity = new UserEntity();
    entity.id = model.id;
    entity.branch_id = model.branchId;
    entity.first_name = model.firstName;
    entity.middle_name = model.middleName;
    entity.last_name = model.lastName;
    entity.email = model.email;
    entity.password_hash = model.passwordHash;
    entity.role = model.role;
    entity.is_active = model.isActive;
    return entity;
  }
}
