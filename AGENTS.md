# Microfinance Backend — Architecture Guide

This document describes the architecture of this codebase. It is intended for:
- Developers joining the project
- AI assistants being used to work on this codebase

Read this before writing or modifying any code.

---

## Stack

- **Framework:** NestJS (Node.js)
- **Language:** TypeScript (strict)
- **Validation:** class-validator + class-transformer (global ValidationPipe in main.ts)
- **Database:** Not yet wired — repositories use in-memory stores. See [Adding a Database](#adding-a-database).

---

## Core Architecture Principle

> **Push business logic down. Push infrastructure out.**

Business logic belongs on the **domain model** — as close to plain TypeScript as possible.
Infrastructure (HTTP, database, events) belongs at the edges and never bleeds inward.

This makes rules testable without mocking, reusable across services, and extractable into microservices later.

---

## Module Structure

Every domain module follows this flat file layout:

```
<module>/
├── <module>.enums.ts          — all enums for this module (status, type, etc.)
├── <module>.model.ts          — domain model: business rules & state transitions
├── <module>.entity.ts         — DB record shape (plain interface; no ORM decorators yet)
├── <module>.mapper.ts         — converts entity ↔ model. Only file that knows both.
├── <module>.repository.ts     — data access. Hides the DB from the service.
├── <module>.policy.ts         — eligibility rules that need external context
├── <module>.dto.ts            — request/response validation shapes
├── <module>.service.ts        — orchestration: fetch → check policy → call model → save
├── <module>.controller.ts     — HTTP layer only: parse request, call service, return result
└── <module>.module.ts         — NestJS module wiring
```

### When to split into subfolders

Do **not** split into subfolders (controllers/, domain/, etc.) pre-emptively.
Split only when a specific pain appears:

| Pain | Response |
|---|---|
| Service file exceeds ~300 lines | Split into `application/` use-case files |
| Multiple controllers needed (REST + admin + webhooks) | Move to `controllers/` folder |
| Extracting to a microservice | Move to full Clean Architecture folders |
| Repository needs multiple implementations | Promote to `infrastructure/` folder |

---

## Layer Responsibilities

### `<module>.controller.ts`
HTTP only. Receives a request, calls the service, returns the result.
**No business logic. No direct repository access.**

```ts
@Post(':id/approve')
approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveLoanDto) {
  return this.loanService.approve(id, dto);
}
```

### `<module>.service.ts`
Orchestration only. Coordinates the steps of a use case.
**No business rules. No raw SQL or ORM queries.**

The pattern is always:
1. Fetch what is needed (via repository)
2. Check external eligibility (via policy)
3. Tell the domain model to act (model enforces its own rules)
4. Persist the result (via repository)

```ts
async approve(loanId: string, dto: ApproveLoanDto): Promise<LoanModel> {
  const loan = await this.findOrFail(loanId);
  loan.approve(dto.approverId); // model enforces: must be PENDING
  await this.loanRepository.save(loan);
  return loan;
}
```

### `<module>.model.ts`
**The most important file in the module.**

A plain TypeScript class with no NestJS, no TypeORM, no external dependencies.
Owns the domain object's lifecycle and all rules that only need data already on the object.

```ts
approve(approverId: string): void {
  if (this.status !== LoanStatus.PENDING) {
    throw new Error(`Cannot approve a loan in status: ${this.status}`);
  }
  this.status = LoanStatus.APPROVED;
  this.approvedBy = approverId;
  this.approvedAt = new Date();
}
```

When a business rule changes, **this is the one file you touch.**
Every caller automatically gets the updated rule — no grep required.

### `<module>.policy.ts`
Business rules that require external context — data not on the domain object itself.

```ts
// The loan does not know how many other loans the member has.
// The policy does.
static assertCanApply(activeLoansCount: number): void {
  if (activeLoansCount >= MAX_ACTIVE_LOANS) {
    throw new ForbiddenException(...);
  }
}
```

Static methods are fine when the service pre-fetches the data.
Make the policy `@Injectable()` when it needs to fetch its own data.

### `<module>.repository.ts`
All database access. The service depends on the repository, never on ORM directly.

When you add a real database, **only this file changes.** The service, model, and policy stay untouched.

### `<module>.entity.ts`
The DB record shape. Uses snake_case to mirror actual DB column conventions.
Currently a plain TypeScript interface. When TypeORM is added, this becomes a class with `@Entity()` and `@Column()` decorators.

### `<module>.mapper.ts`
Translates between `LoanRecord` (DB shape, snake_case) and `LoanModel` (domain shape, camelCase).
This is the **only file** that knows about both. If a DB column is renamed, you fix it here — nowhere else.

### `<module>.dto.ts`
Input validation using class-validator decorators. Defines the contract for each endpoint.
DTOs are for incoming requests. The model is returned directly from the service for now.

---

## Decision Rules: Where Does New Code Go?

Use this when you are unsure where to put something.

| What you are adding | Where it goes |
|---|---|
| A state transition rule ("can only close if ACTIVE") | `model.ts` method |
| A business calculation ("total repayable amount") | `model.ts` method |
| A rule that needs DB data ("member can't have 2 active loans") | `policy.ts` |
| A rule about who is allowed to do something (roles/permissions) | `policy.ts` |
| Coordinating multiple steps for a use case | `service.ts` |
| A new HTTP endpoint | `controller.ts` |
| A new query or persistence operation | `repository.ts` |
| Input shape for a new endpoint | `dto.ts` |
| A new column in the DB | `entity.ts` + `mapper.ts` |

---

## Loan Module — Current Implementation

### Lifecycle (state machine)

```
PENDING ──► APPROVED ──► ACTIVE ──► CLOSED
   │                        │
   └──► REJECTED            └──► DEFAULTED
```

Transitions are enforced by `LoanModel` methods. Calling a method in the wrong state throws immediately.

### Loan Types

`INDIVIDUAL` | `GROUP` | `EMERGENCY` | `BUSINESS` | `AGRICULTURAL`

Each type has its own maximum loan amount defined in `loan.policy.ts`.

### Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/loans` | Submit a loan application |
| POST | `/loans/:id/approve` | Approve a pending loan |
| POST | `/loans/:id/reject` | Reject a pending loan |
| POST | `/loans/:id/disburse` | Disburse an approved loan |
| POST | `/loans/:id/close` | Close an active loan (fully repaid) |
| GET | `/loans` | List all loans |
| GET | `/loans/:id` | Get a single loan |

### Interest Calculation

Currently uses **flat interest**:

```
totalRepayable = principal + (principal × annualRate × termMonths / 12)
monthlyInstalment = totalRepayable / termMonths
```

When repayment schedules are built, this calculation moves to a dedicated `RepaymentSchedule` domain object.

---

## Adding a Database

The repository is the only layer that changes. Steps:

1. Install TypeORM or Prisma
2. Convert `loan.entity.ts` from a plain interface to a `@Entity()` class (TypeORM) or update `schema.prisma` (Prisma)
3. Replace the `Map` in `loan.repository.ts` with real queries
4. Nothing else changes

The mapper, model, policy, service, and controller are all database-agnostic.

---

## Adding a New Module

Copy the loan module structure. For each new module, ask:

1. What are the lifecycle states and types? → `*.enums.ts`
2. What are the state transitions and their rules? → `*.model.ts` methods
3. What eligibility rules depend on external data? → `*.policy.ts`
4. What does the DB record look like? → `*.entity.ts` + `*.mapper.ts`
5. What HTTP actions are needed? → `*.controller.ts` + `*.dto.ts`

---

## What Not To Do

- Do not put `if/else` business rule checks in `*.service.ts` — put them on the model
- Do not import TypeORM or Prisma in `*.model.ts` or `*.policy.ts`
- Do not access the repository directly from a controller
- Do not add ORM decorators to `*.model.ts` — that file must stay framework-free
- Do not create subfolders until you feel the pain that justifies them
