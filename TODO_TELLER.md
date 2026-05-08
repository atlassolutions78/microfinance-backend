# TODO — Teller

## 1. Deposit slip fields — depositor info and denomination breakdown

Currently `TellerDepositDto` only captures `accountId`, `amount`, `currency`, and an optional
`description`. The physical deposit slip (Bordereau de Versement d'Espèces) also contains
the depositor's name and phone, plus a denomination breakdown of the cash being handed in.
The depositor may be a different person from the account holder (e.g. a family member depositing
on behalf of the account owner). The teller fills these fields into the system from the slip —
or directly from the client if no slip is used.

At the end the receipt must include all of this information.

### What is missing

| Field | Where needed |
|---|---|
| `depositorName` (required) | DTO, stored on the transaction, shown on receipt |
| `depositorPhone` (optional) | DTO, stored on the transaction, shown on receipt |
| `denominations[]` (required) | DTO, stored linked to the transaction, shown on receipt |
| `feeAmount` (required, 0 if none) | DTO, teller cash position increases by amount + fee, fee posted to fee income COA, shown on receipt |

### What changes in code

**`teller.dto.ts`**
- Add `depositorName: string` (`@IsString()`, required) to `TellerDepositDto`
- Add `depositorPhone?: string` (`@IsString() @IsOptional()`) to `TellerDepositDto`
- Add `denominations: DenominationEntryDto[]` (`@IsArray() @ValidateNested @ArrayMinSize(1)`)
  to `TellerDepositDto` — reuse the existing `DenominationEntryDto` class
- Add `feeAmount: number` (`@IsNumber() @Min(0)`, required — teller enters 0 if no fee applies)
  to `TellerDepositDto`

**`teller.entity.ts` — `ClientTransactionEntity`**
- Add nullable column `depositor_name varchar` — stores who physically deposited the cash
- Add nullable column `depositor_phone varchar` — stores depositor contact

**`teller.enums.ts`**
- Add `DEPOSIT = 'DEPOSIT'` to the `DenominationType` enum

**`teller.entity.ts` — `SessionDenominationEntity`**
- Add nullable column `account_tx_id uuid` — links denomination rows for a deposit to the
  specific `client_transactions` row (null for FLOAT_APPROVAL and EOD_DECLARATION rows)

**`teller.repository.ts`**
- Update `saveAccountTx()` to persist `depositor_name` and `depositor_phone` from the model
- Add `findDenominationsByAccountTx(accountTxId: string)` query for receipt lookup

**`account-tx.model.ts`**
- Add `depositorName: string | undefined` and `depositorPhone: string | undefined` to
  `AccountTxModelProps` and `AccountTxModel`

**`teller.service.ts` — `deposit()`**
- Pass `dto.depositorName` and `dto.depositorPhone` into `AccountTxModel.create()`
- Inside the transaction block, call `repo.saveDenominations()` with type `DEPOSIT`,
  `account_tx_id = tx.id`, using the denominations from `dto.denominations`
- If `dto.feeAmount > 0`, inside the same transaction block:
  - The client account balance is **not affected** by the fee — full `amount` is credited as normal
  - Record the fee as an additional cash-in on the teller's session:
    `session.recordCashMovement(TellerTxType.DEPOSIT, dto.feeAmount, currency)`
    (teller physically received `amount + fee` in cash)
  - Post a fee journal entry: Dr. Teller Cash COA → Cr. Fee Income COA
    (add `postDepositFee()` to `AccountingService`)
  - No second `AccountTxModel` is created — the fee does not appear on the client's account statement

**New migration**
- `ALTER TABLE client_transactions ADD COLUMN depositor_name varchar, ADD COLUMN depositor_phone varchar`
- `ALTER TABLE session_denominations ADD COLUMN account_tx_id uuid NULL`
- Add `'DEPOSIT'` to the `denomination_type_enum` postgres enum

**`receipt.service.ts` — `forAccountTx()`**
- After loading the transaction, if `tx.type === DEPOSIT`:
  - Read `tx.depositor_name` and `tx.depositor_phone`
  - Call `findDenominationsByAccountTx(txId)` to load the denomination rows
- Pass both into `renderAccountTx()`

**`receipt.service.ts` — `renderAccountTx()`**
- For DEPOSIT receipts add a depositor section:
  - "Versé par" → depositor name
  - "Tél" → depositor phone (if present)
- Add a denomination table below the amount section:
  - One row per denomination: `{quantity} × {denomination} = {subtotal}`
  - Final row: total
- If `feeAmount > 0`, show the fee on the receipt:
  - "Frais de service" → fee amount
  - "Total versé" → deposit amount + fee (total cash the depositor handed in)
  - The account balance shown is the post-deposit balance only (fee did not affect it)

---

## 2. Withdrawal fee

When a client withdraws, the teller may charge a fee. The fee is optional and decided entirely
by the teller. For institutional accounts (`BUSINESS_CURRENT`) the convention is 1% of the
withdrawal amount, but the teller can override this to any value including zero.

**How it works:**
- Account is debited the full `amount` (the client's balance decreases by the full amount)
- Teller physically pays out `amount - fee` in cash to the client
- Teller cash position decreases by `amount - fee` (not the full amount)
- Fee is posted to fee income COA — it does not appear on the client's account statement
- The preview endpoint returns a `suggestedFee` so the UI can pre-fill the fee field

### What changes in code

**`teller.dto.ts`**
- Add `feeAmount?: number` (`@IsNumber() @Min(0) @IsOptional()`) to `TellerWithdrawalDto`
- Fee is omitted entirely for check withdrawals and CADECO employee withdrawals
- When omitted, treat as 0 throughout the service logic
- Add `denominations: DenominationEntryDto[]` (`@IsArray() @ValidateNested @ArrayMinSize(1)`)
  to `TellerWithdrawalDto` — the breakdown of bills the teller is paying out

**`teller.policy.ts`**
- Add `static suggestedWithdrawalFee(accountType: AccountType, amount: number): string`:
  returns `(amount × 0.01).toFixed(2)` for `BUSINESS_CURRENT`, `'0.00'` otherwise

**`teller.service.ts` — `withdrawalPreview()`**
- Compute `suggestedFee` via `TellerPolicy.suggestedWithdrawalFee(account.accountType, query.amount)`
- `assertHasCashFor` should be called with `query.amount - suggestedFee` (net cash out)
  but since the teller may override the fee, only the final `withdraw()` call enforces this
- Add `suggestedFee` and `netPayout` to the `WithdrawalPreview` return shape

**`WithdrawalPreview` interface (`teller.service.ts`)**
- Add `suggestedFee: string` — pre-filled hint for the UI
- Add `netPayout: string` — `amount - suggestedFee`, what the client physically receives

**`teller.enums.ts`**
- Add `WITHDRAWAL = 'WITHDRAWAL'` to the `DenominationType` enum

**`teller.service.ts` — `withdraw()`**
- `assertHasCashFor` must check against `dto.amount - (dto.feeAmount ?? 0)` (actual cash paid out),
  not the full `dto.amount`
- Inside the transaction block:
  - Call `repo.saveDenominations()` with type `WITHDRAWAL`, `account_tx_id = tx.id`,
    using `dto.denominations`
  - If `(dto.feeAmount ?? 0) > 0`:
    - `session.recordCashMovement(TellerTxType.WITHDRAWAL, dto.amount - (dto.feeAmount ?? 0), currency)`
      instead of the full `dto.amount`
    - Post a fee journal entry: Dr. Teller Cash COA → Cr. Fee Income COA
      (add `postWithdrawalFee()` to `AccountingService`)
    - The withdrawal journal entry (`postWithdrawal`) still uses the full `dto.amount`
      (account is debited in full)
    - No second `AccountTxModel` — fee does not appear on client's account statement

**`receipt.service.ts` — `forAccountTx()`**
- After loading the transaction, if `tx.type === WITHDRAWAL`:
  - Call `findDenominationsByAccountTx(txId)` to load the denomination rows

**`receipt.service.ts` — `renderAccountTx()`**
- For WITHDRAWAL receipts, show a denomination table (same layout as deposit):
  - One row per denomination: `{quantity} × {denomination} = {subtotal}`
  - Final row: total
- If `feeAmount` was provided and `> 0`:
  - "Frais de service" → fee amount
  - "Montant reçu" → net payout (`amount - fee`), what the client physically walked away with
- If no fee, receipt shows only the withdrawal amount as normal

---

## 3. New role: HEAD_CASHIER (Cassier Principale)

The Cassier Principale is the person responsible for the branch vault and float distribution.
They are the only one who can approve teller session requests and close sessions after EOD
reconciliation. `BRANCH_MANAGER` loses these permissions entirely.
The role is branch-scoped — a HEAD_CASHIER can only act on sessions within their own branch.

### What changes in code

**`user.enums.ts`**
- Add `HEAD_CASHIER = 'HEAD_CASHIER'` to `UserRole`

**`teller.policy.ts`**
- Rename `assertIsBranchManager()` to `assertIsHeadCashier()`
- Change the check to allow `HEAD_CASHIER` only (remove `BRANCH_MANAGER` and `ADMIN`)

**`teller.service.ts`**
- Replace all three calls to `TellerPolicy.assertIsBranchManager()` with `assertIsHeadCashier()`:
  - `approveSession()`
  - `closeSession()`
  - `listPendingReconciliation()`

**New migration**
- Add `'HEAD_CASHIER'` to the `user_role_enum` postgres enum

**Seed**
- Add a seed user with role `HEAD_CASHIER` assigned to a branch

### Future — large withdrawal escalation (needs further discussion)

When a client requests a withdrawal the teller cannot cover from their drawer (e.g. 50,000 FC
or 100,000 FC), the transaction is escalated to the HEAD_CASHIER who processes it directly
from the vault. The exact flow, approval mechanics, and how it affects both the teller's and
the vault's cash position need to be confirmed with Cadeco before any code is written.

⚠️ Blocked — do not implement until flow is agreed with Cadeco.

---

## 4. Transfer fee

When a transfer is processed, a fee of 1% may apply to institutional source accounts
(`BUSINESS_CURRENT`). The teller decides the final amount and can override or waive it.
The fee is a pure book entry — no physical cash moves.

**How it works:**
- Source account is debited `amount + fee` total
- Destination account receives the full `amount` unchanged
- Fee is posted to fee income COA as a separate journal entry
- `TransferEntity.fee_amount` stores the fee (field already exists)
- The receipt already renders the fee when `fee_amount > 0` — no receipt changes needed

### What changes in code

**`teller.dto.ts`**
- Add `feeAmount?: number` (`@IsNumber() @Min(0) @IsOptional()`) to `TellerTransferDto`
- When omitted, treat as 0

**`teller.policy.ts`**
- Add `static suggestedTransferFee(sourceAccountType: AccountType, amount: number): string`:
  returns `(amount × 0.01).toFixed(2)` for `BUSINESS_CURRENT`, `'0.00'` otherwise

**`TransferPreview` interface (`teller.service.ts`)**
- Add `suggestedFee: string` — pre-filled hint for the UI
- Update `source.balanceAfter` to reflect `balance - amount - fee` in the preview

**`teller.service.ts` — `transferPreview()`**
- Compute `suggestedFee` via `TellerPolicy.suggestedTransferFee(source.accountType, query.amount)`
- Return it in the preview response
- `source.balanceAfter` should be `balance - amount - suggestedFee` (indicative only)

**`teller.service.ts` — `transfer()`**
- `sourceNewBalance` becomes `balance - amount - (dto.feeAmount ?? 0)`
- Inside the transaction block, if `(dto.feeAmount ?? 0) > 0`:
  - Post a fee journal entry: Dr. Source Savings COA → Cr. Fee Income COA
    (add `postTransferFee()` to `AccountingService`)
- When saving `TransferEntity` (see TODO 3), set `fee_amount = dto.feeAmount ?? 0`
