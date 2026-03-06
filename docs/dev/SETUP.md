# Local Setup

## Prerequisites

- Node.js 20.x
- Corepack enabled
- Docker + Docker Compose

## Steps

1. Copy environment files:
   - `cp .env.example .env`
   - `cp apps/api/.env.example apps/api/.env`
   - `cp apps/web/.env.example apps/web/.env.local`
   - Set `apps/api/.env` values for `KEYCLOAK_ISSUER` and `DATABASE_URL` for your local setup.
   - Ensure `MINIO_BUCKET` exists in MinIO (default: `tiba-portal`), either via MinIO Console (`http://localhost:9001`) or by creating it once with `mc mb`.
   - Set `apps/web/.env.local` values for `NEXTAUTH_SECRET`, `KEYCLOAK_CLIENT_SECRET`, and confirm `BACKEND_BASE_URL`.
   - Keycloak setup for web login:
     - Create client `web` in realm `tiba`.
     - Set client type to OpenID Connect, confidential.
     - Add redirect URI: `http://localhost:3000/api/auth/callback/keycloak`.
     - Add post-logout redirect URI: `http://localhost:3000`.
   - Keycloak setup for API provisioning:
      - Create confidential client `api-admin` in realm `tiba`.
      - Enable service accounts.
      - Grant realm-management roles: `view-users`, `manage-users`, `view-realm`, `manage-realm`.
      - Set `KEYCLOAK_ADMIN_CLIENT_ID=api-admin` and `KEYCLOAK_ADMIN_CLIENT_SECRET` in `apps/api/.env`.
2. Start infrastructure:
   - `docker compose up -d`
   - `pnpm -C apps/api prisma:migrate`
3. Install workspace dependencies:
   - `corepack enable pnpm`
   - `pnpm install`
4. Start apps:
   - `pnpm dev`

## Integration Notes

- The web app never calls Nest directly from the browser. All browser requests go through `apps/web/app/api/backend/[...path]/route.ts`.
- BFF-originated errors and API errors are normalized to the same JSON error envelope:
  - `{ "error": { "code": "...", "message": "...", "statusCode": 400, "details": ...? } }`
- If Keycloak admin provisioning is configured incorrectly, `/api/v1/users*` returns `502` with a safe error message; inspect API logs for upstream details.
- Attachment uploads require:
  - `MINIO_ENDPOINT`
  - `MINIO_ACCESS_KEY`
  - `MINIO_SECRET_KEY`
  - `MINIO_BUCKET`
  - and an existing bucket in MinIO
- Useful local checks:
  - `http://localhost:3000/api/auth/session`
  - `http://localhost:3001/api/v1/health`
  - `http://localhost:3001/api/docs`

## Migration Troubleshooting

- If `pnpm -C apps/api prisma:migrate` fails against an older local Postgres volume, verify that your local DB is not in drift.
- A known symptom is:
  - `column Project.is_archived does not exist`
- In that case the local database predates current migrations. Use a clean local database or an explicit local reset workflow before trusting runtime results.
- Do not assume production risk from this symptom alone; it commonly indicates stale local state, not a broken migration chain.

## URLs

- Web: [http://localhost:3000](http://localhost:3000)
- API Health: [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)
- API Swagger: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- Keycloak: [http://localhost:8080](http://localhost:8080)
- MinIO Console: [http://localhost:9001](http://localhost:9001)

## Login/Logout Check

1. Open `http://localhost:3000` in an incognito window and verify redirect to `/login`.
2. Click `Sign in with Keycloak` and verify Keycloak shows the login screen.
3. Login and verify you land on `/dashboard` (or another authenticated route).
4. Click navbar `Logout` and verify redirect back to `/login`.
5. Open `/api/auth/session` and verify it returns `null` after logout.
6. For BFF/API error verification, call a protected endpoint without a valid session and verify the response keeps the JSON error envelope.

## Quality Checks

- Primary local quality pipeline:
  - `pnpm -C apps/api test`
  - `pnpm -C apps/api build`
  - `pnpm -C apps/web build`
  - `pnpm -r lint`
  - `pnpm -r build`
- Current automated regression focus:
  - service-centered tenant enforcement
  - `404` for hidden tenant-fremde Einzelressourcen
  - standardized API error envelope
  - BFF/web error normalization helpers
- Still requiring manual verification with live services:
  - real Keycloak login/logout
  - real MinIO upload/download
  - full browser-level end-to-end flows
