# Backend Setup (PostgreSQL on Render)

This backend uses PostgreSQL via `pg` with a pooled connection, compatible with Render’s managed PostgreSQL.

## Environment

Create a `.env` in the backend root with one of the following URLs:

- `DATABASE_URL_EXTERNAL`: External connection URL from Render (use locally)
- `DATABASE_URL_INTERNAL`: Internal URL (only resolves on Render)
- `DATABASE_URL`: Fallback for local development
- `PGSSLMODE=require`
- Email (for OTP): `EMAIL_USER`, `EMAIL_PASSWORD`

See `.env.example` for the template.

## Start

1) Install deps:

```bash
npm install
```

2) Check DB connectivity:

```bash
npm run db:check
```

3) Run server:

```bash
npm run start
```

On startup, the app:
- Verifies DB connectivity (`testConnection`)
- Initializes tables (`initTables`)
- Starts Express

## Database

Connection selection (in `config/database.js`):
- On Render (`RENDER=true`): prefer `DATABASE_URL_INTERNAL`
- Locally: prefer `DATABASE_URL_EXTERNAL`, fallback `DATABASE_URL`
- SSL enabled with `rejectUnauthorized: false`

Tables created if missing:
- `students(id, name, email unique, password, year, registration_date)`
- `admins(id, username, email unique, password)`
- `events(id, title, description, event_date)`
- `payments(id, student_id, purpose, amount, method, date)`
- `event_registrations(id, student_id, event_name, created_at)`

## Routes (high-level)

### Student Authentication
- `POST /api/auth/register` — Register student (returns JWT token)
- `POST /api/login` — Student login (email + password)
- `POST /api/students/register` — Alternative student registration (no JWT)
- `POST /api/students/login` — Alternative student login

### Admin Authentication (Code-Based)
- `POST /api/admins/register-code` — Request admin code via email
- `POST /api/admins/login-code` — Login with code (regNumber + name + code)

### Other Routes
- `GET /api/students` — List students
- `GET /api/admins` — List admins
- `GET /api/events` — List events; `POST /api/events` — Create event
- `POST /api/events/register` — Register for event
- `GET /api/payments` — List payments; `GET /api/payments/summary` — Aggregate
- `POST /api/password-reset/request-otp` — Request OTP
- `POST /api/password-reset/verify-otp` — Verify OTP
- `POST /api/password-reset/reset-password` — Reset password

See [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) for detailed authentication documentation.

## Troubleshooting

- ENOTFOUND for `dpg-...-a`: Use `DATABASE_URL_EXTERNAL` locally; internal hostnames only work on Render.
- Missing `DATABASE_URL`: Ensure `.env` is in backend root and variables are set.
- Email not sent: Check `EMAIL_USER`/`EMAIL_PASSWORD` and provider settings.

## Notes

- Do not print secrets in logs.
- Prefer async/await with `pool.query($1, ...)` placeholders.
