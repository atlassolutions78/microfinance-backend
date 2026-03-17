# Database Schema

## Tables

### 1. Auth & Staff

#### `branches`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| address | text | |
| created_at | timestamp | |

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| branch_id | uuid FK → branches | |
| first_name | text | |
| middle_name | text | nullable |
| last_name | text | |
| email | text unique | |
| password_hash | text | |
| role | enum | `ADMIN` `MANAGER` `LOAN_OFFICER` `TELLER` |
| is_active | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### 2. Clients

#### `clients`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| client_number | text unique | system-generated |
| type | enum | `INDIVIDUAL` `BUSINESS` |
| kyc_status | enum | `PENDING` `UNDER_REVIEW` `APPROVED` `REJECTED` `REQUIRES_UPDATE` |
| branch_id | uuid FK → branches | |
| created_by | uuid FK → users | |
| kyc_reviewed_by | uuid FK → users | nullable |
| kyc_reviewed_at | timestamp | nullable |
| kyc_notes | text | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `individual_profiles` — 1:1 with clients
| Column | Type | Notes |
|---|---|---|
| client_id | uuid PK/FK → clients | |
| first_name | text | |
| middle_name | text | nullable |
| last_name | text | |
| date_of_birth | date | |
| gender | enum | `MALE` `FEMALE` `OTHER` |
| nationality | text | |
| marital_status | enum | `SINGLE` `MARRIED` `DIVORCED` `WIDOWED` |
| profession | text | |
| province | text | |
| municipality | text | |
| neighborhood | text | |
| street | text | |
| plot_number | text | |
| phone | text | |
| id_type | enum | `NATIONAL_ID` `PASSPORT` `CEPGL_CARD` |
| id_number | text | |
| is_minor | boolean | |
| responsible_adult_name | text | nullable |
| responsible_adult_id | text | nullable |

#### `business_profiles` — 1:1 with clients
| Column | Type | Notes |
|---|---|---|
| client_id | uuid PK/FK → clients | |
| company_name | text | |
| mandatory_signatories | integer | minimum number of mandatory signatories required |
| optional_signatories | integer | minimum number of optional signatories required (0 = on record only) |

#### `minor_guardians`
| Column | Type | Notes |
|---|---|---|
| guardian_id | uuid PK | |
| client_id | uuid FK → clients | |
| first_name | text | |
| middle_name | text | nullable |
| last_name | text | |
| id_document_ref | text | |

#### `representatives`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → clients | |
| first_name | text | |
| middle_name | text | nullable |
| last_name | text | |
| gender | enum | nullable — `MALE` `FEMALE` `OTHER` |
| date_of_birth | date | nullable |
| place_of_birth | text | nullable |
| province_of_origin | text | nullable |
| marital_status | enum | nullable — `SINGLE` `MARRIED` `DIVORCED` `WIDOWED` |
| profession | text | nullable |
| id_type | enum | nullable — `NATIONAL_ID` `PASSPORT` `CEPGL_CARD` |
| id_number | text | |
| province | text | |
| municipality | text | |
| neighborhood | text | |
| street | text | |
| plot_number | text | |
| phone | text | |
| email | text | nullable |
| signatory_type | enum | `MANDATORY` `OPTIONAL` |
| role | text | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `client_documents`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → clients | |
| document_type | enum | `PASSPORT_PHOTO` `ID_DOCUMENT` `REGISTRATION_DOC` `OPENING_LETTER` `BIOMETRIC` |
| file_name | text | |
| file_url | text | |
| status | enum | `PENDING` `ACCEPTED` `REJECTED` |
| rejection_reason | text | nullable |
| uploaded_by | uuid FK → users | |
| reviewed_by | uuid FK → users | nullable |
| reviewed_at | timestamp | nullable |
| uploaded_at | timestamp | |

#### `representative_documents`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| representative_id | uuid FK → representatives | |
| document_type | enum | `PASSPORT_PHOTO` `ID_DOCUMENT` `REPRESENTATIVE_ID` |
| file_name | text | |
| file_url | text | |
| status | enum | `PENDING` `ACCEPTED` `REJECTED` |
| rejection_reason | text | nullable |
| uploaded_by | uuid FK → users | |
| reviewed_by | uuid FK → users | nullable |
| reviewed_at | timestamp | nullable |
| uploaded_at | timestamp | |

#### `guardian_documents`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| guardian_id | uuid FK → minor_guardians | |
| document_type | enum | `PASSPORT_PHOTO` `ID_DOCUMENT` |
| file_name | text | |
| file_url | text | |
| status | enum | `PENDING` `ACCEPTED` `REJECTED` |
| rejection_reason | text | nullable |
| uploaded_by | uuid FK → users | |
| reviewed_by | uuid FK → users | nullable |
| reviewed_at | timestamp | nullable |
| uploaded_at | timestamp | |

---

### 3. Accounts & Transactions

#### `accounts`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_number | text unique | |
| client_id | uuid FK → clients | |
| type | enum | `SAVINGS` `CHECKING` `BUSINESS` |
| currency | enum | `USD` `FC` |
| balance | numeric(18,4) | |
| status | enum | `PENDING` `ACTIVE` `SUSPENDED` `DORMANT` `CLOSED` |
| created_by | uuid FK → users | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `transactions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK → accounts | |
| type | enum | `DEPOSIT` `WITHDRAWAL` `TRANSFER_IN` `TRANSFER_OUT` `LOAN_DISBURSEMENT` `LOAN_REPAYMENT` `FEE` `PENALTY` |
| amount | numeric(18,4) | |
| currency | enum | `USD` `FC` |
| balance_after | numeric(18,4) | snapshot at time of tx |
| reference | text | |
| description | text | nullable |
| performed_by | uuid FK → users | |
| created_at | timestamp | |

#### `transfers`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| debit_transaction_id | uuid FK → transactions | |
| credit_transaction_id | uuid FK → transactions | nullable (external transfers) |
| is_internal | boolean | |
| recipient_name | text | nullable (external only) |
| fee_amount | numeric(18,4) | |
| claim_reference | text | nullable (external claim doc) |

---

### 4. Loans

#### `loans`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| loan_number | text unique | system-generated reference |
| client_id | uuid FK → clients | |
| loan_officer_id | uuid FK → users | nullable |
| branch_id | uuid FK → branches | |
| amount | double precision | |
| interest_rate | double precision | annual rate as decimal |
| term_months | integer | |
| type | enum | `SALARY_ADVANCE` `STANDARD_LOAN` `OVERDRAFT` |
| purpose | text | |
| status | enum | `PENDING` `APPROVED` `REJECTED` `ACTIVE` `CLOSED` `DEFAULTED` |
| rejection_reason | text | nullable |
| approved_by | uuid FK → users | nullable |
| approved_at | timestamp | nullable |
| disbursed_at | timestamp | nullable |
| penalty_amount | double precision | accumulated penalty, default 0 |
| penalty_applied_at | timestamp | nullable |
| created_at | timestamp | |

#### `repayment_schedules`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| loan_id | uuid FK → loans | |
| installment_number | integer | 1-based |
| due_date | date | |
| principal_amount | numeric(18,4) | |
| interest_amount | numeric(18,4) | |
| total_amount | numeric(18,4) | |
| status | enum | `PENDING` `PAID` `LATE` `PARTIALLY_PAID` |

#### `repayments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| loan_id | uuid FK → loans | |
| transaction_id | uuid FK → transactions | links to the account debit |
| amount | numeric(18,4) | |
| payment_date | date | |
| received_by | uuid FK → users | |
| notes | text | nullable |

---

### 5. Accounting

#### `chart_of_accounts`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code | text unique | e.g. `1001` |
| name | text | e.g. `Cash - USD` |
| type | enum | `ASSET` `LIABILITY` `INCOME` `EXPENSE` |
| currency | text | `USD` or `FC` |
| balance | numeric(18,4) | running balance |

#### `journal_entries`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text unique | |
| description | text | |
| operation_type | enum | `DEPOSIT` `WITHDRAWAL` `LOAN_DISBURSEMENT` `LOAN_REPAYMENT` `FEE_PENALTY` `TRANSFER` |
| created_by | uuid FK → users | |
| created_at | timestamp | |

#### `journal_lines` — always balanced (Σ debit = Σ credit per entry)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| journal_entry_id | uuid FK → journal_entries | |
| account_id | uuid FK → chart_of_accounts | |
| debit | numeric(18,4) | 0 if credit side |
| credit | numeric(18,4) | 0 if debit side |

---

## Relationships

```
branches ──────────────< users
branches ──────────────< clients
branches ──────────────< loans

users ──────────────────< clients (created_by)
users ──────────────────< clients (kyc_reviewed_by)
users ──────────────────< accounts (created_by)
users ──────────────────< loans (loan_officer_id)
users ──────────────────< loans (approved_by)
users ──────────────────< repayments (received_by)
users ──────────────────< transactions (performed_by)
users ──────────────────< client_documents (reviewed_by)
users ──────────────────< journal_entries (created_by)

clients ─────────────── individual_profiles  (1:1)
clients ─────────────── business_profiles    (1:1)
clients ──────────────< representatives
clients ──────────────< client_documents
clients ──────────────< accounts
clients ──────────────< loans

accounts ─────────────< transactions
transactions ─────────< transfers (debit_transaction_id)
transactions ─────────< transfers (credit_transaction_id, nullable)
transactions ─────────< repayments (transaction_id)

loans ────────────────< repayment_schedules
loans ────────────────< repayments

journal_entries ──────< journal_lines
chart_of_accounts ────< journal_lines
```

---

_16 tables across 5 domains._
