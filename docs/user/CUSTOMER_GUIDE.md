# Customer Guide (Draft)

## Purpose

This guide will document customer-facing portal flows.

## Planned Flows

- Sign in with organization account
- View project and ticket status
- Create and comment on tickets
- Upload and review attachments

## Login Flow (MVP)

1. Open `http://localhost:3000` and click `Login`.
2. Sign in via Keycloak.
3. After successful login, navigate to `/dashboard` or `/tickets`.
4. Browser calls only web BFF routes (`/api/backend/*`); API tokens stay server-side in the session flow.

## TODO

- Replace placeholders with screenshots and exact navigation paths
