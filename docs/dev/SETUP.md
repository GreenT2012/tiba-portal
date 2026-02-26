# Local Setup

## Prerequisites

- Node.js 20.x
- Corepack enabled
- Docker + Docker Compose

## Steps

1. Copy environment files:
   - `cp .env.example .env`
   - `cp apps/api/.env.example apps/api/.env`
   - Set `apps/api/.env` values for `KEYCLOAK_ISSUER` and `DATABASE_URL` for your local setup.
2. Start infrastructure:
   - `docker compose up -d`
3. Install workspace dependencies:
   - `corepack enable pnpm`
   - `pnpm install`
4. Start apps:
   - `pnpm dev`

## URLs

- Web: [http://localhost:3000](http://localhost:3000)
- API Health: [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)
- API Swagger: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- Keycloak: [http://localhost:8080](http://localhost:8080)
- MinIO Console: [http://localhost:9001](http://localhost:9001)
