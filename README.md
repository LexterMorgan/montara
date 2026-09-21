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

## [ DATA FLOW ]

```text
+----------------+
|  Expense form  |
+-------+--------+
        |
        v
+----------------+
|  localStorage  |
+-------+--------+
        |
   +----+----+----------------+
   |         |                |
   v         v                v
Overview  Transactions   CSV / JSON
```

## [ LOCAL-FIRST DATA ]

Montara stores expense records in your browser using
`localStorage`.

Your data stays on your device and is not sent to a
Montara server.

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
Browser localStorage
        |
        +--> Overview
        +--> Transactions
        +--> Backup and export
```

There is currently no authentication, backend database,
payment system, or external API.

## [ TECH STACK ]

- Next.js
- React
- TypeScript
- Tailwind CSS
- Browser `localStorage`
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
