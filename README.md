# Paylift

Restaurant QR ordering, bill splitting, and payment middleware.

## Repository structure

| Path | Description |
|------|-------------|
| `Paylift/` | iOS app (Swift/SwiftUI) |
| `Backend/` | NestJS REST API (`/api/v1`) |
| `Database/` | DB documentation |
| `docker-compose.yml` | Postgres, Redis, Backend |

## Backend quick start

```bash
docker compose up -d postgres redis
cd Backend && cp .env.example .env
npm install && npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed
npm run start:dev
```

Swagger: http://localhost:3000/docs

See [Backend/README.md](Backend/README.md) for full documentation.