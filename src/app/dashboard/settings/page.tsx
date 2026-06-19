'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Shield, Key, ShieldCheck, User, Building, Copy, Check,
  Users, Lock, ChevronRight, ChevronDown, UserPlus, Crown, Briefcase,
  Eye, Edit, Edit3, Trash2, ToggleLeft, ToggleRight,
  ArrowUp, ArrowDown, RotateCcw, Palette, Sun, Moon, Clock,
  Globe, Link, Zap, RefreshCw, ExternalLink, AlertTriangle, Plug, X,
  Wifi, WifiOff, MessageSquare, FileSignature, Bot, Languages,
  Search, Plus
} from 'lucide-react';
import { translateText } from '@/lib/translations';

// ─── Types ───────────────────────────────────────────────────────────
interface RoleData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: string;
  _count: { members: number };
}

interface MemberData {
  id: string;
  isActive: boolean;
  joinedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    lastLoginAt: string | null;
  };
  role: {
    id: string;
    name: string;
    slug: string;
  };
}

// ─── Permission Label Mapper ────────────────────────────────────────
function formatPermission(perm: string): string {
  if (perm === '*') return '★ Full Access (Wildcard)';
  return perm
    .replace(/_/g, ' ')
    .replace(/\./g, ' → ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// ─── Role Icon Mapper ───────────────────────────────────────────────
function getRoleIcon(slug: string) {
  switch (slug) {
    case 'super_admin':
    case 'org_admin': return Crown;
    case 'property_manager': return Building;
    case 'accountant': return Briefcase;
    case 'coordinator': return Users;
    case 'owner': return Eye;
    case 'vendor': return Edit3;
    default: return User;
  }
}

function getRoleColor(slug: string): string {
  switch (slug) {
    case 'super_admin':
    case 'org_admin': return '#d4af37';
    case 'property_manager': return '#3b82f6';
    case 'accountant': return '#10b981';
    case 'coordinator': return '#f59e0b';
    case 'owner': return '#8b5cf6';
    case 'vendor': return '#ec4899';
    default: return '#9ca3af';
  }
}

const PLATFORM_MAP: Record<string, { name: string; icon: string }> = {
  overview:           { name: 'My Dashboard',      icon: '📊' },
  scheduler:          { name: 'Scheduler',          icon: '🗓️' },
  properties:         { name: 'Properties',         icon: '🏠' },
  bookings:           { name: 'Bookings',           icon: '📅' },
  reservations:       { name: 'Reservations',       icon: '🔔' },
  staff:              { name: 'Staff',              icon: '👥' },
  accounting:         { name: 'Accounting',         icon: '💵' },
  'host-management':  { name: 'Host Management',   icon: '🤝' },
  'revenue-management': { name: 'Revenue Management', icon: '📈' },
  channels:           { name: 'Channel Management', icon: '🔌' },
  chat:               { name: 'WhatsApp Chat',     icon: '💬' },
};

// ─── Settings Tabs ──────────────────────────────────────────────────
type SettingsTab = 'profile' | 'appearance' | 'roles' | 'integrations' | 'danger';

export default function SettingsPage() {
  const { user, organization, roleSlug, refreshSession, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Organization update states
  const [orgName, setOrgName] = useState('');
  const [orgLogoUrl, setOrgLogoUrl] = useState('');
  const [orgSubheading, setOrgSubheading] = useState('');
  const [updatingOrg, setUpdatingOrg] = useState(false);
  const [orgUpdateSuccess, setOrgUpdateSuccess] = useState('');
  const [orgUpdateError, setOrgUpdateError] = useState('');

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || '');
      setOrgLogoUrl(organization.logoUrl || '');
      setOrgSubheading(organization.settings?.subheading || '');
    }
  }, [organization]);

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setOrgUpdateError('Company Name is required');
      return;
    }
    setUpdatingOrg(true);
    setOrgUpdateError('');
    setOrgUpdateSuccess('');
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim(),
          logoUrl: orgLogoUrl.trim(),
          subheading: orgSubheading.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update organization settings');
      }
      setOrgUpdateSuccess('Organization settings saved and synced successfully.');
      if (typeof refreshSession === 'function') {
        await refreshSession();
      }
    } catch (err: any) {
      setOrgUpdateError(err.message || 'An error occurred while updating settings');
    } finally {
      setUpdatingOrg(false);
    }
  };

  // Appearance & Layout States
  const [theme, setTheme] = useState<'dark' | 'light' | 'dynamic'>('dark');
  const [lightStart, setLightStart] = useState('08:00');
  const [fontStyle, setFontStyle] = useState('modern');
  const [lightEnd, setLightEnd] = useState('18:00');
  const [platforms, setPlatforms] = useState<string[]>(['overview', 'scheduler', 'properties', 'bookings', 'reservations', 'staff', 'accounting', 'host-management', 'revenue-management', 'channels', 'chat']);
  const [accentColor, setAccentColor] = useState('gold');
  
  // Custom Accents
  const [accentPrimary, setAccentPrimary] = useState('#d4af37');
  const [accentHover, setAccentHover] = useState('#f3e5ab');
  const [accentDark, setAccentDark] = useState('#aa7c11');
  
  // Background Presets
  const [darkBg, setDarkBg] = useState('obsidian');
  const [lightBg, setLightBg] = useState('slate');

  // Load settings from localStorage when client is ready and auth loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && !authLoading) {
      const email = user?.email;
      const orgId = organization?.id;
      const suffix = orgId ? `_${orgId}` : '';
      const themeKey = email ? `pms_theme_${email}${suffix}` : `pms_theme${suffix}`;
      const accentColorKey = email ? `pms_accent_color_${email}${suffix}` : `pms_accent_color${suffix}`;
      const accentPrimaryKey = email ? `pms_accent_primary_${email}${suffix}` : `pms_accent_primary${suffix}`;
      const accentHoverKey = email ? `pms_accent_hover_${email}${suffix}` : `pms_accent_hover${suffix}`;
      const accentDarkKey = email ? `pms_accent_dark_${email}${suffix}` : `pms_accent_dark${suffix}`;
      const darkBgKey = email ? `pms_dark_bg_${email}${suffix}` : `pms_dark_bg${suffix}`;
      const lightBgKey = email ? `pms_light_bg_${email}${suffix}` : `pms_light_bg${suffix}`;
      const lightStartKey = email ? `pms_light_start_${email}${suffix}` : `pms_light_start${suffix}`;
      const lightEndKey = email ? `pms_light_end_${email}${suffix}` : `pms_light_end${suffix}`;
      const orderKey = email ? `pms_platform_order_${email}${suffix}` : `pms_platform_order${suffix}`;
      const langKey = email ? `pms_ui_language_${email}${suffix}` : `pms_ui_language${suffix}`;
      const toneKey = email ? `pms_translation_tone_${email}${suffix}` : `pms_translation_tone${suffix}`;

      const savedTheme = localStorage.getItem(themeKey) as 'dark' | 'light' | 'dynamic' | null;
      if (savedTheme) setTheme(savedTheme);

      const savedStart = localStorage.getItem(lightStartKey);
      if (savedStart) setLightStart(savedStart);

      const savedEnd = localStorage.getItem(lightEndKey);
      if (savedEnd) setLightEnd(savedEnd);

      // Load presets or defaults
      const presets: Record<string, { primary: string; hover: string; dark: string }> = {
        gold: { primary: '#d4af37', hover: '#f3e5ab', dark: '#aa7c11' },
        green: { primary: '#10b981', hover: '#34d399', dark: '#047857' },
        blue: { primary: '#3b82f6', hover: '#60a5fa', dark: '#1d4ed8' },
        pink: { primary: '#f03b6a', hover: '#f472b6', dark: '#be185d' },
        purple: { primary: '#8b5cf6', hover: '#a78bfa', dark: '#6d28d9' }
      };

      // Derive the active button from the actual primary hex (ground truth).
      // The stored accent name (pms_accent_color) can be stale from old sessions.
      const storedPrimary = localStorage.getItem(accentPrimaryKey);
      const storedHover   = localStorage.getItem(accentHoverKey);
      const storedDark    = localStorage.getItem(accentDarkKey);
      const storedName    = localStorage.getItem(accentColorKey);
      let savedAccent: string;
      if (storedPrimary) {
        savedAccent = Object.keys(presets).find(k => presets[k].primary === storedPrimary) || 'custom';
      } else {
        savedAccent = storedName || 'gold';
      }
      setAccentColor(savedAccent);

      const p = presets[savedAccent] || presets.gold;
      setAccentPrimary(storedPrimary || p.primary);
      // Only use stored hover/dark if the accent was intentionally custom-tuned.
      // For any named preset, always use the canonical preset values.
      if (savedAccent === 'custom') {
        setAccentHover(storedHover || p.hover);
        setAccentDark(storedDark   || p.dark);
      } else {
        setAccentHover(p.hover);
        setAccentDark(p.dark);
      }

      setDarkBg(localStorage.getItem(darkBgKey) || 'obsidian');
      setLightBg(localStorage.getItem(lightBgKey) || 'slate');
      const fontStyleKey = email ? `pms_font_style_${email}${suffix}` : `pms_font_style${suffix}`;
      setFontStyle(localStorage.getItem(fontStyleKey) || 'modern');

      const fullDefault = ['overview', 'scheduler', 'properties', 'bookings', 'reservations', 'staff', 'accounting', 'host-management', 'revenue-management', 'channels', 'chat'];
      const savedOrder = localStorage.getItem(orderKey);
      if (savedOrder) {
        try {
          const parsed: string[] = JSON.parse(savedOrder);
          // Keep only IDs that still exist in the platform map, preserve order
          const valid = parsed.filter((id: string) => fullDefault.includes(id));
          // Append any new platforms not yet in the saved order
          const missing = fullDefault.filter((id: string) => !valid.includes(id));
          const merged = [...valid, ...missing];
          setPlatforms(merged);
          // Persist the corrected order so it's up-to-date for next load
          localStorage.setItem(orderKey, JSON.stringify(merged));
        } catch (e) {
          console.error(e);
          setPlatforms(fullDefault);
        }
      } else {
        setPlatforms(fullDefault);
      }

      // Load Integrations
      const uplistingKey = orgId ? `pms_uplisting_api_key_${orgId}` : 'pms_uplisting_api_key';
      const webhookKey = orgId ? `pms_webhook_secret_${orgId}` : 'pms_webhook_secret';
      const waPhoneIdKey = orgId ? `pms_wa_phone_id_${orgId}` : 'pms_wa_phone_id';
      const waBusinessIdKey = orgId ? `pms_wa_business_id_${orgId}` : 'pms_wa_business_id';
      const waAccessTokenKey = orgId ? `pms_wa_access_token_${orgId}` : 'pms_wa_access_token';
      const waVerifyTokenKey = orgId ? `pms_wa_verify_token_${orgId}` : 'pms_wa_verify_token';
      
      const dsClientIdKey = orgId ? `pms_ds_client_id_${orgId}` : 'pms_ds_client_id';
      const dsSecretKeyKey = orgId ? `pms_ds_secret_key_${orgId}` : 'pms_ds_secret_key';
      const dsAccountIdKey = orgId ? `pms_ds_account_id_${orgId}` : 'pms_ds_account_id';
      const dsBaseUrlKey = orgId ? `pms_ds_base_url_${orgId}` : 'pms_ds_base_url';

      const claudeApiKeyKey = orgId ? `pms_claude_api_key_${orgId}` : 'pms_claude_api_key';
      const claudeModelKey = orgId ? `pms_claude_model_${orgId}` : 'pms_claude_model';
      
      const translationProviderKey = orgId ? `pms_translation_provider_${orgId}` : 'pms_translation_provider';
      const translationApiKeyKey = orgId ? `pms_translation_api_key_${orgId}` : 'pms_translation_api_key';

      const dbSettings = organization?.settings || {};

      setUplistingApiKey(dbSettings.pms_uplisting_api_key || localStorage.getItem(uplistingKey) || '');
      setWebhookSecret(dbSettings.pms_webhook_secret || localStorage.getItem(webhookKey) || '');
      setWaPhoneId(dbSettings.pms_wa_phone_id || localStorage.getItem(waPhoneIdKey) || '');
      setWaBusinessId(dbSettings.pms_wa_business_id || localStorage.getItem(waBusinessIdKey) || '');
      setWaAccessToken(dbSettings.pms_wa_access_token || localStorage.getItem(waAccessTokenKey) || '');
      setWaVerifyToken(dbSettings.pms_wa_verify_token || localStorage.getItem(waVerifyTokenKey) || '');
      setDsClientId(dbSettings.pms_ds_client_id || localStorage.getItem(dsClientIdKey) || '');
      setDsSecretKey(dbSettings.pms_ds_secret_key || localStorage.getItem(dsSecretKeyKey) || '');
      setDsAccountId(dbSettings.pms_ds_account_id || localStorage.getItem(dsAccountIdKey) || '');
      setDsBaseUrl(dbSettings.pms_ds_base_url || localStorage.getItem(dsBaseUrlKey) || 'https://demo.docusign.net');
      setClaudeApiKey(dbSettings.pms_claude_api_key || localStorage.getItem(claudeApiKeyKey) || '');
      setClaudeModel(dbSettings.pms_claude_model || localStorage.getItem(claudeModelKey) || 'claude-sonnet-4-20250514');
      setTranslationProvider(dbSettings.pms_translation_provider || localStorage.getItem(translationProviderKey) || 'google');
      setTranslationApiKey(dbSettings.pms_translation_api_key || localStorage.getItem(translationApiKeyKey) || '');

      // Check if previously connected
      if (dbSettings.pms_uplisting_api_key || localStorage.getItem(uplistingKey)) setUplistingStatus('connected');
      else setUplistingStatus('idle');
      if (dbSettings.pms_wa_access_token || localStorage.getItem(waAccessTokenKey)) setWaStatus('connected');
      else setWaStatus('idle');
      if (dbSettings.pms_ds_client_id || localStorage.getItem(dsClientIdKey)) setDsStatus('connected');
      else setDsStatus('idle');
      if (dbSettings.pms_claude_api_key || localStorage.getItem(claudeApiKeyKey)) setClaudeStatus('connected');
      else setClaudeStatus('idle');
      if (dbSettings.pms_translation_api_key || localStorage.getItem(translationApiKeyKey)) setTranslationStatus('connected');
      else setTranslationStatus('idle');

      // Translation preferences
      const customizations = dbSettings.customizations || {};
      const userCustomizations = (user?.id ? customizations[user.id] : null) || {};
      setUiLanguage(userCustomizations.pms_ui_language || localStorage.getItem(langKey) || 'en');
      setTranslationTone(userCustomizations.pms_translation_tone || localStorage.getItem(toneKey) || 'professional');
    }
  }, [user?.email, user?.id, organization?.id, organization?.settings, authLoading]);

  // Re-sync UI when AuthProvider finishes hydrating DB values into localStorage.
  // The init effect runs before AuthProvider writes to localStorage, so dropdowns
  // show stale defaults. This listener fires when AuthProvider dispatches pms-theme-change
  // after restoring, and re-reads all keys to update the displayed selections.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      const email = user?.email;
      const orgId = organization?.id;
      const suffix = orgId ? `_${orgId}` : '';
      const presets: Record<string, { primary: string; hover: string; dark: string }> = {
        gold: { primary: '#d4af37', hover: '#f3e5ab', dark: '#aa7c11' },
        green: { primary: '#10b981', hover: '#34d399', dark: '#047857' },
        blue: { primary: '#3b82f6', hover: '#60a5fa', dark: '#1d4ed8' },
        pink: { primary: '#f03b6a', hover: '#f472b6', dark: '#be185d' },
        purple: { primary: '#8b5cf6', hover: '#a78bfa', dark: '#6d28d9' }
      };

      const themeVal = localStorage.getItem(email ? `pms_theme_${email}${suffix}` : `pms_theme${suffix}`);
      if (themeVal) setTheme(themeVal as 'dark' | 'light' | 'dynamic');

      const apVal = localStorage.getItem(email ? `pms_accent_primary_${email}${suffix}` : `pms_accent_primary${suffix}`);
      const ahVal = localStorage.getItem(email ? `pms_accent_hover_${email}${suffix}` : `pms_accent_hover${suffix}`);
      const adVal = localStorage.getItem(email ? `pms_accent_dark_${email}${suffix}` : `pms_accent_dark${suffix}`);
      const nameVal = localStorage.getItem(email ? `pms_accent_color_${email}${suffix}` : `pms_accent_color${suffix}`);
      // Always derive active button from primary hex (ground truth — name can be stale)
      let resolvedAccent: string;
      if (apVal) {
        resolvedAccent = Object.keys(presets).find(k => presets[k].primary === apVal) || 'custom';
      } else {
        resolvedAccent = nameVal || 'gold';
      }
      setAccentColor(resolvedAccent);
      const p = presets[resolvedAccent];
      setAccentPrimary(apVal || p?.primary || '#d4af37');
      // Only use stored hover/dark if the accent was intentionally custom-tuned.
      // For any named preset, always use the canonical preset values.
      if (resolvedAccent === 'custom') {
        setAccentHover(ahVal || p?.hover || '#f3e5ab');
        setAccentDark(adVal  || p?.dark  || '#aa7c11');
      } else {
        setAccentHover(p?.hover || '#f3e5ab');
        setAccentDark(p?.dark  || '#aa7c11');
      }

      const darkBgVal = localStorage.getItem(email ? `pms_dark_bg_${email}${suffix}` : `pms_dark_bg${suffix}`);
      if (darkBgVal) setDarkBg(darkBgVal);

      const lightBgVal = localStorage.getItem(email ? `pms_light_bg_${email}${suffix}` : `pms_light_bg${suffix}`);
      if (lightBgVal) setLightBg(lightBgVal);

      const fontVal = localStorage.getItem(email ? `pms_font_style_${email}${suffix}` : `pms_font_style${suffix}`);
      if (fontVal) setFontStyle(fontVal);

      const lsVal = localStorage.getItem(email ? `pms_light_start_${email}${suffix}` : `pms_light_start${suffix}`);
      if (lsVal) setLightStart(lsVal);

      const leVal = localStorage.getItem(email ? `pms_light_end_${email}${suffix}` : `pms_light_end${suffix}`);
      if (leVal) setLightEnd(leVal);

      // Re-read integrations (like Claude and DocuSign)
      const dsClientIdKey = orgId ? `pms_ds_client_id_${orgId}` : 'pms_ds_client_id';
      const dsSecretKeyKey = orgId ? `pms_ds_secret_key_${orgId}` : 'pms_ds_secret_key';
      const dsAccountIdKey = orgId ? `pms_ds_account_id_${orgId}` : 'pms_ds_account_id';
      const dsBaseUrlKey = orgId ? `pms_ds_base_url_${orgId}` : 'pms_ds_base_url';

      const savedDsClientId = localStorage.getItem(dsClientIdKey);
      if (savedDsClientId !== null) setDsClientId(savedDsClientId);
      const savedDsSecret = localStorage.getItem(dsSecretKeyKey);
      if (savedDsSecret !== null) setDsSecretKey(savedDsSecret);
      const savedDsAccount = localStorage.getItem(dsAccountIdKey);
      if (savedDsAccount !== null) setDsAccountId(savedDsAccount);
      const savedDsBaseUrl = localStorage.getItem(dsBaseUrlKey);
      if (savedDsBaseUrl !== null) setDsBaseUrl(savedDsBaseUrl);
      if (savedDsClientId) setDsStatus('connected');

      const claudeApiKeyKey = orgId ? `pms_claude_api_key_${orgId}` : 'pms_claude_api_key';
      const claudeModelKey = orgId ? `pms_claude_model_${orgId}` : 'pms_claude_model';

      const savedClaudeApiKey = localStorage.getItem(claudeApiKeyKey);
      if (savedClaudeApiKey !== null) setClaudeApiKey(savedClaudeApiKey);
      const savedClaudeModel = localStorage.getItem(claudeModelKey);
      if (savedClaudeModel !== null) setClaudeModel(savedClaudeModel);
      if (savedClaudeApiKey) setClaudeStatus('connected');

      const orderVal = localStorage.getItem(email ? `pms_platform_order_${email}${suffix}` : `pms_platform_order${suffix}`);
      if (orderVal) {
        try {
          const _full = ['overview', 'scheduler', 'properties', 'bookings', 'reservations', 'staff', 'accounting', 'host-management', 'revenue-management', 'channels', 'chat'];
          const _parsed: string[] = JSON.parse(orderVal);
          const _valid = _parsed.filter((id: string) => _full.includes(id));
          const _missing = _full.filter((id: string) => !_valid.includes(id));
          setPlatforms([..._valid, ..._missing]);
        } catch (e) {}
      }
    };

    const langHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const email = user?.email;
      if (detail?.email && detail.email !== email) return;
      const orgId = organization?.id;
      const suffix = orgId ? `_${orgId}` : '';
      const langVal = localStorage.getItem(email ? `pms_ui_language_${email}${suffix}` : `pms_ui_language${suffix}`);
      const toneVal = localStorage.getItem(email ? `pms_translation_tone_${email}${suffix}` : `pms_translation_tone${suffix}`);
      if (langVal) setUiLanguage(langVal);
      if (toneVal) setTranslationTone(toneVal);
    };

    window.addEventListener('pms-theme-change', handler);
    window.addEventListener('pms-language-change', langHandler);

    // Call handler immediately — catches the case where pms-theme-change already
    // fired before this effect registered the listener (race condition).
    handler();

    // Delayed fallbacks in case AuthProvider's API call is slow.
    const t1 = setTimeout(handler, 1500);
    const t2 = setTimeout(handler, 3000);

    return () => {
      window.removeEventListener('pms-theme-change', handler);
      window.removeEventListener('pms-language-change', langHandler);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [user?.email, organization?.id]);

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'dynamic') => {
    setTheme(newTheme);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const key = email ? `pms_theme_${email}${suffix}` : `pms_theme${suffix}`;
    localStorage.setItem(key, newTheme);
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
    saveIntegration('pms_theme', newTheme);
  };

  const handleAccentChange = (newAccent: string) => {
    setAccentColor(newAccent);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const acKey = email ? `pms_accent_color_${email}${suffix}` : `pms_accent_color${suffix}`;
    localStorage.setItem(acKey, newAccent);
    saveIntegration('pms_accent_color', newAccent);

    const presets: Record<string, { primary: string; hover: string; dark: string }> = {
      gold: { primary: '#d4af37', hover: '#f3e5ab', dark: '#aa7c11' },
      green: { primary: '#10b981', hover: '#34d399', dark: '#047857' },
      blue: { primary: '#3b82f6', hover: '#60a5fa', dark: '#1d4ed8' },
      pink: { primary: '#f03b6a', hover: '#f472b6', dark: '#be185d' },
      purple: { primary: '#8b5cf6', hover: '#a78bfa', dark: '#6d28d9' }
    };
    
    const p = presets[newAccent];
    if (p) {
      setAccentPrimary(p.primary);
      setAccentHover(p.hover);
      setAccentDark(p.dark);
      const apKey = email ? `pms_accent_primary_${email}${suffix}` : `pms_accent_primary${suffix}`;
      const ahKey = email ? `pms_accent_hover_${email}${suffix}` : `pms_accent_hover${suffix}`;
      const adKey = email ? `pms_accent_dark_${email}${suffix}` : `pms_accent_dark${suffix}`;
      localStorage.setItem(apKey, p.primary);
      localStorage.setItem(ahKey, p.hover);
      localStorage.setItem(adKey, p.dark);
      saveIntegration('pms_accent_primary', p.primary);
      saveIntegration('pms_accent_hover', p.hover);
      saveIntegration('pms_accent_dark', p.dark);
    }
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
  };

  const handleCustomAccentChange = (type: 'primary' | 'hover' | 'dark', hex: string) => {
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const apKey = email ? `pms_accent_primary_${email}${suffix}` : `pms_accent_primary${suffix}`;
    const ahKey = email ? `pms_accent_hover_${email}${suffix}` : `pms_accent_hover${suffix}`;
    const adKey = email ? `pms_accent_dark_${email}${suffix}` : `pms_accent_dark${suffix}`;
    const acKey = email ? `pms_accent_color_${email}${suffix}` : `pms_accent_color${suffix}`;

    if (type === 'primary') {
      setAccentPrimary(hex);
      localStorage.setItem(apKey, hex);
      saveIntegration('pms_accent_primary', hex);
    } else if (type === 'hover') {
      setAccentHover(hex);
      localStorage.setItem(ahKey, hex);
      saveIntegration('pms_accent_hover', hex);
    } else if (type === 'dark') {
      setAccentDark(hex);
      localStorage.setItem(adKey, hex);
      saveIntegration('pms_accent_dark', hex);
    }
    setAccentColor('custom');
    localStorage.setItem(acKey, 'custom');
    saveIntegration('pms_accent_color', 'custom');
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
  };

  const handleDarkBgChange = (newBg: string) => {
    setDarkBg(newBg);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const key = email ? `pms_dark_bg_${email}${suffix}` : `pms_dark_bg${suffix}`;
    localStorage.setItem(key, newBg);
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
    saveIntegration('pms_dark_bg', newBg);
  };

  const handleLightBgChange = (newBg: string) => {
    setLightBg(newBg);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const key = email ? `pms_light_bg_${email}${suffix}` : `pms_light_bg${suffix}`;
    localStorage.setItem(key, newBg);
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
    saveIntegration('pms_light_bg', newBg);
  };

  const handleFontStyleChange = (style: string) => {
    setFontStyle(style);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const key = email ? `pms_font_style_${email}${suffix}` : `pms_font_style${suffix}`;
    localStorage.setItem(key, style);
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
    saveIntegration('pms_font_style', style);
  };

  const handleLightStartChange = (val: string) => {
    setLightStart(val);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const key = email ? `pms_light_start_${email}${suffix}` : `pms_light_start${suffix}`;
    localStorage.setItem(key, val);
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
    saveIntegration('pms_light_start', val);
  };

  const handleLightEndChange = (val: string) => {
    setLightEnd(val);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const key = email ? `pms_light_end_${email}${suffix}` : `pms_light_end${suffix}`;
    localStorage.setItem(key, val);
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
    saveIntegration('pms_light_end', val);
  };

  const movePlatform = (index: number, direction: 'up' | 'down') => {
    const newPlatforms = [...platforms];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= platforms.length) return;

    // Swap
    const temp = newPlatforms[index];
    newPlatforms[index] = newPlatforms[targetIndex];
    newPlatforms[targetIndex] = temp;

    setPlatforms(newPlatforms);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const key = email ? `pms_platform_order_${email}${suffix}` : `pms_platform_order${suffix}`;
    localStorage.setItem(key, JSON.stringify(newPlatforms));
    window.dispatchEvent(new CustomEvent('pms-menu-order-change', { detail: { email } }));
    saveIntegration('pms_platform_order', JSON.stringify(newPlatforms));
  };

  const resetPlatformOrder = () => {
    const defaultOrder = ['overview', 'scheduler', 'properties', 'bookings', 'reservations', 'staff', 'accounting', 'host-management', 'revenue-management', 'channels', 'chat'];
    setPlatforms(defaultOrder);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const key = email ? `pms_platform_order_${email}${suffix}` : `pms_platform_order${suffix}`;
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent('pms-menu-order-change', { detail: { email } }));
    saveIntegration('pms_platform_order', JSON.stringify(defaultOrder));
  };

  // MFA setup states
  const [mfaEnabledState, setMfaEnabledState] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableMode, setDisableMode] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Roles & Team states
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  // Role editor modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');
  const [roleFormPerms, setRoleFormPerms] = useState<string[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  // User Invitation states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);

  // ─── Integrations & APIs states ─────────────────────────────────
  // Uplisting
  const [uplistingApiKey, setUplistingApiKey] = useState('');
  const [uplistingStatus, setUplistingStatus] = useState<'idle' | 'verifying' | 'connected' | 'error'>('idle');
  const [uplistingMessage, setUplistingMessage] = useState('');
  const [uplistingListings, setUplistingListings] = useState<Array<{ id: string; name: string; nickname?: string }>>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  // Webhook
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'verifying' | 'connected' | 'error'>('idle');
  const [lastWebhookReceivedAt, setLastWebhookReceivedAt] = useState<string | null>(null);
  const [webhookErrorMessage, setWebhookErrorMessage] = useState<string | null>(null);
  const [webhookLocalSuccess, setWebhookLocalSuccess] = useState<string | null>(null);
  const [webhookLocalError, setWebhookLocalError] = useState<string | null>(null);
  // WhatsApp
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waBusinessId, setWaBusinessId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waVerifyToken, setWaVerifyToken] = useState('');
  const [waStatus, setWaStatus] = useState<'idle' | 'verifying' | 'connected' | 'error'>('idle');
  // DocuSign
  const [dsClientId, setDsClientId] = useState('');
  const [dsSecretKey, setDsSecretKey] = useState('');
  const [dsAccountId, setDsAccountId] = useState('');
  const [dsBaseUrl, setDsBaseUrl] = useState('https://demo.docusign.net');
  const [dsStatus, setDsStatus] = useState<'idle' | 'verifying' | 'connected' | 'error'>('idle');
  // Claude AI
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [claudeModel, setClaudeModel] = useState('claude-sonnet-4-20250514');
  const [claudeStatus, setClaudeStatus] = useState<'idle' | 'verifying' | 'connected' | 'error'>('idle');
  // Translation
  const [uiLanguage, setUiLanguage] = useState('en');
  const [translationTone, setTranslationTone] = useState('professional');
  const [translationSaving, setTranslationSaving] = useState(false);
  // Quick translation helper using the static dictionary
  const t = (key: string) => translateText(key, uiLanguage);
  const [translationSaved, setTranslationSaved] = useState(false);
  // (legacy — kept for type compatibility, no longer used for external API)
  const [translationProvider, setTranslationProvider] = useState('claude');
  const [translationApiKey, setTranslationApiKey] = useState('');
  const [translationStatus, setTranslationStatus] = useState<'idle' | 'verifying' | 'connected' | 'error'>('idle');
  // Property Link Mappings
  const [propertyMappings, setPropertyMappings] = useState<Array<{id: string; name: string; uplistingId: string | null; uplistingName: string | null}>>([]);
  const [mappingSearch, setMappingSearch] = useState('');
  const [mappingFilter, setMappingFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [selectedMappingProp, setSelectedMappingProp] = useState<{id: string; name: string} | null>(null);
  const [editUplistingId, setEditUplistingId] = useState('');
  const [editUplistingName, setEditUplistingName] = useState('');
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [activeDropdownPropId, setActiveDropdownPropId] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [syncingBookings, setSyncingBookings] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncProgressLabel, setSyncProgressLabel] = useState('');
  const [selectedMappingIds, setSelectedMappingIds] = useState<string[]>([]);

  // Channel Account Mappings State
  const [channelRules, setChannelRules] = useState<Array<{id: string; channel: string; accountName: string}>>([]);
  const [channelMappings, setChannelMappings] = useState<Record<string, {uplistingCode: string; uplistingName: string}>>({});
  const [channelRulesLoading, setChannelRulesLoading] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [activeChannelDropdownId, setActiveChannelDropdownId] = useState<string | null>(null);
  const [channelDropdownSearch, setChannelDropdownSearch] = useState('');
  const [customChannelInputs, setCustomChannelInputs] = useState<Record<string, string>>({});
  const [customChannelVisible, setCustomChannelVisible] = useState<Record<string, boolean>>({});

  // Last sync result — persisted to DB (Organization.settings) AND localStorage as cache
  const [lastSyncResult, setLastSyncResult] = useState<{
    time: string;
    count: number;
    error: string | null;
    type: 'manual' | 'automatic';
  } | null>(null);

  // Load last sync result — DB (via organization.settings) is source of truth
  useEffect(() => {
    if (authLoading) return;
    const orgId = organization?.id;
    // 1. Try DB value first (comes from organization.settings.lastSyncResult)
    const dbResult = organization?.settings?.lastSyncResult;
    if (dbResult && dbResult.time) {
      setLastSyncResult(dbResult);
      // Keep localStorage in sync as a cache
      if (typeof window !== 'undefined' && orgId) {
        try { localStorage.setItem(`pms_last_sync_result_${orgId}`, JSON.stringify(dbResult)); } catch {}
      }
      return;
    }
    // 2. Fall back to localStorage if DB has nothing yet
    if (typeof window === 'undefined' || !orgId) return;
    const key = `pms_last_sync_result_${orgId}`;
    try {
      const raw = localStorage.getItem(key);
      setLastSyncResult(raw ? JSON.parse(raw) : null);
    } catch { setLastSyncResult(null); }
  }, [organization?.id, organization?.settings?.lastSyncResult, authLoading]);

  // Load Channel Mappings
  useEffect(() => {
    if (authLoading) return;
    const dbMappings = organization?.settings?.pms_channel_mappings;
    if (dbMappings) {
      setChannelMappings(typeof dbMappings === 'string' ? JSON.parse(dbMappings) : dbMappings);
      return;
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(getScopedKey('pms_channel_mappings'));
      if (saved) {
        try {
          setChannelMappings(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, [organization?.id, organization?.settings?.pms_channel_mappings, authLoading]);

  const saveLastSyncResult = (result: { time: string; count: number; error: string | null; type: 'manual' | 'automatic' }) => {
    setLastSyncResult(result);
    // Save to localStorage as cache
    const orgId = organization?.id;
    const key = orgId ? `pms_last_sync_result_${orgId}` : 'pms_last_sync_result';
    try { localStorage.setItem(key, JSON.stringify(result)); } catch {}
    // Save to DB so it survives cookie/localStorage clears
    fetch('/api/settings/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'lastSyncResult', value: result }),
    }).catch(err => console.error('[saveLastSyncResult] DB persist failed:', err));
  };

  // ─── API Key / Mapping Lock state ────────────────────────────────
  const [unlockedSections, setUnlockedSections] = useState<Record<string, boolean>>({});
  const [pwModalTarget, setPwModalTarget] = useState<string | null>(null); // which section to unlock
  const [pwModalInput, setPwModalInput] = useState('');
  const [pwModalVerifying, setPwModalVerifying] = useState(false);
  const [pwModalError, setPwModalError] = useState('');

  const openUnlockModal = (section: string) => {
    setPwModalTarget(section);
    setPwModalInput('');
    setPwModalError('');
  };

  const closeUnlockModal = () => {
    setPwModalTarget(null);
    setPwModalInput('');
    setPwModalError('');
    setPwModalVerifying(false);
  };

  const handleConfirmUnlock = async () => {
    if (!pwModalInput.trim()) return;
    setPwModalVerifying(true);
    setPwModalError('');
    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwModalInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Incorrect password.');
      setUnlockedSections(prev => ({ ...prev, [pwModalTarget!]: true }));
      closeUnlockModal();
    } catch (err: any) {
      setPwModalError(err.message || 'Incorrect password.');
    } finally {
      setPwModalVerifying(false);
    }
  };

  const getShortListingName = (item: { name: string; nickname?: string }) => {
    if (item.nickname && item.nickname.trim()) {
      return item.nickname.trim();
    }
    const match = item.name.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return item.name;
  };

  // Filter members list to pending members for workspace display
  const pendingMembers = members.filter(m => !m.joinedAt);

  // Listen for settings changes from external elements
  useEffect(() => {
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const handleLanguageChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.email && detail.email !== email) return;
      if (detail?.language) setUiLanguage(detail.language);
      if (detail?.tone) setTranslationTone(detail.tone);
    };
    const handleThemeChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.email && detail.email !== email) return;
      const themeKey = email ? `pms_theme_${email}${suffix}` : `pms_theme${suffix}`;
      const savedTheme = localStorage.getItem(themeKey) as 'dark' | 'light' | 'dynamic' | null;
      if (savedTheme) setTheme(savedTheme);
    };
    window.addEventListener('pms-language-change', handleLanguageChange);
    window.addEventListener('pms-theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('pms-language-change', handleLanguageChange);
      window.removeEventListener('pms-theme-change', handleThemeChange);
    };
  }, [user?.email, organization?.id]);

  const getScopedKey = (baseKey: string) => {
    const orgId = organization?.id;
    return orgId ? `${baseKey}_${orgId}` : baseKey;
  };

  // Integration helper: save and set status
  const saveIntegration = (key: string, value: string) => {
    localStorage.setItem(getScopedKey(key), value);
    fetch('/api/settings/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    }).catch(err => console.error('Failed to sync integration to db:', err));
  };

  const generateRandomToken = (length: number = 24): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const fetchUplistingListings = async (key: string) => {
    if (!key) return;
    setListingsLoading(true);
    try {
      const res = await fetch('/api/settings/uplisting-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      if (res.ok) {
        const data = await res.json();
        setUplistingListings(data.properties || []);
      }
    } catch (err) {
      console.error('Failed to fetch Uplisting listings:', err);
    } finally {
      setListingsLoading(false);
    }
  };

  const handleVerifyUplisting = async () => {
    if (!uplistingApiKey.trim()) return;
    setUplistingStatus('verifying');
    setUplistingMessage('');
    try {
      const res = await fetch('/api/settings/verify-uplisting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: uplistingApiKey })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'API Key verification failed.');
      }
      saveIntegration('pms_uplisting_api_key', uplistingApiKey);
      setUplistingStatus('connected');
      setUplistingMessage(data.message || 'Connected successfully to Uplisting.');
      setSuccess('Uplisting API key verified and saved.');
      // Fetch live listings immediately
      fetchUplistingListings(uplistingApiKey);
    } catch (err: any) {
      setUplistingStatus('error');
      setUplistingMessage(err.message || 'Verification failed.');
      localStorage.removeItem(getScopedKey('pms_uplisting_api_key'));
      setUplistingListings([]);
    }
  };

  const getStatusBadge = (status: 'idle' | 'verifying' | 'connected' | 'error') => {
    const configs = {
      idle: { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.03)', label: 'Not Connected', dotColor: '#6b7280' },
      verifying: { color: 'var(--accent-primary)', bg: 'rgba(var(--accent-primary-rgb), 0.08)', label: 'Verifying...', dotColor: 'var(--accent-primary)' },
      connected: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', label: 'Connected', dotColor: '#10b981' },
      error: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', label: 'Error', dotColor: '#ef4444' },
    };
    const c = configs[status];
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
        background: c.bg, color: c.color, border: `1px solid ${c.color}25`,
        textTransform: 'uppercase', letterSpacing: '0.5px'
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.dotColor }} />
        {c.label}
      </span>
    );
  };

  // ─── Fetch Roles, Team & Integrations ───────────────────────────
  useEffect(() => {
    if (activeTab === 'roles') {
      fetchRoles();
      fetchMembers();
    } else if (activeTab === 'integrations') {
      fetchPropertiesForMapping();
      fetchChannelRules();
      fetchWebhookStatus();
    }
  }, [activeTab]);

  const fetchWebhookStatus = async () => {
    try {
      const res = await fetch('/api/settings/integrations');
      if (res.ok) {
        const data = await res.json();
        if (data.webhookStatus) {
          setWebhookStatus(data.webhookStatus);
        }
        if (data.lastWebhookReceivedAt) {
          setLastWebhookReceivedAt(data.lastWebhookReceivedAt);
        }
        if (data.webhookErrorMessage) {
          setWebhookErrorMessage(data.webhookErrorMessage);
        } else {
          setWebhookErrorMessage(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch webhook status:', err);
    }
  };

  const fetchPropertiesForMapping = async () => {
    setPropertiesLoading(true);
    try {
      const res = await fetch('/api/properties?limit=1000');
      if (res.ok) {
        const data = await res.json();
        const rawProps = data.properties || [];
        
        // Load mappings from localStorage
        const storedMappingsStr = localStorage.getItem(getScopedKey('pms_property_mappings'));
        const storedMappings = storedMappingsStr ? JSON.parse(storedMappingsStr) : {};
        
        const mapped = rawProps.map((p: any) => {
          const extra = p.extraDetails && typeof p.extraDetails === 'object' ? p.extraDetails : {};
          const mapping = storedMappings[p.id] || null;
          return {
            id: p.id,
            name: p.name,
            uplistingId: extra.uplistingId || (mapping ? mapping.uplistingId : null),
            uplistingName: extra.uplistingName || (mapping ? mapping.uplistingName : null),
          };
        });
        setPropertyMappings(mapped);

        // Auto-backport localStorage mappings to the database if they are missing
        const missingInDb = rawProps.filter((p: any) => {
          const extra = p.extraDetails && typeof p.extraDetails === 'object' ? p.extraDetails : {};
          const mapping = storedMappings[p.id] || null;
          return !extra.uplistingId && mapping && mapping.uplistingId;
        });

        if (missingInDb.length > 0) {
          (async () => {
            for (const p of missingInDb) {
              const mapping = storedMappings[p.id];
              try {
                const currentExtra = p.extraDetails || {};
                const updatedExtra = {
                  ...currentExtra,
                  uplistingId: mapping.uplistingId,
                  uplistingName: mapping.uplistingName
                };
                await fetch(`/api/properties/${p.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    extraDetails: updatedExtra
                  })
                });
              } catch (err) {
                console.error(`Failed to backport mapping for property ${p.id} to database:`, err);
              }
            }
          })();
        }
      }

      // Load Uplisting properties if API key is stored
      const savedApiKey = uplistingApiKey || organization?.settings?.pms_uplisting_api_key || localStorage.getItem(getScopedKey('pms_uplisting_api_key'));
      if (savedApiKey) {
        fetchUplistingListings(savedApiKey);
      }
    } catch (err) {
      console.error('Failed to fetch properties for mapping:', err);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const fetchChannelRules = async () => {
    setChannelRulesLoading(true);
    try {
      const res = await fetch('/api/settings/channel-rules');
      if (res.ok) {
        const data = await res.json();
        setChannelRules(data.rules || []);
      }
    } catch (err) {
      console.error('Failed to fetch channel rules:', err);
    } finally {
      setChannelRulesLoading(false);
    }
  };

  const handleSaveChannelMappings = async (newMappings: Record<string, {uplistingCode: string; uplistingName: string}>) => {
    setChannelRulesLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/channel-mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: newMappings })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save channel mappings.');
      }
      setChannelMappings(newMappings);
      localStorage.setItem(getScopedKey('pms_channel_mappings'), JSON.stringify(newMappings));
      setSuccess('Channel account mappings saved and bookings updated.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while saving channel mappings.');
    } finally {
      setChannelRulesLoading(false);
    }
  };

  const handleSaveMapping = async (propertyId: string, uplistingId: string | null, uplistingName: string | null) => {
    const storedMappingsStr = localStorage.getItem(getScopedKey('pms_property_mappings'));
    const storedMappings = storedMappingsStr ? JSON.parse(storedMappingsStr) : {};
    
    if (uplistingId) {
      storedMappings[propertyId] = { uplistingId, uplistingName };
    } else {
      delete storedMappings[propertyId];
    }
    
    localStorage.setItem(getScopedKey('pms_property_mappings'), JSON.stringify(storedMappings));
    saveIntegration('pms_property_mappings', JSON.stringify(storedMappings));
    
    // Update state
    setPropertyMappings(prev => prev.map(p => {
      if (p.id === propertyId) {
        return { ...p, uplistingId, uplistingName };
      }
      return p;
    }));

    // Update database Property extraDetails
    try {
      const propRes = await fetch(`/api/properties/${propertyId}`);
      if (propRes.ok) {
        const propData = await propRes.json();
        const currentExtra = propData.property?.extraDetails || {};
        const updatedExtra = {
          ...currentExtra,
          uplistingId,
          uplistingName
        };
        const putRes = await fetch(`/api/properties/${propertyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            extraDetails: updatedExtra
          })
        });

        if (putRes.ok && uplistingId) {
          const apiKey = uplistingApiKey || organization?.settings?.pms_uplisting_api_key || localStorage.getItem(getScopedKey('pms_uplisting_api_key'));
          if (apiKey) {
            setSuccess('Property linked successfully. Syncing bookings...');
            // Build current mappings including the newly linked property
            const storedMappingsStr = localStorage.getItem(getScopedKey('pms_property_mappings'));
            const freshMappings = storedMappingsStr ? JSON.parse(storedMappingsStr) : {};
            freshMappings[propertyId] = { uplistingId, uplistingName };
            fetch('/api/bookings/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey, propertyMappings: freshMappings })
            }).then(async (syncRes) => {
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                setSuccess(`Property linked and ${syncData.syncedCount || 0} bookings synchronized successfully!`);
              }
            }).catch(syncErr => {
              console.error('Auto-sync bookings failed:', syncErr);
            });
            return;
          }
        }
      }
    } catch (dbErr) {
      console.error('Failed to save mapping to database:', dbErr);
    }
    
    setSuccess(uplistingId ? 'Property mapping updated successfully.' : 'Property mapping removed.');
  };

  const handleBulkUnlink = (propertyIds: string[]) => {
    if (propertyIds.length === 0) return;
    const storedMappingsStr = localStorage.getItem(getScopedKey('pms_property_mappings'));
    const storedMappings = storedMappingsStr ? JSON.parse(storedMappingsStr) : {};

    propertyIds.forEach(id => {
      delete storedMappings[id];
    });

    localStorage.setItem(getScopedKey('pms_property_mappings'), JSON.stringify(storedMappings));
    saveIntegration('pms_property_mappings', JSON.stringify(storedMappings));

    // Update state
    setPropertyMappings(prev => prev.map(p => {
      if (propertyIds.includes(p.id)) {
        return { ...p, uplistingId: null, uplistingName: null };
      }
      return p;
    }));

    setSelectedMappingIds([]);
    setSuccess(`Unlinked ${propertyIds.length} properties successfully.`);
  };

  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await fetch('/api/settings/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const res = await fetch('/api/settings/team');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteRoleId) return;
    setInviteLoading(true);
    setError(null);
    setSuccess(null);


    try {
      const res = await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, roleId: inviteRoleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');
      setSuccess('Teammate invitation sent successfully.');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteRoleId('');
      // Refresh the team members list
      fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Invitation error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (memberId: string) => {
    setResendingInviteId(memberId);
    try {
      const res = await fetch('/api/settings/team/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to resend invite'); return; }
      setSuccess('Invite resent successfully. Link expires in 10 minutes.');
      fetchMembers();
    } catch {
      setError('Failed to resend invite.');
    } finally {
      setResendingInviteId(null);
    }
  };

  // ─── MFA Handlers ───────────────────────────────────────────────
  // --- Role Management Handlers ---
  const ALL_PERMISSIONS = [
    { group: 'Properties',     perms: ['properties.list','properties.view','properties.create','properties.edit','properties.view_financial'] },
    { group: 'Bookings',       perms: ['bookings.list','bookings.view','bookings.create','bookings.edit','bookings.cancel','bookings.sync'] },
    { group: 'Tasks',          perms: ['tasks.list','tasks.view','tasks.create','tasks.edit','tasks.complete'] },
    { group: 'Maintenance',    perms: ['maintenance.list','maintenance.view','maintenance.create','maintenance.approve_quote'] },
    { group: 'Accounting',     perms: ['accounting.view_dashboard','accounting.manage_ledger','accounting.view_bank','accounting.create_invoice','accounting.payments','accounting.statements'] },
    { group: 'Reports',        perms: ['reports.view_dashboard','reports.view_financial','reports.export'] },
    { group: 'Communications', perms: ['whatsapp.chat','whatsapp.send','email.send'] },
    { group: 'Documents',      perms: ['documents.list','documents.view','documents.upload','documents.sign'] },
    { group: 'Owner Portal',   perms: ['owner_portal.view_properties','owner_portal.view_statements','owner_portal.view_documents','owner_portal.approve_quotes','owner_portal.sign_documents'] },
    { group: 'Vendor Portal',  perms: ['vendor_portal.view_work_orders','vendor_portal.submit_quotes','vendor_portal.update_status','vendor_portal.submit_invoices'] },
    { group: 'Settings',       perms: ['settings.manage_roles','settings.manage_team','settings.manage_org'] },
  ];
  const openCreateRole = () => { setEditingRole(null); setRoleFormName(''); setRoleFormDesc(''); setRoleFormPerms([]); setRoleError(null); setRoleModalOpen(true); };
  const openEditRole = (role: RoleData, e: React.MouseEvent) => { e.stopPropagation(); setEditingRole(role); setRoleFormName(role.name); setRoleFormDesc(role.description || ''); setRoleFormPerms(Array.isArray(role.permissions) ? [...role.permissions] : []); setRoleError(null); setRoleModalOpen(true); };
  const togglePermission = (perm: string) => { setRoleFormPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]); };
  const handleSaveRole = async () => {
    if (!roleFormName.trim()) { setRoleError('Role name is required'); return; }
    setRoleSaving(true); setRoleError(null);
    try {
      const method = editingRole ? 'PUT' : 'POST';
      const body = editingRole
        ? { id: editingRole.id, name: roleFormName, description: roleFormDesc, permissions: roleFormPerms }
        : { name: roleFormName, description: roleFormDesc, permissions: roleFormPerms };
      const res = await fetch('/api/settings/roles', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setRoleError(data.error || 'Failed to save role'); return; }
      setRoleModalOpen(false); fetchRoles();
    } catch { setRoleError('Failed to save role'); }
    finally { setRoleSaving(false); }
  };
  const handleDeleteRole = async (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this role? This cannot be undone.')) return;
    setDeletingRoleId(roleId);
    try {
      const res = await fetch('/api/settings/roles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: roleId }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to delete role'); return; }
      fetchRoles();
    } catch { setError('Failed to delete role'); }
    finally { setDeletingRoleId(null); }
  };

  const startMfaSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize MFA setup');
      setQrCodeUrl(data.qrCodeDataUrl);
      setManualSecret(data.secret);
      setSetupMode(true);
    } catch (err: any) {
      setError(err.message || 'MFA initialization error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid verification code');
      setBackupCodes(data.backupCodes);
      setMfaEnabledState(true);
      setSetupMode(false);
      setSuccess('MFA successfully enabled. Please save your recovery backup codes!');
      await refreshSession();
    } catch (err: any) {
      setError(err.message || 'MFA verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid verification code');
      setMfaEnabledState(false);
      setDisableMode(false);
      setDisableCode('');
      setSuccess('MFA has been disabled.');
      await refreshSession();
    } catch (err: any) {
      setError(err.message || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // ─── Tab Config ─────────────────────────────────────────────────
  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile & Security', icon: Shield },
    { id: 'appearance' as SettingsTab, label: 'Personalisation', icon: Palette },
    { id: 'roles' as SettingsTab, label: 'Roles & Team', icon: Users },
    { id: 'integrations' as SettingsTab, label: 'Integrations & APIs', icon: Plug },
    { id: 'danger' as SettingsTab, label: 'Danger Zone', icon: AlertTriangle },
  ];

  // ─── Danger Zone States ─────────────────────────────────────────
  const [dangerConfirmText, setDangerConfirmText] = useState('');
  const [dangerAction, setDangerAction] = useState<string | null>(null);
  const [dangerDeleting, setDangerDeleting] = useState(false);
  const [dangerProgress, setDangerProgress] = useState(0);
  const [dangerProgressLabel, setDangerProgressLabel] = useState('');
  const [dangerAttempted, setDangerAttempted] = useState(false);

  const DANGER_ACTIONS = [
    {
      id: 'properties',
      title: 'Delete All Properties',
      description: 'Permanently remove all properties from this organization. This includes all property details, photos, documents, and owner assignments.',
      icon: '🏠',
      confirmWord: 'DELETE PROPERTIES',
      steps: ['Removing property photos...', 'Removing property documents...', 'Removing owner assignments...', 'Deleting property records...', 'Cleaning up references...'],
    },
    {
      id: 'bookings',
      title: 'Delete All Bookings',
      description: 'Permanently remove all bookings and reservation data. Guest records will remain but booking history will be lost.',
      icon: '📅',
      confirmWord: 'DELETE BOOKINGS',
      steps: ['Removing guest check-in data...', 'Removing payment records...', 'Deleting booking entries...', 'Cleaning up calendar data...'],
    },
    {
      id: 'team',
      title: 'Delete All Team Members',
      description: 'Remove all team members and staff from this organization. Only the organization owner account will remain.',
      icon: '👥',
      confirmWord: 'DELETE TEAM',
      steps: ['Revoking team permissions...', 'Removing role assignments...', 'Deleting team member accounts...', 'Cleaning up task assignments...'],
    },
    {
      id: 'tasks',
      title: 'Delete All Tasks & Schedules',
      description: 'Remove all scheduled tasks, cleaning schedules, maintenance requests, and task history.',
      icon: '📋',
      confirmWord: 'DELETE TASKS',
      steps: ['Removing scheduled tasks...', 'Clearing maintenance requests...', 'Deleting cleaning schedules...', 'Cleaning up task history...'],
    },
    {
      id: 'accounting',
      title: 'Delete All Accounting Data',
      description: 'Remove all journal entries, ledger data, VAT records, and owner statements. Chart of Accounts structure will be preserved.',
      icon: '💰',
      confirmWord: 'DELETE ACCOUNTING',
      steps: ['Removing journal entries...', 'Clearing ledger data...', 'Deleting owner statements...', 'Removing VAT records...', 'Preserving Chart of Accounts...'],
    },
    {
      id: 'everything',
      title: 'Delete Everything — Full Reset',
      description: 'Completely wipe all data in this organization. This resets the workspace to a blank state. Only the organization and your admin account will remain. This action is absolutely irreversible.',
      icon: '💣',
      confirmWord: 'DELETE EVERYTHING',
      steps: ['Deleting all bookings...', 'Deleting all tasks...', 'Deleting all properties...', 'Deleting all team members...', 'Deleting all accounting data...', 'Removing documents & media...', 'Resetting organization...', 'Finalizing full reset...'],
    },
  ];

  const handleDangerDelete = async (actionId: string) => {
    const action = DANGER_ACTIONS.find(a => a.id === actionId);
    if (!action) return;

    // Mark that user attempted to click
    setDangerAttempted(true);

    // Validate confirmation text
    if (dangerConfirmText !== action.confirmWord) {
      return; // Don't proceed — the UI will show the mismatch error
    }

    setDangerDeleting(true);
    setDangerProgress(0);
    setDangerProgressLabel('Connecting to server...');

    try {
      // 1. Perform actual database deletion on server
      const response = await fetch('/api/settings/danger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Database deletion failed on the server.');
      }

      // 2. Perform smooth UI transition progress steps to indicate what was deleted
      for (let i = 0; i < action.steps.length; i++) {
        setDangerProgressLabel(action.steps[i]);
        setDangerProgress(Math.round(((i + 0.5) / action.steps.length) * 100));

        await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 300));

        setDangerProgress(Math.round(((i + 1) / action.steps.length) * 100));
      }

      setDangerProgressLabel('Complete!');
      setDangerProgress(100);
      await new Promise(resolve => setTimeout(resolve, 600));

      setSuccess(`Successfully deleted: ${action.title.replace('Delete ', '')}`);
      setDangerAction(null);
      setDangerConfirmText('');
      setDangerAttempted(false);
      
      // Refresh the session & state
      await refreshSession();
    } catch (err: any) {
      setError(err.message || 'Failed to perform deletion');
    } finally {
      setDangerDeleting(false);
      setDangerProgress(0);
      setDangerProgressLabel('');
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>{t('Workspace Settings')}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '15px' }}>
        {t('Manage your profile, security, roles, and team access controls.')}
      </p>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        background: 'rgba(255,255,255,0.03)',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        marginBottom: '32px'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(null); setSuccess(null); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s ease',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.15), rgba(var(--accent-primary-rgb), 0.05))'
                  : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                boxShadow: isActive ? '0 2px 8px rgba(var(--accent-primary-rgb), 0.1)' : 'none',
              }}
            >
              <Icon size={16} />
              {t(tab.label)}
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--color-danger)',
          color: 'var(--color-danger)',
          padding: '16px',
          borderRadius: '10px',
          fontSize: '14px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid var(--color-success)',
          color: 'var(--color-success)',
          padding: '16px',
          borderRadius: '10px',
          fontSize: '14px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          {success}
        </div>
      )}

      {/* ═══════════════════ PROFILE TAB ═══════════════════ */}
      {activeTab === 'profile' && (
        <>
          {/* User Profile Card */}
          <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                background: 'rgba(var(--accent-primary-rgb), 0.08)',
                padding: '12px',
                borderRadius: '12px',
                color: 'var(--accent-primary)'
              }}>
                <User size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('Personal Profile')}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('Your account details')}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">{t('Full Name')}</label>
                <input className="form-input" type="text" value={user ? `${user.firstName} ${user.lastName}` : ''} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Email Address')}</label>
                <input className="form-input" type="text" value={user ? user.email : ''} disabled />
              </div>
            </div>
          </div>

          {/* Organization Details Card */}
          <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                background: 'rgba(var(--accent-primary-rgb), 0.08)',
                padding: '12px',
                borderRadius: '12px',
                color: 'var(--accent-primary)'
              }}>
                <Building size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('Organization Parameters')}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {roleSlug === 'org_admin' ? t('Manage company branding, title and logo settings') : t('Configured workspace settings')}
                </p>
              </div>
            </div>

            {roleSlug === 'org_admin' ? (
              <form onSubmit={handleUpdateOrganization} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">{t('Company Name (Title)')}</label>
                    <input 
                      className="form-input" 
                      type="text" 
                      value={orgName} 
                      onChange={e => setOrgName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('Subheading')}</label>
                    <input 
                      className="form-input" 
                      type="text" 
                      value={orgSubheading} 
                      onChange={e => setOrgSubheading(e.target.value)} 
                      placeholder="e.g. Operations Hub" 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">{t('Company Logo')}</label>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Option A: Text/Emoji */}
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                          Option A: Text, Emoji or Initials
                        </span>
                        <input 
                          className="form-input" 
                          type="text" 
                          value={orgLogoUrl.startsWith('data:image/') ? '' : orgLogoUrl} 
                          onChange={e => setOrgLogoUrl(e.target.value)} 
                          placeholder="e.g. 🏨, OB or initials" 
                          disabled={orgLogoUrl.startsWith('data:image/')}
                        />
                        {orgLogoUrl.startsWith('data:image/') && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                            Clear the uploaded photo to edit text/emoji.
                          </span>
                        )}
                      </div>

                      {/* Option B: Photo Upload */}
                      <div style={{ flex: 2, minWidth: '280px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                          Option B: Upload Brand Photo
                        </span>
                        
                        {orgLogoUrl.startsWith('data:image/') ? (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '16px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid var(--border-color)', 
                            padding: '12px', 
                            borderRadius: '12px' 
                          }}>
                            <div style={{ 
                              width: '48px', 
                              height: '48px', 
                              borderRadius: '50%', 
                              overflow: 'hidden', 
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-tertiary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <img src={orgLogoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>{t('Brand Logo Photo Active')}</div>
                              <button 
                                type="button" 
                                onClick={() => setOrgLogoUrl('')} 
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  color: 'var(--color-danger)', 
                                  fontSize: '12px', 
                                  padding: 0, 
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  marginTop: '4px'
                                }}
                              >
                                Remove Photo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            onDragOver={e => {
                              e.preventDefault();
                              e.currentTarget.style.borderColor = 'var(--brand-pink)';
                              e.currentTarget.style.background = 'rgba(240, 59, 106, 0.05)';
                            }}
                            onDragLeave={e => {
                              e.preventDefault();
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                              e.currentTarget.style.background = 'transparent';
                            }}
                            onDrop={e => {
                              e.preventDefault();
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                              e.currentTarget.style.background = 'transparent';
                              const file = e.dataTransfer.files?.[0];
                              if (file) {
                                if (file.size > 512000) {
                                  alert('File exceeds 500KB. Please compress or upload a smaller image.');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setOrgLogoUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            onClick={() => document.getElementById('logo-file-input')?.click()}
                            style={{
                              border: '2px dashed var(--border-color)',
                              borderRadius: '12px',
                              padding: '20px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-pink)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                          >
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                              Drag & drop photo here or <strong>browse files</strong>
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              PNG, JPG, SVG up to 500KB (square ratio recommended)
                            </span>
                            <input 
                              type="file" 
                              id="logo-file-input" 
                              accept="image/png, image/jpeg, image/jpg, image/svg+xml" 
                              style={{ display: 'none' }} 
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 512000) {
                                    alert('File exceeds 500KB. Please compress or upload a smaller image.');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setOrgLogoUrl(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">{t('Base Currency')}</label>
                    <input 
                      className="form-input" 
                      type="text" 
                      value={organization?.settings?.base_currency || 'AED'} 
                      disabled 
                    />
                  </div>
                </div>

                {orgUpdateSuccess && (
                  <div style={{ color: 'var(--color-success)', fontSize: '13px', fontWeight: 600 }}>
                    {orgUpdateSuccess}
                  </div>
                )}
                
                {orgUpdateError && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '13px', fontWeight: 600 }}>
                    {orgUpdateError}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: 'auto', alignSelf: 'flex-start', padding: '10px 24px' }}
                  disabled={updatingOrg}
                >
                  {updatingOrg ? 'Saving Settings...' : 'Save Workspace Branding'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input className="form-input" type="text" value={organization ? organization.name : ''} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Base Currency')}</label>
                  <input className="form-input" type="text" value={organization?.settings?.base_currency || 'AED'} disabled />
                </div>
              </div>
            )}
          </div>

          {/* Security MFA Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                background: 'rgba(var(--accent-primary-rgb), 0.08)',
                padding: '12px',
                borderRadius: '12px',
                color: 'var(--accent-primary)'
              }}>
                <Shield size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('Multi-Factor Authentication (MFA)')}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('Secure login using an authenticator app')}</p>
              </div>
            </div>

            {!mfaEnabledState && !setupMode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    MFA is currently Disabled
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Protect your workspace from unauthorized entry by enforcing a secondary login code.
                  </p>
                </div>
                <button className="btn-primary" style={{ width: 'auto' }} onClick={startMfaSetup} disabled={loading}>
                  Configure MFA
                </button>
              </div>
            )}

            {setupMode && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--accent-primary)' }}>
                  MFA Configuration Steps:
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '32px', alignItems: 'flex-start' }}>
                  {qrCodeUrl && (
                    <div style={{
                      background: '#fff', padding: '12px', borderRadius: '12px',
                      width: '180px', height: '180px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}>
                      <img src={qrCodeUrl} alt="MFA QR Code" style={{ width: '100%', height: '100%' }} />
                    </div>
                  )}
                  <div>
                    <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <li>{t('Scan the QR code with your Authenticator App.')}</li>
                      <li>
                        If you cannot scan, enter this key manually:
                        <div style={{
                          fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '8px 12px',
                          borderRadius: '6px', color: 'var(--text-primary)', marginTop: '6px', fontSize: '12px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <span>{manualSecret}</span>
                          <button onClick={() => copyToClipboard(manualSecret || '', 99)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)' }}>
                            {copiedIndex === 99 ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </li>
                      <li>{t('Enter the 6-digit verification code below.')}</li>
                    </ol>
                    <form onSubmit={handleVerifySetup} style={{ display: 'flex', gap: '16px', marginTop: '24px', alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ marginBottom: 0, flexGrow: 1 }}>
                        <label className="form-label">{t('Verification Code')}</label>
                        <input className="form-input" type="text" maxLength={6} placeholder="000000" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))} required />
                      </div>
                      <button className="btn-primary" type="submit" style={{ width: 'auto', height: '45px' }} disabled={loading}>{t('Verify & Activate')}</button>
                      <button type="button" onClick={() => setSetupMode(false)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0 20px', height: '45px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {mfaEnabledState && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <ShieldCheck size={20} color="var(--color-success)" />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-success)' }}>{t('MFA is Active & Enforced')}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('Your account is secure.')}</p>
                    </div>
                  </div>
                  {!disableMode && (
                    <button className="btn-primary" style={{ width: 'auto', background: 'none', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', boxShadow: 'none' }} onClick={() => setDisableMode(true)}>
                      Disable MFA
                    </button>
                  )}
                </div>
                {disableMode && (
                  <form onSubmit={handleDisableMfa} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0, flexGrow: 1 }}>
                      <label className="form-label" style={{ color: 'var(--color-danger)' }}>{t('Enter 6-Digit Code to Confirm')}</label>
                      <input className="form-input" type="text" maxLength={6} placeholder="000000" value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))} required />
                    </div>
                    <button className="btn-primary" type="submit" style={{ width: 'auto', height: '45px', background: 'var(--color-danger)', color: '#fff', boxShadow: 'none' }} disabled={loading}>{t('Confirm Disable')}</button>
                    <button type="button" onClick={() => { setDisableMode(false); setDisableCode(''); }} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0 20px', height: '45px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                  </form>
                )}
                {backupCodes.length > 0 && (
                  <div style={{ background: 'rgba(var(--accent-primary-rgb), 0.05)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginTop: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Key size={16} /> MFA Recovery Backup Codes
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Save these codes immediately. They can only be shown once.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                      {backupCodes.map((code, index) => (
                        <div key={code} onClick={() => copyToClipboard(code, index)} style={{
                          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '6px', padding: '8px 12px', fontFamily: 'monospace', fontSize: '13px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                        }}>
                          <span>{code}</span>
                          {copiedIndex === index ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════ APPEARANCE TAB ═══════════════════ */}
      {activeTab === 'appearance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Appearance Theme Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                background: 'rgba(var(--accent-primary-rgb), 0.08)',
                padding: '12px',
                borderRadius: '12px',
                color: 'var(--accent-primary)'
              }}>
                <Palette size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('Appearance Theme')}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('Select your preferred workspace visual theme.')}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              
              {/* Dark Theme Option */}
              <div 
                onClick={() => handleThemeChange('dark')}
                style={{
                  background: 'linear-gradient(135deg, #0a0e17 0%, #060910 100%)',
                  border: `2px solid ${theme === 'dark' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  boxShadow: theme === 'dark' ? '0 8px 24px rgba(var(--accent-primary-rgb), 0.15)' : 'none',
                  transition: 'all 0.25s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Moon size={16} style={{ color: 'var(--accent-primary)' }} /> {t('Warm Dark Mode')}
                  </span>
                  {theme === 'dark' && (
                    <span style={{
                      background: 'var(--accent-primary)',
                      color: '#000000',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 10px',
                      borderRadius: '20px',
                      textTransform: 'uppercase'
                    }}>{t('Active')}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', height: '40px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ width: '12px', height: '100%', background: 'var(--accent-primary)', borderRadius: '4px' }} />
                  <div style={{ flex: 1, background: '#121a2c', borderRadius: '4px', border: '1px solid rgba(var(--accent-primary-rgb), 0.15)' }} />
                  <div style={{ flex: 1, background: '#121a2c', borderRadius: '4px', border: '1px solid rgba(var(--accent-primary-rgb), 0.15)' }} />
                </div>
              </div>
 
               {/* Light Theme Option */}
              <div 
                onClick={() => handleThemeChange('light')}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                  border: `2px solid ${theme === 'light' ? 'var(--accent-primary)' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  boxShadow: theme === 'light' ? '0 8px 24px rgba(var(--accent-primary-rgb), 0.1)' : 'none',
                  transition: 'all 0.25s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sun size={16} style={{ color: 'var(--accent-primary)' }} /> {t('Elegant Light Mode')}
                  </span>
                  {theme === 'light' && (
                    <span style={{
                      background: 'var(--accent-primary)',
                      color: '#000000',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 10px',
                      borderRadius: '20px',
                      textTransform: 'uppercase'
                    }}>{t('Active')}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', height: '40px', background: 'rgba(0, 0, 0, 0.03)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ width: '12px', height: '100%', background: 'var(--accent-primary)', borderRadius: '4px' }} />
                  <div style={{ flex: 1, background: '#ffffff', borderRadius: '4px', border: '1px solid rgba(0, 0, 0, 0.08)' }} />
                  <div style={{ flex: 1, background: '#ffffff', borderRadius: '4px', border: '1px solid rgba(0, 0, 0, 0.08)' }} />
                </div>
              </div>
 
               {/* Dynamic Theme Option */}
              <div 
                onClick={() => handleThemeChange('dynamic')}
                style={{
                  background: 'linear-gradient(135deg, #0a0e17 0%, #ffffff 100%)',
                  border: `2px solid ${theme === 'dynamic' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  boxShadow: theme === 'dynamic' ? '0 8px 24px rgba(var(--accent-primary-rgb), 0.15)' : 'none',
                  transition: 'all 0.25s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#000000', mixBlendMode: 'difference', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} style={{ color: 'var(--accent-primary)' }} /> {t('Dynamic Appearance')}
                  </span>
                  {theme === 'dynamic' && (
                    <span style={{
                      background: 'var(--accent-primary)',
                      color: '#000000',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 10px',
                      borderRadius: '20px',
                      textTransform: 'uppercase'
                    }}>{t('Active')}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', height: '40px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '12px', height: '100%', background: 'var(--accent-primary)', borderRadius: '4px' }} />
                  <div style={{ flex: 1, background: '#0a0e17', borderRadius: '4px', border: '1px solid rgba(212, 175, 55, 0.15)' }} />
                  <div style={{ flex: 1, background: '#ffffff', borderRadius: '4px', border: '1px solid rgba(0, 0, 0, 0.08)' }} />
                </div>
              </div>

            </div>

            {/* Dynamic Schedule Customizer */}
            {theme === 'dynamic' && (
              <div style={{
                marginTop: '24px',
                padding: '20px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                animation: 'fadeIn 0.25s ease-out'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
                  ⚙️ {t('Customize Dynamic Schedule')}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t('Specify when the Elegant Light Mode theme is active. The app switches automatically.')}
                </p>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>☀️ {t('Light Mode Starts')}:</span>
                    <input 
                      type="time" 
                      value={lightStart} 
                      onChange={e => handleLightStartChange(e.target.value)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        padding: '6px 12px',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>🌙 {t('Light Mode Ends')}:</span>
                    <input 
                      type="time" 
                      value={lightEnd} 
                      onChange={e => handleLightEndChange(e.target.value)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        padding: '6px 12px',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Background Style Presets */}
            <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--accent-primary)' }}>
                🧱 {t('Workspace Background Theme')}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {t('Select your preferred base background styling presets for light and dark modes.')}
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                {/* Dark Mode Backgrounds */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🌙 {t('Dark Mode Background')}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { id: 'obsidian', name: 'Obsidian Black', desc: '#0a0e17 (Signature)', preview: '#0a0e17' },
                      { id: 'coal', name: 'Coal Charcoal', desc: '#121212 (Deep Gray)', preview: '#121212' },
                      { id: 'navy', name: 'Midnight Navy', desc: '#030712 (Dark Blue)', preview: '#030712' },
                      { id: 'amethyst', name: 'Amethyst Night', desc: '#090514 (Deep Purple)', preview: '#090514' },
                    ].map(preset => {
                      const isActive = darkBg === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleDarkBgChange(preset.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: '1px solid',
                            borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-color)',
                            background: isActive ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'rgba(255, 255, 255, 0.01)',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: preset.preview, border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{t(preset.name)}</span>
                            <span style={{ fontSize: '10px', opacity: 0.7 }}>{preset.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
 
                 {/* Light Mode Backgrounds */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ☀️ {t('Light Mode Background')}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { id: 'slate', name: 'Slate Gray', desc: '#f8fafc (Clean Slate)', preview: '#f8fafc' },
                      { id: 'silver', name: 'Silver Mist', desc: '#f1f5f9 (Soft Metallic)', preview: '#f1f5f9' },
                      { id: 'cream', name: 'Desert Sand Cream', desc: '#fafaf9 (Warm Sand)', preview: '#fafaf9' },
                      { id: 'gray', name: 'Classic Gray', desc: '#f3f4f6 (Neutral)', preview: '#f3f4f6' },
                    ].map(preset => {
                      const isActive = lightBg === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleLightBgChange(preset.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: '1px solid',
                            borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-color)',
                            background: isActive ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'rgba(255, 255, 255, 0.01)',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: preset.preview, border: '1px solid rgba(0, 0, 0, 0.08)' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{t(preset.name)}</span>
                            <span style={{ fontSize: '10px', opacity: 0.7 }}>{preset.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
 
             {/* Color Scheme Picker */}
            <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--accent-primary)' }}>
                🎨 {t('Workspace Color Accent')}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {t('Choose the primary branding accent color or fine-tune all three accent tones below.')}
              </p>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {[
                  { id: 'gold', name: 'Luxury Gold', color: '#d4af37' },
                  { id: 'green', name: 'Emerald Green', color: '#10b981' },
                  { id: 'blue', name: 'Royal Blue', color: '#3b82f6' },
                  { id: 'pink', name: 'Rose Pink', color: '#f03b6a' },
                  { id: 'purple', name: 'Amethyst Purple', color: '#8b5cf6' },
                  ...(accentColor === 'custom' ? [{ id: 'custom', name: 'Custom Tuned', color: accentPrimary }] : [])
                ].map(scheme => {
                  const isActive = accentColor === scheme.id;
                  return (
                    <button
                      key={scheme.id}
                      onClick={() => handleAccentChange(scheme.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: isActive ? scheme.color : 'var(--border-color)',
                        background: isActive ? `${scheme.color}15` : 'rgba(255, 255, 255, 0.01)',
                        color: isActive ? scheme.color : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'var(--font-sans)',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = scheme.color;
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      <span style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: scheme.color,
                        boxShadow: `0 0 8px ${scheme.color}60`
                      }} />
                      {t(scheme.name)}
                    </button>
                  );
                })}
              </div>

              {/* Custom Fine-Tuning */}
              <div style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <h5 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚙️ {t('Custom Fine-Tuning (All 3 Accent Colors)')}
                </h5>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t('Individually customize each accent color. The system will automatically update status controls, glow borders, and shadow gradients.')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  
                  {/* Primary Accent Color */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {t('Primary Accent')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        position: 'relative', 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '8px', 
                        overflow: 'hidden', 
                        border: '1px solid var(--border-color)', 
                        background: accentPrimary,
                        cursor: 'pointer'
                      }}>
                        <input 
                          type="color" 
                          value={accentPrimary}
                          onChange={e => handleCustomAccentChange('primary', e.target.value)}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            left: '-6px',
                            width: '50px',
                            height: '50px',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            opacity: 0
                          }}
                        />
                      </div>
                      <input 
                        type="text" 
                        value={accentPrimary.toUpperCase()} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val.startsWith('#') && val.length <= 7) {
                            handleCustomAccentChange('primary', val);
                          } else if (!val.startsWith('#') && val.length <= 6) {
                            handleCustomAccentChange('primary', '#' + val);
                          }
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          padding: '6px 12px',
                          fontSize: '13px',
                          width: '90px',
                          fontFamily: 'monospace',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Hover Accent Color */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {t('Hover/Glow Accent')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        position: 'relative', 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '8px', 
                        overflow: 'hidden', 
                        border: '1px solid var(--border-color)', 
                        background: accentHover,
                        cursor: 'pointer'
                      }}>
                        <input 
                          type="color" 
                          value={accentHover}
                          onChange={e => handleCustomAccentChange('hover', e.target.value)}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            left: '-6px',
                            width: '50px',
                            height: '50px',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            opacity: 0
                          }}
                        />
                      </div>
                      <input 
                        type="text" 
                        value={accentHover.toUpperCase()} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val.startsWith('#') && val.length <= 7) {
                            handleCustomAccentChange('hover', val);
                          } else if (!val.startsWith('#') && val.length <= 6) {
                            handleCustomAccentChange('hover', '#' + val);
                          }
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          padding: '6px 12px',
                          fontSize: '13px',
                          width: '90px',
                          fontFamily: 'monospace',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Dark Accent Color */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {t('Dark/Shadow Accent')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        position: 'relative', 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '8px', 
                        overflow: 'hidden', 
                        border: '1px solid var(--border-color)', 
                        background: accentDark,
                        cursor: 'pointer'
                      }}>
                        <input 
                          type="color" 
                          value={accentDark}
                          onChange={e => handleCustomAccentChange('dark', e.target.value)}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            left: '-6px',
                            width: '50px',
                            height: '50px',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            opacity: 0
                          }}
                        />
                      </div>
                      <input 
                        type="text" 
                        value={accentDark.toUpperCase()} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val.startsWith('#') && val.length <= 7) {
                            handleCustomAccentChange('dark', val);
                          } else if (!val.startsWith('#') && val.length <= 6) {
                            handleCustomAccentChange('dark', '#' + val);
                          }
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          padding: '6px 12px',
                          fontSize: '13px',
                          width: '90px',
                          fontFamily: 'monospace',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Font Style */}
              <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--accent-primary)' }}>
                  ✍️ {t('Typography Style')}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {t('Select the primary visual identity and typography set for the workspace.')}
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {[
                    { id: 'modern', label: 'Modern Executive', sans: 'Inter', display: 'Outfit', desc: 'Sleek, minimalist and highly readable' },
                    { id: 'classic', label: 'Classic Luxury', sans: 'Jakarta', display: 'Cinzel', desc: 'Sophisticated Roman luxury aesthetic' },
                    { id: 'clean', label: 'Minimal Clean', sans: 'Jakarta', display: 'DM Sans', desc: 'Soft geometry and lightweight feel' },
                    { id: 'heritage', label: 'Neo-Heritage', sans: 'Inter', display: 'Playfair', desc: 'High-contrast elegant editorial serif' },
                    { id: 'futuristic', label: 'Futuristic Syne', sans: 'Inter', display: 'Syne', desc: 'Bold, avant-garde design language' },
                  ].map(font => {
                    const isActive = fontStyle === font.id;
                    return (
                      <div 
                        key={font.id} 
                        onClick={() => handleFontStyleChange(font.id)}
                        style={{ 
                          padding: '16px', 
                          borderRadius: '12px', 
                          border: '1px solid', 
                          borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-color)', 
                          background: isActive ? 'rgba(var(--accent-primary-rgb),0.06)' : 'rgba(255, 255, 255, 0.01)', 
                          color: 'var(--text-primary)', 
                          cursor: 'pointer', 
                          transition: 'all 0.2s',
                          boxShadow: isActive ? '0 4px 12px rgba(var(--accent-primary-rgb), 0.05)' : 'none'
                        }}
                        onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-primary)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255, 255, 255, 0.03)'; } }}
                        onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255, 255, 255, 0.01)'; } }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px' }}>{font.label}</span>
                          {isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                        </div>
                        
                        {/* Font Preview snippet */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                          <span style={{ 
                            display: 'block', 
                            fontSize: '15px', 
                            fontWeight: 700, 
                            fontFamily: font.id === 'modern' ? "'Outfit'" : font.id === 'classic' ? "'Cinzel'" : font.id === 'clean' ? "'DM Sans'" : font.id === 'heritage' ? "'Playfair Display'" : "'Syne'",
                            color: '#fff',
                            lineHeight: 1.2
                          }}>
                            OMNIBetter
                          </span>
                          <span style={{ 
                            display: 'block', 
                            fontSize: '10px', 
                            fontFamily: font.id === 'classic' || font.id === 'clean' ? "'Plus Jakarta Sans'" : "'Inter'",
                            color: 'var(--text-secondary)',
                            marginTop: '2px'
                          }}>
                            Short-term rental AI
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>{font.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Platform Custom Order Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                background: 'rgba(var(--accent-primary-rgb), 0.08)',
                padding: '12px',
                borderRadius: '12px',
                color: 'var(--accent-primary)'
              }}>
                <Users size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('Platform Custom Order')}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Arrange the platforms in the sidebar to match your preferred navigation sequence. Use the up and down controls to adjust positions.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '480px' }}>
              {platforms.map((pid, idx) => {
                const item = PLATFORM_MAP[pid];
                if (!item) return null;
                return (
                  <div 
                    key={pid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '10px 16px',
                      transition: 'background 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t(item.name)}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                      <button 
                        disabled={idx === 0}
                        onClick={() => movePlatform(idx, 'up')}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: 'none',
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          color: 'var(--text-primary)',
                          opacity: idx === 0 ? 0.2 : 0.8,
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s'
                        }}
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        disabled={idx === platforms.length - 1}
                        onClick={() => movePlatform(idx, 'down')}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: 'none',
                          cursor: idx === platforms.length - 1 ? 'not-allowed' : 'pointer',
                          color: 'var(--text-primary)',
                          opacity: idx === platforms.length - 1 ? 0.2 : 0.8,
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s'
                        }}
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={resetPlatformOrder}
              style={{
                marginTop: '20px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <RotateCcw size={14} /> Reset Order to Default
            </button>
          </div>

          {/* ─── Language & Translation ─── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(var(--accent-primary-rgb), 0.08)', padding: '12px', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                <Languages size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Language & Translation</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Choose your workspace language. Claude AI will translate the interface and content automatically.
                </p>
              </div>
            </div>


            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('Interface Language')}</label>
                <select className="form-input" value={uiLanguage} onChange={e => setUiLanguage(e.target.value)} style={{ cursor: 'pointer' }}>
                  <option value="en">🇺🇸 English (Default)</option>
                  <option value="ar">🇸🇦 Arabic (عربي)</option>
                  <option value="fr">🇫🇷 French (Français)</option>
                  <option value="es">🇪🇸 Spanish (Español)</option>
                  <option value="de">🇩🇪 German (Deutsch)</option>
                  <option value="it">🇮🇹 Italian (Italiano)</option>
                  <option value="pt">🇵🇹 Portuguese (Português)</option>
                  <option value="zh">🇨🇳 Chinese (中文)</option>
                  <option value="ja">🇯🇵 Japanese (日本語)</option>
                  <option value="ko">🇰🇷 Korean (한국어)</option>
                  <option value="ru">🇷🇺 Russian (Русский)</option>
                  <option value="tr">🇹🇷 Turkish (Türkçe)</option>
                  <option value="nl">🇳🇱 Dutch (Nederlands)</option>
                  <option value="pl">🇵🇱 Polish (Polski)</option>
                  <option value="hi">🇮🇳 Hindi (हिंदी)</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('Translation Tone')}</label>
                <select className="form-input" value={translationTone} onChange={e => setTranslationTone(e.target.value)} style={{ cursor: 'pointer' }}>
                  <option value="professional">{t('Professional & Formal')}</option>
                  <option value="friendly">{t('Friendly & Casual')}</option>
                  <option value="neutral">{t('Neutral & Balanced')}</option>
                  <option value="luxury">{t('Luxury & Premium')}</option>
                </select>
              </div>
            </div>

            {uiLanguage !== 'en' && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(var(--accent-primary-rgb),0.04)', border: '1px solid rgba(var(--accent-primary-rgb),0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Languages size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {t('Interface will be translated to')}{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {t(({ ar:'Arabic',fr:'French',es:'Spanish',de:'German',it:'Italian',pt:'Portuguese',zh:'Chinese',ja:'Japanese',ko:'Korean',ru:'Russian',tr:'Turkish',nl:'Dutch',pl:'Polish',hi:'Hindi' } as Record<string,string>)[uiLanguage])}
                  </strong>
                  {' '}{t('using Claude AI with a')}{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {t(({ professional: 'Professional & Formal', friendly: 'Friendly & Casual', neutral: 'Neutral & Balanced', luxury: 'Luxury & Premium' } as Record<string,string>)[translationTone] || translationTone)}
                  </strong>{' '}
                  {t('tone.')}
                </span>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={async () => {
                  setTranslationSaving(true);
                  const email = user?.email;
                  const orgId = organization?.id;
                  const suffix = orgId ? `_${orgId}` : '';
                  const langKey = email ? `pms_ui_language_${email}${suffix}` : `pms_ui_language${suffix}`;
                  const toneKey = email ? `pms_translation_tone_${email}${suffix}` : `pms_translation_tone${suffix}`;
                  localStorage.setItem(langKey, uiLanguage);
                  localStorage.setItem(toneKey, translationTone);
                  saveIntegration('pms_ui_language', uiLanguage);
                  saveIntegration('pms_translation_tone', translationTone);
                  window.dispatchEvent(new CustomEvent('pms-language-change', { detail: { language: uiLanguage, tone: translationTone, email } }));
                  await new Promise(r => setTimeout(r, 600));
                  setTranslationSaving(false);
                  setTranslationSaved(true);
                  setTimeout(() => setTranslationSaved(false), 3000);
                }}
                className="btn-primary"
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
                disabled={translationSaving}
              >
                {translationSaving ? (
                  <><div style={{ width:'14px',height:'14px',border:'2px solid rgba(0,0,0,0.3)',borderTopColor:'#000',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} /> {t('Saving...')}</>
                ) : translationSaved ? (
                  <><Check size={14} /> {t('Saved!')}</>
                ) : (
                  <><Languages size={14} /> {t('Save Language Preference')}</>
                )}
              </button>
              {uiLanguage === 'en' && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('English is the default — no translation needed.')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ ROLES TAB ═══════════════════ */}
      {/* ═══════════════════ ROLES & TEAM TAB ═══════════════════ */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Section 1: Team Members */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{t('Team Members')}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {pendingMembers.length} pending invitation{pendingMembers.length !== 1 ? 's' : ''} in this workspace
                </p>
              </div>
              <button
                onClick={() => {
                  fetchRoles();
                  setIsInviteModalOpen(true);
                }}
                className="btn-primary"
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <UserPlus size={16} /> Invite Teammate
              </button>
            </div>

            {membersLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <div style={{
                  width: '32px', height: '32px',
                  border: '3px solid rgba(var(--accent-primary-rgb), 0.1)',
                  borderTopColor: 'var(--accent-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }} />
                <p style={{ fontSize: '13px' }}>{t('Loading team...')}</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr',
                  padding: '14px 24px',
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                }}>
                  <span>User</span>
                  <span>Role</span>
                  <span>Last Login</span>
                  <span style={{ textAlign: 'center' }}>Status</span>
                </div>

                {/* Table Rows */}
                {pendingMembers.map((member, idx) => {
                  const roleColor = getRoleColor(member.role.slug);
                  return (
                    <div
                      key={member.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr',
                        padding: '16px 24px',
                        alignItems: 'center',
                        borderBottom: idx < pendingMembers.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* User Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px', height: '38px',
                          borderRadius: '50%',
                          background: 'rgba(var(--accent-primary-rgb), 0.08)',
                          border: '1px solid var(--border-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--accent-primary)',
                          fontSize: '14px', fontWeight: 700,
                          fontFamily: 'var(--font-display)',
                        }}>
                          {member.user.firstName?.[0] || '?'}{member.user.lastName?.[0] || ''}
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {member.user.firstName ? `${member.user.firstName} ${member.user.lastName}` : 'Pending Invitation'}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {member.user.email}
                          </p>
                        </div>
                      </div>

                      {/* Role Badge */}
                      <div>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '5px 12px',
                          borderRadius: '20px',
                          background: `${roleColor}15`,
                          color: roleColor,
                          border: `1px solid ${roleColor}30`,
                        }}>
                          {React.createElement(getRoleIcon(member.role.slug), { size: 12 })}
                          {member.role.name}
                        </span>
                      </div>

                      {/* Last Login */}
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {member.user.lastLoginAt
                            ? new Date(member.user.lastLoginAt).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })
                            : '—'
                          }
                        </p>
                      </div>

                      {/* Actions: Pending badge + Resend button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          fontSize: '11px', fontWeight: 600, padding: '4px 10px',
                          borderRadius: '20px',
                          background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                          Pending
                        </span>
                        <button
                          onClick={() => handleResendInvite(member.id)}
                          disabled={resendingInviteId === member.id}
                          style={{
                            fontSize: '11px', fontWeight: 600, padding: '4px 10px',
                            borderRadius: '20px', cursor: 'pointer',
                            background: 'rgba(102,126,234,0.1)', color: 'var(--accent-primary)',
                            border: '1px solid rgba(102,126,234,0.25)',
                            opacity: resendingInviteId === member.id ? 0.6 : 1,
                          }}
                        >
                          {resendingInviteId === member.id ? 'Sending…' : '↩ Resend'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {pendingMembers.length === 0 && (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                    <p>{t('No pending invitations found')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', opacity: 0.15, margin: '8px 0' }} />

          {/* Section 2: Roles & Permissions */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Roles &amp; Permissions</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {roles.length} role{roles.length !== 1 ? 's' : ''} configured for this workspace
                </p>
              </div>
              {roleSlug === 'org_admin' && (
                <button onClick={openCreateRole} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                  <Plus size={16} /> Create Role
                </button>
              )}
            </div>

            {rolesLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid rgba(var(--accent-primary-rgb), 0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '13px' }}>{t('Loading roles...')}</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {roles.map(role => {
                  const RoleIcon = getRoleIcon(role.slug);
                  const roleColor = getRoleColor(role.slug);
                  const isExpanded = expandedRoleId === role.id;
                  const permissions = Array.isArray(role.permissions) ? role.permissions : [];
                  const isWildcard = permissions.includes('*');
                  return (
                    <div key={role.id} className="card" style={{ cursor: 'pointer', transition: 'all 0.2s ease', border: isExpanded ? `1px solid ${roleColor}40` : undefined }} onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${roleColor}15`, border: `1px solid ${roleColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleColor }}>
                            <RoleIcon size={20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{role.name}</h4>
                              {role.isSystemRole && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(var(--accent-primary-rgb), 0.1)', border: '1px solid rgba(var(--accent-primary-rgb), 0.2)', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>System</span>}
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{role.description || role.slug}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ textAlign: 'right' }}>
                            {(() => { const c = members.filter(m => m.role.id === role.id && !!m.joinedAt).length; return (<><p style={{ fontSize: '18px', fontWeight: 700, color: roleColor }}>{c}</p><p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Member{c !== 1 ? 's' : ''}</p></>); })()}
                          </div>
                          {roleSlug === 'org_admin' && (
                            <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                              <button onClick={e => openEditRole(role, e)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Edit size={13} /> Edit
                              </button>
                              {role.slug !== 'org_admin' && (
                                <button onClick={e => handleDeleteRole(role.id, e)} disabled={deletingRoleId === role.id} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Trash2 size={13} /> {deletingRoleId === role.id ? '...' : 'Delete'}
                                </button>
                              )}
                            </div>
                          )}
                          <ChevronRight size={18} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
                            {isWildcard ? 'Full Access \u2014 All Permissions' : `Granted Permissions (${permissions.length})`}
                          </p>
                          {isWildcard ? (
                            <span style={{ fontSize: '13px', padding: '6px 16px', borderRadius: '8px', background: 'rgba(var(--accent-primary-rgb),0.12)', border: '1px solid rgba(var(--accent-primary-rgb),0.3)', color: 'var(--accent-primary)', fontWeight: 700 }}>\u2605 Wildcard \u2014 Full Access</span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {permissions.map((perm: string, i: number) => (
                                <span key={i} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{perm}</span>
                              ))}
                              {permissions.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('No permissions assigned')}</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* --- Role Editor Modal --- */}
          {roleModalOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setRoleModalOpen(false)}>
              <div style={{ background: '#141414', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{editingRole ? 'Edit Role' : 'Create Custom Role'}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{editingRole ? 'Edit name, description or permissions' : 'Define a new role with custom permissions'}</p>
                  </div>
                  <button onClick={() => setRoleModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={22} /></button>
                </div>
                <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                  {roleError && <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px' }}>{roleError}</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role Name *</label>
                      <input value={roleFormName} onChange={e => setRoleFormName(e.target.value)} placeholder="e.g. Senior Manager" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                      <input value={roleFormDesc} onChange={e => setRoleFormDesc(e.target.value)} placeholder="Brief description" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  {editingRole?.slug === 'org_admin' ? (
                    <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(var(--accent-primary-rgb),0.06)', border: '1px solid rgba(var(--accent-primary-rgb),0.15)', fontSize: '13px', color: 'var(--accent-primary)' }}>
                      \u2605 Org Admin always has wildcard (full) access \u2014 permissions cannot be restricted
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Permissions ({roleFormPerms.length} selected)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => setRoleFormPerms(ALL_PERMISSIONS.flatMap(g => g.perms))} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(var(--accent-primary-rgb),0.1)', border: '1px solid rgba(var(--accent-primary-rgb),0.2)', color: 'var(--accent-primary)', cursor: 'pointer' }}>Select All</button>
                          <button onClick={() => setRoleFormPerms([])} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', cursor: 'pointer' }}>Clear</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {ALL_PERMISSIONS.map(({ group, perms }) => (
                          <div key={group}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{group}</p>
                              <button onClick={() => { const a = perms.every(p => roleFormPerms.includes(p)); setRoleFormPerms(prev => a ? prev.filter(p => !perms.includes(p)) : [...new Set([...prev, ...perms])]); }} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                {perms.every(p => roleFormPerms.includes(p)) ? 'Deselect all' : 'Select all'}
                              </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {perms.map(perm => {
                                const active = roleFormPerms.includes(perm);
                                const label = perm.split('.').slice(-1)[0].split('_').join(' ');
                                return (
                                  <button key={perm} onClick={() => togglePermission(perm)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: active ? 600 : 400, cursor: 'pointer', background: active ? 'rgba(var(--accent-primary-rgb),0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'rgba(var(--accent-primary-rgb),0.4)' : 'rgba(255,255,255,0.07)'}`, color: active ? 'var(--accent-primary)' : 'var(--text-muted)', transition: 'all 0.15s ease' }}>
                                    {active ? '\u2713 ' : ''}{label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={() => setRoleModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button onClick={handleSaveRole} disabled={roleSaving} style={{ padding: '10px 28px', borderRadius: '10px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: roleSaving ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: roleSaving ? 0.7 : 1 }}>
                    {roleSaving ? 'Saving...' : editingRole ? 'Save Changes' : 'Create Role'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ═══════════════════ INTEGRATIONS TAB ═══════════════════ */}
      {activeTab === 'integrations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', animation: 'fadeIn 0.25s ease-out' }}>

          {/* ─── Card 1: Uplisting API Key ─── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  background: 'rgba(var(--accent-primary-rgb), 0.08)',
                  padding: '12px', borderRadius: '12px', color: 'var(--accent-primary)'
                }}>
                  <Plug size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('Uplisting API Key')}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Provide your API key from the Uplisting Connect dashboard to sync bookings automatically.
                  </p>
                </div>
              </div>
              {getStatusBadge(uplistingStatus)}
            </div>
            {uplistingStatus === 'connected' && !unlockedSections['uplisting'] ? (
              /* ── Locked state ── */
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  flex: 1, background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)', borderRadius: '10px',
                  padding: '12px 16px', fontSize: '14px', color: 'var(--text-secondary)',
                  fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '10px',
                  userSelect: 'none',
                }}>
                  <span style={{ fontSize: '16px', opacity: 0.6 }}>🔒</span>
                  <span style={{ letterSpacing: '3px', opacity: 0.5 }}>{'•'.repeat(28)}</span>
                </div>
                <button
                  onClick={() => openUnlockModal('uplisting')}
                  style={{
                    whiteSpace: 'nowrap', padding: '12px 20px', borderRadius: '10px',
                    border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  🔓 Unlock to Edit
                </button>
              </div>
            ) : (
              /* ── Editable state ── */
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Enter your Uplisting API Key"
                  value={uplistingApiKey}
                  onChange={e => { setUplistingApiKey(e.target.value); setUplistingMessage(''); }}
                  style={{
                    flex: 1, background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--accent-primary)', borderRadius: '10px',
                    padding: '12px 16px', fontSize: '14px', color: 'var(--text-primary)',
                    outline: 'none', fontFamily: 'monospace', transition: 'border-color 0.2s',
                    WebkitTextSecurity: 'disc'
                  } as any}
                />
                <button
                  onClick={handleVerifyUplisting}
                  disabled={uplistingStatus === 'verifying' || !uplistingApiKey.trim()}
                  className="btn-primary"
                  style={{ width: 'auto', whiteSpace: 'nowrap', opacity: uplistingStatus === 'verifying' || !uplistingApiKey.trim() ? 0.6 : 1 }}
                >
                  {uplistingStatus === 'verifying' ? 'Verifying...' : 'Verify & Save'}
                </button>
                {unlockedSections['uplisting'] && (
                  <button
                    onClick={() => setUnlockedSections(prev => ({ ...prev, uplisting: false }))}
                    style={{
                      padding: '12px 14px', borderRadius: '10px',
                      border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)',
                      color: '#f87171', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                    }}
                    title="Re-lock this field"
                  >
                    🔒
                  </button>
                )}
              </div>
            )}
            {uplistingMessage && (
              <div style={{
                marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '13px', fontWeight: 600,
                color: uplistingStatus === 'connected' ? '#10b981' : '#ef4444'
              }}>
                {uplistingStatus === 'connected' ? <Check size={14} /> : <AlertTriangle size={14} />}
                {uplistingMessage}
              </div>
            )}

            {/* ─── Property Link Mappings (unlocked after valid API key) ─── */}
            {uplistingStatus === 'connected' && (
              <div style={{
                marginTop: '28px',
                borderTop: '1px solid rgba(var(--accent-primary-rgb), 0.2)',
                paddingTop: '24px',
                animation: 'fadeSlideIn 0.35s ease-out'
              }}>
                <style>{`
                  @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
{/* Unlock banner */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '10px', padding: '10px 16px', marginBottom: '20px'
                }}>
                  <Link size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
                    API key verified — Property Link Mappings unlocked
                  </p>
                </div>

                {/* Section header with Auto-Map button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      background: 'rgba(var(--accent-primary-rgb), 0.08)',
                      padding: '10px', borderRadius: '10px', color: 'var(--accent-primary)'
                    }}>
                      <Link size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 600 }}>{t('Property Link Mappings')}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Link each local property to its corresponding Uplisting listing to sync calendar bookings.
                      </p>
                    </div>
                  </div>
                  {propertyMappings.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={async () => {
                          const key = uplistingApiKey || organization?.settings?.pms_uplisting_api_key || localStorage.getItem(getScopedKey('pms_uplisting_api_key'));
                          if (!key) {
                            setError('Uplisting API Key is required for synchronization. Please save it in the Integrations tab.');
                            return;
                          }
                          setSyncingBookings(true);
                          setSyncProgress(5);
                          setSyncProgressLabel('Connecting to Uplisting PMS...');
                          setError('');
                          setSuccess('');
                          // Pass current mappings from localStorage so freshly-linked properties are included
                          const currentMappingsStr = localStorage.getItem(getScopedKey('pms_property_mappings'));
                          const currentMappings = currentMappingsStr ? JSON.parse(currentMappingsStr) : undefined;
                          
                          // Smoothly simulate progress over typical duration
                          const progressSteps = [
                            { val: 15, label: 'Authenticating credentials...' },
                            { val: 32, label: 'Fetching reservations from Uplisting API...' },
                            { val: 55, label: 'Analyzing property mapping coordinates...' },
                            { val: 72, label: 'Upserting booking details into database...' },
                            { val: 88, label: 'Checking contact histories and notifications...' },
                            { val: 96, label: 'Finalizing database transactions...' }
                          ];
                          
                          let currentStepIndex = 0;
                          const intervalId = setInterval(() => {
                            if (currentStepIndex < progressSteps.length) {
                              const step = progressSteps[currentStepIndex];
                              setSyncProgress(step.val);
                              setSyncProgressLabel(step.label);
                              currentStepIndex++;
                            }
                          }, 900);

                          try {
                            const res = await fetch('/api/bookings/sync', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ apiKey: key, propertyMappings: currentMappings })
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              throw new Error(data.error || 'Failed to sync bookings.');
                            }
                            clearInterval(intervalId);
                            setSyncProgress(100);
                            setSyncProgressLabel('Completed successfully!');
                            await new Promise(resolve => setTimeout(resolve, 800));
                            setSuccess(data.message || 'Bookings synced successfully.');
                            saveLastSyncResult({
                              time: new Date().toISOString(),
                              count: data.syncedCount ?? 0,
                              error: null,
                              type: 'manual',
                            });
                          } catch (err: any) {
                            clearInterval(intervalId);
                            setSyncProgress(0);
                            setSyncProgressLabel('');
                            const errMsg = err.message || 'An error occurred while syncing bookings.';
                            setError(errMsg);
                            saveLastSyncResult({
                              time: new Date().toISOString(),
                              count: 0,
                              error: errMsg,
                              type: 'manual',
                            });
                          } finally {
                            clearInterval(intervalId);
                            setSyncingBookings(false);
                          }
                        }}
                        disabled={syncingBookings}
                        style={{
                          background: syncingBookings ? 'rgba(var(--accent-primary-rgb), 0.05)' : 'rgba(var(--accent-primary-rgb), 0.1)',
                          border: '1px solid var(--accent-primary)',
                          borderRadius: '8px', padding: '8px 16px',
                          color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 600,
                          cursor: syncingBookings ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          transition: 'all 0.2s',
                          opacity: syncingBookings ? 0.7 : 1
                        }}
                        onMouseEnter={e => !syncingBookings && (e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.18)')}
                        onMouseLeave={e => !syncingBookings && (e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.1)')}
                      >
                        <RefreshCw size={14} style={{ animation: syncingBookings ? 'spin 1s linear infinite' : 'none' }} /> {syncingBookings ? 'Syncing...' : 'Sync Bookings'}
                      </button>

                      <button
                        onClick={async () => {
                          if (uplistingListings.length === 0) {
                            setError('No Uplisting listings retrieved yet. Make sure your API key is verified and connected.');
                            return;
                          }
                          
                          setPropertiesLoading(true);
                          setError('');
                          setSuccess('');
                          
                          try {
                            const storedMappingsStr = localStorage.getItem(getScopedKey('pms_property_mappings'));
                            const storedMappings = storedMappingsStr ? JSON.parse(storedMappingsStr) : {};
                            
                            const alreadyMappedIds = propertyMappings
                              .filter(p => p.uplistingId)
                              .map(p => p.uplistingId as string);

                            const res = await fetch('/api/settings/auto-map', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                localProperties: propertyMappings.filter(p => !p.uplistingId).map(p => ({ id: p.id, name: p.name })),
                                uplistingListings: uplistingListings,
                                alreadyMappedIds,
                                apiKey: localStorage.getItem(getScopedKey('pms_claude_api_key')),
                                model: localStorage.getItem(getScopedKey('pms_claude_model')) || 'claude-3-5-sonnet-20241022'
                              })
                            });

                            if (!res.ok) {
                              const data = await res.json();
                              throw new Error(data.error || 'Auto-mapping request failed.');
                            }

                            const data = await res.json();
                            const results = data.mappedResults || {};
                            const totalMapped = data.totalMapped || 0;

                            if (totalMapped > 0) {
                              Object.entries(results).forEach(([propId, mapObj]: [string, any]) => {
                                if (mapObj.uplistingId) {
                                  storedMappings[propId] = {
                                    uplistingId: mapObj.uplistingId,
                                    uplistingName: mapObj.uplistingName
                                  };
                                }
                              });

                              localStorage.setItem(getScopedKey('pms_property_mappings'), JSON.stringify(storedMappings));
                              saveIntegration('pms_property_mappings', JSON.stringify(storedMappings));
                              
                              setPropertyMappings(prev => prev.map(p => {
                                if (results[p.id]) {
                                  return {
                                    ...p,
                                    uplistingId: results[p.id].uplistingId,
                                    uplistingName: results[p.id].uplistingName
                                  };
                                }
                                return p;
                              }));

                              // Save auto-mapped properties to database
                              const updatePromises = Object.entries(results).map(async ([propId, mapObj]: [string, any]) => {
                                if (mapObj.uplistingId) {
                                  try {
                                    const propRes = await fetch(`/api/properties/${propId}`);
                                    if (propRes.ok) {
                                      const propData = await propRes.json();
                                      const currentExtra = propData.property?.extraDetails || {};
                                      const updatedExtra = {
                                        ...currentExtra,
                                        uplistingId: mapObj.uplistingId,
                                        uplistingName: mapObj.uplistingName
                                      };
                                      await fetch(`/api/properties/${propId}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          extraDetails: updatedExtra
                                        })
                                      });
                                    }
                                  } catch (dbErr) {
                                    console.error(`Failed to save auto-mapped property ${propId} to database:`, dbErr);
                                  }
                                }
                              });
                              await Promise.all(updatePromises);

                              let successMsg = `Successfully auto-mapped ${data.heuristicCount} properties using structural matching.`;
                              if (data.claudeCount > 0) {
                                successMsg += ` Mapped an additional ${data.claudeCount} properties using Claude AI.`;
                              }
                              setSuccess(successMsg + ' Syncing bookings...');

                              // Trigger automatic booking sync in the background
                              const apiKey = uplistingApiKey || organization?.settings?.pms_uplisting_api_key || localStorage.getItem(getScopedKey('pms_uplisting_api_key'));
                              if (apiKey) {
                                fetch('/api/bookings/sync', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ apiKey })
                                }).then(async (syncRes) => {
                                  if (syncRes.ok) {
                                    const syncData = await syncRes.json();
                                    setSuccess(successMsg + ` Synchronized ${syncData.syncedCount || 0} bookings from Uplisting.`);
                                    saveLastSyncResult({
                                      time: new Date().toISOString(),
                                      count: syncData.syncedCount || 0,
                                      error: null,
                                      type: 'automatic'
                                    });
                                  }
                                }).catch(syncErr => {
                                  console.error('Auto-sync bookings after auto-map failed:', syncErr);
                                });
                              }
                            } else {
                              setError('No new matches could be determined automatically. Try linking manually or verify your property names.');
                            }
                          } catch (err: any) {
                            setError(err.message || 'An error occurred during auto-mapping.');
                          } finally {
                            setPropertiesLoading(false);
                          }
                        }}
                        style={{
                          background: 'rgba(var(--accent-primary-rgb), 0.1)',
                          border: '1px solid var(--accent-primary)',
                          borderRadius: '8px', padding: '8px 16px',
                          color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 600,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.18)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.1)'}
                      >
                        <RefreshCw size={14} /> Auto-Map Properties
                      </button>
                      </div>

                      {/* Last sync status */}
                      {!syncingBookings && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          {lastSyncResult ? (
                            lastSyncResult.error ? (
                              <>
                                <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠ {t('Sync failed')}</span>
                                <span style={{ color: '#f87171', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lastSyncResult.error}>
                                  — {t(lastSyncResult.error)}
                                </span>
                                <span style={{ opacity: 0.5, whiteSpace: 'nowrap' }}>
                                  · {new Date(lastSyncResult.time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span style={{ opacity: 0.5, whiteSpace: 'nowrap' }}>
                                  · {lastSyncResult.type === 'manual' ? t('Manual Sync') : t('Auto Sync')}
                                </span>
                              </>
                            ) : (
                              <>
                                <span style={{ color: '#10b981', fontWeight: 700 }}>✓ {t('Last synced')}:</span>
                                <span style={{ whiteSpace: 'nowrap' }}>
                                  {new Date(lastSyncResult.time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span style={{ opacity: 0.55, whiteSpace: 'nowrap' }}>
                                  · {lastSyncResult.count === 1 ? t('1 booking') : `${lastSyncResult.count} ${t('bookings')}`}
                                </span>
                                <span style={{ opacity: 0.55, whiteSpace: 'nowrap' }}>
                                  · {lastSyncResult.type === 'manual' ? t('Manual Sync') : t('Auto Sync')}
                                </span>
                              </>
                            )
                          ) : (
                            <>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{t('Last synced')}:</span>
                              <span style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                {t('Never')}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bookings Sync Progress Bar */}
                {syncingBookings && (
                  <div style={{
                    background: 'rgba(var(--accent-primary-rgb), 0.03)',
                    border: '1px solid rgba(var(--accent-primary-rgb), 0.1)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    animation: 'fadeIn 0.3s ease-out'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <RefreshCw size={14} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--accent-primary)' }} />
                          {syncProgressLabel || 'Synchronizing bookings...'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 700, fontFamily: 'monospace' }}>
                          {syncProgress}%
                        </span>
                      </div>
                      {/* Progress Track */}
                      <div style={{
                        width: '100%', height: '8px', borderRadius: '4px',
                        background: 'rgba(var(--accent-primary-rgb), 0.1)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${syncProgress}%`, height: '100%',
                          borderRadius: '4px',
                          background: syncProgress === 100
                            ? 'linear-gradient(90deg, #10b981, #34d399)'
                            : 'linear-gradient(90deg, var(--accent-primary), var(--accent-hover, var(--accent-primary)))',
                          transition: 'width 0.3s ease-out, background 0.3s',
                        }} />
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                        We are retrieving your latest bookings from Uplisting OTA channels and sync-matching them to local property calendars. Please keep this settings tab open.
                      </p>
                    </div>
                  </div>
                )}

                {propertiesLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{
                      width: '28px', height: '28px',
                      border: '3px solid rgba(var(--accent-primary-rgb), 0.1)',
                      borderTopColor: 'var(--accent-primary)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 12px'
                    }} />
                    <p style={{ fontSize: '13px' }}>Loading properties...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : propertyMappings.length === 0 ? (
                  <div style={{
                    padding: '40px', textAlign: 'center', color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)',
                    borderRadius: '12px'
                  }}>
                    <Building size={32} style={{ marginBottom: '12px', opacity: 0.4, color: 'var(--accent-primary)' }} />
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>No Properties Registered</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                      Register local properties in your portfolio before mapping them to Uplisting listings.
                    </p>
                    <a
                      href="/dashboard/properties"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        background: 'var(--accent-primary)', color: '#000',
                        fontWeight: 700, fontSize: '13px', padding: '10px 20px',
                        borderRadius: '10px', textDecoration: 'none', transition: 'all 0.2s',
                      }}
                    >
                      Go to Listings <ExternalLink size={14} />
                    </a>
                  </div>
                ) : (
                  <>
                    {/* Search & Filter */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '320px' }}>
                        <input
                          type="text"
                          placeholder="Search property or listing..."
                          value={mappingSearch}
                          onChange={e => {
                            setMappingSearch(e.target.value);
                            setSelectedMappingIds([]);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)', borderRadius: '10px',
                            padding: '9px 14px 9px 36px', color: 'var(--text-primary)',
                            fontSize: '13px', outline: 'none', width: '100%',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                        />
                        <Search size={13} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                      </div>
                      <select
                        value={mappingFilter}
                        onChange={e => {
                          setMappingFilter(e.target.value as 'all' | 'linked' | 'unlinked');
                          setSelectedMappingIds([]);
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)', borderRadius: '10px',
                          padding: '9px 14px', color: 'var(--text-primary)',
                          fontSize: '13px', outline: 'none', cursor: 'pointer'
                        }}
                      >
                        <option value="all" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>All ({propertyMappings.length})</option>
                        <option value="linked" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>✓ Linked ({propertyMappings.filter(p => p.uplistingId).length})</option>
                        <option value="unlinked" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>✗ Unlinked ({propertyMappings.filter(p => !p.uplistingId).length})</option>
                      </select>

                      {selectedMappingIds.length > 0 && (
                        <button
                          onClick={() => {
                            const linkedSelectedIds = propertyMappings
                              .filter(p => selectedMappingIds.includes(p.id) && p.uplistingId)
                              .map(p => p.id);
                            if (linkedSelectedIds.length === 0) {
                              setSuccess('No linked properties were selected.');
                              setSelectedMappingIds([]);
                              return;
                            }
                            if (confirm(`Are you sure you want to unlink the ${linkedSelectedIds.length} selected properties?`)) {
                              handleBulkUnlink(linkedSelectedIds);
                            }
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid #ef4444',
                            borderRadius: '10px',
                            padding: '9px 16px',
                            color: '#ef4444',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            marginLeft: 'auto'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                        >
                          <span>Bulk Unlink ({selectedMappingIds.length})</span>
                        </button>
                      )}
                    </div>

                    {/* Mapping Table */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'visible' }}>
                      {(() => {
                        const filtered = propertyMappings.filter(p => {
                          const term = mappingSearch.toLowerCase().trim();
                          if (term && !p.name.toLowerCase().includes(term) && !(p.uplistingName || '').toLowerCase().includes(term)) return false;
                          if (mappingFilter === 'linked') return !!p.uplistingId;
                          if (mappingFilter === 'unlinked') return !p.uplistingId;
                          return true;
                        });

                        const linkedFiltered = filtered.filter(p => p.uplistingId);

                        return (
                          <>
                            <div style={{
                              display: 'grid', gridTemplateColumns: '40px 2fr 2fr 0.8fr',
                              padding: '11px 18px',
                              background: 'rgba(255,255,255,0.02)',
                              borderBottom: '1px solid var(--border-color)',
                              fontSize: '11px', fontWeight: 700,
                              color: 'var(--accent-primary)',
                              textTransform: 'uppercase', letterSpacing: '1.5px',
                              alignItems: 'center'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={linkedFiltered.length > 0 && linkedFiltered.every(p => selectedMappingIds.includes(p.id))}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedMappingIds(linkedFiltered.map(p => p.id));
                                    } else {
                                      setSelectedMappingIds([]);
                                    }
                                  }}
                                  style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                />
                              </div>
                              <span>{t('Local Property')}</span>
                              <span>{t('Uplisting Listing')}</span>
                              <span style={{ textAlign: 'center' }}>Status</span>
                            </div>

                            {filtered.length === 0 ? (
                              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Building size={24} style={{ marginBottom: '8px', opacity: 0.3 }} />
                                <p style={{ fontSize: '13px' }}>No properties match your filter.</p>
                              </div>
                            ) : (
                              filtered.map((prop, idx) => {
                                const filteredListings = uplistingListings.filter(item => {
                                  const term = dropdownSearch.toLowerCase().trim();
                                  if (!term) return true;
                                  const shortName = getShortListingName(item).toLowerCase();
                                  const fullName = item.name.toLowerCase();
                                  return shortName.includes(term) || fullName.includes(term) || item.id.toLowerCase().includes(term);
                                });

                                return (
                                  <div
                                    key={prop.id}
                                    style={{
                                      display: 'grid', gridTemplateColumns: '40px 2fr 2fr 0.8fr',
                                      padding: '13px 18px', alignItems: 'center',
                                      borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                      transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <input
                                        type="checkbox"
                                        disabled={!prop.uplistingId}
                                        checked={selectedMappingIds.includes(prop.id)}
                                        onChange={e => {
                                          if (e.target.checked) {
                                            setSelectedMappingIds(prev => [...prev, prop.id]);
                                          } else {
                                            setSelectedMappingIds(prev => prev.filter(id => id !== prop.id));
                                          }
                                        }}
                                        style={{ cursor: prop.uplistingId ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-primary)' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{
                                        width: '30px', height: '30px', borderRadius: '7px',
                                        background: 'rgba(var(--accent-primary-rgb), 0.06)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--accent-primary)', flexShrink: 0
                                      }}>
                                        <Building size={13} />
                                      </div>
                                      <div>
                                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{prop.name}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{prop.id}</p>
                                      </div>
                                    </div>

                                    <div>
                                      <div style={{ position: 'relative' }}>
                                        {/* Dropdown Button — locked if linked and mappings not unlocked */}
                                        {prop.uplistingId && !unlockedSections['mappings'] ? (
                                          /* Locked linked row */
                                          <div style={{
                                            background: 'rgba(var(--accent-primary-rgb), 0.03)',
                                            border: '1px solid var(--accent-primary)',
                                            borderRadius: '10px', padding: '10px 14px',
                                            color: 'var(--text-primary)', fontSize: '13px',
                                            width: '100%', maxWidth: '280px',
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'space-between', userSelect: 'none',
                                          }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px', opacity: 0.8 }}>
                                              {prop.uplistingName}
                                            </span>
                                            <span
                                              onClick={() => openUnlockModal('mappings')}
                                              title="Unlock to change this mapping"
                                              style={{ fontSize: '14px', cursor: 'pointer', opacity: 0.7, flexShrink: 0 }}
                                            >🔒</span>
                                          </div>
                                        ) : (
                                          /* Editable / unlinked row */
                                          <div
                                            onClick={() => {
                                              setActiveDropdownPropId(activeDropdownPropId === prop.id ? null : prop.id);
                                              setDropdownSearch('');
                                            }}
                                            style={{
                                              background: prop.uplistingId ? 'rgba(var(--accent-primary-rgb), 0.03)' : 'rgba(255, 255, 255, 0.02)',
                                              border: prop.uplistingId ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                              borderRadius: '10px', padding: '10px 14px',
                                              color: prop.uplistingId ? 'var(--text-primary)' : 'var(--text-secondary)',
                                              fontSize: '13px', width: '100%', maxWidth: '280px',
                                              cursor: 'pointer', display: 'flex', alignItems: 'center',
                                              justifyContent: 'space-between', userSelect: 'none',
                                              transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => {
                                              e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                              e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.06)';
                                            }}
                                            onMouseLeave={e => {
                                              if (activeDropdownPropId !== prop.id) {
                                                e.currentTarget.style.borderColor = prop.uplistingId ? 'var(--accent-primary)' : 'var(--border-color)';
                                                e.currentTarget.style.background = prop.uplistingId ? 'rgba(var(--accent-primary-rgb), 0.03)' : 'rgba(255, 255, 255, 0.02)';
                                              }
                                            }}
                                          >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                                              {prop.uplistingId ? prop.uplistingName : '-- Choose a listing --'}
                                            </span>
                                            <ChevronDown size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
                                          </div>
                                        )}

                                        {/* Click-outside Backdrop */}
                                        {activeDropdownPropId === prop.id && (
                                          <div
                                            style={{
                                              position: 'fixed',
                                              top: 0, left: 0, right: 0, bottom: 0,
                                              zIndex: 998,
                                              cursor: 'default',
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveDropdownPropId(null);
                                            }}
                                          />
                                        )}

                                        {/* Dropdown Options List */}
                                        {activeDropdownPropId === prop.id && (() => {
                                          const alreadyMappedListings = propertyMappings.reduce((acc, p) => {
                                            if (p.id !== prop.id && p.uplistingId) {
                                              acc[p.uplistingId] = p.name;
                                            }
                                            return acc;
                                          }, {} as Record<string, string>);

                                          return (
                                            <div
                                              style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                marginTop: '6px',
                                                width: '100%',
                                                minWidth: '280px',
                                                background: 'var(--bg-tertiary)',
                                                border: '1px solid var(--accent-primary)',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                                zIndex: 999,
                                                padding: '10px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                              }}
                                              onClick={e => e.stopPropagation()}
                                            >
                                              {/* Search Input */}
                                              <div style={{ position: 'relative' }}>
                                                <input
                                                  type="text"
                                                  autoFocus
                                                  placeholder="Search listing..."
                                                  value={dropdownSearch}
                                                  onChange={e => setDropdownSearch(e.target.value)}
                                                  style={{
                                                    width: '100%',
                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    padding: '8px 12px 8px 30px',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    transition: 'border-color 0.2s',
                                                  }}
                                                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                                                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                                />
                                                <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, color: 'var(--text-secondary)' }} />
                                              </div>

                                              {/* Scrollable Listings */}
                                              <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                                                {/* Empty / Unlink Option */}
                                                <div
                                                  onClick={() => {
                                                    handleSaveMapping(prop.id, null, null);
                                                    setActiveDropdownPropId(null);
                                                  }}
                                                  style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    padding: '8px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    color: prop.uplistingId ? '#ef4444' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s',
                                                    marginBottom: '2px'
                                                  }}
                                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                  {prop.uplistingId ? '❌ Unlink / Clear' : '-- Choose a listing --'}
                                                </div>
                                                 {filteredListings.length === 0 ? (
                                                   <div style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                     No listings found
                                                   </div>
                                                 ) : (
                                                   filteredListings.map(item => {
                                                     const isSelected = item.id === prop.uplistingId;
                                                     const shortName = getShortListingName(item);
                                                     const alreadyMappedToPropName = alreadyMappedListings[item.id];

                                                     if (alreadyMappedToPropName) {
                                                       return (
                                                         <div
                                                           key={item.id}
                                                           style={{
                                                             display: 'block',
                                                             width: '100%',
                                                             boxSizing: 'border-box',
                                                             padding: '8px 10px',
                                                             borderRadius: '6px',
                                                             fontSize: '13px',
                                                             color: 'var(--text-muted)',
                                                             background: 'rgba(255, 255, 255, 0.01)',
                                                             cursor: 'not-allowed',
                                                             opacity: 0.6,
                                                             overflow: 'hidden',
                                                             textOverflow: 'ellipsis',
                                                             whiteSpace: 'nowrap',
                                                             marginBottom: '2px',
                                                             fontStyle: 'italic'
                                                           }}
                                                           title={`Already linked to ${alreadyMappedToPropName}`}
                                                         >
                                                           {shortName} <span style={{ fontSize: '11px', color: 'rgba(239, 68, 68, 0.7)' }}>({alreadyMappedToPropName})</span>
                                                         </div>
                                                       );
                                                     }

                                                     return (
                                                       <div
                                                         key={item.id}
                                                         onClick={() => {
                                                           handleSaveMapping(prop.id, item.id, shortName);
                                                           setActiveDropdownPropId(null);
                                                         }}
                                                         style={{
                                                           display: 'block',
                                                           width: '100%',
                                                           boxSizing: 'border-box',
                                                           padding: '8px 10px',
                                                           borderRadius: '6px',
                                                           fontSize: '13px',
                                                           color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                           background: isSelected ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'transparent',
                                                           cursor: 'pointer',
                                                           fontWeight: isSelected ? 600 : 400,
                                                           transition: 'background 0.2s',
                                                           overflow: 'hidden',
                                                           textOverflow: 'ellipsis',
                                                           whiteSpace: 'nowrap',
                                                           marginBottom: '2px'
                                                         }}
                                                         onMouseEnter={e => e.currentTarget.style.background = isSelected ? 'rgba(var(--accent-primary-rgb), 0.12)' : 'rgba(255, 255, 255, 0.05)'}
                                                         onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'transparent'}
                                                       >
                                                         {shortName}
                                                       </div>
                                                     );
                                                   })
                                                 )}
                                             </div>
                                           </div>
                                         );
                                       })()}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                        fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px',
                                        background: prop.uplistingId ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: prop.uplistingId ? '#10b981' : '#ef4444',
                                        border: `1px solid ${prop.uplistingId ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: prop.uplistingId ? '#10b981' : '#ef4444' }} />
                                        {prop.uplistingId ? 'Linked' : 'Unlinked'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Summary */}
                    <div style={{ marginTop: '12px', display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>{propertyMappings.filter(p => p.uplistingId).length} of {propertyMappings.length} properties linked</span>
                      <span style={{ color: propertyMappings.filter(p => !p.uplistingId).length > 0 ? '#f59e0b' : '#10b981' }}>
                        {propertyMappings.filter(p => !p.uplistingId).length} unlinked
                      </span>
                    </div>
                  </>
                )}

                {/* ─── Channel Account Mappings ─── */}
                <div style={{
                  marginTop: '40px',
                  borderTop: '1px solid rgba(var(--accent-primary-rgb), 0.2)',
                  paddingTop: '32px',
                  animation: 'fadeSlideIn 0.35s ease-out'
                }}>
                  {/* Section header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{
                      background: 'rgba(var(--accent-primary-rgb), 0.08)',
                      padding: '10px', borderRadius: '10px', color: 'var(--accent-primary)'
                    }}>
                      <Plug size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 600 }}>{t('Channel Account Mappings')}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Link your local channel accounts/rules to Uplisting booking channel and source codes.
                      </p>
                    </div>
                  </div>

                  {channelRulesLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{
                        width: '28px', height: '28px',
                        border: '3px solid rgba(var(--accent-primary-rgb), 0.1)',
                        borderTopColor: 'var(--accent-primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 12px'
                      }} />
                      <p style={{ fontSize: '13px' }}>Loading channel accounts...</p>
                    </div>
                  ) : channelRules.length === 0 ? (
                    <div style={{
                      padding: '40px', textAlign: 'center', color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)',
                      borderRadius: '12px'
                    }}>
                      <AlertTriangle size={32} style={{ marginBottom: '12px', opacity: 0.4, color: 'var(--accent-primary)' }} />
                      <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>No Channel Rules Found</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
                        Create channel rules in the Channel Management tab before linking them to Uplisting.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Search & Filter */}
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '320px' }}>
                          <input
                            type="text"
                            placeholder="Search channel or account..."
                            value={channelSearch}
                            onChange={e => setChannelSearch(e.target.value)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--border-color)', borderRadius: '10px',
                              padding: '9px 14px 9px 36px', color: 'var(--text-primary)',
                              fontSize: '13px', outline: 'none', width: '100%',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                          />
                          <Search size={13} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                        </div>
                        <select
                          value={channelFilter}
                          onChange={e => setChannelFilter(e.target.value as 'all' | 'linked' | 'unlinked')}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)', borderRadius: '10px',
                            padding: '9px 14px', color: 'var(--text-primary)',
                            fontSize: '13px', outline: 'none', cursor: 'pointer'
                          }}
                        >
                          <option value="all" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>All ({channelRules.length})</option>
                          <option value="linked" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>✓ Linked ({channelRules.filter(r => channelMappings[r.id]?.uplistingCode).length})</option>
                          <option value="unlinked" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>✗ Unlinked ({channelRules.filter(r => !channelMappings[r.id]?.uplistingCode).length})</option>
                        </select>
                      </div>

                      {/* Mapping Table */}
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'visible' }}>
                        {(() => {
                          const filteredRules = channelRules.filter(r => {
                            const term = channelSearch.toLowerCase().trim();
                            if (term && !r.channel.toLowerCase().includes(term) && !r.accountName.toLowerCase().includes(term)) return false;
                            
                            const isLinked = !!channelMappings[r.id]?.uplistingCode;
                            if (channelFilter === 'linked') return isLinked;
                            if (channelFilter === 'unlinked') return !isLinked;
                            return true;
                          });

                          return (
                            <>
                              <div style={{
                                display: 'grid', gridTemplateColumns: '2fr 2fr 0.8fr',
                                padding: '11px 18px',
                                background: 'rgba(255,255,255,0.02)',
                                borderBottom: '1px solid var(--border-color)',
                                fontSize: '11px', fontWeight: 700,
                                color: 'var(--accent-primary)',
                                textTransform: 'uppercase', letterSpacing: '1.5px',
                                alignItems: 'center'
                              }}>
                                <span>{t('Local Channel Account')}</span>
                                <span>{t('Uplisting Channel / Source Code')}</span>
                                <span style={{ textAlign: 'center' }}>Status</span>
                              </div>

                              {filteredRules.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                  <AlertTriangle size={24} style={{ marginBottom: '8px', opacity: 0.3 }} />
                                  <p style={{ fontSize: '13px' }}>No channel accounts match your filter.</p>
                                </div>
                              ) : (
                                filteredRules.map((rule, idx) => {
                                  const mapping = channelMappings[rule.id] || null;
                                  const isLinked = !!mapping?.uplistingCode;
                                  
                                  const presetCodes = [
                                    { code: 'airbnb_official', name: 'Airbnb (airbnb_official)' },
                                    { code: 'booking_dot_com', name: 'Booking.com (booking_dot_com)' },
                                    { code: 'uplisting', name: 'Direct/Uplisting Manual (uplisting)' },
                                    { code: 'phone', name: 'Direct/Phone (phone)' },
                                    { code: 'extension', name: 'Direct/Extension (extension)' },
                                    { code: 'apartments_online', name: 'Direct/Apartments Online (apartments_online)' },
                                    { code: 'website', name: 'Direct/Website (website)' },
                                    { code: 'vrbo', name: 'VRBO (vrbo)' },
                                    { code: 'agoda', name: 'Agoda (agoda)' },
                                  ];

                                  const isPreset = presetCodes.some(p => p.code === mapping?.uplistingCode) || !isLinked;
                                  const showCustomInput = customChannelVisible[rule.id] ?? !isPreset;
                                  const customVal = customChannelInputs[rule.id] ?? (!isPreset ? (mapping?.uplistingCode || '') : '');

                                  return (
                                    <div
                                      key={rule.id}
                                      style={{
                                        display: 'grid', gridTemplateColumns: '2fr 2fr 0.8fr',
                                        padding: '13px 18px', alignItems: 'center',
                                        borderBottom: idx < filteredRules.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                        transition: 'background 0.15s'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                          width: '30px', height: '30px', borderRadius: '7px',
                                          background: 'rgba(var(--accent-primary-rgb), 0.06)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          color: 'var(--accent-primary)', flexShrink: 0
                                        }}>
                                          <Plug size={13} />
                                        </div>
                                        <div>
                                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {rule.channel} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— {rule.accountName}</span>
                                          </p>
                                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rule.id}</p>
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', maxWidth: '280px' }}>
                                        {!unlockedSections['mappings'] && isLinked ? (
                                          <div style={{
                                            background: 'rgba(var(--accent-primary-rgb), 0.03)',
                                            border: '1px solid var(--accent-primary)',
                                            borderRadius: '10px', padding: '10px 14px',
                                            color: 'var(--text-primary)', fontSize: '13px',
                                            width: '100%', display: 'flex', alignItems: 'center',
                                            justifyContent: 'space-between', userSelect: 'none',
                                          }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px', opacity: 0.8 }}>
                                              {mapping?.uplistingName || mapping?.uplistingCode}
                                            </span>
                                            <span
                                              onClick={() => openUnlockModal('mappings')}
                                              title="Unlock to change this mapping"
                                              style={{ fontSize: '14px', cursor: 'pointer', opacity: 0.7, flexShrink: 0 }}
                                            >🔒</span>
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                            <select
                                              value={showCustomInput ? 'custom' : (mapping?.uplistingCode || '')}
                                              onChange={e => {
                                                const val = e.target.value;
                                                if (val === 'custom') {
                                                  setCustomChannelVisible(prev => ({ ...prev, [rule.id]: true }));
                                                  setCustomChannelInputs(prev => ({ ...prev, [rule.id]: mapping?.uplistingCode || '' }));
                                                } else if (val === '') {
                                                  setCustomChannelVisible(prev => ({ ...prev, [rule.id]: false }));
                                                  const copy = { ...channelMappings };
                                                  delete copy[rule.id];
                                                  handleSaveChannelMappings(copy);
                                                } else {
                                                  setCustomChannelVisible(prev => ({ ...prev, [rule.id]: false }));
                                                  const selectedPreset = presetCodes.find(p => p.code === val);
                                                  const copy = {
                                                    ...channelMappings,
                                                    [rule.id]: {
                                                      uplistingCode: val,
                                                      uplistingName: selectedPreset ? selectedPreset.name : val
                                                    }
                                                  };
                                                  handleSaveChannelMappings(copy);
                                                }
                                              }}
                                              style={{
                                                background: isLinked ? 'rgba(var(--accent-primary-rgb), 0.03)' : 'rgba(255, 255, 255, 0.02)',
                                                border: isLinked ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                                borderRadius: '10px', padding: '10px 14px',
                                                color: isLinked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                fontSize: '13px', width: '100%',
                                                cursor: 'pointer', outline: 'none'
                                              }}
                                            >
                                              <option value="">-- Choose a code --</option>
                                              {presetCodes.map(p => (
                                                <option key={p.code} value={p.code}>{p.name}</option>
                                              ))}
                                              <option value="custom">Other / Custom Code...</option>
                                            </select>

                                            {showCustomInput && (
                                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <input
                                                  type="text"
                                                  placeholder="e.g. airbnb_official"
                                                  value={customVal}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    setCustomChannelInputs(prev => ({ ...prev, [rule.id]: val }));
                                                  }}
                                                  style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px', padding: '8px 10px',
                                                    color: 'var(--text-primary)', fontSize: '12px',
                                                    flex: 1, outline: 'none'
                                                  }}
                                                />
                                                <button
                                                  onClick={() => {
                                                    if (!customVal.trim()) return;
                                                    const copy = {
                                                      ...channelMappings,
                                                      [rule.id]: {
                                                        uplistingCode: customVal.trim(),
                                                        uplistingName: customVal.trim()
                                                      }
                                                    };
                                                    handleSaveChannelMappings(copy);
                                                  }}
                                                  style={{
                                                    background: 'var(--accent-primary)',
                                                    border: 'none', borderRadius: '8px',
                                                    color: '#000', padding: '8px 12px',
                                                    fontSize: '11px', fontWeight: 700,
                                                    cursor: 'pointer'
                                                  }}
                                                >
                                                  Save
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <span style={{
                                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                                          fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px',
                                          background: isLinked ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                          color: isLinked ? '#10b981' : '#ef4444',
                                          border: `1px solid ${isLinked ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                        }}>
                                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLinked ? '#10b981' : '#ef4444' }} />
                                          {isLinked ? 'Linked' : 'Unlinked'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Summary */}
                      <div style={{ marginTop: '12px', display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>{channelRules.filter(r => channelMappings[r.id]?.uplistingCode).length} of {channelRules.length} accounts linked</span>
                        <span style={{ color: channelRules.filter(r => !channelMappings[r.id]?.uplistingCode).length > 0 ? '#f59e0b' : '#10b981' }}>
                          {channelRules.filter(r => !channelMappings[r.id]?.uplistingCode).length} unlinked
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── Card 2: Webhook Security Token ─── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  background: 'rgba(var(--accent-primary-rgb), 0.08)',
                  padding: '12px', borderRadius: '12px', color: 'var(--accent-primary)'
                }}>
                  <Key size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('Webhook Security Token')}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Add this secret token to your Uplisting webhook URL parameters (e.g. <code style={{ color: 'var(--accent-primary)', fontSize: '12px' }}>?secret=YOUR_TOKEN</code>) to authorize incoming webhooks securely.
                  </p>
                </div>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
                background: webhookStatus === 'connected' ? 'rgba(16, 185, 129, 0.08)' : (webhookStatus === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.03)'),
                color: webhookStatus === 'connected' ? '#10b981' : (webhookStatus === 'error' ? '#ef4444' : 'var(--text-muted)'),
                border: `1px solid ${webhookStatus === 'connected' ? '#10b981' : (webhookStatus === 'error' ? '#ef4444' : '#6b7280')}25`,
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: webhookStatus === 'connected' ? '#10b981' : (webhookStatus === 'error' ? '#ef4444' : '#6b7280')
                }} />
                {webhookStatus === 'connected' ? 'Connected' : (webhookStatus === 'error' ? 'Invalid Webhook Token' : 'Not Connected')}
              </span>
            </div>

            {/* Local Webhook Success Banner */}
            {webhookLocalSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid var(--color-success)',
                color: 'var(--color-success)',
                padding: '12px 16px', borderRadius: '10px',
                fontSize: '13px', marginBottom: '16px', textAlign: 'center'
              }}>
                {webhookLocalSuccess}
              </div>
            )}

            {/* Local Webhook Error Banner */}
            {webhookLocalError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid var(--color-error)',
                color: 'var(--color-error)',
                padding: '12px 16px', borderRadius: '10px',
                fontSize: '13px', marginBottom: '16px', textAlign: 'center'
              }}>
                {webhookLocalError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Generate or enter a webhook secret token"
                value={webhookSecret}
                onChange={e => setWebhookSecret(e.target.value)}
                style={{
                  flex: 1, background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)', borderRadius: '10px',
                  padding: '12px 16px', fontSize: '14px', color: 'var(--text-primary)',
                  outline: 'none', fontFamily: 'monospace', transition: 'border-color 0.2s'
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              />
              <button
                onClick={async () => {
                  try {
                    setWebhookLocalError(null);
                    setWebhookLocalSuccess(null);
                    const res = await fetch('/api/settings/integrations', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: 'pms_webhook_secret', value: webhookSecret })
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.error || 'Failed to save Webhook Security Token');
                    }
                    localStorage.setItem(getScopedKey('pms_webhook_secret'), webhookSecret);
                    if (typeof refreshSession === 'function') {
                      await refreshSession();
                    }
                    setWebhookLocalSuccess('Webhook Security Token saved successfully.');
                  } catch (err: any) {
                    setWebhookLocalError(err.message || 'Failed to save Webhook Security Token');
                  }
                }}
                className="btn-primary"
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
                disabled={!webhookSecret.trim()}
              >
                Save
              </button>
              <button
                onClick={async () => {
                  try {
                    setWebhookLocalError(null);
                    setWebhookLocalSuccess(null);
                    const token = generateRandomToken();
                    const res = await fetch('/api/settings/integrations', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: 'pms_webhook_secret', value: token })
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.error || 'Failed to generate Webhook Security Token');
                    }
                    setWebhookSecret(token);
                    localStorage.setItem(getScopedKey('pms_webhook_secret'), token);
                    if (typeof refreshSession === 'function') {
                      await refreshSession();
                    }
                    setWebhookLocalSuccess('Webhook Security Token generated and saved.');
                  } catch (err: any) {
                    setWebhookLocalError(err.message || 'Failed to generate Webhook Security Token');
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)', borderRadius: '10px',
                  padding: '12px 20px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <RefreshCw size={14} /> Generate
              </button>
            </div>
            {webhookStatus === 'error' && (
              <div style={{
                fontSize: '13px', color: '#ef4444', marginTop: '12px',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(239, 68, 68, 0.05)', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.15)'
              }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <span>
                  <strong>Token Mismatch / Invalid Webhook Token:</strong> Uplisting sent a webhook event, but it was rejected because the secret token did not match. Please verify the webhook URL configured in Uplisting.
                </span>
              </div>
            )}
            {lastWebhookReceivedAt && (
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ● Last verified webhook event received: {new Date(lastWebhookReceivedAt).toLocaleString()}
              </div>
            )}
            {webhookSecret && (
              <div style={{
                marginTop: '16px', background: 'rgba(255, 255, 255, 0.02)',
                padding: '14px 16px', borderRadius: '10px',
                border: '1px solid var(--border-color)',
                fontSize: '13px', color: 'var(--text-secondary)'
              }}>
                <strong style={{ color: 'var(--text-primary)' }}>Your Webhook Target URL:</strong>
                <br />
                <code style={{
                  color: 'var(--accent-primary)', userSelect: 'all' as const,
                  wordBreak: 'break-all' as const, fontSize: '12px', lineHeight: 1.8
                }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/uplisting?secret={webhookSecret}
                </code>
              </div>
            )}
          </div>

          {/* ─── Card 3: WhatsApp Business API ─── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  background: 'rgba(37, 211, 102, 0.08)',
                  padding: '12px', borderRadius: '12px', color: '#25d366'
                }}>
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('WhatsApp Business API')}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Connect your WhatsApp Business account for guest communication and automated messaging.
                  </p>
                </div>
              </div>
              {getStatusBadge(waStatus)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone Number ID</label>
                <input className="form-input" type="text" placeholder="e.g. 114xxxxxxxxxxxxx"
                  value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Business Account ID</label>
                <input className="form-input" type="text" placeholder="e.g. 101xxxxxxxxxxxxx"
                  value={waBusinessId} onChange={e => setWaBusinessId(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Access Token</label>
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="Permanent access token"
                  value={waAccessToken} 
                  onChange={e => setWaAccessToken(e.target.value)} 
                  style={{ WebkitTextSecurity: 'disc' } as any}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Webhook Verify Token</label>
                <input className="form-input" type="text" placeholder="Custom verification string"
                  value={waVerifyToken} onChange={e => setWaVerifyToken(e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={async () => {
                  setWaStatus('verifying');
                  await new Promise(r => setTimeout(r, 1000));
                  saveIntegration('pms_wa_phone_id', waPhoneId);
                  saveIntegration('pms_wa_business_id', waBusinessId);
                  saveIntegration('pms_wa_access_token', waAccessToken);
                  saveIntegration('pms_wa_verify_token', waVerifyToken);
                  setWaStatus('connected');
                  setSuccess('WhatsApp Business API connected.');
                }}
                className="btn-primary"
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
                disabled={waStatus === 'verifying' || !waAccessToken.trim()}
              >
                <Zap size={14} />
                {waStatus === 'verifying' ? 'Connecting...' : 'Test & Save'}
              </button>
              {waStatus === 'connected' && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ExternalLink size={12} />
                  Webhook: {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/whatsapp
                </div>
              )}
            </div>
          </div>

          {/* ─── Platform-Level Integrations Notice ─── */}
          <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)', background: 'rgba(var(--accent-primary-rgb), 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ background: 'rgba(var(--accent-primary-rgb), 0.08)', padding: '12px', borderRadius: '12px', color: 'var(--accent-primary)', flexShrink: 0 }}>
                <Shield size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>{t('Platform-Level Integrations')}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '16px' }}>
                  The following integrations are managed centrally by the SaaS platform administrator and apply across <strong style={{ color: 'var(--text-primary)' }}>all</strong> holiday home companies on this system:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '10px' }}>
                    <Bot size={18} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('AI Assistant (Claude)')}</span>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        One shared API key powers AI replies, translations, and scheduling across the entire platform. Managed by the system administrator.
                      </p>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>● CONNECTED</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(255,200,40,0.06)', border: '1px solid rgba(255,200,40,0.15)', borderRadius: '10px' }}>
                    <FileSignature size={18} style={{ color: '#ffc828', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('DocuSign Integration')}</span>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Electronic signing for host agreements and rental contracts across all properties. Configured and managed by the system administrator.
                      </p>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>● ACTIVE</span>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '14px' }}>
                  These differ from <strong>Uplisting</strong>, which each company configures with their own account credentials.
                </p>
              </div>
            </div>
          </div>


          {/* Translation Service card removed — Claude handles translation via the Translation tab */}

          {/* Property Link Mappings moved inside Uplisting card above */}
          {/* ─── Card 7: (removed standalone Property Link Mappings) ─── */}
          <div style={{ display: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  background: 'rgba(var(--accent-primary-rgb), 0.08)',
                  padding: '12px', borderRadius: '12px', color: 'var(--accent-primary)'
                }}>
                  <Link size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('Property Link Mappings')}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Link each local property to its corresponding Uplisting listing to synchronize calendar bookings.
                  </p>
                </div>
              </div>
              {propertyMappings.length > 0 && (
                <button
                  onClick={() => {
                    const storedMappingsStr = localStorage.getItem(getScopedKey('pms_property_mappings'));
                    const storedMappings = storedMappingsStr ? JSON.parse(storedMappingsStr) : {};
                    
                    const updated = propertyMappings.map(p => {
                      if (!p.uplistingId) {
                        const autoId = `upl_${Math.floor(Math.random() * 9000 + 1000)}`;
                        const autoName = `${p.name} (Auto)`;
                        storedMappings[p.id] = { uplistingId: autoId, uplistingName: autoName };
                        return { ...p, uplistingId: autoId, uplistingName: autoName };
                      }
                      return p;
                    });
                    
                    localStorage.setItem(getScopedKey('pms_property_mappings'), JSON.stringify(storedMappings));
                    saveIntegration('pms_property_mappings', JSON.stringify(storedMappings));
                    setPropertyMappings(updated);
                    setSuccess('Auto-mapped unlinked properties to Uplisting listings.');
                  }}
                  style={{
                    background: 'rgba(var(--accent-primary-rgb), 0.1)',
                    border: '1px solid var(--accent-primary)',
                    borderRadius: '8px', padding: '8px 16px',
                    color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.1)'}
                >
                  <RefreshCw size={14} /> Auto-Map Properties
                </button>
              )}
            </div>

            {propertiesLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{
                  width: '32px', height: '32px',
                  border: '3px solid rgba(var(--accent-primary-rgb), 0.1)',
                  borderTopColor: 'var(--accent-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }} />
                <p style={{ fontSize: '13px' }}>Loading properties...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : propertyMappings.length === 0 ? (
              <div style={{
                padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)',
                borderRadius: '16px'
              }}>
                <Building size={36} style={{ marginBottom: '16px', opacity: 0.4, color: 'var(--accent-primary)' }} />
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  No Properties Registered
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  You need to register local properties in your portfolio before you can map them to external Uplisting properties.
                </p>
                <a
                  href="/dashboard/properties"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'var(--accent-primary)', color: '#000',
                    fontWeight: 700, fontSize: '13px', padding: '10px 20px',
                    borderRadius: '10px', textDecoration: 'none', transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(var(--accent-primary-rgb), 0.15)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-primary)'}
                >
                  Go to Listings <ExternalLink size={14} />
                </a>
              </div>
            ) : (
              <>
                {/* Search & Filter Bar */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '350px' }}>
                    <input
                      type="text"
                      placeholder="Search property name or linked listing..."
                      value={mappingSearch}
                      onChange={e => setMappingSearch(e.target.value)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color)', borderRadius: '10px',
                        padding: '10px 14px 10px 38px', color: 'var(--text-primary)',
                        fontSize: '13px', outline: 'none', width: '100%',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    />
                    <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                  </div>
                  <select
                    value={mappingFilter}
                    onChange={e => setMappingFilter(e.target.value as 'all' | 'linked' | 'unlinked')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-color)', borderRadius: '10px',
                      padding: '10px 14px', color: 'var(--text-primary)',
                      fontSize: '13px', outline: 'none', cursor: 'pointer'
                    }}
                  >
                    <option value="all" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                      All ({propertyMappings.length})
                    </option>
                    <option value="linked" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                      ✓ Linked ({propertyMappings.filter(p => p.uplistingId).length})
                    </option>
                    <option value="unlinked" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                      ✗ Unlinked ({propertyMappings.filter(p => !p.uplistingId).length})
                    </option>
                  </select>
                </div>

                {/* Mapping Table */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Table Header */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 2fr 0.8fr 0.8fr',
                    padding: '12px 20px',
                    background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '11px', fontWeight: 700,
                    color: 'var(--accent-primary)',
                    textTransform: 'uppercase', letterSpacing: '1.5px'
                  }}>
                    <span>{t('Local Property')}</span>
                    <span>{t('Uplisting Listing')}</span>
                    <span style={{ textAlign: 'center' }}>Status</span>
                    <span style={{ textAlign: 'right' }}>Actions</span>
                  </div>

                  {/* Table Rows */}
                  {(() => {
                    const filtered = propertyMappings
                      .filter(p => {
                        const term = mappingSearch.toLowerCase().trim();
                        if (term && !p.name.toLowerCase().includes(term) && !(p.uplistingName || '').toLowerCase().includes(term)) return false;
                        if (mappingFilter === 'linked') return !!p.uplistingId;
                        if (mappingFilter === 'unlinked') return !p.uplistingId;
                        return true;
                      });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <Building size={28} style={{ marginBottom: '8px', opacity: 0.3 }} />
                          <p style={{ fontSize: '13px' }}>No properties match your filter.</p>
                        </div>
                      );
                    }

                    return filtered.map((prop, idx) => (
                      <div
                        key={prop.id}
                        style={{
                          display: 'grid', gridTemplateColumns: '2fr 2fr 0.8fr 0.8fr',
                          padding: '14px 20px', alignItems: 'center',
                          borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Local Property */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'rgba(var(--accent-primary-rgb), 0.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--accent-primary)', flexShrink: 0
                          }}>
                            <Building size={14} />
                          </div>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{prop.name}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{prop.id}</p>
                          </div>
                        </div>

                        {/* Uplisting Listing */}
                        <div>
                          {prop.uplistingId ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                {prop.uplistingName}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {prop.uplistingId}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              — Not linked
                            </span>
                          )}
                        </div>

                        {/* Status */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px',
                            background: prop.uplistingId ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: prop.uplistingId ? '#10b981' : '#ef4444',
                            border: `1px solid ${prop.uplistingId ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                          }}>
                            <span style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              background: prop.uplistingId ? '#10b981' : '#ef4444'
                            }} />
                            {prop.uplistingId ? 'Linked' : 'Unlinked'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setSelectedMappingProp({ id: prop.id, name: prop.name });
                              setEditUplistingId(prop.uplistingId || '');
                              setEditUplistingName(prop.uplistingName || '');
                              setIsMappingModalOpen(true);
                            }}
                            style={{
                              background: 'rgba(var(--accent-primary-rgb), 0.08)',
                              border: '1px solid rgba(var(--accent-primary-rgb), 0.2)',
                              borderRadius: '8px', padding: '6px 12px',
                              color: 'var(--accent-primary)', fontSize: '12px', fontWeight: 600,
                              cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.16)';
                              e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.08)';
                              e.currentTarget.style.borderColor = 'rgba(var(--accent-primary-rgb), 0.2)';
                            }}
                          >
                            {prop.uplistingId ? 'Edit Link' : 'Link'}
                          </button>
                          {prop.uplistingId && (
                            <button
                              onClick={() => handleSaveMapping(prop.id, null, null)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.06)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '8px', padding: '6px 12px',
                                color: '#ef4444', fontSize: '12px', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                                e.currentTarget.style.borderColor = '#ef4444';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)';
                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                              }}
                            >
                              Unlink
                            </button>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Summary */}
                <div style={{
                  marginTop: '16px', display: 'flex', gap: '20px',
                  fontSize: '12px', color: 'var(--text-muted)'
                }}>
                  <span>{propertyMappings.filter(p => p.uplistingId).length} of {propertyMappings.length} properties linked</span>
                  <span style={{ color: propertyMappings.filter(p => !p.uplistingId).length > 0 ? '#f59e0b' : '#10b981' }}>
                    {propertyMappings.filter(p => !p.uplistingId).length} unlinked
                  </span>
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* ═══════════ DANGER ZONE TAB ═══════════ */}
      {activeTab === 'danger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Warning Banner */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '16px 20px', borderRadius: '12px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444', marginBottom: '2px' }}>
                Danger Zone — Irreversible Actions
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Actions on this page permanently delete data. They cannot be undone. Only Organization Admins can perform these actions.
              </p>
            </div>
          </div>

          {/* Danger Action Cards */}
          {DANGER_ACTIONS.map(action => {
            const isExpanded = dangerAction === action.id;
            const isFullReset = action.id === 'everything';

            return (
              <div
                key={action.id}
                style={{
                  background: isFullReset ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isFullReset ? 'rgba(239,68,68,0.25)' : 'var(--border-color)'}`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Card Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '24px' }}>{action.icon}</span>
                    <div>
                      <h3 style={{
                        fontSize: '14px', fontWeight: 600,
                        color: isFullReset ? '#ef4444' : 'var(--text-primary)',
                        marginBottom: '2px',
                      }}>{action.title}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '500px' }}>
                        {action.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDangerAction(isExpanded ? null : action.id);
                      setDangerConfirmText('');
                    }}
                    style={{
                      padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-sans)',
                      background: isExpanded ? 'rgba(107,114,128,0.1)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${isExpanded ? 'rgba(107,114,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      color: isExpanded ? 'var(--text-secondary)' : '#ef4444',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isExpanded ? 'Cancel' : 'Delete...'}
                  </button>
                </div>

                {/* Expanded Confirmation */}
                {isExpanded && (
                  <div style={{
                    padding: '0 20px 20px',
                    borderTop: '1px solid rgba(239,68,68,0.1)',
                    paddingTop: '16px',
                  }}>
                    {/* Progress Bar — shown during deletion */}
                    {dangerDeleting && dangerAction === action.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
                            {dangerProgressLabel}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {dangerProgress}%
                          </span>
                        </div>
                        {/* Progress Track */}
                        <div style={{
                          width: '100%', height: '8px', borderRadius: '4px',
                          background: 'rgba(239,68,68,0.1)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${dangerProgress}%`, height: '100%',
                            borderRadius: '4px',
                            background: dangerProgress === 100
                              ? 'linear-gradient(90deg, #10b981, #34d399)'
                              : 'linear-gradient(90deg, #ef4444, #f87171)',
                            transition: 'width 0.4s ease, background 0.3s',
                          }} />
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Please do not close this page while deletion is in progress...
                        </p>
                      </div>
                    ) : (
                      <>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                          To confirm, type <strong style={{ color: '#ef4444', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{action.confirmWord}</strong> below:
                        </p>

                        {/* Input + Button */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <input
                              type="text"
                              value={dangerConfirmText}
                              onChange={e => { setDangerConfirmText(e.target.value); setDangerAttempted(false); }}
                              placeholder={action.confirmWord}
                              style={{
                                width: '100%', padding: '10px 14px',
                                background: 'rgba(239,68,68,0.04)',
                                border: `1px solid ${dangerAttempted && dangerConfirmText !== action.confirmWord ? '#ef4444' : 'rgba(239,68,68,0.2)'}`,
                                borderRadius: '8px', color: 'var(--text-primary)',
                                fontSize: '13px', fontFamily: 'monospace',
                                outline: 'none', transition: 'border-color 0.2s',
                              }}
                              onFocus={e => e.currentTarget.style.borderColor = '#ef4444'}
                              onBlur={e => e.currentTarget.style.borderColor = dangerAttempted && dangerConfirmText !== action.confirmWord ? '#ef4444' : 'rgba(239,68,68,0.2)'}
                            />
                          </div>
                          <button
                            disabled={dangerDeleting}
                            onClick={() => handleDangerDelete(action.id)}
                            style={{
                              padding: '10px 24px', borderRadius: '8px',
                              border: 'none', cursor: dangerDeleting ? 'not-allowed' : 'pointer',
                              fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
                              background: dangerConfirmText === action.confirmWord
                                ? '#ef4444'
                                : 'rgba(239,68,68,0.15)',
                              color: dangerConfirmText === action.confirmWord
                                ? '#fff'
                                : 'rgba(239,68,68,0.4)',
                              transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', gap: '6px',
                              flexShrink: 0,
                            }}
                          >
                            <Trash2 size={14} />
                            Permanently Delete
                          </button>
                        </div>

                        {/* Validation Feedback */}
                        {dangerAttempted && dangerConfirmText !== action.confirmWord && (
                          <div style={{
                            marginTop: '8px', padding: '10px 14px', borderRadius: '8px',
                            background: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.15)',
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                          }}>
                            <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
                            <div style={{ fontSize: '12px', color: '#ef4444' }}>
                              <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                                Confirmation text does not match. Deletion was not performed.
                              </p>
                              <p style={{ color: 'var(--text-muted)' }}>
                                You typed: <code style={{ fontFamily: 'monospace', background: 'rgba(239,68,68,0.08)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>{dangerConfirmText || '(empty)'}</code>
                              </p>
                              <p style={{ color: 'var(--text-muted)' }}>
                                Expected: <code style={{ fontFamily: 'monospace', background: 'rgba(239,68,68,0.08)', padding: '1px 6px', borderRadius: '4px', color: '#ef4444' }}>{action.confirmWord}</code>
                              </p>
                              {dangerConfirmText.length > 0 && dangerConfirmText.toUpperCase() === action.confirmWord && (
                                <p style={{ color: '#f59e0b', marginTop: '4px', fontWeight: 500 }}>
                                  💡 Hint: The confirmation is case-sensitive. Make sure all letters are uppercase.
                                </p>
                              )}
                              {dangerConfirmText.length > 0 && dangerConfirmText !== action.confirmWord && dangerConfirmText.toUpperCase() !== action.confirmWord && (
                                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                                  Please type exactly <strong style={{ color: '#ef4444' }}>{action.confirmWord}</strong> to proceed.
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Live match indicator */}
                        {dangerConfirmText.length > 0 && !dangerAttempted && (
                          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              background: dangerConfirmText === action.confirmWord ? '#10b981' : '#f59e0b',
                            }} />
                            <span style={{
                              fontSize: '11px',
                              color: dangerConfirmText === action.confirmWord ? '#10b981' : '#f59e0b',
                              fontWeight: 500,
                            }}>
                              {dangerConfirmText === action.confirmWord
                                ? '✓ Confirmation text matches — ready to delete'
                                : `${dangerConfirmText.length}/${action.confirmWord.length} characters typed`}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        </div>
      )}

      {/* ═══════════ PROPERTY MAPPING MODAL ═══════════ */}
      {isMappingModalOpen && selectedMappingProp && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setIsMappingModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '0',
              width: '90%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflow: 'auto',
              animation: 'slideUp 0.3s ease-out',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Link Uplisting Property</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedMappingProp.name} ({selectedMappingProp.id})
                </p>
              </div>
              <button
                onClick={() => setIsMappingModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)', transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveMapping(selectedMappingProp.id, editUplistingId, editUplistingName);
                setIsMappingModalOpen(false);
              }}
              style={{ padding: '20px 24px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {uplistingListings.length > 0 ? (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                        Select Uplisting Listing
                      </label>
                      <select
                        value={editUplistingId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selected = uplistingListings.find(item => item.id === selectedId);
                          if (selected) {
                            setEditUplistingId(selected.id);
                            setEditUplistingName(getShortListingName(selected));
                          } else {
                            setEditUplistingId('');
                            setEditUplistingName('');
                          }
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)', borderRadius: '10px',
                          padding: '10px 14px', color: 'var(--text-primary)',
                          fontSize: '13px', outline: 'none', width: '100%',
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        <option value="" style={{ background: '#1c1c1e' }}>-- Choose a live listing --</option>
                        {uplistingListings.map(item => (
                          <option key={item.id} value={item.id} style={{ background: '#1c1c1e' }}>
                            {getShortListingName(item)} — {item.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    {editUplistingId && (
                      <div style={{
                        background: 'rgba(var(--accent-primary-rgb), 0.03)',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(var(--accent-primary-rgb), 0.15)',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5
                      }}>
                        <strong style={{ color: 'var(--accent-primary)' }}>Selected Listing Details:</strong>
                        <div style={{ marginTop: '4px' }}>
                          <strong>ID:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{editUplistingId}</span>
                        </div>
                        <div>
                          <strong>Name:</strong> <span style={{ color: 'var(--text-primary)' }}>{editUplistingName}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    fontSize: '13px',
                    textAlign: 'center'
                  }}>
                    <AlertTriangle size={20} style={{ margin: '0 auto 8px', display: 'block' }} />
                    No live listings could be retrieved from your Uplisting account. Please make sure your API key is correctly verified.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                {propertyMappings.find(p => p.id === selectedMappingProp.id)?.uplistingId && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveMapping(selectedMappingProp.id, null, null);
                      setIsMappingModalOpen(false);
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '10px', padding: '10px 16px',
                      color: '#ef4444', cursor: 'pointer', fontSize: '13px',
                      fontWeight: 600, marginRight: 'auto', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'}
                  >
                    Unlink Property
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMappingModalOpen(false)}
                  style={{
                    background: 'none', border: '1px solid var(--border-color)',
                    borderRadius: '10px', padding: '10px 20px',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!editUplistingId}
                  style={{
                    background: editUplistingId ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                    color: editUplistingId ? '#000' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '10px', padding: '10px 20px',
                    cursor: editUplistingId ? 'pointer' : 'not-allowed',
                    fontSize: '13px', fontWeight: 700,
                    width: 'auto'
                  }}
                >
                  Save Mapping
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ═══════════ TEAM MEMBER INVITATION MODAL ═══════════ */}
      {isInviteModalOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setIsInviteModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '0',
              width: '90%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflow: 'auto',
              animation: 'slideUp 0.3s ease-out',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Invite Team Member</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Send an email invitation to join this organization
                </p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)', transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleInviteMember} style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. teammate@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    required
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-color)', borderRadius: '10px',
                      padding: '10px 14px', color: 'var(--text-primary)',
                      fontSize: '13px', outline: 'none', width: '100%',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Workspace Role
                  </label>
                  <select
                    className="form-input"
                    value={inviteRoleId}
                    onChange={e => setInviteRoleId(e.target.value)}
                    required
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-color)', borderRadius: '10px',
                      padding: '10px 14px', color: 'var(--text-primary)',
                      fontSize: '13px', outline: 'none', width: '100%',
                      cursor: 'pointer', appearance: 'none'
                    }}
                  >
                    <option value="" disabled style={{ background: 'var(--bg-tertiary)' }}>-- Select Role --</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id} style={{ background: 'var(--bg-tertiary)' }}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  style={{
                    background: 'none', border: '1px solid var(--border-color)',
                    borderRadius: '10px', padding: '10px 20px',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={inviteLoading}
                  style={{
                    background: 'var(--accent-primary)', color: '#000', border: 'none',
                    borderRadius: '10px', padding: '10px 20px',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                    width: 'auto', display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─── Password Unlock Modal ─── */}
      {pwModalTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) closeUnlockModal(); }}
        >
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            animation: 'fadeSlideUp 0.2s ease-out',
          }}>
            <style>{`@keyframes fadeSlideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
              }}>🔒</div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Confirm Your Password
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Enter your password to unlock{' '}
                  {pwModalTarget === 'uplisting' ? 'the Uplisting API key'
                    : pwModalTarget === 'claude' ? 'the Claude AI key'
                    : pwModalTarget === 'mappings' ? 'property link mappings'
                    : 'this section'}
                </p>
              </div>
            </div>

            <input
              type="password"
              autoFocus
              placeholder="Your account password"
              value={pwModalInput}
              onChange={e => { setPwModalInput(e.target.value); setPwModalError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirmUnlock(); }}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${pwModalError ? 'rgba(239,68,68,0.5)' : 'var(--border-color)'}`,
                borderRadius: '10px', padding: '12px 16px',
                color: 'var(--text-primary)', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />

            {pwModalError && (
              <p style={{ fontSize: '12px', color: '#f87171', marginTop: '8px' }}>
                ⚠️ {pwModalError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={closeUnlockModal}
                style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUnlock}
                disabled={pwModalVerifying || !pwModalInput.trim()}
                style={{
                  flex: 2, padding: '11px', borderRadius: '10px',
                  border: 'none',
                  background: (!pwModalInput.trim() || pwModalVerifying) ? 'rgba(var(--accent-primary-rgb),0.4)' : 'var(--accent-primary)',
                  color: '#000', fontSize: '13px', fontWeight: 700,
                  cursor: pwModalVerifying ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  transition: 'all 0.2s',
                }}
              >
                {pwModalVerifying ? 'Verifying...' : '🔓 Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
