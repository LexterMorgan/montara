# MONTARA Security

Scope source: `docs/PRD.md` §11 + PRD-B2/B4/B6. No unverified claims (no "bank-grade", no compliance badges).

## 1. Rules

- Server asserts session on every private action; queries always scope `user_id = session.userId`. Cross-user access rejected + tested (ACCEPTANCE).
- Validate at boundary: amount/date/category/classification/lengths enforced server-side regardless of client.
- Secrets in env only (`.env.example` lists keys, never values). No secrets in repo/logs.
- Passwords hashed by Better Auth (never custom crypto). Recovery links single-use, expiring, no email enumeration in errors.
- Logs/analytics exclude amounts, merchants, notes, dates. Minimum pilot events only (BUSINESS §5).
- Account delete wipes rows (DATA-MODEL §5); backups age out per /privacy retention. Backup credentials founder-only.
- CSV formula-injection guard (PRD-E3) applied at export, not storage (stored text stays verbatim).

## 2. Reporting

Private channel TBD (founder inbox). State it on /privacy at Stage B. No bug-bounty promise.
