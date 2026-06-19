# KPI & Reporting Specification — Holiday Homes SaaS

> **Version**: 2.0  
> **Last Updated**: 2026-05-31  
> **Chart Library**: Recharts (React)  
> **Export Formats**: PDF (react-pdf), CSV (papaparse), Excel (exceljs)
> **Base Currency**: AED (UAE Dirhams)  
> **Secondary Currency**: USD (US Dollars)

---

## 1. KPI Framework

```
┌─────────────────────────────────────────────────────┐
│                 PLATFORM KPIs                        │
│  (Super Admin) — System health, active organizations│
├─────────────────────────────────────────────────────┤
│              ORGANIZATION KPIs                       │
│  (Org Admin) — Portfolio metrics, fee earnings       │
├────────────────────────┬────────────────────────────┤
│   OPERATIONAL KPIs     │    FINANCIAL KPIs          │
│  (PM, Coordinator)     │    (Accountant)            │
│  Tasks, maintenance    │    Revenue, expenses       │
├────────────────────────┴────────────────────────────┤
│           EXTERNAL KPIs                              │
│  Owner Portal: Real-time booking revenue & payout    │
│  Vendor Portal: Job completion metrics              │
└─────────────────────────────────────────────────────┘
```

---

## 2. Operational KPIs

- **KPI-01: Maintenance Response Time**: Average hours from reported status to triaged status.
- **KPI-02: Maintenance Resolution Time**: Average days from reported status to closed status.
- **KPI-03: Task Completion Rate**: Percentage of cleaning/inspections completed by their scheduled due date.
- **KPI-04: Overdue Tasks Count**: Number of tasks past due date and incomplete.
- **KPI-05: Active Maintenance Requests**: Count of open issues categorized by priority (Emergency, Standard).
- **KPI-06: Property Onboarding Time**: Average days to transition a property from draft state to permit approved and signed active state.

---

## 3. Financial KPIs (Multi-Currency Support: AED & USD)

All financial reports calculate transactions in their native entry currency (USD or AED) and convert them to the organization's base currency (defaulting to AED for the UAE market) for portfolio consolidation.

### KPI-07: Gross Booking Revenue (GBR)
- **Description**: Combined value of all reservations booked within the target period.
- **Formula**:
  $$\text{GBR}_{\text{base}} = \sum (\text{gross\_amount} \times \text{exchange\_rate}) \quad \text{for bookings in period}$$
- **Data Source**: `bookings` (status = 'confirmed', check_in/check_out in period).
- **Visualization**: Metric card + 12-month comparison chart.

### KPI-08: Net Operating Income (NOI) per Property
- **Description**: Gross property booking income minus property-specific maintenance expenses.
- **Formula**:
  $$\text{NOI} = \text{Property Revenue (base)} - \text{Property Maintenance Expenses (base)}$$
- **Data Source**: `journal_lines` filtered by `property_id` and grouped by revenue/expense account codes.
- **Visualization**: Table ranking properties by highest to lowest profitability.

### KPI-09: Trust Escrow Balances
- **Description**: Total client funds held in trust bank accounts (guest deposits, security deposits) which cannot be commingled with operating cash.
- **Formula**:
  $$\text{Trust Cash Balance} = \sum (\text{debit} - \text{credit}) \quad \text{for accounts labeled is\_trust = true}$$
- **Data Source**: `journal_lines` joined to `chart_of_accounts`.
- **Target**: Must equal the sum of active guest deposit liabilities plus owner payout reserves.

### KPI-10: Accounts Receivable (AR) Aging
- **Description**: Outstanding tenant/guest invoices grouped by time (0-30, 31-60, 61-90, 90+ days).
- **Visualization**: Stacked bar chart.

### KPI-11: Accounts Payable (AP) Aging
- **Description**: Unpaid vendor invoices grouped by time buckets.

---

## 4. Owner Portal KPIs

The owner portal calculates metrics in real-time, showing owners exactly what their properties are earning.

### KPI-12: Real-time Booking Revenue (Owner View)
- **Description**: Gross booking revenues from confirmed guest stays at the owner's properties, updated in real-time as reservations are confirmed or completed.
- **Formula**:
  $$\text{Real-time Revenue} = \sum (\text{booking.gross\_amount} \times \text{ownership\_percentage}) \quad \text{for confirmed bookings}$$
- **Visualization**: Highlighted number card showing month-to-date and year-to-date figures.

### KPI-13: Net Owner Payout (Owner View)
- **Description**: Earnings payable to the owner after subtracting management commissions and maintenance costs.
- **Formula**:
  $$\text{Net Payout} = \text{Gross Revenue} - \text{Management Fees} - \text{Maintenance Expenses}$$
- **Visualization**: Monthly income chart.

---

## 5. Dashboard Wireframes

### Dashboard 1: Owner Portal Dashboard (Khalid)
Real-time tracking of unit revenues.

```
┌───────────────────────────────────────────────────────────┐
│ Welcome, Khalid                                           │
├───────────────┬───────────────────────────┬───────────────┤
│ Real-Time MTD │ Total Operating Expenses  │ Est. Net MTD  │
│ AED 34,250.00 │       AED 4,800.00        │ AED 24,312.50 │
│ (Updated Just Now)│                       │               │
├───────────────┴───────────────────────────┴───────────────┤
│                                                           │
│   Real-Time Monthly Revenue (Recharts Area Chart)        │
│                                                           │
├───────────────────────────┬───────────────────────────────┤
│ Property Performance Table│ Documents Awaiting Signature  │
│ • Unit 402: AED 18,200    │ 📝 Management Agreement       │
│ • Villa 12: AED 16,050    │    (Click to sign via DocuSign)│
├───────────────────────────┴───────────────────────────────┤
│ Recent Statements (Download PDF)                          │
│ • May 2026 Statement (AED 22,100 Payout)  [Download]      │
└───────────────────────────────────────────────────────────┘
```

### Dashboard 2: Accountant Financial Dashboard (Fatima)
Replaced automated bank statement matching boards with manual ledger transaction reviews and bank balance cards.

```
┌───────────────┬───────────────┬───────────────┬───────────────┐
│ Operating Cash│  Trust Cash   │ Outstanding AR│ Outstanding AP│
│ AED 142,500   │ AED 380,420   │  AED 15,200   │  AED 8,900    │
└───────────────┴───────────────┴───────────────┴───────────────┘
┌───────────────────────────────────────────────────────────────┐
│ Ledger Balances by Account (Table)                            │
│ • 1010 - Guest Trust Cash: AED 280,000                        │
│ • 1020 - Security Deposit Trust Cash: AED 100,420             │
│ • 2010 - Guest Escrow Liability: AED 280,000                  │
│ • 2020 - Security Deposit Escrow: AED 100,420                 │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────┬───────────────────────────────┐
│ AR Aging Buckets (Bar Chart)  │ AP Aging Buckets (Bar Chart)  │
│ 0-30 days: AED 12,000         │ 0-30 days: AED 6,500          │
│ 31-60 days: AED 3,200         │ 31-60 days: AED 2,400         │
└───────────────────────────────┴───────────────────────────────┘
```

---

## 6. Report Specifications

1. **Property Performance Report**: Scopes revenue, expenses, occupancy, and NOI per property unit.
2. **Double-Entry General Ledger Report**: Outputs standard ledger listings filtered by account code and date ranges.
3. **VAT & Tax Summary Report**: Detailed output of collected 5% UAE VAT from reservation invoices and deductible input VAT from maintenance invoices, configured for Federal Tax Authority (FTA) audit filing.
4. **Owner Statement PDF**: Branded monthly breakdown of gross rents, commission deductions, maintenance charges, and net payouts, exported via `@react-pdf/renderer`.
5. **AR/AP Aging Report**: Detailed lists of overdue client receivables and vendor payables.
6. **WhatsApp Message Log Report**: Audit exports of communication volumes and log status.

---

## 7. Data Aggregation & Snapshot Caching

- **Materialized Views**: Double-entry ledger totals are computed in the database. Materialized views aggregate ledger totals hourly to prevent system lag when building P&L reports.
- **Dynamic Conversion**: Bookings billed in USD are dynamically converted to AED in SQL queries utilizing the stored `exchange_rate` timestamp on `journal_entries`.
- **Cache TTL**: Dashboard revenue numbers are cached for 5 minutes and invalidated immediately on new `booking` confirmations or `journal_entry` postings.
- **Statement Compilation**: Executed on the 1st of each month via scheduled workers. Auto-compiles draft statements for accountant approval.
