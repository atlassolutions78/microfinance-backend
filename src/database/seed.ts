/**
 * Database seed script.
 *
 * Run with:
 *   pnpm run seed
 *
 * Creates:
 *   - 4 system users (one per role)
 *   - 3 individual clients (one minor with guardian)
 *   - 1 business client with 2 representatives
 *   - Sample documents metadata for each client
 */

import 'reflect-metadata';
import { config } from 'dotenv';
config();

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { ClientEntity, IndividualDetailsEntity, BusinessDetailsEntity, GuardianEntity, RepresentativeEntity } from 'src/clients/client.entity';
import { Gender, IdType, ClientType, ClientStatus, KycStatus, GuardianRelationship, SignaturePolicy } from 'src/clients/client.enums';
import { DocumentEntity } from 'src/documents/document.entity';
import { DocumentType, DocumentOwnerType } from 'src/documents/document.enums';
import { UserEntity } from 'src/users/user.entity';
import { UserRole } from 'src/users/user.enums';



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
    IndividualDetailsEntity,
    BusinessDetailsEntity,
    GuardianEntity,
    RepresentativeEntity,
    DocumentEntity,
  ],
  synchronize: false,
});

async function seed() {
  await ds.initialize();
  console.log('Connected to database.');

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  const userRepo = ds.getRepository(UserEntity);

  const users: Array<{ username: string; email: string; fullName: string; role: UserRole }> = [
    { username: 'admin',        email: 'admin@microfinance.local',        fullName: 'System Administrator', role: UserRole.ADMIN },
    { username: 'manager',      email: 'manager@microfinance.local',      fullName: 'Jane Manager',         role: UserRole.MANAGER },
    { username: 'loan_officer', email: 'loan.officer@microfinance.local', fullName: 'Bob Loan Officer',     role: UserRole.LOAN_OFFICER },
    { username: 'teller',       email: 'teller@microfinance.local',       fullName: 'Carol Teller',         role: UserRole.TELLER },
  ];

  const createdUsers: Record<string, UserEntity> = {};

  for (const u of users) {
    const existing = await userRepo.findOne({ where: { username: u.username } });
    if (existing) {
      console.log(`  skip user: ${u.username} (already exists)`);
      createdUsers[u.role] = existing;
      continue;
    }
    const entity = userRepo.create({
      id: randomUUID(),
      username: u.username,
      email: u.email,
      password_hash: await bcrypt.hash('Password123!', 12),
      full_name: u.fullName,
      role: u.role,
      is_active: true,
    });
    await userRepo.save(entity);
    createdUsers[u.role] = entity;
    console.log(`  created user: ${u.username} [${u.role}]  password: Password123!`);
  }

  const adminId = createdUsers[UserRole.ADMIN].id;
  const officerId = createdUsers[UserRole.LOAN_OFFICER].id;

  // -------------------------------------------------------------------------
  // Individual clients
  // -------------------------------------------------------------------------
  const clientRepo        = ds.getRepository(ClientEntity);
  const indivRepo         = ds.getRepository(IndividualDetailsEntity);
  const guardianRepo      = ds.getRepository(GuardianEntity);
  const bizRepo           = ds.getRepository(BusinessDetailsEntity);
  const repRepo           = ds.getRepository(RepresentativeEntity);
  const docRepo           = ds.getRepository(DocumentEntity);

  // Helper: skip if client number exists
  async function clientExists(num: string) {
    return !!(await clientRepo.findOne({ where: { client_number: num } }));
  }

  // --- Client 1: verified adult individual ---
  if (!(await clientExists('CLT-000001'))) {
    const ind1 = indivRepo.create({
      id: randomUUID(),
      first_name: 'Alice', last_name: 'Mwangi', middle_name: 'Grace',
      date_of_birth: new Date('1990-04-15'),
      gender: Gender.FEMALE,
      nationality: 'Kenyan',
      phone: '+254700000001',
      email: 'alice.mwangi@example.com',
      address_line1: '12 Ngong Road', city: 'Nairobi', country: 'Kenya',
      id_type: IdType.NATIONAL_ID, id_number: 'KE-NID-001234',
      id_expiry_date: new Date('2030-04-14'),
      is_minor: false,
    });
    await indivRepo.save(ind1);

    const c1 = clientRepo.create({
      id: randomUUID(),
      client_number: 'CLT-000001',
      client_type: ClientType.INDIVIDUAL,
      status: ClientStatus.ACTIVE,
      kyc_status: KycStatus.VERIFIED,
      kyc_verified_by: officerId,
      kyc_verified_at: new Date('2026-01-10'),
      kyc_expiry_date: new Date('2030-04-14'),
      individual_details: ind1,
      representatives: [],
      created_by: adminId,
    });
    await clientRepo.save(c1);

    await docRepo.save(docRepo.create({
      id: randomUUID(),
      document_type: DocumentType.ID_SCAN,
      file_path: 'client/alice-id-scan.jpg',
      file_name: 'alice-id-scan.jpg',
      original_name: 'national_id_scan.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 204800,
      owner_type: DocumentOwnerType.CLIENT,
      owner_id: c1.id,
      uploaded_by: adminId,
      is_verified: true,
      verified_by: officerId,
      verified_at: new Date('2026-01-10'),
    }));

    console.log('  created client: CLT-000001 Alice Mwangi (VERIFIED)');
  } else {
    console.log('  skip client: CLT-000001 (already exists)');
  }

  // --- Client 2: pending adult individual ---
  if (!(await clientExists('CLT-000002'))) {
    const ind2 = indivRepo.create({
      id: randomUUID(),
      first_name: 'John', last_name: 'Otieno',
      date_of_birth: new Date('1985-08-22'),
      gender: Gender.MALE,
      nationality: 'Kenyan',
      phone: '+254711000002',
      address_line1: '5 Moi Avenue', city: 'Mombasa', country: 'Kenya',
      id_type: IdType.NATIONAL_ID, id_number: 'KE-NID-005678',
      id_expiry_date: new Date('2028-08-21'),
      is_minor: false,
    });
    await indivRepo.save(ind2);

    const c2 = clientRepo.create({
      id: randomUUID(),
      client_number: 'CLT-000002',
      client_type: ClientType.INDIVIDUAL,
      status: ClientStatus.ACTIVE,
      kyc_status: KycStatus.PENDING,
      individual_details: ind2,
      representatives: [],
      created_by: adminId,
    });
    await clientRepo.save(c2);
    console.log('  created client: CLT-000002 John Otieno (PENDING)');
  } else {
    console.log('  skip client: CLT-000002 (already exists)');
  }

  // --- Client 3: minor with guardian ---
  if (!(await clientExists('CLT-000003'))) {
    const guardian = guardianRepo.create({
      id: randomUUID(),
      first_name: 'Mary', last_name: 'Kamau',
      relationship: GuardianRelationship.PARENT,
      phone: '+254722000003',
      email: 'mary.kamau@example.com',
      id_type: IdType.NATIONAL_ID, id_number: 'KE-NID-009999',
      id_expiry_date: new Date('2029-12-31'),
    });
    await guardianRepo.save(guardian);

    const ind3 = indivRepo.create({
      id: randomUUID(),
      first_name: 'Tom', last_name: 'Kamau',
      date_of_birth: new Date('2012-03-01'),
      gender: Gender.MALE,
      nationality: 'Kenyan',
      phone: '+254722000003',
      address_line1: '5 Moi Avenue', city: 'Kisumu', country: 'Kenya',
      id_type: IdType.NATIONAL_ID, id_number: 'KE-NID-MINOR001',
      id_expiry_date: new Date('2027-03-01'),
      is_minor: true,
    });
    await indivRepo.save(ind3);

    const c3 = clientRepo.create({
      id: randomUUID(),
      client_number: 'CLT-000003',
      client_type: ClientType.INDIVIDUAL,
      status: ClientStatus.ACTIVE,
      kyc_status: KycStatus.PENDING,
      individual_details: ind3,
      guardian,
      representatives: [],
      created_by: adminId,
    });
    await clientRepo.save(c3);
    console.log('  created client: CLT-000003 Tom Kamau (minor, PENDING)');
  } else {
    console.log('  skip client: CLT-000003 (already exists)');
  }

  // --- Client 4: business client ---
  if (!(await clientExists('CLT-000004'))) {
    const biz = bizRepo.create({
      id: randomUUID(),
      company_name: 'Savannah Trading Co. Ltd',
      registration_number: 'KE-BIZ-00123',
      tax_id: 'P051234567A',
      business_type: 'Retail',
      phone: '+254733000004',
      email: 'info@savannah-trading.co.ke',
      address_line1: '20 Industrial Area', city: 'Nairobi', country: 'Kenya',
      signature_policy: SignaturePolicy.DUAL,
    });
    await bizRepo.save(biz);

    const rep1 = repRepo.create({
      id: randomUUID(),
      first_name: 'David', last_name: 'Njoroge',
      role: 'Director',
      phone: '+254744000041',
      email: 'david@savannah-trading.co.ke',
      id_type: IdType.PASSPORT, id_number: 'KE-PP-ABC001',
      id_expiry_date: new Date('2031-06-30'),
      is_primary_signatory: true,
    });

    const rep2 = repRepo.create({
      id: randomUUID(),
      first_name: 'Esther', last_name: 'Wanjiku',
      role: 'Company Secretary',
      phone: '+254744000042',
      id_type: IdType.NATIONAL_ID, id_number: 'KE-NID-REP002',
      id_expiry_date: new Date('2029-09-15'),
      is_primary_signatory: true,
    });

    const c4 = clientRepo.create({
      id: randomUUID(),
      client_number: 'CLT-000004',
      client_type: ClientType.BUSINESS,
      status: ClientStatus.ACTIVE,
      kyc_status: KycStatus.PENDING,
      business_details: biz,
      representatives: [],
      created_by: adminId,
    });
    await clientRepo.save(c4);

    rep1.client_id = c4.id;
    rep2.client_id = c4.id;
    await repRepo.save([rep1, rep2]);

    await docRepo.save(docRepo.create({
      id: randomUUID(),
      document_type: DocumentType.REGISTRATION_DOC,
      file_path: 'client/savannah-reg-doc.pdf',
      file_name: 'savannah-reg-doc.pdf',
      original_name: 'certificate_of_incorporation.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 512000,
      owner_type: DocumentOwnerType.CLIENT,
      owner_id: c4.id,
      uploaded_by: adminId,
      is_verified: false,
    }));

    console.log('  created client: CLT-000004 Savannah Trading Co. Ltd (BUSINESS, PENDING)');
  } else {
    console.log('  skip client: CLT-000004 (already exists)');
  }

  await ds.destroy();
  console.log('\nSeed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
