/**
 * Database seed script.
 *
 * Run with:
 *   pnpm run seed
 *
 * Creates:
 *   - 1 branch (Agence de Goma)
 *   - 4 system users (one per role) — staff from Goma, Nord-Kivu
 *   - 2 individual clients (one adult, one minor with guardian)
 *   - 1 organization client with 2 representatives
 *   - Sample documents for each client
 */

import 'reflect-metadata';
import { config } from 'dotenv';
config();

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import {
  ClientEntity,
  IndividualProfileEntity,
  OrganizationProfileEntity,
  MinorGuardianEntity,
  OrganizationRepresentativeEntity,
} from 'src/clients/client.entity';
import {
  Gender,
  IdType,
  ClientType,
  KycStatus,
  MaritalStatus,
  OrganizationType,
  SignatoryType,
} from 'src/clients/client.enums';
import {
  ClientDocumentEntity,
  GuardianDocumentEntity,
} from 'src/documents/document.entity';
import {
  ClientDocumentType,
  GuardianDocumentType,
  DocumentStatus,
} from 'src/documents/document.enums';
import { UserEntity } from 'src/users/user.entity';
import { UserRole } from 'src/users/user.enums';
import { BranchEntity } from 'src/settings/branch.entity';
import { BranchType } from 'src/settings/branch.enums';
import { AccountEntity, AccountSequenceEntity } from 'src/accounts/account.entity';
import { AccountRepository } from 'src/accounts/account.repository';
import { AccountType, AccountCurrency, AccountStatus } from 'src/accounts/account.enums';

// ---------------------------------------------------------------------------

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'microfinance_user',
  password: process.env.DATABASE_PASSWORD ?? 'microfinance_pass',
  database: process.env.DATABASE_NAME ?? 'microfinance_db',
  entities: [
    UserEntity,
    ClientEntity,
    IndividualProfileEntity,
    OrganizationProfileEntity,
    MinorGuardianEntity,
    OrganizationRepresentativeEntity,
    ClientDocumentEntity,
    GuardianDocumentEntity,
    BranchEntity,
    AccountEntity,
    AccountSequenceEntity,
  ],
  synchronize: false,
});

async function seed() {
  await ds.initialize();
  console.log('Connected to database.\n');

  // -------------------------------------------------------------------------
  // Branch
  // -------------------------------------------------------------------------
  const branchRepo = ds.getRepository(BranchEntity);

  let gomaBranch = await branchRepo.findOne({
    where: { name: 'Agence de Goma' },
  });
  if (!gomaBranch) {
    gomaBranch = branchRepo.create({
      id: randomUUID(),
      name: 'Agence de Goma',
      code: 'GOM01',
      type: BranchType.NORMAL,
      address: 'Avenue du Commerce, Quartier Himbi, Goma, Nord-Kivu',
      phone: null,
      is_active: true,
      created_by: '00000000-0000-0000-0000-000000000000',
    });
    await branchRepo.save(gomaBranch);
    console.log('  created branch: Agence de Goma');
  } else {
    console.log('  skip branch: Agence de Goma (already exists)');
  }

  const gomaBranchId = gomaBranch.id;

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  const userRepo = ds.getRepository(UserEntity);

  const users: Array<{
    firstName: string;
    middleName: string | null;
    lastName: string;
    email: string;
    role: UserRole;
  }> = [
    {
      firstName: 'Jean-Pierre',
      middleName: 'Mapendo',
      lastName: 'Kahindo',
      email: 'jp.kahindo@microfinance.cd',
      role: UserRole.ADMIN,
    },
    {
      firstName: 'Admin',
      middleName: null,
      lastName: 'User',
      email: 'admin@microfinance.cd',
      role: UserRole.ADMIN,
    },
    {
      firstName: 'Cécile',
      middleName: 'Zawadi',
      lastName: 'Lubanga',
      email: 'cecile.lubanga@microfinance.cd',
      role: UserRole.BRANCH_MANAGER,
    },
    {
      firstName: 'Patrick',
      middleName: 'Bahati',
      lastName: 'Katembo',
      email: 'patrick.katembo@microfinance.cd',
      role: UserRole.LOAN_OFFICER,
    },
    {
      firstName: 'Aimée',
      middleName: null,
      lastName: 'Masika',
      email: 'aimee.masika@microfinance.cd',
      role: UserRole.TELLER,
    },
  ];

  const createdUsers: Record<string, UserEntity> = {};

  for (const u of users) {
    const existing = await userRepo.findOne({ where: { email: u.email } });
    if (existing) {
      console.log(`  skip user: ${u.email} (already exists)`);
      createdUsers[u.role] = existing;
      continue;
    }
    const entity = userRepo.create({
      id: randomUUID(),
      branch_id: gomaBranchId,
      first_name: u.firstName,
      middle_name: u.middleName,
      last_name: u.lastName,
      email: u.email,
      password_hash: await bcrypt.hash('Password123!', 12),
      role: u.role,
      is_active: true,
    });
    await userRepo.save(entity);
    createdUsers[u.role] = entity;
    console.log(
      `  created user: ${u.firstName} ${u.lastName} [${u.role}]  password: Password123!`,
    );
  }

  const adminId = createdUsers[UserRole.ADMIN].id;
  const officerId = createdUsers[UserRole.LOAN_OFFICER].id;

  // -------------------------------------------------------------------------
  // Clients
  // -------------------------------------------------------------------------
  const clientRepo = ds.getRepository(ClientEntity);
  const profileRepo = ds.getRepository(IndividualProfileEntity);
  const orgRepo = ds.getRepository(OrganizationProfileEntity);
  const guardianRepo = ds.getRepository(MinorGuardianEntity);
  const repRepo = ds.getRepository(OrganizationRepresentativeEntity);
  const clientDocRepo = ds.getRepository(ClientDocumentEntity);
  const guardianDocRepo = ds.getRepository(GuardianDocumentEntity);

  async function clientExists(num: string) {
    return !!(await clientRepo.findOne({ where: { client_number: num } }));
  }

  // -------------------------------------------------------------------------
  // Client 1 — Espérance Amani Kahambu (adult woman, KYC APPROVED)
  // -------------------------------------------------------------------------
  if (!(await clientExists('CL-000001'))) {
    const c1Id = randomUUID();

    const c1 = clientRepo.create({
      id: c1Id,
      client_number: 'CL-000001',
      type: ClientType.INDIVIDUAL,
      kyc_status: KycStatus.APPROVED,
      kyc_reviewed_by: officerId,
      kyc_reviewed_at: new Date('2026-02-15'),
      kyc_notes: null,
      branch_id: gomaBranchId,
      created_by: adminId,
    });
    await clientRepo.save(c1);

    await profileRepo.save(
      profileRepo.create({
        client_id: c1Id,
        first_name: 'Espérance',
        middle_name: 'Amani',
        last_name: 'Kahambu',
        date_of_birth: new Date('1992-06-18'),
        place_of_birth: 'Goma',
        province_of_origin: 'Nord-Kivu',
        gender: Gender.FEMALE,
        nationality: 'Congolaise',
        marital_status: MaritalStatus.MARRIED,
        profession: 'Commerçante',
        province: 'Nord-Kivu',
        municipality: 'Goma',
        neighborhood: 'Himbi',
        street: 'Avenue des Volcans',
        plot_number: '14',
        phone: '+243810000001',
        email: null,
        id_type: IdType.NATIONAL_ID,
        id_number: 'NK-NID-001234',
        matriculation_number: null,
        is_minor: false,
      }),
    );

    await clientDocRepo.save(
      clientDocRepo.create({
        id: randomUUID(),
        client_id: c1Id,
        document_type: ClientDocumentType.ID_DOCUMENT,
        file_name: 'esperance-id.jpg',
        file_url: 'uploads/clients/CL-000001/esperance-id.jpg',
        status: DocumentStatus.ACCEPTED,
        rejection_reason: null,
        uploaded_by: adminId,
        reviewed_by: officerId,
        reviewed_at: new Date('2026-02-15'),
      }),
    );

    await clientDocRepo.save(
      clientDocRepo.create({
        id: randomUUID(),
        client_id: c1Id,
        document_type: ClientDocumentType.PASSPORT_PHOTO,
        file_name: 'esperance-photo.jpg',
        file_url: 'uploads/clients/CL-000001/esperance-photo.jpg',
        status: DocumentStatus.ACCEPTED,
        rejection_reason: null,
        uploaded_by: adminId,
        reviewed_by: officerId,
        reviewed_at: new Date('2026-02-15'),
      }),
    );

    console.log(
      '  created client: CL-000001 Espérance Amani Kahambu (INDIVIDUAL, APPROVED)',
    );
  } else {
    console.log('  skip client: CL-000001 (already exists)');
  }

  // -------------------------------------------------------------------------
  // Client 2 — Gabriel Paluku Mastaki (adult man, KYC UNDER_REVIEW)
  // -------------------------------------------------------------------------
  if (!(await clientExists('CL-000002'))) {
    const c2Id = randomUUID();

    const c2 = clientRepo.create({
      id: c2Id,
      client_number: 'CL-000002',
      type: ClientType.INDIVIDUAL,
      kyc_status: KycStatus.UNDER_REVIEW,
      kyc_reviewed_by: null,
      kyc_reviewed_at: null,
      kyc_notes: null,
      branch_id: gomaBranchId,
      created_by: adminId,
    });
    await clientRepo.save(c2);

    await profileRepo.save(
      profileRepo.create({
        client_id: c2Id,
        first_name: 'Gabriel',
        middle_name: 'Paluku',
        last_name: 'Mastaki',
        date_of_birth: new Date('1988-11-03'),
        place_of_birth: 'Goma',
        province_of_origin: 'Nord-Kivu',
        gender: Gender.MALE,
        nationality: 'Congolais',
        marital_status: MaritalStatus.SINGLE,
        profession: 'Enseignant',
        province: 'Nord-Kivu',
        municipality: 'Goma',
        neighborhood: 'Katindo',
        street: 'Avenue Rutshuru',
        plot_number: '27B',
        phone: '+243820000002',
        email: null,
        id_type: IdType.NATIONAL_ID,
        id_number: 'NK-NID-005678',
        matriculation_number: null,
        is_minor: false,
      }),
    );

    await clientDocRepo.save(
      clientDocRepo.create({
        id: randomUUID(),
        client_id: c2Id,
        document_type: ClientDocumentType.ID_DOCUMENT,
        file_name: 'gabriel-id.jpg',
        file_url: 'uploads/clients/CL-000002/gabriel-id.jpg',
        status: DocumentStatus.PENDING,
        rejection_reason: null,
        uploaded_by: adminId,
        reviewed_by: null,
        reviewed_at: null,
      }),
    );

    console.log(
      '  created client: CL-000002 Gabriel Paluku Mastaki (INDIVIDUAL, UNDER_REVIEW)',
    );
  } else {
    console.log('  skip client: CL-000002 (already exists)');
  }

  // -------------------------------------------------------------------------
  // Client 3 — Furaha Vivalya (minor, KYC PENDING) + guardian Riziki Vivalya
  // -------------------------------------------------------------------------
  if (!(await clientExists('CL-000003'))) {
    const c3Id = randomUUID();

    const c3 = clientRepo.create({
      id: c3Id,
      client_number: 'CL-000003',
      type: ClientType.INDIVIDUAL,
      kyc_status: KycStatus.PENDING,
      kyc_reviewed_by: null,
      kyc_reviewed_at: null,
      kyc_notes: null,
      branch_id: gomaBranchId,
      created_by: adminId,
    });
    await clientRepo.save(c3);

    await profileRepo.save(
      profileRepo.create({
        client_id: c3Id,
        first_name: 'Furaha',
        middle_name: null,
        last_name: 'Vivalya',
        date_of_birth: new Date('2013-04-22'),
        place_of_birth: 'Butembo',
        province_of_origin: 'Nord-Kivu',
        gender: Gender.FEMALE,
        nationality: 'Congolaise',
        marital_status: MaritalStatus.SINGLE,
        profession: 'Élève',
        province: 'Nord-Kivu',
        municipality: 'Butembo',
        neighborhood: 'Kimemi',
        street: 'Avenue de la Paix',
        plot_number: '5',
        phone: '+243830000003',
        email: null,
        id_type: IdType.NATIONAL_ID,
        id_number: 'NK-NID-MINOR001',
        matriculation_number: null,
        is_minor: true,
      }),
    );

    const guardian = guardianRepo.create({
      client_id: c3Id,
      first_name: 'Riziki',
      middle_name: 'Vivalya',
      last_name: 'Kasereka',
    });
    await guardianRepo.save(guardian);

    await guardianDocRepo.save(
      guardianDocRepo.create({
        id: randomUUID(),
        guardian_id: guardian.guardian_id,
        document_type: GuardianDocumentType.ID_DOCUMENT,
        file_name: 'riziki-id.jpg',
        file_url: 'uploads/guardians/riziki-id.jpg',
        status: DocumentStatus.PENDING,
        rejection_reason: null,
        uploaded_by: adminId,
        reviewed_by: null,
        reviewed_at: null,
      }),
    );

    console.log(
      '  created client: CL-000003 Furaha Vivalya (minor, PENDING) + guardian Riziki Vivalya Kasereka',
    );
  } else {
    console.log('  skip client: CL-000003 (already exists)');
  }

  // -------------------------------------------------------------------------
  // Client 4 — Coopérative Agricole Virunga SARL (ORGANIZATION, PENDING)
  // -------------------------------------------------------------------------
  if (!(await clientExists('CL-000004'))) {
    const c4Id = randomUUID();

    const c4 = clientRepo.create({
      id: c4Id,
      client_number: 'CL-000004',
      type: ClientType.ORGANIZATION,
      kyc_status: KycStatus.PENDING,
      kyc_reviewed_by: null,
      kyc_reviewed_at: null,
      kyc_notes: null,
      branch_id: gomaBranchId,
      created_by: adminId,
    });
    await clientRepo.save(c4);

    await orgRepo.save(
      orgRepo.create({
        client_id: c4Id,
        organization_type: OrganizationType.COMPANY,
        organization_type_other: null,
        organization_name: 'Coopérative Agricole Virunga SARL',
      }),
    );

    // Representative 1 — Directeur Général
    await repRepo.save(
      repRepo.create({
        client_id: c4Id,
        first_name: 'Célestin',
        middle_name: 'Sivulyangwa',
        last_name: 'Mbavumoja',
        gender: Gender.MALE,
        date_of_birth: new Date('1975-09-10'),
        place_of_birth: 'Goma',
        province_of_origin: 'Nord-Kivu',
        marital_status: MaritalStatus.MARRIED,
        profession: 'Agronome',
        id_type: IdType.PASSPORT,
        id_number: 'CD-PP-NK00123',
        province: 'Nord-Kivu',
        municipality: 'Goma',
        neighborhood: 'Ndosho',
        street: 'Avenue du Lac',
        plot_number: '3',
        phone: '+243840000041',
        email: 'celestin.mbavumoja@virunga-coop.cd',
        signatory_type: SignatoryType.MANDATORY,
        role: 'Directeur Général',
        created_by: adminId,
        updated_by: null,
      }),
    );

    // Representative 2 — Directrice Financière
    await repRepo.save(
      repRepo.create({
        client_id: c4Id,
        first_name: 'Solange',
        middle_name: 'Mapendo',
        last_name: 'Kageuka',
        gender: Gender.FEMALE,
        date_of_birth: new Date('1982-03-25'),
        place_of_birth: 'Butembo',
        province_of_origin: 'Nord-Kivu',
        marital_status: MaritalStatus.MARRIED,
        profession: 'Comptable',
        id_type: IdType.NATIONAL_ID,
        id_number: 'NK-NID-REP002',
        province: 'Nord-Kivu',
        municipality: 'Goma',
        neighborhood: 'Birere',
        street: 'Avenue Nyiragongo',
        plot_number: '11',
        phone: '+243840000042',
        email: 'solange.kageuka@virunga-coop.cd',
        signatory_type: SignatoryType.MANDATORY,
        role: 'Directrice Financière',
        created_by: adminId,
        updated_by: null,
      }),
    );

    await clientDocRepo.save(
      clientDocRepo.create({
        id: randomUUID(),
        client_id: c4Id,
        document_type: ClientDocumentType.REGISTRATION_DOC,
        file_name: 'virunga-coop-statuts.pdf',
        file_url: 'uploads/clients/CL-000004/virunga-coop-statuts.pdf',
        status: DocumentStatus.PENDING,
        rejection_reason: null,
        uploaded_by: adminId,
        reviewed_by: null,
        reviewed_at: null,
      }),
    );

    console.log(
      '  created client: CL-000004 Coopérative Agricole Virunga SARL (ORGANIZATION, PENDING)',
    );
  } else {
    console.log('  skip client: CL-000004 (already exists)');
  }

  // -------------------------------------------------------------------------
  // Accounts
  // -------------------------------------------------------------------------
  const accountRepo = ds.getRepository(AccountEntity);
  const seqRepo = ds.getRepository(AccountSequenceEntity);

  const c1 = await clientRepo.findOne({ where: { client_number: 'CL-000001' } });
  const c2 = await clientRepo.findOne({ where: { client_number: 'CL-000002' } });
  const c4 = await clientRepo.findOne({ where: { client_number: 'CL-000004' } });

  async function accountExists(num: string) {
    return !!(await accountRepo.findOne({ where: { account_number: num } }));
  }

  // CL-000001 — SAVINGS, seq 1
  const acc1Number = AccountRepository.formatSavingsNumber(1);
  if (c1 && !(await accountExists(acc1Number))) {
    await accountRepo.save(
      accountRepo.create({
        id: randomUUID(),
        account_number: acc1Number,
        client_id: c1.id,
        branch_id: gomaBranchId,
        account_type: AccountType.SAVINGS,
        currency: AccountCurrency.USD,
        status: AccountStatus.ACTIVE,
        balance: '500',
        opened_by: adminId,
      }),
    );
    console.log(`  created account: ${acc1Number} (CL-000001 SAVINGS ACTIVE $500)`);
  } else {
    console.log(`  skip account: ${acc1Number} (already exists or client missing)`);
  }

  // CL-000001 — CHECKING, seq 1
  const acc2Number = AccountRepository.formatCadecoNumber(1, AccountType.CHECKING, AccountCurrency.USD);
  if (c1 && !(await accountExists(acc2Number))) {
    await accountRepo.save(
      accountRepo.create({
        id: randomUUID(),
        account_number: acc2Number,
        client_id: c1.id,
        branch_id: gomaBranchId,
        account_type: AccountType.CHECKING,
        currency: AccountCurrency.USD,
        status: AccountStatus.ACTIVE,
        balance: '0',
        opened_by: adminId,
      }),
    );
    console.log(`  created account: ${acc2Number} (CL-000001 CHECKING ACTIVE $0)`);
  } else {
    console.log(`  skip account: ${acc2Number} (already exists or client missing)`);
  }

  // CL-000002 — SAVINGS, seq 2
  const acc3Number = AccountRepository.formatSavingsNumber(2);
  if (c2 && !(await accountExists(acc3Number))) {
    await accountRepo.save(
      accountRepo.create({
        id: randomUUID(),
        account_number: acc3Number,
        client_id: c2.id,
        branch_id: gomaBranchId,
        account_type: AccountType.SAVINGS,
        currency: AccountCurrency.USD,
        status: AccountStatus.PENDING,
        balance: '0',
        opened_by: adminId,
      }),
    );
    console.log(`  created account: ${acc3Number} (CL-000002 SAVINGS PENDING $0)`);
  } else {
    console.log(`  skip account: ${acc3Number} (already exists or client missing)`);
  }

  // CL-000004 — BUSINESS_CURRENT, seq 2
  const acc4Number = AccountRepository.formatCadecoNumber(2, AccountType.BUSINESS_CURRENT, AccountCurrency.USD);
  if (c4 && !(await accountExists(acc4Number))) {
    await accountRepo.save(
      accountRepo.create({
        id: randomUUID(),
        account_number: acc4Number,
        client_id: c4.id,
        branch_id: gomaBranchId,
        account_type: AccountType.BUSINESS_CURRENT,
        currency: AccountCurrency.USD,
        status: AccountStatus.PENDING,
        balance: '0',
        opened_by: adminId,
      }),
    );
    console.log(`  created account: ${acc4Number} (CL-000004 BUSINESS_CURRENT PENDING $0)`);
  } else {
    console.log(`  skip account: ${acc4Number} (already exists or client missing)`);
  }

  // Account sequences
  const sequences: Array<{ type: AccountType; lastSeq: number }> = [
    { type: AccountType.SAVINGS, lastSeq: 2 },
    { type: AccountType.CHECKING, lastSeq: 1 },
    { type: AccountType.BUSINESS_CURRENT, lastSeq: 2 },
  ];
  for (const { type, lastSeq } of sequences) {
    const existing = await seqRepo.findOne({ where: { type } });
    if (!existing) {
      await seqRepo.save(seqRepo.create({ type, last_seq: lastSeq }));
      console.log(`  created sequence: ${type} last_seq=${lastSeq}`);
    } else {
      console.log(`  skip sequence: ${type} (already exists)`);
    }
  }

  await ds.destroy();
  console.log('\nSeed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
