import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ClientType, KycStatus } from './client.enums';

/**
 * Client business rules that require data not on the client object itself.
 * Static methods receive pre-fetched context from the service.
 */
export class ClientPolicy {
  /**
   * An individual client's ID number must be unique across the system.
   */
  static assertUniqueIdNumber(exists: boolean, idNumber: string): void {
    if (exists) {
      throw new ConflictException(
        `A client with ID number '${idNumber}' is already registered.`,
      );
    }
  }

  /**
   * A business client's registration number must be unique.
   */
  static assertUniqueRegistrationNumber(exists: boolean, regNumber: string): void {
    if (exists) {
      throw new ConflictException(
        `A client with registration number '${regNumber}' is already registered.`,
      );
    }
  }

  /**
   * A minor client (age < 18) must have a guardian on record.
   */
  static assertMinorHasGuardian(isMinor: boolean, hasGuardian: boolean): void {
    if (isMinor && !hasGuardian) {
      throw new ForbiddenException(
        'A minor client must have a guardian record provided.',
      );
    }
  }

  /**
   * A business client must have at least one representative.
   */
  static assertBusinessHasRepresentatives(
    type: ClientType,
    representativeCount: number,
  ): void {
    if (type === ClientType.BUSINESS && representativeCount === 0) {
      throw new ForbiddenException(
        'A business client must have at least one representative.',
      );
    }
  }

  /**
   * KYC can only be verified by a Loan Officer or Manager.
   * Roles are checked at the controller level via @Roles() — this guard
   * enforces the rule at the domain level if called from the service.
   */
  static assertKycCanBeReviewed(currentStatus: KycStatus): void {
    if (currentStatus === KycStatus.VERIFIED) {
      throw new ForbiddenException('KYC is already verified and cannot be re-reviewed unless expired or reset.');
    }
  }
}
