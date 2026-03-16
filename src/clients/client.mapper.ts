import {
  ClientEntity,
  IndividualDetailsEntity,
  BusinessDetailsEntity,
  GuardianEntity,
  RepresentativeEntity,
} from './client.entity';
import {
  ClientModel,
  IndividualDetails,
  BusinessDetails,
  GuardianDetails,
  RepresentativeDetails,
} from './client.model';

/**
 * Translates between ClientEntity (DB) and ClientModel (domain).
 * The only file that knows about both shapes.
 */
export class ClientMapper {
  static toDomain(entity: ClientEntity): ClientModel {
    return new ClientModel({
      id: entity.id,
      clientNumber: entity.client_number,
      type: entity.client_type,
      status: entity.status,
      kycStatus: entity.kyc_status,
      kycVerifiedBy: entity.kyc_verified_by ?? undefined,
      kycVerifiedAt: entity.kyc_verified_at ?? undefined,
      kycRejectionReason: entity.kyc_rejection_reason ?? undefined,
      kycExpiryDate: entity.kyc_expiry_date ?? undefined,
      individualDetails: entity.individual_details
        ? ClientMapper.toIndividualDetails(entity.individual_details)
        : undefined,
      guardian: entity.guardian
        ? ClientMapper.toGuardianDetails(entity.guardian)
        : undefined,
      businessDetails: entity.business_details
        ? ClientMapper.toBusinessDetails(entity.business_details)
        : undefined,
      representatives: (entity.representatives ?? []).map(
        ClientMapper.toRepresentativeDetails,
      ),
      createdBy: entity.created_by,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    });
  }

  static toEntity(model: ClientModel): ClientEntity {
    const entity = new ClientEntity();
    entity.id = model.id;
    entity.client_number = model.clientNumber;
    entity.client_type = model.type;
    entity.status = model.status;
    entity.kyc_status = model.kycStatus;
    entity.kyc_verified_by = model.kycVerifiedBy ?? null;
    entity.kyc_verified_at = model.kycVerifiedAt ?? null;
    entity.kyc_rejection_reason = model.kycRejectionReason ?? null;
    entity.kyc_expiry_date = model.kycExpiryDate ?? null;
    entity.created_by = model.createdBy;

    if (model.individualDetails) {
      entity.individual_details = ClientMapper.fromIndividualDetails(
        model.individualDetails,
      );
    }
    if (model.guardian) {
      entity.guardian = ClientMapper.fromGuardianDetails(model.guardian);
    }
    if (model.businessDetails) {
      entity.business_details = ClientMapper.fromBusinessDetails(
        model.businessDetails,
      );
    }
    entity.representatives = model.representatives.map(
      ClientMapper.fromRepresentativeDetails,
    );

    return entity;
  }

  // --- Individual helpers ---

  private static toIndividualDetails(e: IndividualDetailsEntity): IndividualDetails {
    return {
      firstName: e.first_name,
      lastName: e.last_name,
      middleName: e.middle_name ?? undefined,
      dateOfBirth: e.date_of_birth,
      gender: e.gender,
      nationality: e.nationality,
      phone: e.phone,
      email: e.email ?? undefined,
      addressLine1: e.address_line1,
      addressLine2: e.address_line2 ?? undefined,
      city: e.city,
      stateProvince: e.state_province ?? undefined,
      country: e.country,
      postalCode: e.postal_code ?? undefined,
      idType: e.id_type,
      idNumber: e.id_number,
      idExpiryDate: e.id_expiry_date,
      isMinor: e.is_minor,
    };
  }

  private static fromIndividualDetails(d: IndividualDetails): IndividualDetailsEntity {
    const e = new IndividualDetailsEntity();
    e.first_name = d.firstName;
    e.last_name = d.lastName;
    e.middle_name = d.middleName ?? null;
    e.date_of_birth = d.dateOfBirth;
    e.gender = d.gender;
    e.nationality = d.nationality;
    e.phone = d.phone;
    e.email = d.email ?? null;
    e.address_line1 = d.addressLine1;
    e.address_line2 = d.addressLine2 ?? null;
    e.city = d.city;
    e.state_province = d.stateProvince ?? null;
    e.country = d.country;
    e.postal_code = d.postalCode ?? null;
    e.id_type = d.idType;
    e.id_number = d.idNumber;
    e.id_expiry_date = d.idExpiryDate;
    e.is_minor = d.isMinor;
    return e;
  }

  // --- Guardian helpers ---

  private static toGuardianDetails(e: GuardianEntity): GuardianDetails {
    return {
      firstName: e.first_name,
      lastName: e.last_name,
      relationship: e.relationship,
      phone: e.phone,
      email: e.email ?? undefined,
      idType: e.id_type,
      idNumber: e.id_number,
      idExpiryDate: e.id_expiry_date,
    };
  }

  private static fromGuardianDetails(d: GuardianDetails): GuardianEntity {
    const e = new GuardianEntity();
    e.first_name = d.firstName;
    e.last_name = d.lastName;
    e.relationship = d.relationship;
    e.phone = d.phone;
    e.email = d.email ?? null;
    e.id_type = d.idType;
    e.id_number = d.idNumber;
    e.id_expiry_date = d.idExpiryDate;
    return e;
  }

  // --- Business helpers ---

  private static toBusinessDetails(e: BusinessDetailsEntity): BusinessDetails {
    return {
      companyName: e.company_name,
      registrationNumber: e.registration_number,
      taxId: e.tax_id ?? undefined,
      businessType: e.business_type ?? undefined,
      phone: e.phone,
      email: e.email ?? undefined,
      addressLine1: e.address_line1,
      addressLine2: e.address_line2 ?? undefined,
      city: e.city,
      stateProvince: e.state_province ?? undefined,
      country: e.country,
      postalCode: e.postal_code ?? undefined,
      signaturePolicy: e.signature_policy,
    };
  }

  private static fromBusinessDetails(d: BusinessDetails): BusinessDetailsEntity {
    const e = new BusinessDetailsEntity();
    e.company_name = d.companyName;
    e.registration_number = d.registrationNumber;
    e.tax_id = d.taxId ?? null;
    e.business_type = d.businessType ?? null;
    e.phone = d.phone;
    e.email = d.email ?? null;
    e.address_line1 = d.addressLine1;
    e.address_line2 = d.addressLine2 ?? null;
    e.city = d.city;
    e.state_province = d.stateProvince ?? null;
    e.country = d.country;
    e.postal_code = d.postalCode ?? null;
    e.signature_policy = d.signaturePolicy;
    return e;
  }

  // --- Representative helpers ---

  private static toRepresentativeDetails(e: RepresentativeEntity): RepresentativeDetails {
    return {
      id: e.id,
      firstName: e.first_name,
      lastName: e.last_name,
      role: e.role,
      phone: e.phone,
      email: e.email ?? undefined,
      idType: e.id_type,
      idNumber: e.id_number,
      idExpiryDate: e.id_expiry_date,
      isPrimarySignatory: e.is_primary_signatory,
      createdAt: e.created_at,
    };
  }

  private static fromRepresentativeDetails(d: RepresentativeDetails): RepresentativeEntity {
    const e = new RepresentativeEntity();
    e.id = d.id;
    e.first_name = d.firstName;
    e.last_name = d.lastName;
    e.role = d.role;
    e.phone = d.phone;
    e.email = d.email ?? null;
    e.id_type = d.idType;
    e.id_number = d.idNumber;
    e.id_expiry_date = d.idExpiryDate;
    e.is_primary_signatory = d.isPrimarySignatory;
    return e;
  }
}
