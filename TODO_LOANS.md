# TODO — Loans

## 1. Penalty policy — rework

### 1a. Compounding penalty cycle
**Formula (agreed):**
- First trigger: day 30 after loan goes late
- Base (day 30): `(sum of unpaid installments' principal + interest) × 11%`
- Every subsequent 30 days: `(unpaid principal + interest + all accumulated penalties so far) × 11%`
- Compounds indefinitely every 30 days until the loan is settled

**What changes in code:**
- `processLateLoans()` in `loan.service.ts`: fetch repayment schedule for each late loan,
  filter to PENDING items, sum `principalAmount + interestAmount`, add accumulated penalty total,
  apply 11% on that combined base each 30-day cycle (not just once).
- Remove the `alreadyPenalised` guard that prevents more than one penalty — replace with
  a 30-day interval check (`daysLate % 30 === 0` or last penalty was 30+ days ago).
- Update `LoanPolicy.computePenalty()` to accept the full base (unpaid + accumulated penalties).

### 1b. Penalty waiver endpoint
**Flow (agreed):**
1. Client and loan officer negotiate outside the system
2. Loan officer calls `POST /loans/:id/penalties/waive` — **both `amount` and `reason` are required**
3. Client deposits the agreed remaining amount into the **account linked to the loan** (`accountId`)
4. Loan officer records the final payment via `POST /loans/:id/payments`
5. Loan auto-closes when outstanding balance hits zero

**What needs to be built:**
- Add waiver fields to `LoanPenalty`: `waivedAmount`, `waivedBy`, `waivedAt`, `waivedReason`
- New migration for those columns
- `POST /loans/:id/penalties/waive` endpoint (loan officer role only)
- Accounting reversal on waiver: debit penalty income → credit loan receivable for waived amount
- `WaivePenaltyDto`: `{ amount: number (required), reason: string (required) }`

## 2. Multiple overdrafts per client

**Rules (agreed):**
- OVERDRAFT: no cap — a client can have unlimited active overdrafts
- PERSONAL_LOAN + SALARY_ADVANCE: max 1 combined active loan (cannot have both at the same time)
- A client can hold 1 (PERSONAL_LOAN or SALARY_ADVANCE) alongside any number of OVERDRAFTs simultaneously

**What changes in code:**
- `LoanPolicy.assertCanApply(count, loanType)`: if `loanType === OVERDRAFT` skip the check entirely
- `countActiveByClient()` in `loan.repository.ts`: exclude OVERDRAFT loans from the count
- `apply()` in `loan.service.ts`: pass `dto.type` into `assertCanApply()`

## 3. New role: Loan Approver
- Add `LOAN_APPROVER` to the `UserRole` enum
- Add `@Roles(UserRole.LOAN_APPROVER)` + `@UseGuards(RolesGuard)` on `POST /loans/:id/approve` and `POST /loans/:id/reject`
- Add a seed user with the `LOAN_APPROVER` role

## 4. Account statement missing loan transactions
Loan disbursements and repayments update the COA (accounting entries) but never create a
transaction record on the client's savings account statement. The client's account history
is therefore incomplete.

**What needs to be recorded:**
- At disbursement: credit transaction on the client's linked account (amount = principal disbursed)
- At repayment: debit transaction on the client's linked account (amount = installment principal + interest)
- At auto-repayment (`processScheduledRepayments()`): same as above

**Where to add it in code:**
- `disburse()` in `loan.service.ts`: after updating the account balance, create an account transaction record
- `recordPayment()` in `loan.service.ts`: same
- Check what method the teller/account module uses to write statement entries and reuse it

## 5. Disbursement funding source
⚠️ Blocked — needs discussion with accounting before any code is written.

Currently disbursement has no modelled funding source. Questions to bring to accounting:
- Which COA account does the money come from at disbursement?
- Is it the same account for all loan types (SALARY_ADVANCE, PERSONAL_LOAN, OVERDRAFT)?
- Does FC and USD each have their own funding account?
- How is that account funded/topped up?
