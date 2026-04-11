# Loans API — Frontend Integration Guide

All endpoints require a `Bearer` JWT token obtained from `POST /auth/login`.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Reference: Enums](#reference-enums)
3. [Reference: Loan Products & Rules](#reference-loan-products--rules)
4. [Interest & Schedule Calculation](#interest--schedule-calculation)
5. [The Complete Loan Lifecycle](#the-complete-loan-lifecycle)
6. [Endpoints](#endpoints)
   - [1. Apply for a Loan](#1-apply-for-a-loan)
   - [2. List Loans](#2-list-loans)
   - [3. Get a Loan](#3-get-a-loan)
   - [4. Approve a Loan](#4-approve-a-loan)
   - [5. Reject a Loan](#5-reject-a-loan)
   - [6. Disburse a Loan](#6-disburse-a-loan)
   - [7. Get Repayment Schedule](#7-get-repayment-schedule)
   - [8. Record a Manual Payment](#8-record-a-manual-payment)
   - [9. Get Payment History](#9-get-payment-history)
   - [10. Get Penalties](#10-get-penalties)
   - [11. Get Documents](#11-get-documents)
   - [12. Process Late Penalties (Admin)](#12-process-late-penalties-admin)
   - [13. Process Scheduled Repayments (Admin)](#13-process-scheduled-repayments-admin)
7. [Uploading Documents to S3](#uploading-documents-to-s3)
8. [Loan Object Shape](#loan-object-shape)
9. [Error Responses](#error-responses)

---

## Authentication

Every request must include:

```
Authorization: Bearer <token>
```

---

## Reference: Enums

### `LoanType`

| Value | Label | Term | Notes |
|---|---|---|---|
| `SALARY_ADVANCE` | Salary Advance | 1 month (fixed) | Single-payment; `termMonths` is ignored |
| `PERSONAL_LOAN` | Personal Loan | 10 or 12 months | `termMonths` is required |
| `OVERDRAFT` | Overdraft | 3 months (fixed) | `termMonths` is ignored |

### `LoanCurrency`

| Value | Description |
|---|---|
| `USD` | US Dollar |
| `FC` | Congolese Franc |

### `LoanStatus`

| Value | Meaning |
|---|---|
| `PENDING` | Application submitted — awaiting officer review |
| `APPROVED` | Approved by an officer — funds not yet released |
| `REJECTED` | Declined by an officer — terminal state |
| `ACTIVE` | Disbursed — repayments ongoing |
| `CLOSED` | All installments paid — terminal state |
| `DEFAULTED` | Written off — payments can still be recorded |

### `RepaymentStatus` (per installment)

| Value | Meaning |
|---|---|
| `PENDING` | Not yet due, or due but awaiting payment |
| `PAID` | Fully settled |
| `LATE` | 1–29 days past the due date — reminder sent to client |
| `OVERDUE` | 30+ days past the due date — 11% penalty applied |

### `LoanDocumentType`

| Value | Meaning |
|---|---|
| `MOU` | Memorandum of Understanding |
| `COMMITMENT_LETTER` | Letter of Commitment |
| `REQUEST_LETTER` | Request Letter |

---

## Reference: Loan Products & Rules

| Type | Term | Monthly Rate | Max Active Loans |
|---|---|---|---|
| `SALARY_ADVANCE` | 1 month (fixed) | 2.5% | 1 per client |
| `PERSONAL_LOAN` | 10 or 12 months | ~0.417% (5% annual) | 1 per client |
| `OVERDRAFT` | 3 months (fixed) | 2.5% | 1 per client |

**Account eligibility rules** - the account receiving the disbursement must:
- Have status `ACTIVE`
- Have been opened at least **6 months** ago

**Client eligibility rules:**
- Must have KYC status `APPROVED`
- Must not already hold an `ACTIVE` or `APPROVED` loan

**Penalty**: 11% of the remaining unpaid installment amount, assessed once, exactly 30 days after the first overdue reminder is sent.

---

## Interest & Schedule Calculation

The interest method depends on the loan type.

### Salary Advance (1 month, flat)

The total due is a single lump sum:

```
Total due = principal x (1 + 0.025)
```

**Example** - $1,000 salary advance:
- Total due on day 30: **$1,025.00**

### Personal Loan & Overdraft (amortising)

Uses the standard reducing-balance amortisation formula:

```
Monthly instalment = P x r(1+r)^n / [(1+r)^n - 1]

Where:
  P = principal amount
  r = monthly interest rate (e.g. 0.025 for Overdraft, 0.004167 for Personal Loan)
  n = term in months
```

Each installment is split between interest and principal. Interest is calculated on the **outstanding principal balance** that month, so the interest portion decreases each month while the principal portion increases.

**Example** - $5,000 Personal Loan, 12 months, 5% annual (r = 0.004167):

| # | Principal | Interest | Total | Remaining Balance |
|---|---|---|---|---|
| 1 | $406.55 | $20.83 | $427.38 | $4,593.45 |
| 2 | $408.25 | $19.14 | $427.38 | $4,185.20 |
| ... | ... | ... | ... | ... |
| 12 | $425.84 | $1.76 | $427.60 | $0 |

The last installment absorbs any rounding residual, so its total may differ slightly from the others.

---

## The Complete Loan Lifecycle

```
[Client applies via officer]
         |
         v
      PENDING ------------------------------------------> REJECTED  (terminal)
         |
         |  Officer approves
         v
      APPROVED
         |
         |  Officer disburses   (optionally overrides the disbursement account)
         v
       ACTIVE ---------------------------------------> DEFAULTED  (manual write-off)
         |
         |  All installments paid
         v
       CLOSED  (terminal)
```

### Step-by-step walkthrough

#### Step 1 - Application (`POST /loans`)

An officer submits an application on behalf of a client. The system:
- Validates the client KYC status
- Checks that the client has no existing active/approved loan
- Validates the chosen account (active, at least 6 months old)
- Validates the principal amount and term against product rules
- Assigns a sequential loan number (`LN-YYYY-NNN`)
- Creates the loan in `PENDING` status
- Persists any attached supporting documents

The loan **does not affect any account balance** at this stage.

---

#### Step 2 - Officer Review (`POST /loans/:id/approve` or `POST /loans/:id/reject`)

An officer reviews the application.

**Approve** moves to `APPROVED`. No money moves yet.

**Reject** moves to `REJECTED` (terminal). A rejection reason is recorded. The client may apply again.

---

#### Step 3 - Disbursement (`POST /loans/:id/disburse`)

This is where money moves. The officer disburses the approved loan. The system:

1. Optionally overrides the disbursement account (from request body)
2. Generates and saves the full repayment schedule (one row per installment)
3. Credits the `principalAmount` to the client account
4. Creates a `LOAN_DISBURSEMENT` transaction record
5. Posts a double-entry accounting journal:
   - **DR** Loan Receivable (e.g. `5010` Loans Salary Advances USD)
   - **CR** Customer Savings (e.g. `2010` Savings USD)
6. Moves the loan to `ACTIVE`

After disbursement, the client owes the full outstanding balance and must repay according to the generated schedule.

**Account override**: if another account is provided in the request body, it must belong to the same client and satisfy the same eligibility rules (active, at least 6 months old). If omitted, the account chosen at application time is used.

---

#### Step 4 - Repayment

Installments are repaid either **manually** (officer records a cash or transfer payment) or **automatically** (the system debits the account on the due date).

Both paths have identical accounting effects:

1. Debits the repayment amount from the client account
2. Creates a `LOAN_REPAYMENT` transaction record
3. Posts a double-entry journal:
   - **DR** Customer Savings
   - **CR** Loan Receivable (principal + any assessed penalty on this installment)
   - **CR** Interest Income
4. Marks the installment `PAID`
5. Reduces `outstandingBalance` on the loan
6. If `outstandingBalance` reaches zero, the loan moves to `CLOSED` automatically

**Manual path** - `POST /loans/:id/payments`:
The officer specifies the amount and optionally the target installment. Use this for walk-in cash repayments.

**Auto-repayment path** - `POST /loans/admin/process-repayments` (cron):
The system scans all installments that are due today or overdue (status `PENDING` or `LATE`) across all active loans, checks if the account has enough balance, and processes each automatically. Installments where the balance is insufficient are skipped and retried on the next run.

---

#### Step 5 - Late Payment Handling (`POST /loans/admin/process-penalties`)

Run this endpoint daily. For each overdue installment:

| Days past due | Action |
|---|---|
| First overdue detection | Status becomes `LATE`. SMS and email reminder sent. 30-day penalty clock starts. |
| 1-29 days after reminder | Status remains `LATE`. Nothing new happens. |
| 30+ days after reminder | Status becomes `OVERDUE`. 11% penalty applied. Journal posted: **DR Loan Receivable / CR Penalty Income**. |

Penalties are assessed **once** per installment. When the client pays an `OVERDUE` installment, the penalty amount is included in the debit. The penalty income was already posted at assessment and is not double-counted.

---

#### Penalty + Repayment accounting

When paying an `OVERDUE` installment:

```
Total debited from account = principal + interest + penalty
Journal:
  DR  Customer Savings           (principal + interest + penalty)
  CR  Loan Receivable            (principal + penalty)
  CR  Interest Income            (interest)
```

The penalty income entry was posted when the penalty was assessed; no additional CR Penalty Income entry is made at repayment time.

---

## Endpoints

---

### 1. Apply for a Loan

```
POST /loans
```

Creates a loan in `PENDING` status. The authenticated user is recorded as the applicant.

#### Request Body

```jsonc
{
  "clientId": "uuid",           // required - the client this loan is for
  "accountId": "uuid",          // required - default disbursement account (must belong to the client)
  "type": "PERSONAL_LOAN",      // required - see LoanType enum
  "currency": "USD",            // required - "USD" or "FC"
  "principalAmount": 5000,      // required - positive number, max 2 decimal places
  "termMonths": 12,             // required for PERSONAL_LOAN (10 or 12); omit for fixed-term products
  "purpose": "School fees",     // optional - free text description
  "documents": [                // required - can be an empty array
    {
      "documentType": "REQUEST_LETTER",
      "fileName": "request.pdf",
      "fileUrl": "uploads/a1b2c3d4-uuid.pdf"   // S3 key returned by POST /uploads
    }
  ]
}
```

#### Validation rules

| Field | Rule |
|---|---|
| `clientId` | Valid UUID of an existing client with KYC `APPROVED` |
| `accountId` | Must belong to the client, be `ACTIVE`, and be at least 6 months old |
| `type` | Must be a valid `LoanType` |
| `currency` | `USD` or `FC` |
| `principalAmount` | Must be greater than 0 |
| `termMonths` | Required for `PERSONAL_LOAN` (10 or 12). Ignored for `SALARY_ADVANCE` and `OVERDRAFT` |
| `documents` | Array; each item must have `documentType`, `fileName`, and `fileUrl` (S3 key from `POST /uploads`) |

#### Response `201`

Returns the full [Loan Object](#loan-object-shape) with `status: "PENDING"`.

#### Errors

| Status | Cause |
|---|---|
| `400` | Validation failure |
| `400` | Client KYC not approved |
| `400` | Client already holds an active or approved loan |
| `400` | Account not active or less than 6 months old |
| `404` | Client or account not found |

---

### 2. List Loans

```
GET /loans
```

Returns all loans, optionally filtered.

#### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `status` | optional | Filter by `LoanStatus` |
| `type` | optional | Filter by `LoanType` |
| `clientId` | optional | Filter by client UUID |

**Examples:**
```
GET /loans?status=ACTIVE
GET /loans?clientId=<uuid>&status=ACTIVE
GET /loans?type=PERSONAL_LOAN
```

#### Response `200`

Array of [Loan Objects](#loan-object-shape).

---

### 3. Get a Loan

```
GET /loans/:id
```

Returns a single loan by its UUID.

#### Response `200`

Single [Loan Object](#loan-object-shape).

#### Errors

| Status | Cause |
|---|---|
| `404` | Loan not found |

---

### 4. Approve a Loan

```
POST /loans/:id/approve
```

Moves a `PENDING` loan to `APPROVED`. The authenticated user is recorded as the reviewer. No request body required.

#### Response `200`

Updated loan object with `status: "APPROVED"` and `reviewedBy` / `reviewedAt` populated.

#### Errors

| Status | Cause |
|---|---|
| `400` | Loan is not in `PENDING` status |
| `404` | Loan not found |

---

### 5. Reject a Loan

```
POST /loans/:id/reject
```

Moves a `PENDING` loan to `REJECTED`. This is terminal — the client must submit a new application.

#### Request Body

```jsonc
{
  "reason": "Insufficient collateral provided by the applicant"  // min 5 characters
}
```

#### Response `200`

Updated loan object with `status: "REJECTED"` and `rejectionReason` populated.

#### Errors

| Status | Cause |
|---|---|
| `400` | Loan is not in `PENDING` status, or reason is too short |
| `404` | Loan not found |

---

### 6. Disburse a Loan

```
POST /loans/:id/disburse
```

Moves an `APPROVED` loan to `ACTIVE` and releases the funds to the client account.

This endpoint:
1. (Optional) Overrides the disbursement account with the one provided in the body
2. Generates and saves the full repayment schedule
3. Credits the `principalAmount` to the client account
4. Creates a `LOAN_DISBURSEMENT` transaction record
5. Posts the accounting journal: **DR Loan Receivable / CR Customer Savings**

#### Request Body

The body is optional. Omit it to disburse to the account set at application time. Provide `accountId` to override the destination.

```jsonc
{
  "accountId": "uuid"   // optional - override the disbursement account
}
```

**Override rules** (identical to application eligibility):
- The account must belong to the same client
- Must be `ACTIVE`
- Must be at least 6 months old

#### Response `200`

Updated loan object with `status: "ACTIVE"`, `disbursedAt`, and `disbursedBy` populated.

#### Errors

| Status | Cause |
|---|---|
| `400` | Loan is not in `APPROVED` status |
| `400` | Override account not eligible (wrong client, not active, too new) |
| `404` | Loan or override account not found |

---

### 7. Get Repayment Schedule

```
GET /loans/:id/schedule
```

Returns the full installment schedule for a loan. Call this immediately after disbursement to display upcoming payments to the client.

#### Response `200`

```jsonc
[
  {
    "id": "uuid",
    "loanId": "uuid",
    "installmentNumber": 1,
    "dueDate": "2026-04-16T00:00:00Z",
    "principalAmount": 406.55,
    "interestAmount": 20.83,
    "totalAmount": 427.38,       // principalAmount + interestAmount (before any penalties)
    "paidAmount": 0,
    "status": "PENDING",          // PENDING | PAID | LATE | OVERDUE
    "paidAt": null,
    "reminderSentAt": null        // set when the first overdue reminder is dispatched
  }
]
```

**UI tip:** Cross-reference each item `id` with the penalties list (`GET /loans/:id/penalties`) to show any additional penalty charge alongside the installment. If an installment is `OVERDUE`, add the `penaltyAmount` to `totalAmount` to get the full amount the client must pay.

---

### 8. Record a Manual Payment

```
POST /loans/:id/payments
```

Records a cash or transfer payment made by the client in person. The system:

1. Identifies the target installment (next unpaid, or specific if `scheduleId` given)
2. Adds any assessed penalty for that installment to the debit amount
3. Debits **principal + interest + penalty** from the client account
4. Creates a `LOAN_REPAYMENT` transaction record
5. Posts the accounting journal
6. Marks the installment `PAID`
7. Reduces the loan `outstandingBalance`
8. Closes the loan automatically if `outstandingBalance` reaches zero

#### Request Body

```jsonc
{
  "amount": 427.38,         // required - must be greater than 0
  "scheduleId": "uuid",     // optional - target a specific installment; defaults to next unpaid
  "notes": "Cash payment"   // optional - free text
}
```

**Handling penalties:** If the installment has an assessed penalty (check `GET /loans/:id/penalties`), the amount to collect from the client is:

```
amount to collect = installment totalAmount + penaltyAmount
```

Example: installment total $427.38 plus $47.01 penalty -> collect **$474.39**.

#### Response `200`

```jsonc
{
  "id": "uuid",
  "loanId": "uuid",
  "scheduleId": "uuid",
  "transactionId": "uuid",
  "amount": 427.38,
  "currency": "USD",
  "paymentDate": "2026-03-29T14:22:00Z",
  "recordedBy": "uuid",
  "notes": "Cash payment",
  "createdAt": "2026-03-29T14:22:00Z"
}
```

#### Errors

| Status | Cause |
|---|---|
| `400` | Loan status is not `ACTIVE` or `DEFAULTED` |
| `400` | All installments are already paid |
| `400` | Insufficient account balance |
| `404` | Loan not found |
| `404` | `scheduleId` not found or already paid |

---

### 9. Get Payment History

```
GET /loans/:id/payments
```

Returns all recorded payments for a loan, newest first.

#### Response `200`

Array of payment objects (see shape in [Record a Manual Payment](#8-record-a-manual-payment)).

Payments created by the auto-repayment scheduler have `recordedBy: "system"` and `notes: "Auto-repayment"`.

---

### 10. Get Penalties

```
GET /loans/:id/penalties
```

Returns all penalty records assessed against the loan installments.

#### Response `200`

```jsonc
[
  {
    "id": "uuid",
    "loanId": "uuid",
    "scheduleId": "uuid",       // cross-reference with the repayment schedule
    "penaltyRate": 0.11,        // always 11%
    "penaltyAmount": 47.01,     // 11% of the unpaid amount at assessment time
    "appliedAt": "2026-03-29T00:00:00Z",
    "createdAt": "2026-03-29T00:00:00Z"
  }
]
```

**Key points:**
- A penalty is applied at most **once** per installment, 30 days after the first reminder.
- The accounting entry is posted immediately when the penalty is assessed (accrual basis).
- When collecting the payment, add `penaltyAmount` on top of the installment `totalAmount`.

---

### 11. Get Documents

```
GET /loans/:id/documents
```

Returns all supporting documents attached to the loan application.

#### Response `200`

```jsonc
[
  {
    "id": "uuid",
    "loanId": "uuid",
    "documentType": "REQUEST_LETTER",
    "fileName": "request.pdf",
    "fileUrl": "uploads/a1b2c3d4-uuid.pdf",   // S3 object key
    "uploadedBy": "uuid",
    "uploadedAt": "2026-03-14T08:30:00Z"
  }
]
```

**To display or download a document**, pass `fileUrl` as the `key` query parameter to `GET /uploads/download` to receive a short-lived signed URL:

```
GET /uploads/download?key=uploads/a1b2c3d4-uuid.pdf
```

Response:
```jsonc
{ "url": "https://microfinance-docs.s3.amazonaws.com/uploads/a1b2c3d4-uuid.pdf?X-Amz-..." }
```

The signed URL expires after **15 minutes**. Generate it on demand — do not store it.

---

### 12. Process Late Penalties (Admin)

```
POST /loans/admin/process-penalties
```

**Admin / cron endpoint.** Scans every overdue installment across all active loans and applies the late-payment policy.

| Days since due | What happens |
|---|---|
| First detection | Status becomes `LATE`. SMS and email reminder sent. 30-day clock starts. |
| 1-29 days after reminder | Status remains `LATE`. No further action. |
| 30+ days after reminder | Status becomes `OVERDUE`. 11% penalty applied. Journal posted: **DR Loan Receivable / CR Penalty Income**. |

Subsequent runs are idempotent — penalties and reminders are never applied twice to the same installment.

No request body required.

#### Response `200`

```jsonc
{
  "processed": 3,    // installments that had the 11% penalty applied this run
  "reminders": 5     // installments that received their first overdue reminder this run
}
```

**Integration note:** Call this once per day via a scheduler. Restrict to admin roles.

---

### 13. Process Scheduled Repayments (Admin)

```
POST /loans/admin/process-repayments
```

**Admin / cron endpoint.** Automatically debits each client account for every installment that is due today or earlier (status `PENDING` or `LATE` across all active loans), provided the account has sufficient balance.

**Processing rules:**
- Items are processed in due-date order, oldest first.
- If the account balance is insufficient, the item is **skipped** for this run and retried the next day. The loan is not closed or marked defaulted.
- Each successfully processed item creates a `LOAN_REPAYMENT` transaction with `recordedBy: "system"`.
- If the installment has an assessed penalty, the penalty amount is included in the debit automatically.
- If the last installment is paid and `outstandingBalance` reaches zero, the loan moves to `CLOSED` automatically.

No request body required.

#### Response `200`

```jsonc
{
  "processed": 12,   // installments successfully debited this run
  "skipped": 3       // installments skipped due to insufficient balance or error
}
```

**Integration note:** Call this daily, ideally **after** `POST /loans/admin/process-penalties` so that freshly assessed penalties are included in the amount debited. Restrict to admin roles.

---

## Uploading Documents to S3

Before submitting a loan application, each supporting document must be uploaded to S3. The upload flow is:

### Option A — Direct upload (recommended for server-to-server or trusted clients)

```
POST /uploads
Content-Type: multipart/form-data

file: <binary>
```

The server uploads the file to S3 and returns:

```jsonc
{ "key": "uploads/a1b2c3d4-uuid.pdf" }
```

Use this `key` as `fileUrl` in the loan application `documents` array.

---

### Option B — Pre-signed URL (recommended for browser clients uploading large files)

**Step 1.** Request a pre-signed upload URL:

```
POST /uploads/presign
Content-Type: application/json

{
  "filename": "request.pdf",
  "contentType": "application/pdf"
}
```

Response:
```jsonc
{
  "url": "https://microfinance-docs.s3.amazonaws.com/uploads/...?X-Amz-...",
  "key": "uploads/a1b2c3d4-uuid.pdf"
}
```

The `url` is valid for **5 minutes**.

**Step 2.** Upload the file directly to S3 from the browser:

```
PUT <url>
Content-Type: application/pdf

<binary file body>
```

No `Authorization` header — the pre-signed URL is already scoped to the specific object and operation.

**Step 3.** Use the `key` as `fileUrl` in the loan application `documents` array.

---

### Downloading / Previewing a document

```
GET /uploads/download?key=uploads/a1b2c3d4-uuid.pdf
```

Response:
```jsonc
{ "url": "https://microfinance-docs.s3.amazonaws.com/uploads/a1b2c3d4-uuid.pdf?X-Amz-..." }
```

The signed download URL expires after **15 minutes**. Request a fresh one each time the user wants to view or download the file.

---

## Loan Object Shape

Returned by all loan endpoints.

```jsonc
{
  "id": "uuid",
  "loanNumber": "LN-2026-042",
  "clientId": "uuid",
  "accountId": "uuid",
  "branchId": "uuid",
  "type": "PERSONAL_LOAN",
  "currency": "USD",
  "principalAmount": 5000,
  "outstandingBalance": 4593.45,     // decreases as installments are paid
  "interestRate": 0.004167,          // monthly rate as a decimal
  "termMonths": 12,
  "purpose": "School fees",
  "status": "ACTIVE",
  "rejectionReason": null,           // populated only on REJECTED loans
  "appliedBy": "uuid",
  "reviewedBy": "uuid",
  "reviewedAt": "2026-03-15T10:00:00Z",
  "disbursedAt": "2026-03-16T09:00:00Z",
  "disbursedBy": "uuid",
  "closedAt": null,
  "createdAt": "2026-03-14T08:30:00Z",
  "updatedAt": "2026-03-16T09:00:00Z"
}
```

---

## Error Responses

All errors follow the standard NestJS structure:

```jsonc
{
  "statusCode": 400,
  "message": "Client already has 1 active loan(s). Maximum is 1.",
  "error": "Bad Request"
}
```

For validation errors, `message` is an array of field-level messages:

```jsonc
{
  "statusCode": 400,
  "message": [
    "principalAmount must be a number with up to 2 decimal places",
    "type must be one of the following values: SALARY_ADVANCE, PERSONAL_LOAN, OVERDRAFT"
  ],
  "error": "Bad Request"
}
```

### HTTP Status Reference

| Status | Meaning |
|---|---|
| `400` | Validation failure or business rule violation |
| `401` | Missing or invalid JWT token |
| `403` | Action not permitted |
| `404` | Resource not found |
| `500` | Unexpected server error |
