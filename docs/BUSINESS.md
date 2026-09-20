# MONTARA Business + Pilot

Scope source: `docs/PRD.md` §14–15. No new scope here.

## 1. Positioning

"See what changed in your money." Spending tracker, not accounting/tax/bank/investment. Records user-typed expenses; never claims completeness.

## 2. Why pay vs self-host

Pay for: ops (uptime, backups, recovery, support, cross-device) + zero setup. Self-host free: full tracking, own ops burden. No feature gating — hosted moat is operations, not features.

## 3. Retention risk

Manual entry = churn vector. Counter: sub-10s entry (PRD §5.9), weekly review ritual, signals give reason to return. If week-2 return <40%, fix entry before charging.

## 4. Payment process (manual pilot first)

Manual: transfer/QRIS → founder confirms ≤24h → entitlement `active`. Renewal manual. Grace: 14-day read-only on late payment, export always works. Cancel = one action + export prompt. Refunds case-by-case, stated on /pricing.
Automation deferred until ≥5 payers renew once. Shortlist Xendit/Midtrans for IDR — unverified; verify fees, webhooks, duplicate-event handling before commit. Never handle raw card details.

## 5. Pilot scorecard

Events (minimum, no amounts/merchants/notes to third parties): first-save, entry duration, W1/W2 return, multi-day recording, signal opened, drill-to-transactions, willingness-to-pay, conversion, renewal, stop reason.
Thresholds (hypotheses): first-save ≥60% session 1; median entry <10s week 2; week-2 return ≥40%; signal open ≥30%; conversion ≥3/10; renewal ≥60%. Miss any two → pause charging, fix entry/return.

Recruit 5–10 via personal networks. Enthusiasm ≠ payment: ask for payment, not opinions.

## 6. Unit economics (illustrative, verify all)

`margin = price − payment_fees − (host + db + mail + monitoring)/payers − support_hours×hourly_value`. Price Rp29.000/mo hypothesis. All vendor prices variables until quoted. Gross revenue never called profit. Dev effort sunk, excluded from monthly margin.

## 7. License tradeoff (founder decides, no LICENSE file yet)

MIT: max adoption, forks can close + compete hosted. AGPL-3.0: hosted forks must share source, moat for paid host, some corps avoid it. Recommendation: AGPL-3.0 if hosted revenue matters; MIT if distribution matters most. Trademark stays founder-owned either way.
