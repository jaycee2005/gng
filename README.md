# G&G Manpower & Professional Services — Integrated Consulting & Staffing System

An integrated management web application for a consulting and staffing agency with three role-specific portals (**Admin/Staff**, **Applicant/Consultant**, and **Employer Client**) and an automated, consent-aware **SMS Dispatch Notification Engine** with native support for **Philippine SMS Gateways** (`+63` / `09XX` Globe, Smart, TNT, TM, and DITO numbers).

---

## 1. Local Development Quick Start

```bash
# 1. Install dependencies (automatically generates Prisma client)
npm install

# 2. Push SQLite schema and seed demo data
npm run db:setup

# 3. Start the development server
npm run dev
```

Open `http://localhost:3000`.

### Demo Accounts (Password: `Password123!`)

| Portal | Role | Email | Notes |
| :--- | :--- | :--- | :--- |
| **Admin / Staff** | `ADMIN` | `admin@consultpro.com` | Full operational + configuration & RBAC access |
| **Admin / Staff** | `STAFF` | `staff@consultpro.com` | Operations access (denied user/role & rule config; denial audited) |
| **Applicant** | `APPLICANT` | `applicant@example.com` | Opted in to SMS (`+15555550200`) |
| **Applicant** | `APPLICANT` | `priya.patel@example.com` | Opted out of SMS (`+15555550202` — notifications suppressed) |
| **Employer** | `EMPLOYER` | `employer@acme.example.com` | Primary contact for **Acme Global Solutions** |
| **Employer** | `EMPLOYER` | `elena@veridian.example.com` | Primary contact for **Veridian Health Systems** |

---

## 2. Philippine SMS Gateway Configuration (`src/lib/sms.ts`)

The system natively normalizes Philippine mobile numbers (`09171234567`, `9171234567`, `639171234567` → `+639171234567`) in [`src/lib/validation.ts`](file:///c:/Users/delat/Desktop/capstone/src/lib/validation.ts) and includes built-in adapters in [`src/lib/sms.ts`](file:///c:/Users/delat/Desktop/capstone/src/lib/sms.ts) for four Philippine SMS gateways:

### Option A: Semaphore SMS Philippines (`SMS_PROVIDER="semaphore"`) — *Best Overall for PH Production*
- **Website**: https://semaphore.co
- **Env Config**:
  ```env
  SMS_PROVIDER="semaphore"
  SMS_PROVIDER_API_KEY="your_semaphore_api_key"
  SMS_SENDER_ID="" # Leave empty to use default "SEMAPHORE" sender name immediately, or set your approved Sender ID
  ```

### Option B: TextBee Android SIM Gateway (`SMS_PROVIDER="textbee"`) — *Best Free Option for Capstone Defense / Real PH SIM*
- **Website**: https://textbee.dev
- **How it works**: Installs the open-source TextBee app on your Android phone and sends SMS through your own **Globe, Smart, or DITO SIM card** (using your regular Unli-Text load for **₱0 per API message** and instant delivery without waiting for NTC Sender ID approval).
- **Env Config**:
  ```env
  SMS_PROVIDER="textbee"
  SMS_PROVIDER_API_KEY="your_textbee_api_key"
  TEXTBEE_DEVICE_ID="your_textbee_device_id"
  ```

### Option C: PhilSMS (`SMS_PROVIDER="philsms"`)
- **Website**: https://philsms.com
- **Env Config**:
  ```env
  SMS_PROVIDER="philsms"
  SMS_PROVIDER_API_KEY="your_philsms_api_token"
  SMS_SENDER_ID="PhilSMS"
  ```

### Option D: IPROG Tech SMS (`SMS_PROVIDER="iprog"`)
- **Website**: https://sms.iprogtech.com
- **Env Config**:
  ```env
  SMS_PROVIDER="iprog"
  SMS_PROVIDER_API_KEY="your_iprog_api_token"
  ```

---

## 3. Deploying to Production (Vercel + Neon PostgreSQL)

This project is configured for **Vercel** with **Neon PostgreSQL**:
- [`prisma/schema.prisma`](file:///c:/Users/delat/Desktop/capstone/prisma/schema.prisma) uses `postgresql` (`DATABASE_URL` + `DATABASE_URL_UNPOOLED`)
- [`package.json`](file:///c:/Users/delat/Desktop/capstone/package.json) runs `prisma generate && next build` and provides `npm run db:init` for one-time schema push + seeding
- [`.env.example`](file:///c:/Users/delat/Desktop/capstone/.env.example) lists all required environment variables (leave `SMS_PROVIDER=""` for simulated demo mode)

### Quick Deploy Steps
1. Push this repository to GitHub (non-deployment files in `docs/` and `archive/` are ignored by `.gitignore` and `.vercelignore`).
2. Import the repository on **Vercel**, then open **Storage → Marketplace → Neon** to attach a free PostgreSQL database (`DATABASE_URL` and `DATABASE_URL_UNPOOLED` are added automatically).
3. Add `JWT_SECRET`, `APP_URL`, and `CRON_SECRET` in **Project Settings → Environment Variables**.
4. Set a one-time **Build Command** override to `npm run db:init && npm run build` and redeploy so tables and demo accounts are created automatically.
