# Electropico Split Sheet V1

A private, single-label web app for creating, signing, completing, and distributing songwriter split agreements.

## What is included

- Private Electropico admin dashboard
- Two, three, or four songwriter profiles per agreement
- Dynamic signer and signature sections
- Composition split validation: must total 100%
- Separate sound-recording ownership validation: must total 100%
- Private signing link for each songwriter
- Drawn electronic signatures
- Status tracking: Draft, Waiting for Signatures, Completed
- Editing before completion; any edit invalidates signatures and creates fresh signing links
- Automatic final PDF generation after the last signature
- Private PDF storage in Supabase
- Automatic delivery of the completed PDF to every songwriter through Resend
- Locked completed agreements

## Technology

- Next.js App Router + TypeScript
- Supabase Postgres and Storage
- Resend email delivery
- pdf-lib PDF generation
- Vercel-ready deployment

## 1. Create the Supabase project

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql` in full.
4. In Project Settings → API, copy:
   - Project URL
   - `service_role` key

The storage bucket is created by the SQL script and remains private.

## 2. Configure email

1. Create a Resend account.
2. Add and verify the Electropico sending domain.
3. Create an API key.
4. Use a verified sender in `EMAIL_FROM`, for example:

```env
EMAIL_FROM=Electropico Records <agreements@electropico.world>
```

During initial testing, Resend may restrict delivery until the domain is verified.

## 3. Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Then open `http://localhost:3000`.

Required environment variables:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=Electropico Records <agreements@yourdomain.com>
ADMIN_PASSWORD=choose-a-strong-password
SESSION_SECRET=choose-a-long-random-secret
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code or commit `.env.local`.

## 4. Deploy on Vercel

1. Push this project to a private GitHub repository.
2. Import the repository into Vercel.
3. Add every environment variable from `.env.example` in Vercel Project Settings.
4. Set `NEXT_PUBLIC_APP_URL` to the final production URL, such as `https://splits.electropico.world`.
5. Deploy.
6. Add the custom subdomain in Vercel and create the requested DNS record with the Electropico domain provider.

## Workflow

1. Electropico logs into the private dashboard.
2. Create an agreement and choose exactly two, three, or four songwriters.
3. Confirm composition and master totals are both 100%.
4. Send signature requests.
5. Each songwriter reviews the complete split sheet and signs through a private link.
6. After the final signature, the server:
   - generates the executed PDF,
   - stores it privately,
   - locks the agreement,
   - emails the PDF to every songwriter.

## Important operational notes

- Editing a pending agreement deletes prior signatures and creates new private signing tokens.
- Completed agreements cannot be edited.
- The final email status is visible on the agreement page.
- If final email delivery fails, the PDF remains safely stored and downloadable from the admin dashboard.
- The included wording is based on the generic Electropico split form and should be reviewed for the needs of each release and jurisdiction.

## Production hardening recommended after V1

- Replace the shared admin password with Supabase Auth and individual staff accounts.
- Add an audit-event table recording invitations, views, signatures, IP addresses, and delivery events.
- Add a final-email retry button and delivery log.
- Add rate limiting to public signing endpoints.
- Add automated backups and retention rules.
- Add an Electropico logo file and branded email/PDF assets.
