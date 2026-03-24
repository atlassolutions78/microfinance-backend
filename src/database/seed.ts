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
 *   - Hierarchical chart of accounts (5 root categories, 42 accounts total)
 *   - Full simulation journal: vault opening, teller floats, deposits,
 *     withdrawals, loan disbursements, loan repayments, late repayment
 *     with penalty, expenses, and a reversal scenario
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
import {
  AccountEntity,
  AccountSequenceEntity,
} from 'src/accounts/account.entity';
import { AccountRepository } from 'src/accounts/account.repository';
import {
  AccountType,
  AccountCurrency,
  AccountStatus,
} from 'src/accounts/account.enums';
import {
  ChartOfAccountsEntity,
  JournalEntryEntity,
  JournalLineEntity,
} from 'src/accounting/accounting.entity';
import {
  ChartAccountType,
  JournalEntryStatus,
} from 'src/accounting/accounting.enums';

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
    ChartOfAccountsEntity,
    JournalEntryEntity,
    JournalLineEntity,
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
  const tellerId = createdUsers[UserRole.TELLER].id;
  const managerId = createdUsers[UserRole.BRANCH_MANAGER].id;

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
  // Client 2 — Gabriel Paluku Mastaki (adult man, KYC APPROVED)
  // -------------------------------------------------------------------------
  if (!(await clientExists('CL-000002'))) {
    const c2Id = randomUUID();

    const c2 = clientRepo.create({
      id: c2Id,
      client_number: 'CL-000002',
      type: ClientType.INDIVIDUAL,
      kyc_status: KycStatus.APPROVED,
      kyc_reviewed_by: officerId,
      kyc_reviewed_at: new Date('2026-02-20'),
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
        status: DocumentStatus.ACCEPTED,
        rejection_reason: null,
        uploaded_by: adminId,
        reviewed_by: officerId,
        reviewed_at: new Date('2026-02-20'),
      }),
    );

    console.log(
      '  created client: CL-000002 Gabriel Paluku Mastaki (INDIVIDUAL, APPROVED)',
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
  // Client 4 — Coopérative Agricole Virunga SARL (ORGANIZATION, APPROVED)
  // -------------------------------------------------------------------------
  if (!(await clientExists('CL-000004'))) {
    const c4Id = randomUUID();

    const c4 = clientRepo.create({
      id: c4Id,
      client_number: 'CL-000004',
      type: ClientType.ORGANIZATION,
      kyc_status: KycStatus.APPROVED,
      kyc_reviewed_by: officerId,
      kyc_reviewed_at: new Date('2026-03-01'),
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
        status: DocumentStatus.ACCEPTED,
        rejection_reason: null,
        uploaded_by: adminId,
        reviewed_by: officerId,
        reviewed_at: new Date('2026-03-01'),
      }),
    );

    console.log(
      '  created client: CL-000004 Coopérative Agricole Virunga SARL (ORGANIZATION, APPROVED)',
    );
  } else {
    console.log('  skip client: CL-000004 (already exists)');
  }

  // -------------------------------------------------------------------------
  // Accounts
  // -------------------------------------------------------------------------
  console.log(
    '\n── Accounts ────────────────────────────────────────────────────────────────',
  );

  const accountRepo = ds.getRepository(AccountEntity);
  const seqRepo = ds.getRepository(AccountSequenceEntity);

  const c1 = await clientRepo.findOne({
    where: { client_number: 'CL-000001' },
  });
  const c2 = await clientRepo.findOne({
    where: { client_number: 'CL-000002' },
  });
  const c4 = await clientRepo.findOne({
    where: { client_number: 'CL-000004' },
  });

  async function accountExists(num: string) {
    return !!(await accountRepo.findOne({ where: { account_number: num } }));
  }

  // CL-000001 — SAVINGS USD (seq 1)
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
        balance: '0',
        opened_by: adminId,
      }),
    );
    console.log(
      `  created account: ${acc1Number} (CL-000001 SAVINGS USD ACTIVE)`,
    );
  } else {
    console.log(
      `  skip account: ${acc1Number} (already exists or client missing)`,
    );
  }

  // CL-000001 — CHECKING USD (seq 1)
  const acc2Number = AccountRepository.formatCadecoNumber(
    1,
    AccountType.CHECKING,
    AccountCurrency.USD,
  );
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
    console.log(
      `  created account: ${acc2Number} (CL-000001 CHECKING USD ACTIVE)`,
    );
  } else {
    console.log(
      `  skip account: ${acc2Number} (already exists or client missing)`,
    );
  }

  // CL-000002 — SAVINGS FC (seq 2) — used for FC simulation
  const acc3Number = AccountRepository.formatSavingsNumber(2);
  if (c2 && !(await accountExists(acc3Number))) {
    await accountRepo.save(
      accountRepo.create({
        id: randomUUID(),
        account_number: acc3Number,
        client_id: c2.id,
        branch_id: gomaBranchId,
        account_type: AccountType.SAVINGS,
        currency: AccountCurrency.FC,
        status: AccountStatus.ACTIVE,
        balance: '0',
        opened_by: adminId,
      }),
    );
    console.log(
      `  created account: ${acc3Number} (CL-000002 SAVINGS FC ACTIVE)`,
    );
  } else {
    console.log(
      `  skip account: ${acc3Number} (already exists or client missing)`,
    );
  }

  // CL-000004 — BUSINESS_CURRENT USD (seq 2)
  const acc4Number = AccountRepository.formatCadecoNumber(
    2,
    AccountType.BUSINESS_CURRENT,
    AccountCurrency.USD,
  );
  if (c4 && !(await accountExists(acc4Number))) {
    await accountRepo.save(
      accountRepo.create({
        id: randomUUID(),
        account_number: acc4Number,
        client_id: c4.id,
        branch_id: gomaBranchId,
        account_type: AccountType.BUSINESS_CURRENT,
        currency: AccountCurrency.USD,
        status: AccountStatus.ACTIVE,
        balance: '0',
        opened_by: adminId,
      }),
    );
    console.log(
      `  created account: ${acc4Number} (CL-000004 BUSINESS_CURRENT USD ACTIVE)`,
    );
  } else {
    console.log(
      `  skip account: ${acc4Number} (already exists or client missing)`,
    );
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
      console.log(
        `  skip sequence: ${type} (already exists, last_seq=${existing.last_seq})`,
      );
    }
  }

  // Resolve account UUIDs for use in journal lines
  const acc1Entity = await accountRepo.findOne({
    where: { account_number: acc1Number },
  });
  const acc3Entity = await accountRepo.findOne({
    where: { account_number: acc3Number },
  });
  const acc4Entity = await accountRepo.findOne({
    where: { account_number: acc4Number },
  });

  // -------------------------------------------------------------------------
  // Chart of Accounts — hierarchical, institution-wide
  // -------------------------------------------------------------------------
  console.log(
    '\n── Chart of accounts ──────────────────────────────────────────────────────',
  );

  const coaRepo = ds.getRepository(ChartOfAccountsEntity);

  type CoaRow = {
    code: string;
    name: string;
    type: ChartAccountType;
    parentCode: string | null;
  };

  const coaDefinition: CoaRow[] = [
    // ── Level 1 — roots ──────────────────────────────────────────────────────
    {
      code: '1000',
      name: 'ASSETS',
      type: ChartAccountType.ASSET,
      parentCode: null,
    },
    {
      code: '2000',
      name: 'LIABILITIES',
      type: ChartAccountType.LIABILITY,
      parentCode: null,
    },
    {
      code: '3000',
      name: 'EQUITY',
      type: ChartAccountType.EQUITY,
      parentCode: null,
    },
    {
      code: '4000',
      name: 'INCOME',
      type: ChartAccountType.INCOME,
      parentCode: null,
    },
    {
      code: '5000',
      name: 'EXPENSES',
      type: ChartAccountType.EXPENSE,
      parentCode: null,
    },

    // ── Level 2 — groups ─────────────────────────────────────────────────────
    {
      code: '1100',
      name: 'Cash & Vault',
      type: ChartAccountType.ASSET,
      parentCode: '1000',
    },
    {
      code: '1200',
      name: 'Loans Receivable',
      type: ChartAccountType.ASSET,
      parentCode: '1000',
    },
    {
      code: '2100',
      name: 'Customer Savings',
      type: ChartAccountType.LIABILITY,
      parentCode: '2000',
    },
    {
      code: '2200',
      name: 'Customer Checking',
      type: ChartAccountType.LIABILITY,
      parentCode: '2000',
    },
    {
      code: '2300',
      name: 'Customer Business',
      type: ChartAccountType.LIABILITY,
      parentCode: '2000',
    },
    {
      code: '3100',
      name: 'Share Capital',
      type: ChartAccountType.EQUITY,
      parentCode: '3000',
    },
    {
      code: '3200',
      name: 'Retained Earnings',
      type: ChartAccountType.EQUITY,
      parentCode: '3000',
    },
    {
      code: '4100',
      name: 'Interest Income',
      type: ChartAccountType.INCOME,
      parentCode: '4000',
    },
    {
      code: '4200',
      name: 'Fee Income',
      type: ChartAccountType.INCOME,
      parentCode: '4000',
    },
    {
      code: '4300',
      name: 'Penalty Income',
      type: ChartAccountType.INCOME,
      parentCode: '4000',
    },
    {
      code: '5100',
      name: 'Salaries & Wages',
      type: ChartAccountType.EXPENSE,
      parentCode: '5000',
    },
    {
      code: '5200',
      name: 'Rent',
      type: ChartAccountType.EXPENSE,
      parentCode: '5000',
    },
    {
      code: '5300',
      name: 'Utilities',
      type: ChartAccountType.EXPENSE,
      parentCode: '5000',
    },

    // ── Level 3 — leaf posting accounts ──────────────────────────────────────
    {
      code: '1101',
      name: 'Teller 1 - Cash USD',
      type: ChartAccountType.ASSET,
      parentCode: '1100',
    },
    {
      code: '1102',
      name: 'Teller 1 - Cash FC',
      type: ChartAccountType.ASSET,
      parentCode: '1100',
    },
    {
      code: '1103',
      name: 'Teller 2 - Cash USD',
      type: ChartAccountType.ASSET,
      parentCode: '1100',
    },
    {
      code: '1104',
      name: 'Teller 2 - Cash FC',
      type: ChartAccountType.ASSET,
      parentCode: '1100',
    },
    {
      code: '1105',
      name: 'Vault - USD',
      type: ChartAccountType.ASSET,
      parentCode: '1100',
    },
    {
      code: '1106',
      name: 'Vault - FC',
      type: ChartAccountType.ASSET,
      parentCode: '1100',
    },
    {
      code: '1201',
      name: 'Standard Loans Receivable - USD',
      type: ChartAccountType.ASSET,
      parentCode: '1200',
    },
    {
      code: '1202',
      name: 'Standard Loans Receivable - FC',
      type: ChartAccountType.ASSET,
      parentCode: '1200',
    },
    {
      code: '1203',
      name: 'Salary Advance Receivable - USD',
      type: ChartAccountType.ASSET,
      parentCode: '1200',
    },
    {
      code: '1204',
      name: 'Salary Advance Receivable - FC',
      type: ChartAccountType.ASSET,
      parentCode: '1200',
    },
    {
      code: '1205',
      name: 'Overdraft Receivable - USD',
      type: ChartAccountType.ASSET,
      parentCode: '1200',
    },
    {
      code: '1206',
      name: 'Overdraft Receivable - FC',
      type: ChartAccountType.ASSET,
      parentCode: '1200',
    },
    {
      code: '2101',
      name: 'Customer Savings - USD',
      type: ChartAccountType.LIABILITY,
      parentCode: '2100',
    },
    {
      code: '2102',
      name: 'Customer Savings - FC',
      type: ChartAccountType.LIABILITY,
      parentCode: '2100',
    },
    {
      code: '2201',
      name: 'Customer Checking - USD',
      type: ChartAccountType.LIABILITY,
      parentCode: '2200',
    },
    {
      code: '2202',
      name: 'Customer Checking - FC',
      type: ChartAccountType.LIABILITY,
      parentCode: '2200',
    },
    {
      code: '2301',
      name: 'Customer Business - USD',
      type: ChartAccountType.LIABILITY,
      parentCode: '2300',
    },
    {
      code: '2302',
      name: 'Customer Business - FC',
      type: ChartAccountType.LIABILITY,
      parentCode: '2300',
    },
    {
      code: '4101',
      name: 'Interest Income - USD',
      type: ChartAccountType.INCOME,
      parentCode: '4100',
    },
    {
      code: '4102',
      name: 'Interest Income - FC',
      type: ChartAccountType.INCOME,
      parentCode: '4100',
    },
    {
      code: '4201',
      name: 'Fee Income - USD',
      type: ChartAccountType.INCOME,
      parentCode: '4200',
    },
    {
      code: '4202',
      name: 'Fee Income - FC',
      type: ChartAccountType.INCOME,
      parentCode: '4200',
    },
    {
      code: '4301',
      name: 'Penalty Income - USD',
      type: ChartAccountType.INCOME,
      parentCode: '4300',
    },
    {
      code: '4302',
      name: 'Penalty Income - FC',
      type: ChartAccountType.INCOME,
      parentCode: '4300',
    },
  ];

  // Insert in definition order — parents always appear before their children
  const coaIds = new Map<string, string>();

  for (const row of coaDefinition) {
    const existing = await coaRepo.findOne({ where: { code: row.code } });
    if (existing) {
      coaIds.set(row.code, existing.id);
      console.log(`  skip COA: ${row.code} ${row.name}`);
      continue;
    }
    const parentId = row.parentCode
      ? (coaIds.get(row.parentCode) ?? null)
      : null;
    const entity = coaRepo.create({
      id: randomUUID(),
      code: row.code,
      name: row.name,
      type: row.type,
      parent_id: parentId,
      is_active: true,
      created_by: adminId,
    });
    await coaRepo.save(entity);
    coaIds.set(row.code, entity.id);
    console.log(`  created COA: ${row.code}  ${row.name}`);
  }

  // -------------------------------------------------------------------------
  // Journal entries — simulation
  //
  // Scenarios covered:
  //   JE-2026-001  Vault opening balance — USD
  //   JE-2026-002  Vault opening balance — FC
  //   JE-2026-003  Vault → Teller 1 daily float — USD
  //   JE-2026-004  Vault → Teller 1 daily float — FC
  //   JE-2026-005  Vault → Teller 2 daily float — USD
  //   JE-2026-006  Vault → Teller 2 daily float — FC
  //   JE-2026-007  Espérance deposits $500 USD (Teller 1)
  //   JE-2026-008  Gabriel deposits 200,000 FC (Teller 2)
  //   JE-2026-009  Espérance withdraws $200 USD (Teller 1)
  //   JE-2026-010  Loan disbursement — Espérance $1,000 USD → savings
  //   JE-2026-011  Loan withdrawal — Espérance takes $1,000 cash (Teller 1)
  //   JE-2026-012  Loan disbursement — Coopérative $2,000 USD → business
  //   JE-2026-013  Loan withdrawal — Coopérative takes $2,000 cash (Teller 2)
  //   JE-2026-014  Repayment deposit — Espérance $150 USD (Teller 1)
  //   JE-2026-015  Repayment deduction — Espérance $120 principal + $30 interest
  //   JE-2026-016  Repayment deposit — Coopérative $300 USD (Teller 2)
  //   JE-2026-017  Repayment deduction — Coopérative $250 principal + $50 interest
  //   JE-2026-018  Late repayment deposit — Espérance $100 USD (Teller 1)
  //   JE-2026-019  Late repayment deduction — $75 principal + $5 interest + $20 penalty
  //   JE-2026-020  Salary expense — $1,500 USD from vault
  //   JE-2026-021  Rent expense — $500 USD from vault
  //   JE-2026-022  WRONG deposit — Espérance $300 USD (later reversed)
  //   JE-2026-023  REVERSAL of JE-2026-022
  // -------------------------------------------------------------------------
  console.log(
    '\n── Journal entries (simulation) ────────────────────────────────────────────',
  );

  const jeRepo = ds.getRepository(JournalEntryEntity);
  const jlRepo = ds.getRepository(JournalLineEntity);

  type LineSpec = {
    code: string;
    clientAccountId?: string;
    debit: number;
    credit: number;
    currency: string;
    description?: string;
  };

  async function postEntry(
    reference: string,
    description: string,
    lines: LineSpec[],
    opts?: {
      status?: JournalEntryStatus;
      reversalOf?: string;
      createdBy?: string;
      postedBy?: string;
    },
  ): Promise<JournalEntryEntity> {
    const existing = await jeRepo.findOne({ where: { reference } });
    if (existing) {
      console.log(`  skip JE: ${reference} (already exists)`);
      return existing;
    }

    const entry = jeRepo.create({
      id: randomUUID(),
      reference,
      branch_id: gomaBranchId,
      created_by: opts?.createdBy ?? tellerId,
      description,
      status: opts?.status ?? JournalEntryStatus.POSTED,
      reversal_of: opts?.reversalOf ?? null,
      posted_by: opts?.postedBy ?? managerId,
      posted_at: new Date(),
      transaction_id: null,
    });
    const savedEntry = await jeRepo.save(entry);

    for (const line of lines) {
      const accountId = coaIds.get(line.code);
      if (!accountId) throw new Error(`COA code not found: ${line.code}`);
      await jlRepo.save(
        jlRepo.create({
          id: randomUUID(),
          journal_entry_id: savedEntry.id,
          account_id: accountId,
          client_account_id: line.clientAccountId ?? null,
          debit: String(line.debit),
          credit: String(line.credit),
          currency: line.currency,
          description: line.description ?? null,
        }),
      );
    }

    console.log(`  created JE: ${reference} — ${description}`);
    return savedEntry;
  }

  // ── JE-2026-001 — Vault opening balance USD ─────────────────────────────────
  await postEntry(
    'JE-2026-001',
    'Opening balance — Vault USD',
    [
      {
        code: '1105',
        debit: 10000,
        credit: 0,
        currency: 'USD',
        description: 'Vault USD opening',
      },
      {
        code: '3200',
        debit: 0,
        credit: 10000,
        currency: 'USD',
        description: 'Retained earnings USD',
      },
    ],
    { createdBy: adminId, postedBy: adminId },
  );

  // ── JE-2026-002 — Vault opening balance FC ─────────────────────────────────
  await postEntry(
    'JE-2026-002',
    'Opening balance — Vault FC',
    [
      {
        code: '1106',
        debit: 5000000,
        credit: 0,
        currency: 'FC',
        description: 'Vault FC opening',
      },
      {
        code: '3200',
        debit: 0,
        credit: 5000000,
        currency: 'FC',
        description: 'Retained earnings FC',
      },
    ],
    { createdBy: adminId, postedBy: adminId },
  );

  // ── JE-2026-003 — Vault → Teller 1 float USD ───────────────────────────────
  await postEntry(
    'JE-2026-003',
    'Daily float — Vault to Teller 1 USD',
    [
      {
        code: '1101',
        debit: 2000,
        credit: 0,
        currency: 'USD',
        description: 'Teller 1 USD drawer',
      },
      {
        code: '1105',
        debit: 0,
        credit: 2000,
        currency: 'USD',
        description: 'Vault USD outflow',
      },
    ],
    { createdBy: adminId, postedBy: managerId },
  );

  // ── JE-2026-004 — Vault → Teller 1 float FC ────────────────────────────────
  await postEntry(
    'JE-2026-004',
    'Daily float — Vault to Teller 1 FC',
    [
      {
        code: '1102',
        debit: 1000000,
        credit: 0,
        currency: 'FC',
        description: 'Teller 1 FC drawer',
      },
      {
        code: '1106',
        debit: 0,
        credit: 1000000,
        currency: 'FC',
        description: 'Vault FC outflow',
      },
    ],
    { createdBy: adminId, postedBy: managerId },
  );

  // ── JE-2026-005 — Vault → Teller 2 float USD ───────────────────────────────
  await postEntry(
    'JE-2026-005',
    'Daily float — Vault to Teller 2 USD',
    [
      {
        code: '1103',
        debit: 2000,
        credit: 0,
        currency: 'USD',
        description: 'Teller 2 USD drawer',
      },
      {
        code: '1105',
        debit: 0,
        credit: 2000,
        currency: 'USD',
        description: 'Vault USD outflow',
      },
    ],
    { createdBy: adminId, postedBy: managerId },
  );

  // ── JE-2026-006 — Vault → Teller 2 float FC ────────────────────────────────
  await postEntry(
    'JE-2026-006',
    'Daily float — Vault to Teller 2 FC',
    [
      {
        code: '1104',
        debit: 1000000,
        credit: 0,
        currency: 'FC',
        description: 'Teller 2 FC drawer',
      },
      {
        code: '1106',
        debit: 0,
        credit: 1000000,
        currency: 'FC',
        description: 'Vault FC outflow',
      },
    ],
    { createdBy: adminId, postedBy: managerId },
  );

  // ── JE-2026-007 — Espérance deposits $500 USD ──────────────────────────────
  await postEntry('JE-2026-007', 'Deposit — Espérance Kahambu $500 USD', [
    {
      code: '1101',
      debit: 500,
      credit: 0,
      currency: 'USD',
      description: 'Cash received at Teller 1',
    },
    {
      code: '2101',
      debit: 0,
      credit: 500,
      currency: 'USD',
      description: 'Credit client savings',
      clientAccountId: acc1Entity?.id,
    },
  ]);

  // ── JE-2026-008 — Gabriel deposits 200,000 FC ──────────────────────────────
  await postEntry('JE-2026-008', 'Deposit — Gabriel Mastaki 200,000 FC', [
    {
      code: '1104',
      debit: 200000,
      credit: 0,
      currency: 'FC',
      description: 'Cash received at Teller 2',
    },
    {
      code: '2102',
      debit: 0,
      credit: 200000,
      currency: 'FC',
      description: 'Credit client savings FC',
      clientAccountId: acc3Entity?.id,
    },
  ]);

  // ── JE-2026-009 — Espérance withdraws $200 USD ─────────────────────────────
  await postEntry('JE-2026-009', 'Withdrawal — Espérance Kahambu $200 USD', [
    {
      code: '2101',
      debit: 200,
      credit: 0,
      currency: 'USD',
      description: 'Debit client savings',
      clientAccountId: acc1Entity?.id,
    },
    {
      code: '1101',
      debit: 0,
      credit: 200,
      currency: 'USD',
      description: 'Cash paid at Teller 1',
    },
  ]);

  // ── JE-2026-010 — Loan disbursement Espérance $1,000 → savings ─────────────
  await postEntry(
    'JE-2026-010',
    'Loan disbursement — Espérance Standard Loan $1,000 USD credited to savings',
    [
      {
        code: '1201',
        debit: 1000,
        credit: 0,
        currency: 'USD',
        description: 'Loan receivable created',
      },
      {
        code: '2101',
        debit: 0,
        credit: 1000,
        currency: 'USD',
        description: 'Credit client savings',
        clientAccountId: acc1Entity?.id,
      },
    ],
    { createdBy: officerId, postedBy: managerId },
  );

  // ── JE-2026-011 — Espérance withdraws loan cash ────────────────────────────
  await postEntry(
    'JE-2026-011',
    'Loan withdrawal — Espérance takes $1,000 cash (Teller 1)',
    [
      {
        code: '2101',
        debit: 1000,
        credit: 0,
        currency: 'USD',
        description: 'Debit client savings',
        clientAccountId: acc1Entity?.id,
      },
      {
        code: '1101',
        debit: 0,
        credit: 1000,
        currency: 'USD',
        description: 'Cash paid at Teller 1',
      },
    ],
  );

  // ── JE-2026-012 — Loan disbursement Coopérative $2,000 → business ──────────
  await postEntry(
    'JE-2026-012',
    'Loan disbursement — Coopérative Virunga Standard Loan $2,000 USD credited to business account',
    [
      {
        code: '1201',
        debit: 2000,
        credit: 0,
        currency: 'USD',
        description: 'Loan receivable created',
      },
      {
        code: '2301',
        debit: 0,
        credit: 2000,
        currency: 'USD',
        description: 'Credit client business account',
        clientAccountId: acc4Entity?.id,
      },
    ],
    { createdBy: officerId, postedBy: managerId },
  );

  // ── JE-2026-013 — Coopérative withdraws loan cash ──────────────────────────
  await postEntry(
    'JE-2026-013',
    'Loan withdrawal — Coopérative Virunga takes $2,000 cash (Teller 2)',
    [
      {
        code: '2301',
        debit: 2000,
        credit: 0,
        currency: 'USD',
        description: 'Debit client business account',
        clientAccountId: acc4Entity?.id,
      },
      {
        code: '1103',
        debit: 0,
        credit: 2000,
        currency: 'USD',
        description: 'Cash paid at Teller 2',
      },
    ],
  );

  // ── JE-2026-014 — Espérance repayment deposit $150 USD ─────────────────────
  await postEntry(
    'JE-2026-014',
    'Repayment deposit — Espérance $150 USD (Teller 1)',
    [
      {
        code: '1101',
        debit: 150,
        credit: 0,
        currency: 'USD',
        description: 'Cash received at Teller 1',
      },
      {
        code: '2101',
        debit: 0,
        credit: 150,
        currency: 'USD',
        description: 'Credit client savings',
        clientAccountId: acc1Entity?.id,
      },
    ],
  );

  // ── JE-2026-015 — Espérance repayment deduction ($120 principal + $30 interest)
  await postEntry(
    'JE-2026-015',
    'Repayment — Espérance $120 principal + $30 interest',
    [
      {
        code: '2101',
        debit: 150,
        credit: 0,
        currency: 'USD',
        description: 'Debit client savings',
        clientAccountId: acc1Entity?.id,
      },
      {
        code: '1201',
        debit: 0,
        credit: 120,
        currency: 'USD',
        description: 'Reduce loan receivable (principal)',
      },
      {
        code: '4101',
        debit: 0,
        credit: 30,
        currency: 'USD',
        description: 'Interest income recognised',
      },
    ],
  );

  // ── JE-2026-016 — Coopérative repayment deposit $300 USD ───────────────────
  await postEntry(
    'JE-2026-016',
    'Repayment deposit — Coopérative $300 USD (Teller 2)',
    [
      {
        code: '1103',
        debit: 300,
        credit: 0,
        currency: 'USD',
        description: 'Cash received at Teller 2',
      },
      {
        code: '2301',
        debit: 0,
        credit: 300,
        currency: 'USD',
        description: 'Credit client business account',
        clientAccountId: acc4Entity?.id,
      },
    ],
  );

  // ── JE-2026-017 — Coopérative repayment deduction ($250 principal + $50 interest)
  await postEntry(
    'JE-2026-017',
    'Repayment — Coopérative $250 principal + $50 interest',
    [
      {
        code: '2301',
        debit: 300,
        credit: 0,
        currency: 'USD',
        description: 'Debit client business account',
        clientAccountId: acc4Entity?.id,
      },
      {
        code: '1201',
        debit: 0,
        credit: 250,
        currency: 'USD',
        description: 'Reduce loan receivable (principal)',
      },
      {
        code: '4101',
        debit: 0,
        credit: 50,
        currency: 'USD',
        description: 'Interest income recognised',
      },
    ],
  );

  // ── JE-2026-018 — Late repayment deposit Espérance $100 USD ────────────────
  await postEntry(
    'JE-2026-018',
    'Late repayment deposit — Espérance $100 USD (Teller 1)',
    [
      {
        code: '1101',
        debit: 100,
        credit: 0,
        currency: 'USD',
        description: 'Cash received at Teller 1',
      },
      {
        code: '2101',
        debit: 0,
        credit: 100,
        currency: 'USD',
        description: 'Credit client savings',
        clientAccountId: acc1Entity?.id,
      },
    ],
  );

  // ── JE-2026-019 — Late repayment with penalty ($75 principal + $5 interest + $20 penalty)
  await postEntry(
    'JE-2026-019',
    'Late repayment — Espérance $75 principal + $5 interest + $20 penalty',
    [
      {
        code: '2101',
        debit: 100,
        credit: 0,
        currency: 'USD',
        description: 'Debit client savings',
        clientAccountId: acc1Entity?.id,
      },
      {
        code: '1201',
        debit: 0,
        credit: 75,
        currency: 'USD',
        description: 'Reduce loan receivable (principal)',
      },
      {
        code: '4101',
        debit: 0,
        credit: 5,
        currency: 'USD',
        description: 'Interest income recognised',
      },
      {
        code: '4301',
        debit: 0,
        credit: 20,
        currency: 'USD',
        description: 'Penalty income — late payment',
      },
    ],
  );

  // ── JE-2026-020 — Salary expense $1,500 USD ────────────────────────────────
  await postEntry(
    'JE-2026-020',
    'Salary payment — March 2026 staff payroll $1,500 USD',
    [
      {
        code: '5100',
        debit: 1500,
        credit: 0,
        currency: 'USD',
        description: 'Staff salaries March 2026',
      },
      {
        code: '1105',
        debit: 0,
        credit: 1500,
        currency: 'USD',
        description: 'Cash paid from vault',
      },
    ],
    { createdBy: managerId, postedBy: managerId },
  );

  // ── JE-2026-021 — Rent expense $500 USD ────────────────────────────────────
  await postEntry(
    'JE-2026-021',
    'Rent payment — March 2026 branch premises $500 USD',
    [
      {
        code: '5200',
        debit: 500,
        credit: 0,
        currency: 'USD',
        description: 'Branch rent March 2026',
      },
      {
        code: '1105',
        debit: 0,
        credit: 500,
        currency: 'USD',
        description: 'Cash paid from vault',
      },
    ],
    { createdBy: managerId, postedBy: managerId },
  );

  // ── JE-2026-022 — Wrong deposit (will be reversed) ─────────────────────────
  // Teller mistakenly posts an extra $300 deposit for Espérance.
  // The entry is posted, then the branch manager orders a reversal.
  const wrongEntry = await postEntry(
    'JE-2026-022',
    'INCORRECT deposit — Espérance $300 USD (entered in error)',
    [
      {
        code: '1101',
        debit: 300,
        credit: 0,
        currency: 'USD',
        description: 'Cash received — data entry error',
      },
      {
        code: '2101',
        debit: 0,
        credit: 300,
        currency: 'USD',
        description: 'Credit client savings — error',
        clientAccountId: acc1Entity?.id,
      },
    ],
  );

  // ── JE-2026-023 — Reversal of JE-2026-022 ──────────────────────────────────
  const existingReversal = await jeRepo.findOne({
    where: { reference: 'JE-2026-023' },
  });
  if (!existingReversal) {
    await postEntry(
      'JE-2026-023',
      'REVERSAL of JE-2026-022 — incorrect deposit corrected',
      [
        {
          code: '2101',
          debit: 300,
          credit: 0,
          currency: 'USD',
          description: 'Reversal — debit client savings',
          clientAccountId: acc1Entity?.id,
        },
        {
          code: '1101',
          debit: 0,
          credit: 300,
          currency: 'USD',
          description: 'Reversal — return cash to Teller 1',
        },
      ],
      { reversalOf: wrongEntry.id, createdBy: managerId, postedBy: managerId },
    );

    // Mark the original entry as REVERSED
    await jeRepo.update(wrongEntry.id, { status: JournalEntryStatus.REVERSED });
    console.log(`  marked JE-2026-022 as REVERSED`);
  } else {
    console.log(`  skip JE: JE-2026-023 (already exists)`);
  }

  // -------------------------------------------------------------------------

  await ds.destroy();
  console.log('\nSeed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
