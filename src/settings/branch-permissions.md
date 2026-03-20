# Branch & Permissions Architecture

This document describes how branches, roles, data ownership, and permission enforcement work together in this system.

---

## 1. The Branch Structure

Every branch in the system has a `type`:

- `HEAD` — one per system, this is the headquarters
- `NORMAL` — regular branches (Goma, Bukavu, etc.)

There is no architectural difference between them. The difference is purely in **who works there** and **what role they have**.

---

## 2. Every User Belongs to a Branch

No exceptions. Even HQ staff point to the HQ branch. Their `branch_id` never changes — it is set at creation and reflects where they work.

```
Jean (TELLER)            → branch_id: Goma Branch
Cécile (BRANCH_MANAGER)  → branch_id: Bukavu Branch
Pierre (HQ_MANAGER)      → branch_id: HQ Branch
Admin                    → branch_id: HQ Branch
```

---

## 3. Every Record Belongs to a Branch

At the moment of creation, every important record gets stamped with a `branch_id`. It never changes unless there is a formal transfer action.

| When this happens | This `branch_id` is used |
|---|---|
| Teller registers a client | `client.branch_id = teller.branch_id` |
| Staff opens an account | `account.branch_id = client.branch_id` |
| Loan officer applies for a loan | `loan.branch_id = loan_officer.branch_id` |
| Teller posts a deposit | `transaction.branch_id = account.branch_id` |
| Teller receives a repayment | `repayment.branch_id = loan.branch_id` |
| Any operation posts to ledger | `journal_entry.branch_id = performing_user.branch_id` |

The key rule: **`branch_id` is always inherited, never calculated at query time.**

---

## 4. The Five Roles and What They Can Do

| Role | Scope | Can create/transact | Can view | Can approve |
|---|---|---|---|---|
| `TELLER` | Own branch | Yes — clients, accounts, transactions | Own branch only | No |
| `LOAN_OFFICER` | Own branch | Yes — clients, loans, documents | Own branch only | KYC, documents |
| `BRANCH_MANAGER` | Own branch | Yes — everything at branch level | Own branch only | KYC, loans within authority limit |
| `HQ_MANAGER` | All branches | No — does not perform branch operations | All branches | Escalated loans, KYC overrides |
| `ADMIN` | Entire system | Yes — system config, users, branches | Everything | Everything |

---

## 5. How Permissions Are Enforced (Three Layers)

### Layer 1 — Role check (controller)
> "Is this role allowed to call this endpoint at all?"

A TELLER cannot create a user. An HQ_MANAGER cannot register a client. Enforced by the `@Roles()` decorator on each controller endpoint.

### Layer 2 — Branch scope (repository)
> "Which records can this user see?"

Every query is filtered by the caller's branch. A scope object is built once from the JWT after authentication and passed into every repository call:

```typescript
// Branch-level roles → scoped
{ type: 'branch', branchId: 'kigali-uuid' }

// HQ roles → no filter
{ type: 'global' }
```

| Role | Scope type |
|---|---|
| `TELLER` | `branch` |
| `LOAN_OFFICER` | `branch` |
| `BRANCH_MANAGER` | `branch` |
| `HQ_MANAGER` | `global` |
| `ADMIN` | `global` |

A Goma teller calling `GET /clients` gets only Goma clients. An HQ_MANAGER gets all clients across all branches. Same endpoint, same code — the scope object does the filtering.

### Layer 3 — Ownership check (service)
> "Does the record being acted on belong to my branch?"

For write operations, before doing anything, the service checks that the target record's `branch_id` matches the caller's `branch_id`. This prevents a Goma BRANCH_MANAGER from knowing a Bukavu loan ID and acting on it.

```typescript
if (scope.type === 'branch' && loan.branch_id !== scope.branchId) {
  throw new ForbiddenException();
}
```

---

## 6. How It All Flows — A Real Example

A client walks into Goma Branch to make a loan repayment:

```
1. Teller logs in
      → JWT contains: { userId, role: TELLER, branchId: 'goma' }
      → Scope built: { type: 'branch', branchId: 'goma' }

2. Teller looks up the client
      → Repository adds WHERE branch_id = 'goma'
      → Only Goma clients are returned ✅

3. Teller posts the repayment
      → Service checks: loan.branch_id === 'goma' ✅
      → repayment.branch_id = 'goma'  (inherited from loan)
      → transaction.branch_id = 'goma' (inherited from account)
      → journal_entry.branch_id = 'goma' (from teller's branch)

4. HQ_MANAGER runs end-of-month report
      → Scope: { type: 'global' }
      → No branch filter → aggregates all branches
      → Sees Goma + Bukavu + HQ totals in one query ✅
```

---

## 7. Tables That Carry `branch_id`

### Directly stamped

| Table | Set from |
|---|---|
| `users` | set at user creation |
| `clients` | set at client registration |
| `accounts` | inherited from `client.branch_id` |
| `transactions` | inherited from `account.branch_id` |
| `loans` | set at loan application |
| `repayments` | inherited from `loan.branch_id` |
| `journal_entries` | set from performing user's `branch_id` |
| `chart_of_accounts` | set per branch — `(code, branch_id)` is the unique key |

### Accessed through parent (no `branch_id` needed)

| Table | Accessed through |
|---|---|
| `repayment_schedules` | always queried through a loan |
| `client_documents` | always queried through a client |
| `representative_documents` | always queried through a representative |
| `guardian_documents` | always queried through a guardian |

---

## 8. What Is Not Yet Implemented

The design is fully locked in. What still needs to be built:

| What | Where |
|---|---|
| Build `BranchScope` from JWT after authentication | `auth` module |
| Apply scope filter in every repository | each `*.repository.ts` |
| Add ownership check before every write | each `*.service.ts` |
| Add `branch_id` to `accounts`, `transactions`, `repayments`, `journal_entries`, `chart_of_accounts` entities | when each module is built |
