# Roles & Permissions Matrix — Holiday Homes SaaS

> **Version**: 2.0  
> **Last Updated**: 2026-05-31  
> **Auth Provider**: In-house Session-Based Auth Engine

---

## 1. Role Definitions

### Platform Level
| Role | Slug | Scope | Description |
|------|------|-------|-------------|
| **Super Admin** | `super_admin` | Entire platform | Platform operator. Manages all organizations, billing, system health. Cannot see tenant data unless explicitly granted. |

### Organization Level
| Role | Slug | Scope | Description |
|------|------|-------|-------------|
| **Org Admin** | `org_admin` | Own organization | Full control of their organization. Manages users, roles, settings, billing. Inherits all PM, Accountant, and Coordinator permissions. |
| **Property Manager** | `property_manager` | Assigned properties | Manages assigned properties, bookings, tasks, maintenance, and vendor assignments. Views financial data for assigned properties. |
| **Accountant** | `accountant` | Own organization (financial) | Full access to double-entry accounting, bank accounts, invoicing, payments, and owner statements. Read-only on properties/bookings/tasks. |
| **Coordinator** | `coordinator` | Own organization (operational) | Manages tasks, maintenance scheduling, and vendor communication. No financial or booking engine access. |

### Portal Level (External Users)
| Role | Slug | Scope | Description |
|------|------|-------|-------------|
| **Owner** | `owner` | Own properties only | Property owner. Views their properties, real-time booking revenue, reports, statements, and documents. Can approve quotes and sign agreements. |
| **Vendor** | `vendor` | Assigned work orders only | Service provider. Views assigned work orders, submits quotes/invoices, updates work status. |
| **Guest** | `guest` | Own bookings only | Guest contact. Views booking details, checks in, and reports maintenance issues. |

---

## 2. Permission Matrix

**Legend:**
- ✅ = Full access
- 🔒 = Own data only (scoped to assigned properties, own contacts, etc.)
- 📖 = Read-only
- ❌ = No access

### Organization & User Management

| Permission | Super Admin | Org Admin | Property Manager | Accountant | Coordinator | Owner | Vendor | Guest |
|-----------|:-----------:|:---------:|:----------------:|:----------:|:-----------:|:-----:|:------:|:-----:|
| `org.view` | ✅ | ✅ | 📖 | 📖 | 📖 | ❌ | ❌ | ❌ |
| `org.edit` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `org.manage_settings` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.list` | ✅ | ✅ | 📖 | 📖 | 📖 | ❌ | ❌ | ❌ |
| `users.invite` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.edit` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.assign_role` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Properties

| Permission | Super Admin | Org Admin | Property Manager | Accountant | Coordinator | Owner | Vendor | Guest |
|-----------|:-----------:|:---------:|:----------------:|:----------:|:-----------:|:-----:|:------:|:-----:|
| `properties.list` | ✅ | ✅ | 🔒 | 📖 | 📖 | 🔒 | ❌ | ❌ |
| `properties.view` | ✅ | ✅ | 🔒 | 📖 | 📖 | 🔒 | ❌ | ❌ |
| `properties.create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `properties.edit` | ✅ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ |
| `properties.delete` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `properties.view_financial`| ✅ | ✅ | 🔒 | ✅ | ❌ | 🔒 | ❌ | ❌ |

### Bookings (Booking Engine & Uplisting Sync)

| Permission | Super Admin | Org Admin | Property Manager | Accountant | Coordinator | Owner | Vendor | Guest |
|-----------|:-----------:|:---------:|:----------------:|:----------:|:-----------:|:-----:|:------:|:-----:|
| `bookings.list` | ✅ | ✅ | 🔒 | ✅ | ❌ | 🔒 | ❌ | ❌ |
| `bookings.view` | ✅ | ✅ | 🔒 | ✅ | ❌ | 🔒 | ❌ | 🔒 |
| `bookings.create` | ✅ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ |
| `bookings.edit` | ✅ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ |
| `bookings.cancel` | ✅ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | 🔒 |
| `bookings.sync` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Tasks & Maintenance

| Permission | Super Admin | Org Admin | Property Manager | Accountant | Coordinator | Owner | Vendor | Guest |
|-----------|:-----------:|:---------:|:----------------:|:----------:|:-----------:|:-----:|:------:|:-----:|
| `tasks.list` | ✅ | ✅ | 🔒 | 📖 | ✅ | ❌ | ❌ | ❌ |
| `tasks.view` | ✅ | ✅ | 🔒 | 📖 | ✅ | ❌ | ❌ | ❌ |
| `tasks.create` | ✅ | ✅ | 🔒 | ❌ | ✅ | ❌ | ❌ | ❌ |
| `tasks.edit` | ✅ | ✅ | 🔒 | ❌ | ✅ | ❌ | ❌ | ❌ |
| `tasks.complete` | ✅ | ✅ | 🔒 | ❌ | ✅ | ❌ | ❌ | ❌ |
| `maintenance.list` | ✅ | ✅ | 🔒 | 📖 | ✅ | 🔒 | 🔒 | ❌ |
| `maintenance.view` | ✅ | ✅ | 🔒 | 📖 | ✅ | 🔒 | 🔒 | ❌ |
| `maintenance.create` | ✅ | ✅ | 🔒 | ❌ | ✅ | 🔒 | ❌ | 🔒 |
| `maintenance.approve_quote`| ✅ | ✅ | 🔒 | ❌ | ❌ | 🔒 | ❌ | ❌ |

### Double-Entry Accounting

| Permission | Super Admin | Org Admin | Property Manager | Accountant | Coordinator | Owner | Vendor | Guest |
|-----------|:-----------:|:---------:|:----------------:|:----------:|:-----------:|:-----:|:------:|:-----:|
| `accounting.view_dashboard`| ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `accounting.manage_ledger` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `accounting.view_bank` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `accounting.create_invoice`| ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `accounting.payments` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `accounting.statements` | ✅ | ✅ | ❌ | ✅ | ❌ | 🔒 | ❌ | ❌ |

### Communication (WhatsApp & Email)

| Permission | Super Admin | Org Admin | Property Manager | Accountant | Coordinator | Owner | Vendor | Guest |
|-----------|:-----------:|:---------:|:----------------:|:----------:|:-----------:|:-----:|:------:|:-----:|
| `whatsapp.chat` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `whatsapp.send` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `email.send` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 3. Session Authentication & Middleware

Instead of utilizing an external identity provider, authentication is handled in-house using secure, stateful sessions.

### Auth Cookie Flow
1. Upon login, the system creates a session in the `sessions` table and sets a cryptographically signed session ID in a secure cookie.
2. The Next.js middleware intercepts requests, extracts the cookie, and queries the session from the database.
3. The session holds references to the `user_id` and the context `organization_id`.
4. The middleware validates roles and permissions by checking the `organization_members` database records.

### Next.js Middleware Implementation
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session_id')?.value;
  
  if (!sessionToken) {
    if (request.nextUrl.pathname.startsWith('/api') || request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Fetch session details from our API/DB
  const sessionRes = await fetch(`${request.nextUrl.origin}/api/auth/verify-session`, {
    headers: { 'Cookie': `session_id=${sessionToken}` }
  });

  if (!sessionRes.ok) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { user, organization, roleSlug, permissions } = await sessionRes.json();

  // Guard routes based on portal types
  const path = request.nextUrl.pathname;
  if (path.startsWith('/owner') && roleSlug !== 'owner') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (path.startsWith('/vendor') && roleSlug !== 'vendor') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Inject session details into request headers for downstream API routes
  const response = NextResponse.next();
  response.headers.set('x-user-id', user.id);
  response.headers.set('x-org-id', organization.id);
  response.headers.set('x-user-permissions', JSON.stringify(permissions));
  
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/owner/:path*', '/vendor/:path*', '/api/v1/:path*']
};
```

---

## 4. Server-side Permission Verification

```typescript
// src/lib/auth/permissions.ts
import { headers } from 'next/headers';

export function hasPermission(requiredPermission: string): boolean {
  const headerList = headers();
  const permissionsJson = headerList.get('x-user-permissions');
  
  if (!permissionsJson) return false;
  
  const permissions: string[] = JSON.parse(permissionsJson);
  
  // Wildcard admin override
  if (permissions.includes('*') || permissions.includes('admin.*')) {
    return true;
  }
  
  return permissions.includes(requiredPermission);
}

export function requirePermission(permission: string) {
  if (!hasPermission(permission)) {
    throw new Error('Forbidden: missing required permission');
  }
}
```

---

## 5. Client Component Permission Gate

```typescript
// src/components/auth/PermissionGate.tsx
'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth'; // Custom hook connected to session context

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback }: PermissionGateProps) {
  const { permissions } = useAuth();

  if (!permissions) return fallback ?? null;

  const allowed = permissions.includes(permission) || permissions.includes('*');

  if (!allowed) return fallback ?? null;
  return <>{children}</>;
}
```

---

## 6. Data Scope Rules

| Role | Properties | Bookings | Tasks | Maintenance | Financial (GL, Invoices) |
|------|-----------|----------|-------|-------------|-------------------------|
| **Super Admin** | All | All | All | All | All |
| **Org Admin** | All in org | All in org | All in org | All in org | All in org |
| **Property Manager** | Assigned only | Scoped to assigned properties | Scoped to assigned properties | Scoped to assigned properties | Scoped to assigned properties (revenue views only) |
| **Accountant** | Read-only in org | Read-only in org | Read-only in org | Read-only in org | Full control in org |
| **Coordinator** | Read-only in org | None | Full control in org | Full control in org | None |
| **Owner** | Scoped properties | Scoped properties (read-only) | None | Scoped properties (read-only) | Scoped statements & real-time revenue |
| **Vendor** | None | None | None | Assigned jobs | Assigned work order invoices |
| **Guest** | None | Self booking | None | Self booking maintenance reporting |
