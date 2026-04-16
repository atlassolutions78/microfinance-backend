import Decimal from 'decimal.js';
import { AccountModel } from './account.model';
import { AccountEntity } from './account.entity';

/**
 * Translates between the DB record shape (AccountEntity) and the
 * domain model (AccountModel). This is the only place that knows about both.
 */
export class AccountMapper {
  static toDomain(entity: AccountEntity): AccountModel {
    return new AccountModel({
      id: entity.id,
      accountNumber: entity.account_number,
      clientId: entity.client_id,
      branchId: entity.branch_id,
      accountType: entity.account_type,
      currency: entity.currency,
      status: entity.status,
      balance: new Decimal(entity.balance).toFixed(2),
      openedBy: entity.opened_by,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    });
  }

  static toEntity(model: AccountModel): AccountEntity {
    const entity = new AccountEntity();
    entity.id = model.id;
    entity.account_number = model.accountNumber;
    entity.client_id = model.clientId;
    entity.branch_id = model.branchId;
    entity.account_type = model.accountType;
    entity.currency = model.currency;
    entity.status = model.status;
    entity.balance = new Decimal(model.balance).toFixed(2);
    entity.opened_by = model.openedBy;
    return entity;
  }
}
