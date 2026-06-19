'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    settings: any;
    logoUrl?: string;
  } | null;
  roleSlug: string | null;
  permissions: string[] | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [roleSlug, setRoleSlug] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSession = async (isRetry = false): Promise<void> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/auth/session', { 
        cache: 'no-store',
        signal: controller.signal
      });

      if (!res.ok) {
        // Server error — retry once without clearing auth
        if (!isRetry) {
          retryTimerRef.current = setTimeout(() => fetchSession(true), 3000);
        }
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.authenticated) {
        // DB cold-start error — the cookie is still valid, just retry to get full user data
        if (data.dbError) {
          if (!isRetry) {
            retryTimerRef.current = setTimeout(() => fetchSession(true), 4000);
            setLoading(true);
          } else {
            setLoading(false);
          }
          setAuthenticated(true);
          return;
        }

        // Full successful session
        setAuthenticated(true);
        setUser(data.user ?? null);
        setOrganization(data.organization ?? null);
        setRoleSlug(data.roleSlug ?? null);
        setPermissions(data.permissions ?? null);
      } else {
        // Definitively unauthenticated — clear everything
        setAuthenticated(false);
        setUser(null);
        setOrganization(null);
        setRoleSlug(null);
        setPermissions(null);

        // Redirect to login if on a protected route
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
          router.push('/login');
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Silent ignore for aborted requests
      }
      console.error('[AuthProvider] Network error fetching session:', err);
      // Network failure — don't log out, retry once
      if (!isRetry) {
        retryTimerRef.current = setTimeout(() => fetchSession(true), 3000);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSession();
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reactive auto-migration of unscoped localStorage settings when session credentials resolve
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.email && organization?.id) {
      try {
        const email = user.email;
        const orgId = organization.id;
        const suffix = `_${orgId}`;

        const isEmpty = (val: string | null) => {
          if (val === null || val === '') return true;
          if (val === '[]' || val === '{}') return true;
          return false;
        };

        // Organization-scoped keys (scoped by orgId).
        // NOTE: hhs_tasks, hhs_properties, hhs_hq, hhs_offdays, hhs_schedule_notes,
        // hhs_completed_tasks, hhs_expert_rules, hhs_creation_mode, hhs_staff_timings
        // are intentionally EXCLUDED — they are scheduler-local and must NOT be
        // hydrated from DB (which may have stale data from a prior session/org).
        const orgKeys = [
          'pms_uplisting_api_key',
          'pms_webhook_secret',
          'pms_wa_phone_id',
          'pms_wa_business_id',
          'pms_wa_access_token',
          'pms_wa_verify_token',
          'pms_ds_client_id',
          'pms_ds_secret_key',
          'pms_ds_account_id',
          'pms_ds_base_url',
          'pms_claude_api_key',
          'pms_claude_model',
          'pms_claude_models_list',
          'pms_translation_provider',
          'pms_translation_api_key',
          'hhs_issues',
          'hhs_channel_rules',
          'pms_property_mappings',
          'hhs_channels_seeded',
        ];

        // Personal/UI settings keys (scoped by email and orgId, or just orgId on the client but separated by user profile on the server)
        const personalKeys = [
          'pms_theme',
          'pms_accent_color',
          'pms_accent_primary',
          'pms_accent_hover',
          'pms_accent_dark',
          'pms_dark_bg',
          'pms_light_bg',
          'pms_light_start',
          'pms_light_end',
          'pms_font_style',
          'pms_platform_order',
          'pms_ui_language',
          'pms_translation_tone',
          'pms_sidebar_collapsed',
          'hhs_bookings_currency',
          'hhs_scheduler_layout_v3',
          'hhs_collapsed_cards_v4',
          'hhs_visible_property_columns'
        ];

        console.log('[AuthProvider] Scoped migration hook triggered. Org ID:', orgId, 'Email:', email);

        orgKeys.forEach(baseKey => {
          const scopedKey = `${baseKey}${suffix}`;
          const scopedVal = localStorage.getItem(scopedKey);
          const legacyVal = localStorage.getItem(baseKey);

          console.log(`[AuthProvider] Checking ${baseKey}: legacy=${legacyVal ? 'present' : 'null'}, scoped=${scopedVal ? 'present' : 'null'}`);

          if (legacyVal !== null && !isEmpty(legacyVal)) {
            if (isEmpty(scopedVal)) {
              console.log(`[AuthProvider] Migrating ${baseKey} -> ${scopedKey}`);
              localStorage.setItem(scopedKey, legacyVal);
            }
          }
        });

        // Special handling for staff key to migrate either pms_staff_data or legacy hhs_staff
        const scopedStaffKey = `pms_staff_data${suffix}`;
        const scopedStaffVal = localStorage.getItem(scopedStaffKey);
        const legacyStaffVal = localStorage.getItem('pms_staff_data') ?? localStorage.getItem('hhs_staff');

        console.log(`[AuthProvider] Checking staff: legacy=${legacyStaffVal ? 'present' : 'null'}, scoped=${scopedStaffVal ? 'present' : 'null'}`);

        if (legacyStaffVal !== null && !isEmpty(legacyStaffVal)) {
          if (isEmpty(scopedStaffVal)) {
            console.log(`[AuthProvider] Migrating staff -> ${scopedStaffKey}`);
            localStorage.setItem(scopedStaffKey, legacyStaffVal);
          }
        }

        personalKeys.forEach(baseKey => {
          const scopedKey = `${baseKey}_${email}${suffix}`;
          const legacyKey = `${baseKey}_${email}`;
          
          const scopedVal = localStorage.getItem(scopedKey);
          const legacyVal = localStorage.getItem(legacyKey) ?? localStorage.getItem(baseKey);

          console.log(`[AuthProvider] Checking personal ${baseKey}: legacy=${legacyVal ? 'present' : 'null'}, scoped=${scopedVal ? 'present' : 'null'}`);

          if (legacyVal !== null && !isEmpty(legacyVal)) {
            if (isEmpty(scopedVal)) {
              console.log(`[AuthProvider] Migrating personal ${baseKey} -> ${scopedKey}`);
              localStorage.setItem(scopedKey, legacyVal);
            }
          }
        });

        // Database settings restore/hydration
        if (organization.settings && typeof organization.settings === 'object') {
          // Hydrate integrations keys
          orgKeys.forEach(baseKey => {
            const scopedKey = `${baseKey}${suffix}`;
            const dbVal = organization.settings[baseKey];
            if (dbVal !== undefined && dbVal !== null) {
              if (isEmpty(localStorage.getItem(scopedKey))) {
                console.log(`[AuthProvider] Hydrating from DB ${baseKey} -> ${scopedKey}`);
                localStorage.setItem(scopedKey, typeof dbVal === 'string' ? dbVal : JSON.stringify(dbVal));
              }
            }
          });

          // Hydrate staff roster
          if (Array.isArray(organization.settings.staff)) {
            const scopedStaffKey = `pms_staff_data${suffix}`;
            if (isEmpty(localStorage.getItem(scopedStaffKey))) {
              console.log(`[AuthProvider] Hydrating staff roster from DB -> ${scopedStaffKey}`);
              localStorage.setItem(scopedStaffKey, JSON.stringify(organization.settings.staff));
            }
          }

          // Hydrate personal customizations — always restore from DB (DB is source of truth for theme/accent/font)
          const customizations = organization.settings.customizations;
          if (customizations && typeof customizations === 'object' && customizations[user.id]) {
            const userCustomizations = customizations[user.id];
            if (userCustomizations && typeof userCustomizations === 'object') {
              let themeRestored = false;
              let langRestored = false;
              personalKeys.forEach(baseKey => {
                const useEmailSuffix = !['hhs_bookings_currency', 'hhs_scheduler_layout_v3', 'hhs_collapsed_cards_v4'].includes(baseKey);
                const scopedKey = useEmailSuffix ? `${baseKey}_${email}${suffix}` : `${baseKey}${suffix}`;
                const dbVal = userCustomizations[baseKey];
                if (dbVal !== undefined && dbVal !== null && dbVal !== '') {
                  // Always write — DB is the authoritative store for personal UI preferences
                  console.log(`[AuthProvider] Restoring customization from DB ${baseKey} -> ${scopedKey}`);
                  localStorage.setItem(scopedKey, typeof dbVal === 'string' ? dbVal : JSON.stringify(dbVal));
                  if (['pms_theme', 'pms_accent_color', 'pms_accent_primary', 'pms_accent_hover', 'pms_accent_dark', 'pms_dark_bg', 'pms_light_bg', 'pms_light_start', 'pms_light_end', 'pms_font_style'].includes(baseKey)) {
                    themeRestored = true;
                  }
                  if (baseKey === 'pms_ui_language' || baseKey === 'pms_translation_tone') {
                    langRestored = true;
                  }
                }
              });
              // Always notify — ensures the settings/layout pages resync from the
              // freshly restored localStorage values, even if only some keys were present.
              window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
              if (langRestored) {
                const langVal = userCustomizations['pms_ui_language'];
                window.dispatchEvent(new CustomEvent('pms-language-change', { detail: { email, language: langVal } }));
              }
            }
          }
        }

        console.log('[AuthProvider] Scoped migration hook finished.');
      } catch (e) {
        console.error('[AuthProvider] Scoped migration failed:', e);
      }
    }
  }, [user?.email, organization?.id]);

  // ─── Super Admin: separate hydration path (no org, prefs stored on User row) ───
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user?.email || !roleSlug || organization !== null) return; // only for super_admin (no org)
    if (roleSlug !== 'super_admin') return;

    const email = user.email;
    // Superadmin has no orgId, so their scoped localStorage keys use empty suffix
    const suffix = '';

    const PERSONAL_KEYS = [
      'pms_theme', 'pms_accent_color', 'pms_accent_primary', 'pms_accent_hover',
      'pms_accent_dark', 'pms_dark_bg', 'pms_light_bg', 'pms_light_start',
      'pms_light_end', 'pms_font_style', 'pms_platform_order', 'pms_ui_language',
      'pms_translation_tone', 'pms_sidebar_collapsed', 'hhs_bookings_currency',
      'hhs_scheduler_layout_v3', 'hhs_collapsed_cards_v4'
    ];

    (async () => {
      try {
        const res = await fetch('/api/admin/preferences', { cache: 'no-store' });
        if (!res.ok) {
          // Still fire so dashboard resync listener can read whatever is in localStorage
          window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
          return;
        }
        const data = await res.json();
        const prefs = data.preferences;
        if (!prefs || typeof prefs !== 'object') {
          window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
          return;
        }

        console.log('[AuthProvider] Restoring superadmin preferences from DB:', Object.keys(prefs));

        let langRestored = false;

        PERSONAL_KEYS.forEach(baseKey => {
          const dbVal = prefs[baseKey];
          if (dbVal === undefined || dbVal === null || dbVal === '') return;
          // Superadmin keys are scoped by email only (no orgId suffix)
          const scopedKey = `${baseKey}_${email}${suffix}`;
          localStorage.setItem(scopedKey, typeof dbVal === 'string' ? dbVal : JSON.stringify(dbVal));
          console.log(`[AuthProvider SA] Restored ${baseKey} -> ${scopedKey}`);
          if (baseKey === 'pms_ui_language' || baseKey === 'pms_translation_tone') {
            langRestored = true;
          }
        });

        // Restore integration keys for superadmin (no orgId suffix)
        const orgKeys = [
          'pms_uplisting_api_key',
          'pms_webhook_secret',
          'pms_wa_phone_id',
          'pms_wa_business_id',
          'pms_wa_access_token',
          'pms_wa_verify_token',
          'pms_ds_client_id',
          'pms_ds_secret_key',
          'pms_ds_account_id',
          'pms_ds_base_url',
          'pms_claude_api_key',
          'pms_claude_model',
          'pms_claude_models_list',
          'pms_translation_provider',
          'pms_translation_api_key',
          'hhs_issues',
          'hhs_channel_rules',
          'pms_property_mappings',
          'hhs_channels_seeded',
        ];
        orgKeys.forEach(baseKey => {
          const dbVal = prefs[baseKey];
          if (dbVal === undefined || dbVal === null || dbVal === '') return;
          localStorage.setItem(baseKey, typeof dbVal === 'string' ? dbVal : JSON.stringify(dbVal));
          console.log(`[AuthProvider SA] Restored integration key ${baseKey}`);
        });

        // Always fire pms-theme-change so the dashboard page resync listener
        // re-reads localStorage and updates its React state (active card selections).
        window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));

        if (langRestored) {
          window.dispatchEvent(new CustomEvent('pms-language-change', {
            detail: { email, language: prefs['pms_ui_language'] }
          }));
        }
      } catch (e) {
        console.error('[AuthProvider SA] Failed to restore superadmin preferences:', e);
        // Fire even on error so the dashboard can re-read whatever is in localStorage
        if (email) window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
      }
    })();
  }, [user?.email, roleSlug, organization]);


  const signOut = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[AuthProvider] Logout error:', err);
    } finally {
      setAuthenticated(false);
      setUser(null);
      setOrganization(null);
      setRoleSlug(null);
      setPermissions(null);
      setLoading(false);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        user,
        organization,
        roleSlug,
        permissions,
        loading,
        signOut,
        refreshSession: () => fetchSession(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
