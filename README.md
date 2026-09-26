<div align="center"><img src="./public/montara-logo.png" alt="Montara logo" width="320" />



<pre>
                         mntr//

             SEE WHAT CHANGED IN YOUR MONEY.

+--------------------------------------------------+
|  local-first spending tracker                    |
|  record  ->  compare  ->  understand             |
+--------------------------------------------------+
</pre>

<a href="https://montara-9on.pages.dev">Live App</a>
&nbsp;·&nbsp;
<a href="https://github.com/LexterMorgan/montara">Source</a>

</div>

## [ DOCUMENTATION ]

- `docs/PRD.md` — source of truth (scope, calculations, signals)
- `docs/DESIGN.md` — visual system + wireframes
- `docs/ARCHITECTURE.md` — stack + boundaries (Supabase sync replaces the old Better Auth/Prisma Stage B plan)
- `docs/DATA-MODEL.md` — tables + deletion (single `expenses` table for sync)
- `docs/BUSINESS.md` — pilot price experiment (Rp29.000/mo hypothesis)
- `docs/ACCEPTANCE.md` — traceable checklist
- `docs/ROADMAP.md` — 8 vertical slices
- `docs/superpowers/specs/2026-09-26-cross-device-sync-design.md` — sync spec
- `SECURITY.md`, `CONTRIBUTING.md` — root

## Storage modes

- **Signed out (default):** expenses live in `localStorage` (`montara.expenses.v1`) on this device only. No account, no network.
- **Signed in (optional):** Supabase Postgres is the source of truth. Writes need internet and the UI confirms only after Supabase succeeds; failures keep the form or previous data with an error.
- **First import:** after the first sign-in, the Sync control offers to import existing local expenses once (`Import N local`). Import upserts by existing UUIDs (idempotent, keeps timestamps) and clears local data only after Supabase confirms every row.
- **Sign-out:** clears synced expense data from the device and returns to an empty local workspace. Theme and preferences stay.
- Preferences (profile name, last category, theme) always stay in `localStorage` and never sync.

## Sync setup (optional)

Without these variables Montara builds and runs in local mode; Sync shows “unavailable”.

```text
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Both are browser-safe public values. Never put a secret or `service_role` key in a `NEXT_PUBLIC_` variable — it ships to the browser.

Dashboard steps (owner only, nothing is automated):

1. Create a Supabase project, then apply `supabase/migrations/20260926123247_create_expenses.sql` (table, constraints, grants, per-operation RLS).
2. In Supabase Auth → URL Configuration, allow exactly `http://localhost:3000/overview` (dev) and `https://<your-pages-domain>/overview` (prod) as redirect URLs.
3. Copy the project URL + publishable key into `.env.local` (dev) and Cloudflare Pages → Settings → Environment Variables (prod).
4. Supabase’s default email service only delivers reliably to project-team addresses. Before inviting public users, set a custom SMTP provider in Supabase Auth → Email; no app code change needed.

## [ ABOUT ]

Montara is a fast, local-first spending tracker.

Record an expense, switch between time periods, and see
where your money moved without creating an account.

## [ CORE LOOP ]

1. Record an expense.
2. Compare Day, Week, Month, or Year.
3. Review totals and spending signals.
4. Inspect the transactions behind the change.

## [ FEATURES ]

- Quick expense recording
- Day, Week, Month, and Year views
- Category totals and spending signals
- Personal and Work classifications
- Transaction search and filters
- Merchant memory suggestions
- CSV export and import
- JSON backup and restore
- Undo after deleting an expense
- Light and Dark themes
- Responsive mobile layout
- No account required
- Optional Supabase cross-device sync

## [ DATA FLOW ]

```text
+----------------+
|  Expense form  |
+-------+--------+
        |
        v
+----------------+
| Expense store  |
+-------+--------+
        |
   +----+----+----------------+
   |         |                |
   v         v                v
Overview  Transactions   CSV / JSON
```

The expense store uses localStorage while signed out and Supabase while signed in.

## [ LOCAL-FIRST DATA ]

While signed out, Montara stores expense records in your browser using
`localStorage`.

Local-mode data stays on your device. Optional sync stores expenses in Supabase.

Data is separate per browser and device. Clearing browser
site data can remove your records, so export a CSV or JSON
backup regularly if the data matters.

## [ ARCHITECTURE ]

```text
Next.js App Router
        |
        v
React + TypeScript
        |
        v
localStorage / Supabase
        |
        +--> Overview
        +--> Transactions
        +--> Backup and export
```

Optional sync uses Supabase Auth and Postgres. There is no custom backend,
payment system, realtime subscription, or offline sync queue.

## [ TECH STACK ]

- Next.js
- React
- TypeScript
- Tailwind CSS
- Browser `localStorage`
- Supabase Auth and Postgres (optional)
- Static export
- Cloudflare Pages

## [ PROJECT STRUCTURE ]

```text
montara/
├── app/             # Pages and layouts
├── components/      # Reusable UI components
├── lib/              # Storage and calculation helpers
├── public/           # Logo and static assets
├── docs/             # Product and design documentation
├── package.json
└── next.config.ts    # Static export configuration
```

## [ RUN LOCALLY ]

```bash
git clone https://github.com/LexterMorgan/montara.git
cd montara
npm install
npm run dev
```

Open http://localhost:3000.

## [ VERIFY ]

```bash
npm run typecheck
npm test
npm run build
```

The production export is written to `out/`.

## [ DEPLOY ]

For Git-connected Cloudflare Pages, use production branch `main`, build command
`npm run build`, and output directory `out`. Set both `NEXT_PUBLIC_SUPABASE_*`
variables before building; they are embedded in the browser bundle at build time.

For a manual deployment:

```bash
npm run build
npx wrangler pages deploy out --project-name montara
```

## [ DESIGN PRINCIPLES ]

```text
LOCAL-FIRST
FAST ENTRY
CLEAR HIERARCHY
USEFUL DEFAULTS
KEYBOARD-FRIENDLY
MOBILE-READY
MINIMAL DEPENDENCIES
NO UNNECESSARY ACCOUNTS
```

## [ SCOPE ]

Montara is a personal spending tracker.

It is not banking, accounting, tax, investment, or
financial advice software.

## [ LICENSE ]

No license has been selected yet.
