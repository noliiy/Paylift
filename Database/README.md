# Paylift Database

PostgreSQL schema is managed via Prisma in `Backend/prisma/`.

## Local development

```bash
# Start infrastructure
docker compose up -d postgres redis

# Run migrations
cd Backend && npm run prisma:migrate

# Seed demo data
cd Backend && npm run prisma:seed
```

## Migrations

Prisma migrations live in `Backend/prisma/migrations/`. SQL reference copies may be placed in `Database/migrations/` for documentation.

## Seeds

Demo seed script: `Backend/prisma/seed.ts`
