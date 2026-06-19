'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback }: PermissionGateProps) {
  const { permissions } = useAuth();

  if (!permissions) return fallback ?? null;

  // Support wildcard matching (* or admin.*)
  const allowed =
    permissions.includes(permission) ||
    permissions.includes('*') ||
    permissions.includes('admin.*');

  if (!allowed) return fallback ?? null;
  return <>{children}</>;
}
export default PermissionGate;
