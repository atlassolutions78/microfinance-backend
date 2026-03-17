import { ForbiddenException } from '@nestjs/common';
import { KycStatus } from './client.enums';

/**
 * Client business rules that require data not on the client object itself.
 */
export class ClientPolicy {
  /**
   * KYC can only be approved/rejected/updated when it is UNDER_REVIEW.
   */
  static assertKycCanBeReviewed(currentStatus: KycStatus): void {
    if (currentStatus !== KycStatus.UNDER_REVIEW) {
      throw new ForbiddenException(
        `KYC must be UNDER_REVIEW to be actioned. Current status: ${currentStatus}`,
      );
    }
  }
}
