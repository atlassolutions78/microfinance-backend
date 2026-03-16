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
      username: entity.username,
      email: entity.email,
      passwordHash: entity.password_hash,
      fullName: entity.full_name,
      role: entity.role,
      isActive: entity.is_active,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    });
  }

  static toEntity(model: UserModel): UserEntity {
    const entity = new UserEntity();
    entity.id = model.id;
    entity.username = model.username;
    entity.email = model.email;
    entity.password_hash = model.passwordHash;
    entity.full_name = model.fullName;
    entity.role = model.role;
    entity.is_active = model.isActive;
    return entity;
  }
}
