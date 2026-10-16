# VEYRA

A clean uptime monitoring platform for websites and APIs, built to keep services healthy, visible, and easy to manage.

## Architecture

![VEYRA working architecture](./architecture.svg)

## Highlights

- Scheduled checks for URLs and API endpoints
- Response time, status code, and error tracking
- Incident grouping for continuous downtime periods
- Secure user-based monitor management
- Public status visibility for selected monitors
- Email alerts for downtime and recovery events
- React dashboard paired with a robust backend service layer

## Tech stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: Supabase + PostgreSQL
- Auth: JWT + Argon2
- Validation: Zod
- Scheduling: node-cron
- Alerts: Resend

## How it works

1. Users create monitors and define check intervals.
2. The app runs automated health checks in the background.
3. Results are stored and analyzed for service health.
4. Downtime is grouped into incidents and surfaced in the dashboard.
5. Public status can be shared for selected services.

## Getting started

```bash
npm install
npm run dev
```

## Project structure

```text
app/        frontend dashboard
src/        backend API and services
public/     static frontend assets
scripts/    automation and audit utilities
```

VEYRA is designed to make uptime monitoring feel simple, reliable, and actionable for modern teams.- **Email:** Resend needs a verified sender/domain for real delivery. Treat as in progress until tested end to end.
- **False alerts:** no retry or failure threshold yet.
- **Single region:** one location checks everything, so a network issue on the VEYRA side looks like downtime.
- **No metrics/tracing:** logs only.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| Monitor never checked | `active` is false, or scheduler not started |
| Email not arriving | Resend sender/domain not verified, or bad `RESEND_API_KEY` |
| 401 on every request | Missing `Authorization: Bearer <JWT>` or wrong `JWT_SECRET` |
| Duplicate checks | More than one backend instance running |
| Supabase permission error | RLS / grants not set for the table |
| Container exits at start | `.env` missing or variable names wrong |


## Stack

| Layer | Tech |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Database | Supabase, PostgreSQL |
| Auth | JWT, Argon2 |
| Validation | Zod |
| Scheduler | node-cron |
| Email | Resend |
| Infra | Docker |
| Tools | Git/GitHub, Postman |

## Setup

```bash
git clone https://github.com/Brijnandan11/Veyra
cd veyra
npm install
cp .env.example .env
npm run dev
```

### Environment variables

```env
PORT=3000

SUPABASE_URL=
SUPABASE_SECRET_KEY=

JWT_SECRET=

RESEND_API_KEY=
EMAIL_FROM=
```


### Docker

```bash
docker build -t veyra:latest .

docker run -d \
  --name veyra-api \
  --restart unless-stopped \
  --env-file .env \
  -p 3000:3000 \
  veyra:latest

docker logs -f veyra-api
```

## Scripts


- `npm run dev` starts the API in development.
- `npm start` starts the API.
- `npm test` runs the tests.

## Research

- "uptime monitoring incident state machine"
- "node-cron vs BullMQ repeatable jobs"
- "SSRF protection node.js"
- "Resend domain verification"