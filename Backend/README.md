# Paylift Backend

Production-oriented NestJS REST API for Paylift — restaurant QR ordering, bill splitting, and payment middleware.

## Stack

- Node.js + TypeScript
- NestJS
- PostgreSQL + Prisma ORM
- Redis
- Swagger at `/docs`
- Docker Compose

## Quick start

```bash
# From repo root – start Postgres & Redis
docker compose up -d postgres redis

# Backend setup
cd Backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

API base URL: `http://localhost:3000/api/v1`  
Swagger UI: `http://localhost:3000/docs`

## Demo seed credentials

After seeding, sign in with Apple or Google (mock tokens):

```json
POST /api/v1/auth/sign-in-with-apple
{ "displayName": "Emre", "identityToken": "demo-apple-emre" }

POST /api/v1/auth/sign-in-with-google
{ "displayName": "Deniz", "identityToken": "demo-google-deniz" }
```

Demo QR token for Table 12: `paylift-demo-table-12-token`

## Mobile app scope

The iOS app supports **ordering, bill splitting, and dashboard** only. **In-app payments are intentionally excluded** — guests pay at the restaurant POS. Payment API endpoints remain available for POS middleware integration.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Jest unit tests |
| `npm run prisma:migrate` | Create/apply migrations |
| `npm run prisma:seed` | Load demo data |
| `npm run db:reset` | Reset DB + re-seed |

## Docker (full stack)

```bash
# From repo root
docker compose up --build
```

## Architecture

- **Modular domains**: auth, businesses, branches, tables, sessions, qr, menu, orders, bill, payments, reports
- **Tenant isolation**: `TenantService` + `BusinessAccessGuard`
- **Payments**: idempotent intents, item locking (`lockedByPaymentId` / `lockExpiresAt`), Prisma transactions
- **Audit**: write endpoints emit `AuditLog` records
- **Money**: all amounts stored as integer cents

## Environment

See `.env.example` for required variables.

## Tests

```bash
npm run test
```

Covers QR resolve, bill calculate/split, payment locking/idempotency, and tenant isolation.
