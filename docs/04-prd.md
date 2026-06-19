# Product Requirements Document (PRD) — Holiday Homes SaaS

> **Version**: 2.0  
> **Last Updated**: 2026-05-31  
> **Product**: All-in-one Holiday Home Property Management Platform  
> **Target Market**: UAE (Dubai DTCM Compliance)  
> **Auth Engine**: In-House Session-Based Authentication

---

## 1. Product Vision & Overview

**Vision**: To be the definitive property management and accounting platform for holiday home operators in the UAE, replacing spreadsheets and fragmented tools with a single compliant system. 

**Core Differentiators**:
- **Built-in Double-Entry Trust Accounting**: Keeps owner payouts and guest deposits legally segregated from operational cash, aligned with real-time booking activity.
- **Uplisting Channel Integration**: A native booking engine that synchronizes rates, inventory, and reservations dynamically across multiple OTAs via Uplisting.
- **In-house Identity Management**: Full tenant and role management without external auth provider dependencies.
- **UAE VAT and DTCM Readiness**: Standard tax receipts, calculations, and short-term rental permits built directly into property and invoicing workflows.
- **Centralized WhatsApp Inbox**: Full-history chat logging enabling property managers to converse directly with guests, owners, and vendors.

---

## 2. User Personas

- **Ahmed (Org Admin/CEO)**: Needs portfolio performance metrics, real-time company management fee reports, and oversight of active properties.
- **Sarah (Property Manager)**: Onboards properties, coordinates tasks (cleans, inspections), triages maintenance, and interacts with guests.
- **Fatima (Accountant)**: Reviews the general ledger, records payments, runs double-entry adjustments, and generates monthly owner payouts.
- **Khalid (Property Owner)**: Uses the Owner Portal to check his single-unit properties, track real-time booking revenue, and sign management agreements.
- **Raj (Vendor)**: Uses the Vendor Portal to accept maintenance work orders, submit quotes, upload completion pictures, and invoice the company.

---

## 3. Module Specifications

### Module 1: Dashboard
- Role-specific screens (Admin, PM, Accountant, Owner, Vendor).
- **Owner View**: Prominently features a real-time booking revenue tracker alongside expense lists and monthly statements.

### Module 2: Properties
- **Single-Unit Constraint**: Designed specifically around single units (apartments or villas). Multi-unit sub-rentals are disabled.
- **Compliance**: Property onboarding requires entering valid **DTCM Permit Numbers** and **Expiry Dates** to proceed to active status.

### Module 3: Booking Engine & Channel Sync
- **Direct Reservations**: Native engine allows manual booking entry or guest payment processing.
- **Uplisting Sync**: Integrates with Uplisting APIs. Inbound webhook listeners capture OTA bookings (Airbnb, Booking.com, VRBO) and map them to guest contacts and property calendars. Outbound API calls push direct booking blocks to Uplisting.
- **Multi-Gateway Integration**: Seamless routing of guest payments through Stripe, PayTabs, or Checkout.com depending on organization preference.

### Module 4: Tasks & Maintenance
- Inventory checks, pre-check-in cleaning checklists, and emergency maintenance.
- Overdue tasks trigger escalation logic.

### Module 5: Claims
- Guest damage claims and deposit withholding management. Stores photo evidence in Cloudflare R2 and links to double-entry escrow accounts.

### Module 6: Document Management & DocuSign
- Agreement uploads linked to Properties and Owner Contacts.
- Native integration with DocuSign REST API to route property management agreements to owners for digital signature.

### Module 7: In-house Authentication & Tenant Management
- Database-backed user registration, password hashing, verification emails, and session tables.
- Two-Factor Authentication (TOTP) enforcement on dashboard login.
- Tenant creation automatically configures a unique organization schema boundary with RLS database isolation.

### Module 8: Owner & Vendor Portals
- **Owner Portal**: Secure dashboard showing real-time booking revenue, property stats, active tasks, DocuSign prompts, and statements.
- **Vendor Portal**: Mobile-responsive workspace for vendors to review jobs, submit quotes, upload work pictures, and submit invoices.

### Module 9: Accounting Module
- **General Ledger**: Balanced double-entry ledger. All transactions mapped to Chart of Accounts (COA).
- **Reservations Accounting**: Captures rents, guest service fees, cleaning fees, and tourism taxes.
- **Trust Accounting**: Segregates funds. Rents are held in a Trust Cash asset and Guest Deposit liability account until checkout.
- **OTA Reconciliation**: Logs Uplisting payout reports, mapping gross booking revenue, channel commissions, and net payments.
- **Property Accounting (NOI)**: Tracks all revenue and maintenance costs directly to the specific property unit.
- **Owner Accounting**: Calculates management fees (15% default) and net owner payouts.
- **Expense & Maintenance Accounting**: Generates vendor payables upon maintenance verification.
- **VAT & Compliance**: Automatically appends 5% UAE VAT to taxable invoices and generates FTA-compliant layout PDFs.
- **Banking module**: Tracks balances, cash inflows, and outflows across trust and operating bank accounts. No automated statement upload matching is implemented in Phase 1.
- **Reporting & Dashboards**: Trial balances, Profit & Loss reports per property, and AR/AP aging charts.

### Module 10: WhatsApp Chat Center
- Centralized inbox in the property manager dashboard displaying incoming/outgoing WhatsApp messages.
- Tracks media uploads, user profile details, and delivers templates or free-text answers.

---

## 4. Release Plan

### Phase 1: Core Foundation (Weeks 1-6)
- Scaffolding Next.js & Prisma.
- In-house Authentication, session cookie management, and MFA.
- Organization setup, RBAC permissions, and Audit Logs.
- Property profile CRUD (single-unit constraint) with DTCM permit inputs.
- Task checklists and Basic Maintenance Triaging.
- **No mobile application** (fully responsive mobile-optimized web UI for PMs and vendors).

### Phase 2: Booking Engine & Integrations (Weeks 7-10)
- Native Booking Engine and bookings database.
- Uplisting Channel Manager API integration and webhook handlers.
- Multi-gateway payment portal (Stripe & PayTabs routing).
- WhatsApp Unified Chat Inbox and media attachments.
- DocuSign Embedded Contract Agreement flows.

### Phase 3: Trust Accounting & Portals (Weeks 11-14)
- General Ledger & Double-entry transactional engine.
- Chart of Accounts setup (segregated Trust accounts vs Operating accounts).
- UAE VAT compliance calculations and invoice generation.
- Owner statement generation and automated commission postings.
- Owner Portal launch (real-time booking revenue & statement downloads).
- Vendor Portal launch (work orders, quotes, invoicing).

### Phase 4: Reports, Analytics & Verification (Weeks 15-16)
- Financial and Operational KPI Dashboards (Recharts).
- Report exports (Trial Balance, Property NOI, AR/AP Aging) in PDF and Excel.
- Full system verification, error logging (Sentry), and E2E Playwright test suite.
