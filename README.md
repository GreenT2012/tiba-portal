# TIBA Portal Monorepo

Baseline scaffold for a self-hosted customer portal and internal dashboard.

## Workspaces

- `apps/web` - Next.js app router frontend (customer + internal views)
- `apps/api` - NestJS API with Prisma skeleton
- `packages/shared` - shared TypeScript + Zod contracts

## Quick Start

1. Copy env templates:
   - `cp .env.example .env`
   - `cp apps/api/.env.example apps/api/.env`
2. Start local infra:
   - `docker compose up -d`
3. Install dependencies:
   - `corepack enable pnpm`
   - `pnpm install`
4. Start apps:
   - `pnpm dev`

See docs in `docs/` for setup and architecture details.
