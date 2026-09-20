# MONTARA Data Model

Scope source: `docs/PRD.md` §11. Minimum tables only.

## 1. Profile / preferences (`profiles`)

| Field | Type | Notes |
|---|---|---|
| `user_id` | UUID PK/FK → auth user | one row per user, cascade delete |
| `timezone` | TEXT NOT NULL DEFAULT 'Asia/Jakarta' | decides "today"; change recomputes immediately |
| `week_start` | SMALLINT NOT NULL DEFAULT 1 | fixed Monday; display-only, no user change Stage A |
| `last_category_id` | UUID NULL FK → categories | repeat-entry default |
| `last_classification` | TEXT NULL CHECK IN ('personal','work') | repeat-entry default |
| `created_at` / `updated_at` | TIMESTAMPTZ | server-set; updated on pref change |

## 2. Expenses (`expenses`)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL FK → auth user, cascade delete | ownership; every query scopes here |
| `amount_idr` | BIGINT NOT NULL CHECK (1..9999999999) | integer rupiah; no floats anywhere; 64-bit (exceeds int32) |
| `date` | DATE NOT NULL | date-only, no time |
| `category_id` | UUID NOT NULL FK → categories restrict-delete | rename = instant (join by id); delete blocked while referenced |
| `classification` | TEXT NOT NULL CHECK IN ('personal','work') | |
| `merchant` | VARCHAR(60) NULL | trimmed |
| `note` | VARCHAR(200) NULL | trimmed |
| `payment_method` | VARCHAR(30) NULL | optional free text (PRD §5.1) |
| `idempotency_key` | UUID NOT NULL; UNIQUE(`user_id`, `idempotency_key`) | repeat-submit guard (PRD §5.7) |
| `created_at` / `updated_at` | TIMESTAMPTZ server-set | updated_at on edit |

Indexes: `(user_id, date DESC)`, `(user_id, category_id)`, `(user_id, classification)`. No amount/merchant/note in logs/analytics.

## 3. Categories (`categories`)

`id` UUID PK; `user_id` FK cascade; `name` VARCHAR(40) NOT NULL; `archived` BOOL DEFAULT false; `created_at`. UNIQUE(user_id, lower(name)) — ponytail: case-insensitive guard at app layer acceptable ceiling; DB citext upgrade path. Seed list per PRD §5.10.

## 4. Pilot entitlements (`entitlements`, Stage B)

`user_id` PK/FK cascade; `status` CHECK IN ('trial','active','past_due','canceled','export_only'); `current_period_end` DATE NULL; `updated_at`. Billing module reads this; `BILLING_ENABLED=false` skips checks (self-host).

## 5. Deletion / backups

Account delete → cascade wipes user rows (auth user + profiles + categories + expenses + entitlements). Backups: encrypted snapshots, retention stated on /privacy; deleted data ages out with retention, restores never resurrect deleted accounts past retention. Backup access: founder-only credentials, no expense details in backup logs.
