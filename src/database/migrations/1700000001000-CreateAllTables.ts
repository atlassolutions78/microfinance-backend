import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAllTables1700000001000 implements MigrationInterface {
  name = 'CreateAllTables1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------------------------
    // Enums
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TYPE user_role_enum AS ENUM ('TELLER', 'LOAN_OFFICER', 'MANAGER', 'ADMIN')
    `);

    await queryRunner.query(`
      CREATE TYPE client_type_enum AS ENUM ('INDIVIDUAL', 'BUSINESS')
    `);

    await queryRunner.query(`
      CREATE TYPE client_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED')
    `);

    await queryRunner.query(`
      CREATE TYPE kyc_status_enum AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')
    `);

    await queryRunner.query(`
      CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE', 'OTHER')
    `);

    await queryRunner.query(`
      CREATE TYPE id_type_enum AS ENUM ('NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE', 'RESIDENCE_PERMIT')
    `);

    await queryRunner.query(`
      CREATE TYPE signature_policy_enum AS ENUM ('SINGLE', 'DUAL', 'ANY_TWO')
    `);

    await queryRunner.query(`
      CREATE TYPE guardian_relationship_enum AS ENUM ('PARENT', 'LEGAL_GUARDIAN', 'SIBLING', 'GRANDPARENT', 'OTHER')
    `);

    await queryRunner.query(`
      CREATE TYPE document_type_enum AS ENUM ('ID_SCAN', 'PASSPORT_PHOTO', 'REGISTRATION_DOC', 'OPENING_REQUEST_LETTER', 'PROOF_OF_ADDRESS', 'BIOMETRIC_DATA', 'OTHER')
    `);

    await queryRunner.query(`
      CREATE TYPE document_owner_type_enum AS ENUM ('CLIENT', 'REPRESENTATIVE', 'GUARDIAN')
    `);

    await queryRunner.query(`
      CREATE TYPE loan_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'CLOSED', 'DEFAULTED')
    `);

    await queryRunner.query(`
      CREATE TYPE loan_type_enum AS ENUM ('INDIVIDUAL', 'GROUP', 'EMERGENCY', 'BUSINESS', 'AGRICULTURAL')
    `);

    // -------------------------------------------------------------------------
    // users
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username      VARCHAR(100) NOT NULL UNIQUE,
        email         VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name     VARCHAR(255) NOT NULL,
        role          user_role_enum NOT NULL,
        is_active     BOOLEAN NOT NULL DEFAULT true,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // -------------------------------------------------------------------------
    // individual_details
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE individual_details (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name      VARCHAR(100) NOT NULL,
        last_name       VARCHAR(100) NOT NULL,
        middle_name     VARCHAR(100),
        date_of_birth   DATE NOT NULL,
        gender          gender_enum NOT NULL,
        nationality     VARCHAR(100) NOT NULL,
        phone           VARCHAR(30) NOT NULL,
        email           VARCHAR(255),
        address_line1   VARCHAR(255) NOT NULL,
        address_line2   VARCHAR(255),
        city            VARCHAR(100) NOT NULL,
        state_province  VARCHAR(100),
        country         VARCHAR(100) NOT NULL,
        postal_code     VARCHAR(20),
        id_type         id_type_enum NOT NULL,
        id_number       VARCHAR(100) NOT NULL UNIQUE,
        id_expiry_date  DATE NOT NULL,
        is_minor        BOOLEAN NOT NULL DEFAULT false
      )
    `);

    // -------------------------------------------------------------------------
    // guardians
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE guardians (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name      VARCHAR(100) NOT NULL,
        last_name       VARCHAR(100) NOT NULL,
        relationship    guardian_relationship_enum NOT NULL,
        phone           VARCHAR(30) NOT NULL,
        email           VARCHAR(255),
        id_type         id_type_enum NOT NULL,
        id_number       VARCHAR(100) NOT NULL,
        id_expiry_date  DATE NOT NULL
      )
    `);

    // -------------------------------------------------------------------------
    // business_details
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE business_details (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name        VARCHAR(255) NOT NULL,
        registration_number VARCHAR(100) NOT NULL UNIQUE,
        tax_id              VARCHAR(100),
        business_type       VARCHAR(100),
        phone               VARCHAR(30) NOT NULL,
        email               VARCHAR(255),
        address_line1       VARCHAR(255) NOT NULL,
        address_line2       VARCHAR(255),
        city                VARCHAR(100) NOT NULL,
        state_province      VARCHAR(100),
        country             VARCHAR(100) NOT NULL,
        postal_code         VARCHAR(20),
        signature_policy    signature_policy_enum NOT NULL DEFAULT 'SINGLE'
      )
    `);

    // -------------------------------------------------------------------------
    // clients
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE clients (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_number         VARCHAR(20) NOT NULL UNIQUE,
        client_type           client_type_enum NOT NULL,
        status                client_status_enum NOT NULL DEFAULT 'ACTIVE',
        kyc_status            kyc_status_enum NOT NULL DEFAULT 'PENDING',
        kyc_verified_by       UUID REFERENCES users(id),
        kyc_verified_at       TIMESTAMPTZ,
        kyc_rejection_reason  TEXT,
        kyc_expiry_date       DATE,
        individual_details_id UUID UNIQUE REFERENCES individual_details(id) ON DELETE CASCADE,
        business_details_id   UUID UNIQUE REFERENCES business_details(id) ON DELETE CASCADE,
        guardian_id           UUID UNIQUE REFERENCES guardians(id) ON DELETE CASCADE,
        created_by            UUID NOT NULL REFERENCES users(id),
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // -------------------------------------------------------------------------
    // representatives
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE representatives (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        first_name           VARCHAR(100) NOT NULL,
        last_name            VARCHAR(100) NOT NULL,
        role                 VARCHAR(100) NOT NULL,
        phone                VARCHAR(30) NOT NULL,
        email                VARCHAR(255),
        id_type              id_type_enum NOT NULL,
        id_number            VARCHAR(100) NOT NULL,
        id_expiry_date       DATE NOT NULL,
        is_primary_signatory BOOLEAN NOT NULL DEFAULT false,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // -------------------------------------------------------------------------
    // documents
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE documents (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_type   document_type_enum NOT NULL,
        file_path       VARCHAR(500) NOT NULL,
        file_name       VARCHAR(255) NOT NULL,
        original_name   VARCHAR(255) NOT NULL,
        mime_type       VARCHAR(100) NOT NULL,
        file_size_bytes INT NOT NULL,
        owner_type      document_owner_type_enum NOT NULL,
        owner_id        UUID NOT NULL,
        uploaded_by     UUID NOT NULL REFERENCES users(id),
        uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        is_verified     BOOLEAN NOT NULL DEFAULT false,
        verified_by     UUID REFERENCES users(id),
        verified_at     TIMESTAMPTZ
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_documents_owner ON documents (owner_type, owner_id)`,
    );

    // -------------------------------------------------------------------------
    // loans
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE loans (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id        UUID NOT NULL,
        amount           NUMERIC(18,2) NOT NULL,
        interest_rate    NUMERIC(6,4) NOT NULL,
        term_months      INT NOT NULL,
        type             loan_type_enum NOT NULL,
        purpose          TEXT NOT NULL,
        status           loan_status_enum NOT NULL DEFAULT 'PENDING',
        rejection_reason TEXT,
        approved_by      UUID,
        approved_at      TIMESTAMPTZ,
        disbursed_at     TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS loans`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_documents_owner`);
    await queryRunner.query(`DROP TABLE IF EXISTS documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS representatives`);
    await queryRunner.query(`DROP TABLE IF EXISTS clients`);
    await queryRunner.query(`DROP TABLE IF EXISTS business_details`);
    await queryRunner.query(`DROP TABLE IF EXISTS guardians`);
    await queryRunner.query(`DROP TABLE IF EXISTS individual_details`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);

    await queryRunner.query(`DROP TYPE IF EXISTS loan_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS loan_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS document_owner_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS document_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS guardian_relationship_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS signature_policy_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS id_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS gender_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS kyc_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS client_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS client_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role_enum`);
  }
}
