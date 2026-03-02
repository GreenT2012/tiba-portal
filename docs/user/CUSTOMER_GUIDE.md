# Customer Guide (Draft)

## Purpose

This guide will document customer-facing portal flows.

## Planned Flows

- Sign in with organization account
- View project and ticket status
- Create and comment on tickets
- Upload and review attachments

<<<<<<< ours
## Login Flow (MVP)

1. Open `http://localhost:3000` and click `Login`.
2. Sign in via Keycloak.
3. After successful login, navigate to `/dashboard` or `/tickets`.
4. Browser calls only web BFF routes (`/api/backend/*`); API tokens stay server-side in the session flow.

## TODO
=======
## Create Ticket With Attachments (MVP)
>>>>>>> theirs

1. Login and open `/tickets`.
2. Click `New Ticket`.
3. Fill the wizard details step:
   - `projectId`
   - `type`
   - `title`
   - `description`
4. Continue to the attachments step.
5. Select one or more files (allowed: `image/*`, `application/pdf`).
6. Submit `Create Ticket`.
7. The web app will:
   - create the ticket via `/api/backend/tickets`
   - request presigned upload URLs via `/api/backend/tickets/:id/attachments/presign-upload`
   - upload files with HTTP `PUT` to the returned URLs
8. You are redirected back to `/tickets`; uploaded attachments are linked to the created ticket.
