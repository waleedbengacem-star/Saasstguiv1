'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2,
  CalendarDays,
  Clock,
  TrendingUp,
  Users,
  Search,
  Mail,
  Shield,
  Layers,
  Languages,
  Check,
  Palette,
  Moon,
  Sun,
  Bot,
  FileSignature,
  Zap,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { translateText } from '@/lib/translations';

export default function DashboardPage() {
  const router = useRouter();
  const { user, organization, roleSlug, loading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [myProperties, setMyProperties] = useState<any[]>([]);
  const [propertyActions, setPropertyActions] = useState<Record<string, { actionType: 'link' | 'import' | 'decline', targetPropertyId?: string }>>({});

  const handlePropertyActionChange = (
    propertyId: string,
    actionType: 'link' | 'import' | 'decline',
    targetPropertyId?: string
  ) => {
    setPropertyActions(prev => ({
      ...prev,
      [propertyId]: {
        actionType,
        targetPropertyId: targetPropertyId !== undefined ? targetPropertyId : prev[propertyId]?.targetPropertyId
      }
    }));
  };

  // SaaS top-nav section state — synced from layout via carrier div
  const [saasSection, setSaasSection] = useState('overview');

  // Tenant stats states
  const [activeProperties, setActiveProperties] = useState<string>('0');
  const [activePropertiesChange, setActivePropertiesChange] = useState<string>('0 MTD');
  const [totalBookings, setTotalBookings] = useState<string>('0');
  const [isUplistingConnected, setIsUplistingConnected] = useState<boolean>(false);
  const [pendingTasksCount, setPendingTasksCount] = useState<string>('0');
  const [pendingTasksChange, setPendingTasksChange] = useState<string>('All caught up');
  const [escrowBalance, setEscrowBalance] = useState<string>('AED 0.00');
  const [escrowBalanceChange, setEscrowBalanceChange] = useState<string>('AED 0 USD 0');

  // Settings / Personalisation — Language
  const [uiLanguage, setUiLanguage]               = useState('en');
  const t = (key: string) => translateText(key, uiLanguage);
  const [translationTone, setTranslationTone]     = useState('professional');
  const [translationSaving, setTranslationSaving] = useState(false);
  const [translationSaved, setTranslationSaved]   = useState(false);

  // Settings — DocuSign (platform-level)
  const [dsClientId, setDsClientId]   = useState('');
  const [dsSecretKey, setDsSecretKey] = useState('');
  const [dsAccountId, setDsAccountId] = useState('');
  const [dsBaseUrl, setDsBaseUrl]     = useState('https://demo.docusign.net');
  const [dsStatus, setDsStatus]       = useState<'idle'|'verifying'|'connected'|'error'>('idle');
  const [dsError, setDsError]         = useState('');

  // Settings — Claude AI (platform-level)
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [claudeModel, setClaudeModel]   = useState('claude-sonnet-4-20250514');
  const [claudeStatus, setClaudeStatus] = useState<'idle'|'verifying'|'connected'|'error'>('idle');
  const [claudeError, setClaudeError]   = useState('');
  const [claudeModelsList, setClaudeModelsList] = useState<{ id: string; displayName: string }[]>([]);

  // ─── Super Admin API Key Lock state ───────────────────────────────
  const [saasUnlocked, setSaasUnlocked] = useState<Record<string, boolean>>({});
  const [saasPwTarget, setSaasPwTarget] = useState<string | null>(null);
  const [saasPwInput, setSaasPwInput] = useState('');
  const [saasPwVerifying, setSaasPwVerifying] = useState(false);
  const [saasPwError, setSaasPwError] = useState('');

  // Settings / Personalisation — Appearance
  const [saasTheme, setSaasTheme]         = useState<'dark'|'light'|'dynamic'>('dark');
  const [saasAccentColor, setSaasAccentColor] = useState('gold');
  const [saasAccentPrimary, setSaasAccentPrimary] = useState('#d4af37');
  const [saasAccentHover, setSaasAccentHover]     = useState('#f3e5ab');
  const [saasAccentDark, setSaasAccentDark]       = useState('#aa7c11');
  const [saasDarkBg, setSaasDarkBg]   = useState('obsidian');
  const [saasLightBg, setSaasLightBg] = useState('slate');
  const [saasLightStart, setSaasLightStart] = useState('08:00');
  const [saasLightEnd, setSaasLightEnd]     = useState('18:00');
  const [saasFontStyle, setSaasFontStyle]   = useState('modern');

  // Super Admin: Register Holiday Homes Company states
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regCompanySlug, setRegCompanySlug] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const handleRegisterCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);

    const PUBLIC_EMAIL_DOMAINS = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'live.com', 'icloud.com', 'mail.com', 'gmx.com', 'zoho.com',
      'yandex.com', 'protonmail.com', 'proton.me', 'mail.ru',
      'ymail.com', 'inbox.com', 'gmx.net', 'fastmail.com'
    ];
    const emailDomain = regEmail.toLowerCase().trim().split('@')[1];
    if (!emailDomain || PUBLIC_EMAIL_DOMAINS.includes(emailDomain)) {
      setRegError(t('Registration requires a business/work email address (public domains like Gmail are not allowed).'));
      setRegLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: regCompanyName.trim(),
          companySlug: regCompanySlug.trim(),
          firstName: regFirstName.trim(),
          lastName: regLastName.trim(),
          email: regEmail.toLowerCase().trim(),
          password: regPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setRegSuccess(t('Holiday home company registered successfully!'));
      
      // Clear fields
      setRegCompanyName('');
      setRegCompanySlug('');
      setRegFirstName('');
      setRegLastName('');
      setRegEmail('');
      setRegPassword('');

      // Refresh organizations list
      const dashboardRes = await fetch('/api/admin/dashboard');
      if (dashboardRes.ok) {
        const resData = await dashboardRes.json();
        if (resData.success) setData(resData);
      }

      // Close modal after a delay
      setTimeout(() => {
        setIsRegisterModalOpen(false);
        setRegSuccess(null);
      }, 2000);

    } catch (err: any) {
      setRegError(err.message || 'An error occurred.');
    } finally {
      setRegLoading(false);
    }
  };

  const openSaasUnlock = (section: string) => { setSaasPwTarget(section); setSaasPwInput(''); setSaasPwError(''); };
  const closeSaasUnlock = () => { setSaasPwTarget(null); setSaasPwInput(''); setSaasPwError(''); setSaasPwVerifying(false); };
  const handleSaasConfirmUnlock = async () => {
    if (!saasPwInput.trim()) return;
    setSaasPwVerifying(true); setSaasPwError('');
    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: saasPwInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Incorrect password.');
      setSaasUnlocked(prev => ({ ...prev, [saasPwTarget!]: true }));
      closeSaasUnlock();
    } catch (err: any) {
      setSaasPwError(err.message || 'Incorrect password.');
    } finally {
      setSaasPwVerifying(false);
    }
  };

  // Sync saasSection from the hidden carrier div injected by layout.tsx
  useEffect(() => {
    const sync = () => {
      const carrier = document.getElementById('saas-section-carrier');
      if (carrier) {
        const s = carrier.getAttribute('data-section');
        if (s) setSaasSection(s);
      }
    };
    sync();
    const carrier = document.getElementById('saas-section-carrier');
    if (!carrier) return;
    const obs = new MutationObserver(sync);
    obs.observe(carrier, { attributes: true });
    return () => obs.disconnect();
  }, []);

  // Load saved preferences
  useEffect(() => {
    if (loading) return;
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const langKey = email ? `pms_ui_language_${email}${suffix}` : `pms_ui_language${suffix}`;
    const toneKey = email ? `pms_translation_tone_${email}${suffix}` : `pms_translation_tone${suffix}`;
    const themeKey = email ? `pms_theme_${email}${suffix}` : `pms_theme${suffix}`;
    const accentColorKey = email ? `pms_accent_color_${email}${suffix}` : `pms_accent_color${suffix}`;
    const accentPrimaryKey = email ? `pms_accent_primary_${email}${suffix}` : `pms_accent_primary${suffix}`;
    const accentHoverKey = email ? `pms_accent_hover_${email}${suffix}` : `pms_accent_hover${suffix}`;
    const accentDarkKey = email ? `pms_accent_dark_${email}${suffix}` : `pms_accent_dark${suffix}`;
    const darkBgKey = email ? `pms_dark_bg_${email}${suffix}` : `pms_dark_bg${suffix}`;
    const lightBgKey = email ? `pms_light_bg_${email}${suffix}` : `pms_light_bg${suffix}`;
    const lightStartKey = email ? `pms_light_start_${email}${suffix}` : `pms_light_start${suffix}`;
    const lightEndKey = email ? `pms_light_end_${email}${suffix}` : `pms_light_end${suffix}`;

    setUiLanguage(localStorage.getItem(langKey) || 'en');
    setTranslationTone(localStorage.getItem(toneKey) || 'professional');

    // Load DocuSign
    const dsClientIdKey = orgId ? `pms_ds_client_id_${orgId}` : 'pms_ds_client_id';
    const dsSecretKeyKey = orgId ? `pms_ds_secret_key_${orgId}` : 'pms_ds_secret_key';
    const dsAccountIdKey = orgId ? `pms_ds_account_id_${orgId}` : 'pms_ds_account_id';
    const dsBaseUrlKey = orgId ? `pms_ds_base_url_${orgId}` : 'pms_ds_base_url';

    setDsClientId(localStorage.getItem(dsClientIdKey) || '');
    setDsSecretKey(localStorage.getItem(dsSecretKeyKey) || '');
    setDsAccountId(localStorage.getItem(dsAccountIdKey) || '');
    setDsBaseUrl(localStorage.getItem(dsBaseUrlKey) || 'https://demo.docusign.net');
    if (localStorage.getItem(dsClientIdKey)) setDsStatus('connected');
    else setDsStatus('idle');

    // Load Claude
    const claudeApiKeyKey = orgId ? `pms_claude_api_key_${orgId}` : 'pms_claude_api_key';
    const claudeModelKey = orgId ? `pms_claude_model_${orgId}` : 'pms_claude_model';
    const claudeModelsListKey = orgId ? `pms_claude_models_list_${orgId}` : 'pms_claude_models_list';

    setClaudeApiKey(localStorage.getItem(claudeApiKeyKey) || '');
    setClaudeModel(localStorage.getItem(claudeModelKey) || 'claude-sonnet-4-20250514');
    if (localStorage.getItem(claudeApiKeyKey)) setClaudeStatus('connected');
    else setClaudeStatus('idle');

    const savedModels = localStorage.getItem(claudeModelsListKey);
    if (savedModels) {
      try {
        setClaudeModelsList(JSON.parse(savedModels));
      } catch (e) {}
    } else {
      setClaudeModelsList([]);
    }

    const savedTheme = localStorage.getItem(themeKey) as 'dark'|'light'|'dynamic'|null;
    if (savedTheme) setSaasTheme(savedTheme);
    const presets: Record<string,{primary:string;hover:string;dark:string}> = {
      gold:{primary:'#d4af37',hover:'#f3e5ab',dark:'#aa7c11'},
      green:{primary:'#10b981',hover:'#34d399',dark:'#047857'},
      blue:{primary:'#3b82f6',hover:'#60a5fa',dark:'#1d4ed8'},
      pink:{primary:'#f03b6a',hover:'#f472b6',dark:'#be185d'},
      purple:{primary:'#8b5cf6',hover:'#a78bfa',dark:'#6d28d9'},
    };

    // Derive the active button from the actual primary hex (ground truth).
    // The stored accent name (pms_accent_color) can be stale from old sessions.
    const storedPrimary = localStorage.getItem(accentPrimaryKey);
    const storedHover   = localStorage.getItem(accentHoverKey);
    const storedDark    = localStorage.getItem(accentDarkKey);
    const storedName    = localStorage.getItem(accentColorKey);
    let resolvedAccent: string;
    if (storedPrimary) {
      // Match primary hex against presets — if no match, it's a custom colour
      resolvedAccent = Object.keys(presets).find(k => presets[k].primary === storedPrimary) || 'custom';
    } else {
      // No primary saved yet — fall back to stored name
      resolvedAccent = storedName || 'gold';
    }
    setSaasAccentColor(resolvedAccent);
    const p = presets[resolvedAccent] || presets.gold;
    setSaasAccentPrimary(storedPrimary || p.primary);
    // Only use stored hover/dark if the accent was intentionally custom-tuned.
    // For any named preset, always use the canonical preset values.
    if (resolvedAccent === 'custom') {
      setSaasAccentHover(storedHover || p.hover);
      setSaasAccentDark(storedDark  || p.dark);
    } else {
      setSaasAccentHover(p.hover);
      setSaasAccentDark(p.dark);
    }
    setSaasDarkBg(localStorage.getItem(darkBgKey) || 'obsidian');
    setSaasLightBg(localStorage.getItem(lightBgKey) || 'slate');
    const ls = localStorage.getItem(lightStartKey); if (ls) setSaasLightStart(ls);
    const le = localStorage.getItem(lightEndKey);   if (le) setSaasLightEnd(le);
    const fontStyleKey = email ? `pms_font_style_${email}${suffix}` : `pms_font_style${suffix}`;
    setSaasFontStyle(localStorage.getItem(fontStyleKey) || 'modern');
  }, [user?.email, organization?.id, loading]);

  // Fetch tenant dashboard statistics
  useEffect(() => {
    if (loading || roleSlug === 'super_admin') return;

    const orgId = organization?.id;
    if (!orgId) return;

    // Fetch properties stats, bookings count, and escrow balances from our new stats endpoint
    fetch('/api/dashboard/stats')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.success && data.stats) {
          const { activeProperties, totalBookings, escrowBalance } = data.stats;
          setActiveProperties(String(activeProperties || 0));
          setActivePropertiesChange(`${activeProperties || 0} MTD`);
          
          setTotalBookings(String(totalBookings || 0));
          
          setEscrowBalance(`AED ${Number(escrowBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
          setEscrowBalanceChange(`AED ${Math.round(Number(escrowBalance || 0))} USD 0`);
        }
      })
      .catch(err => console.error('Error fetching dashboard stats:', err));

    // Load tasks from localStorage scoped by organization
    const issuesKey = `hhs_issues_${orgId}`;
    const savedIssues = localStorage.getItem(issuesKey);
    if (savedIssues) {
      try {
        const parsed = JSON.parse(savedIssues);
        if (Array.isArray(parsed)) {
          const pending = parsed.filter((i: any) => i.status !== 'Resolved').length;
          setPendingTasksCount(String(pending));
          setPendingTasksChange(pending > 0 ? `${pending} active orders` : 'All caught up');
        }
      } catch (e) {
        console.error('Error parsing localStorage issues on dashboard:', e);
      }
    }

    // Check for Uplisting PMS Integration API key in organization settings or localStorage
    const dbUplistingKey = organization?.settings?.pms_uplisting_api_key;
    const uplistingApiKeyVal = dbUplistingKey || localStorage.getItem(`pms_uplisting_api_key_${orgId}`);
    setIsUplistingConnected(!!uplistingApiKeyVal);

    // Fetch incoming connection requests
    fetch('/api/dashboard/host-management?action=getIncomingRequests')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.incomingRequests) {
          setIncomingRequests(data.incomingRequests);
          const initialActions: Record<string, { actionType: 'link' | 'import' | 'decline', targetPropertyId?: string }> = {};
          data.incomingRequests.forEach((req: any) => {
            if (Array.isArray(req.properties)) {
              req.properties.forEach((prop: any) => {
                initialActions[prop.id] = { actionType: 'import' };
              });
            }
          });
          setPropertyActions(prev => ({ ...initialActions, ...prev }));
        }
      })
      .catch(err => console.error('Error fetching connection requests:', err));

    // Fetch own properties for linking
    fetch('/api/dashboard/host-management?action=getProperties')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.properties) {
          setMyProperties(data.properties);
        }
      })
      .catch(err => console.error('Error fetching own properties:', err));

  }, [loading, roleSlug, organization?.id, organization?.settings]);

  // Listen for language changes fired from settings
  useEffect(() => {
    const email = user?.email;
    const handleLanguageChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.email && detail.email !== email) return;
      if (detail?.language) setUiLanguage(detail.language);
      if (detail?.tone) setTranslationTone(detail.tone);
    };
    window.addEventListener('pms-language-change', handleLanguageChange);
    return () => window.removeEventListener('pms-language-change', handleLanguageChange);
  }, [user?.email]);

  // Re-sync appearance state when AuthProvider finishes hydrating DB values into localStorage.
  // The load useEffect above runs before AuthProvider's async API call completes,
  // so all saas* state starts as defaults. When AuthProvider fires pms-theme-change
  // after writing to localStorage, this listener re-reads every key and updates state,
  // ensuring the settings cards show the correct active selection.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const PRESETS: Record<string, { primary: string; hover: string; dark: string }> = {
      gold: { primary: '#d4af37', hover: '#f3e5ab', dark: '#aa7c11' },
      green: { primary: '#10b981', hover: '#34d399', dark: '#047857' },
      blue: { primary: '#3b82f6', hover: '#60a5fa', dark: '#1d4ed8' },
      pink: { primary: '#f03b6a', hover: '#f472b6', dark: '#be185d' },
      purple: { primary: '#8b5cf6', hover: '#a78bfa', dark: '#6d28d9' },
    };

    const resync = () => {
      const email = user?.email;
      const orgId = organization?.id;
      const suffix = orgId ? `_${orgId}` : '';

      const theme = localStorage.getItem(email ? `pms_theme_${email}${suffix}` : `pms_theme${suffix}`);
      if (theme) setSaasTheme(theme as 'dark' | 'light' | 'dynamic');

      const apVal = localStorage.getItem(email ? `pms_accent_primary_${email}${suffix}` : `pms_accent_primary${suffix}`);
      const ahVal = localStorage.getItem(email ? `pms_accent_hover_${email}${suffix}` : `pms_accent_hover${suffix}`);
      const adVal = localStorage.getItem(email ? `pms_accent_dark_${email}${suffix}` : `pms_accent_dark${suffix}`);
      const nameVal = localStorage.getItem(email ? `pms_accent_color_${email}${suffix}` : `pms_accent_color${suffix}`);
      // Always derive active button from primary hex (ground truth — name can be stale)
      let resolvedAccent: string;
      if (apVal) {
        resolvedAccent = Object.keys(PRESETS).find(k => PRESETS[k].primary === apVal) || 'custom';
      } else {
        resolvedAccent = nameVal || 'gold';
      }
      setSaasAccentColor(resolvedAccent);
      const p = PRESETS[resolvedAccent];
      setSaasAccentPrimary(apVal || (p?.primary ?? '#d4af37'));
      // Only use stored hover/dark if the accent was intentionally custom-tuned.
      // For any named preset, always use the canonical preset values.
      if (resolvedAccent === 'custom') {
        setSaasAccentHover(ahVal || (p?.hover ?? '#f3e5ab'));
        setSaasAccentDark(adVal  || (p?.dark  ?? '#aa7c11'));
      } else {
        setSaasAccentHover(p?.hover ?? '#f3e5ab');
        setSaasAccentDark(p?.dark  ?? '#aa7c11');
      }

      const darkBg = localStorage.getItem(email ? `pms_dark_bg_${email}${suffix}` : `pms_dark_bg${suffix}`);
      if (darkBg) setSaasDarkBg(darkBg);

      const lightBg = localStorage.getItem(email ? `pms_light_bg_${email}${suffix}` : `pms_light_bg${suffix}`);
      if (lightBg) setSaasLightBg(lightBg);

      const font = localStorage.getItem(email ? `pms_font_style_${email}${suffix}` : `pms_font_style${suffix}`);
      if (font) setSaasFontStyle(font);

      const ls = localStorage.getItem(email ? `pms_light_start_${email}${suffix}` : `pms_light_start${suffix}`);
      if (ls) setSaasLightStart(ls);

      const le = localStorage.getItem(email ? `pms_light_end_${email}${suffix}` : `pms_light_end${suffix}`);
      if (le) setSaasLightEnd(le);

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
      const claudeModelsListKey = orgId ? `pms_claude_models_list_${orgId}` : 'pms_claude_models_list';

      const savedClaudeApiKey = localStorage.getItem(claudeApiKeyKey);
      if (savedClaudeApiKey !== null) setClaudeApiKey(savedClaudeApiKey);
      const savedClaudeModel = localStorage.getItem(claudeModelKey);
      if (savedClaudeModel !== null) setClaudeModel(savedClaudeModel);
      if (savedClaudeApiKey) setClaudeStatus('connected');

      const savedModels = localStorage.getItem(claudeModelsListKey);
      if (savedModels) {
        try {
          setClaudeModelsList(JSON.parse(savedModels));
        } catch (e) {}
      }
    };

    const handleLangResync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const email = user?.email;
      if (detail?.email && detail.email !== email) return;
      const orgId = organization?.id;
      const suffix = orgId ? `_${orgId}` : '';
      const lang = localStorage.getItem(email ? `pms_ui_language_${email}${suffix}` : `pms_ui_language${suffix}`);
      const tone = localStorage.getItem(email ? `pms_translation_tone_${email}${suffix}` : `pms_translation_tone${suffix}`);
      if (lang) setUiLanguage(lang);
      if (tone) setTranslationTone(tone);
    };

    window.addEventListener('pms-theme-change', resync);
    window.addEventListener('pms-language-change', handleLangResync);

    // Call resync immediately — catches the case where pms-theme-change already fired
    // before this effect registered the listener (race condition on fast API responses).
    resync();

    // Delayed fallback for slow API responses: re-read localStorage ~2s after mount.
    // Covers cases where AuthProvider's prefs fetch completes after this effect runs.
    const t1 = setTimeout(resync, 1500);
    const t2 = setTimeout(resync, 3000);

    return () => {
      window.removeEventListener('pms-theme-change', resync);
      window.removeEventListener('pms-language-change', handleLangResync);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [user?.email, organization?.id]);

  // Persists a preference key/value to the DB via the integrations API.
  // For superadmin (no orgId) this routes to User.preferences.
  const savePref = (key: string, value: string) => {
    fetch('/api/settings/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    }).catch(err => console.error('[savePref] failed to persist', key, err));
  };

  const handleSaasThemeChange = (t: 'dark'|'light'|'dynamic') => {
    setSaasTheme(t);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const key = email ? `pms_theme_${email}${suffix}` : `pms_theme${suffix}`;
    localStorage.setItem(key, t);
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
    savePref('pms_theme', t);
  };

  const handleSaasFontStyleChange = (style: string) => {
    setSaasFontStyle(style);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const key = email ? `pms_font_style_${email}${suffix}` : `pms_font_style${suffix}`;
    localStorage.setItem(key, style);
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
    savePref('pms_font_style', style);
  };

  const ACCENT_PRESETS: Record<string,{primary:string;hover:string;dark:string}> = {
    gold:{primary:'#d4af37',hover:'#f3e5ab',dark:'#aa7c11'},
    green:{primary:'#10b981',hover:'#34d399',dark:'#047857'},
    blue:{primary:'#3b82f6',hover:'#60a5fa',dark:'#1d4ed8'},
    pink:{primary:'#f03b6a',hover:'#f472b6',dark:'#be185d'},
    purple:{primary:'#8b5cf6',hover:'#a78bfa',dark:'#6d28d9'},
  };

  const handleSaasAccentChange = (id: string) => {
    setSaasAccentColor(id);
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const acKey = email ? `pms_accent_color_${email}${suffix}` : `pms_accent_color${suffix}`;
    localStorage.setItem(acKey, id);
    savePref('pms_accent_color', id);
    const p = ACCENT_PRESETS[id];
    if (p) {
      setSaasAccentPrimary(p.primary); setSaasAccentHover(p.hover); setSaasAccentDark(p.dark);
      const apKey = email ? `pms_accent_primary_${email}${suffix}` : `pms_accent_primary${suffix}`;
      const ahKey = email ? `pms_accent_hover_${email}${suffix}` : `pms_accent_hover${suffix}`;
      const adKey = email ? `pms_accent_dark_${email}${suffix}` : `pms_accent_dark${suffix}`;
      localStorage.setItem(apKey, p.primary);
      localStorage.setItem(ahKey, p.hover);
      localStorage.setItem(adKey, p.dark);
      savePref('pms_accent_primary', p.primary);
      savePref('pms_accent_hover', p.hover);
      savePref('pms_accent_dark', p.dark);
    }
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
  };

  const handleSaasCustomAccent = (type: 'primary'|'hover'|'dark', hex: string) => {
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const apKey = email ? `pms_accent_primary_${email}${suffix}` : `pms_accent_primary${suffix}`;
    const ahKey = email ? `pms_accent_hover_${email}${suffix}` : `pms_accent_hover${suffix}`;
    const adKey = email ? `pms_accent_dark_${email}${suffix}` : `pms_accent_dark${suffix}`;
    const acKey = email ? `pms_accent_color_${email}${suffix}` : `pms_accent_color${suffix}`;

    if (type==='primary') { setSaasAccentPrimary(hex); localStorage.setItem(apKey, hex); savePref('pms_accent_primary', hex); }
    else if (type==='hover') { setSaasAccentHover(hex); localStorage.setItem(ahKey, hex); savePref('pms_accent_hover', hex); }
    else { setSaasAccentDark(hex); localStorage.setItem(adKey, hex); savePref('pms_accent_dark', hex); }
    setSaasAccentColor('custom'); localStorage.setItem(acKey, 'custom');
    savePref('pms_accent_color', 'custom');
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
  };

  // Fetch SaaS metrics for super_admin
  useEffect(() => {
    if (roleSlug === 'super_admin') {
      fetch('/api/admin/dashboard')
        .then(res => res.json())
        .then(resData => {
          if (resData.success) setData(resData);
          setLoadingData(false);
        })
        .catch(err => { console.error(err); setLoadingData(false); });
    }
  }, [roleSlug]);

  // ─── Super Admin View ──────────────────────────────────────────────────────
  if (roleSlug === 'super_admin') {

    // ── Settings / Personalisation section ──────────────────────────────────
    if (saasSection === 'settings') {
      return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{to{transform:rotate(360deg);}}` }} />

          {/* Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(var(--accent-primary-rgb),0.1)', padding: '6px', borderRadius: '8px', color: 'var(--accent-primary)' }}>
                <Palette size={18} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('Control Center')}</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>{t('Settings')}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('Personalise your SaaS Control Center experience.')}</p>
          </div>

          {/* ── Appearance Theme Card ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(var(--accent-primary-rgb),0.08)', padding: '12px', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                <Palette size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('Appearance Theme')}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('Select your preferred workspace visual theme.')}</p>
              </div>
            </div>

            {/* Theme Picker Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {/* Dark */}
              <div onClick={() => handleSaasThemeChange('dark')} style={{ background: 'linear-gradient(135deg,#0a0e17 0%,#060910 100%)', border: `2px solid ${saasTheme==='dark'?'var(--accent-primary)':'var(--border-color)'}`, borderRadius: '16px', padding: '20px', cursor: 'pointer', boxShadow: saasTheme==='dark'?'0 8px 24px rgba(var(--accent-primary-rgb),0.15)':'none', transition: 'all 0.25s', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}><Moon size={15} style={{ color: 'var(--accent-primary)' }} /> {t('Warm Dark Mode')}</span>
                  {saasTheme==='dark' && <span style={{ background: 'var(--accent-primary)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>{t('Active')}</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px', height: '36px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: '10px', height: '100%', background: 'var(--accent-primary)', borderRadius: '4px' }} />
                  <div style={{ flex: 1, background: '#121a2c', borderRadius: '4px', border: '1px solid rgba(var(--accent-primary-rgb),0.15)' }} />
                  <div style={{ flex: 1, background: '#121a2c', borderRadius: '4px', border: '1px solid rgba(var(--accent-primary-rgb),0.15)' }} />
                </div>
              </div>
              {/* Light */}
              <div onClick={() => handleSaasThemeChange('light')} style={{ background: 'linear-gradient(135deg,#ffffff 0%,#f1f5f9 100%)', border: `2px solid ${saasTheme==='light'?'var(--accent-primary)':'rgba(0,0,0,0.08)'}`, borderRadius: '16px', padding: '20px', cursor: 'pointer', boxShadow: saasTheme==='light'?'0 8px 24px rgba(var(--accent-primary-rgb),0.1)':'none', transition: 'all 0.25s', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><Sun size={15} style={{ color: 'var(--accent-primary)' }} /> {t('Elegant Light Mode')}</span>
                  {saasTheme==='light' && <span style={{ background: 'var(--accent-primary)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>{t('Active')}</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px', height: '36px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '10px', height: '100%', background: 'var(--accent-primary)', borderRadius: '4px' }} />
                  <div style={{ flex: 1, background: '#fff', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.08)' }} />
                  <div style={{ flex: 1, background: '#fff', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.08)' }} />
                </div>
              </div>
              {/* Dynamic */}
              <div onClick={() => handleSaasThemeChange('dynamic')} style={{ background: 'linear-gradient(135deg,#0a0e17 0%,#ffffff 100%)', border: `2px solid ${saasTheme==='dynamic'?'var(--accent-primary)':'var(--border-color)'}`, borderRadius: '16px', padding: '20px', cursor: 'pointer', boxShadow: saasTheme==='dynamic'?'0 8px 24px rgba(var(--accent-primary-rgb),0.15)':'none', transition: 'all 0.25s', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: saasTheme==='dynamic'?'var(--text-primary)':'#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>⏱ {t('Dynamic (Time-Based)')}</span>
                  {saasTheme==='dynamic' && <span style={{ background: 'var(--accent-primary)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>{t('Active')}</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px', height: '36px', background: 'rgba(128,128,128,0.1)', borderRadius: '8px', padding: '6px' }}>
                  <div style={{ width: '10px', height: '100%', background: 'var(--accent-primary)', borderRadius: '4px' }} />
                  <div style={{ flex: 1, background: '#121a2c', borderRadius: '4px' }} />
                  <div style={{ flex: 1, background: '#fff', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.08)' }} />
                </div>
              </div>
            </div>

            {/* Dynamic time range — only when dynamic is selected */}
            {saasTheme === 'dynamic' && (
              <div style={{ marginTop: '20px', padding: '16px 20px', background: 'rgba(var(--accent-primary-rgb),0.04)', border: '1px solid rgba(var(--accent-primary-rgb),0.12)', borderRadius: '12px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{t('Specify when the Elegant Light Mode theme is active. The app switches automatically.')}</p>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>☀️ {t('Light Mode Starts')}</span>
                    <input type="time" value={saasLightStart} onChange={e => {
                      setSaasLightStart(e.target.value);
                      const email = user?.email;
                      const orgId = organization?.id;
                      const suffix = orgId ? `_${orgId}` : '';
                      const key = email ? `pms_light_start_${email}${suffix}` : `pms_light_start${suffix}`;
                      localStorage.setItem(key, e.target.value);
                      window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
                      savePref('pms_light_start', e.target.value);
                    }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '6px 12px', fontSize: '13px', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>🌙 {t('Light Mode Ends')}</span>
                    <input type="time" value={saasLightEnd} onChange={e => {
                      setSaasLightEnd(e.target.value);
                      const email = user?.email;
                      const orgId = organization?.id;
                      const suffix = orgId ? `_${orgId}` : '';
                      const key = email ? `pms_light_end_${email}${suffix}` : `pms_light_end${suffix}`;
                      localStorage.setItem(key, e.target.value);
                      window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
                      savePref('pms_light_end', e.target.value);
                    }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '6px 12px', fontSize: '13px', outline: 'none' }} />
                  </div>
                </div>
              </div>
            )}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', color: 'var(--accent-primary)' }}>🖥 {t('Background Presets')}</h4>
              {/* Dark */}
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>🌑 {t('Dark Mode Background')}</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {[{id:'obsidian',label:'Obsidian',bg:'#0a0e17'},{id:'coal',label:'Coal Black',bg:'#121212'},{id:'navy',label:'Deep Navy',bg:'#030712'},{id:'amethyst',label:'Amethyst',bg:'#090514'}].map(preset => {
                  const isActive = saasDarkBg === preset.id;
                  return (
                    <button key={preset.id} onClick={() => {
                      setSaasDarkBg(preset.id);
                      const email = user?.email;
                      const orgId = organization?.id;
                      const suffix = orgId ? `_${orgId}` : '';
                      const key = email ? `pms_dark_bg_${email}${suffix}` : `pms_dark_bg${suffix}`;
                      localStorage.setItem(key, preset.id);
                      window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
                      savePref('pms_dark_bg', preset.id);
                    }} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', borderRadius:'10px', border:`1px solid ${isActive?'var(--accent-primary)':'var(--border-color)'}`, background: isActive?'rgba(var(--accent-primary-rgb),0.08)':'transparent', color: isActive?'var(--accent-primary)':'var(--text-secondary)', fontSize:'12px', fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}>
                      <span style={{ width:'14px', height:'14px', borderRadius:'50%', background:preset.bg, border:'1px solid rgba(255,255,255,0.15)', display:'inline-block' }} />{t(preset.label)}{isActive && <Check size={11}/>}
                    </button>
                  );
                })}
              </div>
              {/* Light */}
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>☀️ {t('Light Mode Background')}</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[{id:'slate',label:'Slate White',bg:'#f8fafc'},{id:'silver',label:'Silver',bg:'#f1f5f9'},{id:'cream',label:'Cream',bg:'#fafaf9'},{id:'gray',label:'Gray',bg:'#f3f4f6'}].map(preset => {
                  const isActive = saasLightBg === preset.id;
                  return (
                    <button key={preset.id} onClick={() => {
                      setSaasLightBg(preset.id);
                      const email = user?.email;
                      const orgId = organization?.id;
                      const suffix = orgId ? `_${orgId}` : '';
                      const key = email ? `pms_light_bg_${email}${suffix}` : `pms_light_bg${suffix}`;
                      localStorage.setItem(key, preset.id);
                      window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { email } }));
                      savePref('pms_light_bg', preset.id);
                    }} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', borderRadius:'10px', border:`1px solid ${isActive?'var(--accent-primary)':'rgba(0,0,0,0.1)'}`, background: isActive?'rgba(var(--accent-primary-rgb),0.08)':'rgba(0,0,0,0.02)', color: isActive?'var(--accent-primary)':'var(--text-secondary)', fontSize:'12px', fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}>
                      <span style={{ width:'14px', height:'14px', borderRadius:'50%', background:preset.bg, border:'1px solid rgba(0,0,0,0.15)', display:'inline-block' }} />{t(preset.label)}{isActive && <Check size={11}/>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Accent */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: 'var(--accent-primary)' }}>🎨 {t('Workspace Color Accent')}</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>{t('Choose the primary branding accent color or fine-tune all three accent tones below.')}</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {[
                  {id:'gold',name:'Luxury Gold',color:'#d4af37'},
                  {id:'green',name:'Emerald Green',color:'#10b981'},
                  {id:'blue',name:'Royal Blue',color:'#3b82f6'},
                  {id:'pink',name:'Rose Pink',color:'#f03b6a'},
                  {id:'purple',name:'Amethyst Purple',color:'#8b5cf6'},
                  ...(saasAccentColor==='custom'?[{id:'custom',name:'Custom Tuned',color:saasAccentPrimary}]:[])
                ].map(scheme => {
                  const isActive = saasAccentColor === scheme.id;
                  return (
                    <button key={scheme.id} onClick={() => handleSaasAccentChange(scheme.id)} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', borderRadius:'10px', border:'1px solid', borderColor:isActive?scheme.color:'var(--border-color)', background:isActive?`${scheme.color}18`:'rgba(255,255,255,0.01)', color:isActive?scheme.color:'var(--text-secondary)', fontSize:'13px', fontWeight:600, cursor:'pointer', transition:'all 0.2s', fontFamily:'var(--font-sans)' }}
                      onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.borderColor=scheme.color; (e.currentTarget as HTMLButtonElement).style.color='var(--text-primary)'; }}}
                      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.borderColor='var(--border-color)'; (e.currentTarget as HTMLButtonElement).style.color='var(--text-secondary)'; }}}>
                      <span style={{ width:'12px', height:'12px', borderRadius:'50%', background:scheme.color, boxShadow:`0 0 8px ${scheme.color}60` }} />{t(scheme.name)}
                    </button>
                  );
                })}
              </div>
              {/* Fine-tuning */}
              <div style={{ padding:'18px 20px', background:'rgba(255,255,255,0.015)', border:'1px solid var(--border-color)', borderRadius:'14px', display:'flex', flexDirection:'column', gap:'14px' }}>
                <h5 style={{ fontSize:'13px', fontWeight:600, color:'var(--accent-primary)' }}>⚙️ {t('Custom Fine-Tuning (All 3 Accent Colors)')}</h5>
                <p style={{ fontSize:'11px', color:'var(--text-secondary)', lineHeight:1.5 }}>{t('Individually customize each accent color. The system will automatically update status controls, glow borders, and shadow gradients.')}</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:'18px' }}>
                  {([['primary','Primary Accent',saasAccentPrimary],['hover','Hover/Glow Accent',saasAccentHover],['dark','Dark/Shadow Accent',saasAccentDark]] as [string,string,string][]).map(([type,label,val]) => (
                    <div key={type} style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      <span style={{ fontSize:'12px', fontWeight:600, color:'var(--text-secondary)' }}>{t(label)}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{ position:'relative', width:'36px', height:'36px', borderRadius:'8px', overflow:'hidden', border:'1px solid var(--border-color)', background:val, cursor:'pointer' }}>
                          <input type="color" value={val} onChange={e => handleSaasCustomAccent(type as 'primary'|'hover'|'dark', e.target.value)} style={{ position:'absolute', top:'-6px', left:'-6px', width:'50px', height:'50px', border:'none', padding:0, cursor:'pointer', opacity:0 }} />
                        </div>
                        <input type="text" value={val.toUpperCase()} onChange={e => { const v=e.target.value; if(v.startsWith('#')&&v.length<=7) handleSaasCustomAccent(type as 'primary'|'hover'|'dark',v); else if(!v.startsWith('#')&&v.length<=6) handleSaasCustomAccent(type as 'primary'|'hover'|'dark','#'+v); }} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--border-color)', borderRadius:'8px', color:'var(--text-primary)', padding:'6px 10px', fontSize:'13px', width:'90px', fontFamily:'monospace', outline:'none' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Font Style */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: 'var(--accent-primary)' }}>✍️ {saasFontStyle === 'modern' ? 'Typography Style' : t('Typography Style')}</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>{t('Select the primary visual identity and typography set for the workspace.')}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {[
                    { id: 'modern', label: 'Modern Executive', sans: 'Inter', display: 'Outfit', desc: 'Sleek, minimalist and highly readable' },
                    { id: 'classic', label: 'Classic Luxury', sans: 'Jakarta', display: 'Cinzel', desc: 'Sophisticated Roman luxury aesthetic' },
                    { id: 'clean', label: 'Minimal Clean', sans: 'Jakarta', display: 'DM Sans', desc: 'Soft geometry and lightweight feel' },
                    { id: 'heritage', label: 'Neo-Heritage', sans: 'Inter', display: 'Playfair', desc: 'High-contrast elegant editorial serif' },
                    { id: 'futuristic', label: 'Futuristic Syne', sans: 'Inter', display: 'Syne', desc: 'Bold, avant-garde design language' },
                  ].map(font => {
                    const isActive = saasFontStyle === font.id;
                    return (
                      <div 
                        key={font.id} 
                        onClick={() => handleSaasFontStyleChange(font.id)}
                        style={{ 
                          padding: '16px', 
                          borderRadius: '12px', 
                          border: '1px solid', 
                          borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-color)', 
                          background: isActive ? 'rgba(var(--accent-primary-rgb),0.06)' : 'rgba(255,255,255,0.01)', 
                          color: 'var(--text-primary)', 
                          cursor: 'pointer', 
                          transition: 'all 0.2s',
                          boxShadow: isActive ? '0 4px 12px rgba(var(--accent-primary-rgb), 0.05)' : 'none'
                        }}
                        onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-primary)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; } }}
                        onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.01)'; } }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px' }}>{t(font.label)}</span>
                          {isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                        </div>
                        
                        {/* Font Preview snippet */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
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
                        
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>{t(font.desc)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── DocuSign Integration Card ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(255,200,40,0.08)', padding: '12px', borderRadius: '12px', color: '#ffc828' }}>
                  <FileSignature size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('DocuSign Integration')}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('Shared credentials enabling e-signatures across all properties and rental contracts.')}</p>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', border: '1px solid',
                borderColor: dsStatus === 'connected' ? 'rgba(16,185,129,0.3)' : dsStatus === 'error' ? 'rgba(239,68,68,0.3)' : 'var(--border-color)',
                color: dsStatus === 'connected' ? '#10b981' : dsStatus === 'error' ? '#ef4444' : 'var(--text-muted)',
                background: dsStatus === 'connected' ? 'rgba(16,185,129,0.08)' : dsStatus === 'error' ? 'rgba(239,68,68,0.08)' : 'transparent'
              }}>
                {dsStatus === 'connected' ? `● ${t('CONNECTED')}` : dsStatus === 'verifying' ? `○ ${t('Verifying...')}` : dsStatus === 'error' ? `✕ ${t('INVALID CREDENTIALS')}` : `○ ${t('NOT CONNECTED')}`}
              </span>
            </div>

            {dsStatus === 'connected' && !saasUnlocked['docusign'] ? (
              /* ── Locked ── */
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
                  <span style={{ fontSize: '16px', opacity: 0.6 }}>🔒</span>
                  <span style={{ letterSpacing: '3px', opacity: 0.5 }}>{'•'.repeat(28)}</span>
                  <span style={{ marginLeft: '8px', opacity: 0.4, fontSize: '12px' }}>{dsAccountId ? `Account ···${dsAccountId.slice(-4)}` : 'Credentials hidden'}</span>
                </div>
                <button
                  onClick={() => openSaasUnlock('docusign')}
                  style={{ whiteSpace: 'nowrap', padding: '12px 20px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#ffc828'; e.currentTarget.style.color = '#ffc828'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  🔓 {t('Unlock to Edit')}
                </button>
              </div>
            ) : (
              /* ── Editable ── */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('API Key')}</label>
                    <input className="form-input" type="text" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" value={dsClientId} onChange={e => setDsClientId(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('Secret Key')}</label>
                    <input 
                      className="form-input" 
                      type="text" 
                      placeholder={t('DocuSign secret key')} 
                      value={dsSecretKey} 
                      onChange={e => setDsSecretKey(e.target.value)} 
                      style={{ WebkitTextSecurity: 'disc' } as any}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('Account ID')}</label>
                    <input className="form-input" type="text" placeholder={t('DocuSign Account ID')} value={dsAccountId} onChange={e => setDsAccountId(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('Base URL')}</label>
                    <select className="form-input" value={dsBaseUrl} onChange={e => setDsBaseUrl(e.target.value)} style={{ cursor: 'pointer' }}>
                      <option value="https://demo.docusign.net">{t('Demo (Sandbox)')}</option>
                      <option value="https://na1.docusign.net">Production — NA1</option>
                      <option value="https://eu.docusign.net">Production — EU</option>
                      <option value="https://au.docusign.net">Production — AU</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={async () => {
                      setDsStatus('verifying');
                      setDsError('');
                      try {
                        const res = await fetch('/api/settings/verify-docusign', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            clientId: dsClientId.trim(),
                            secretKey: dsSecretKey.trim(),
                            accountId: dsAccountId.trim(),
                            baseUrl: dsBaseUrl,
                          }),
                        });
                        const data = await res.json();
                        const orgId = organization?.id;
                        const dsClientIdKey = orgId ? `pms_ds_client_id_${orgId}` : 'pms_ds_client_id';
                        const dsSecretKeyKey = orgId ? `pms_ds_secret_key_${orgId}` : 'pms_ds_secret_key';
                        const dsAccountIdKey = orgId ? `pms_ds_account_id_${orgId}` : 'pms_ds_account_id';
                        const dsBaseUrlKey = orgId ? `pms_ds_base_url_${orgId}` : 'pms_ds_base_url';

                        if (res.ok && data.ok) {
                          localStorage.setItem(dsClientIdKey, dsClientId.trim());
                          localStorage.setItem(dsSecretKeyKey, dsSecretKey.trim());
                          localStorage.setItem(dsAccountIdKey, dsAccountId.trim());
                          localStorage.setItem(dsBaseUrlKey, dsBaseUrl);
                          savePref('pms_ds_client_id', dsClientId.trim());
                          savePref('pms_ds_secret_key', dsSecretKey.trim());
                          savePref('pms_ds_account_id', dsAccountId.trim());
                          savePref('pms_ds_base_url', dsBaseUrl);
                          setDsStatus('connected');
                          setDsError('');
                          setSaasUnlocked(prev => ({ ...prev, docusign: false }));
                        } else {
                          setDsStatus('error');
                          setDsError(data.error || 'Verification failed. Check your credentials.');
                          localStorage.removeItem(dsClientIdKey);
                        }
                      } catch (e: any) {
                        setDsStatus('error');
                        setDsError('Network error — could not reach verification server.');
                      }
                    }}
                    className="btn-primary"
                    style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
                    disabled={dsStatus === 'verifying' || !dsClientId.trim()}
                  >
                    <Zap size={14} />
                    {dsStatus === 'verifying' ? t('Verifying with DocuSign...') : t('Connect & Save')}
                  </button>
                  {saasUnlocked['docusign'] && (
                    <button
                      onClick={() => setSaasUnlocked(prev => ({ ...prev, docusign: false }))}
                      style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#f87171', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                      title="Re-lock this field"
                    >
                      🔒
                    </button>
                  )}
                </div>
                {dsStatus === 'error' && dsError && (
                  <p style={{ marginTop: '10px', fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠</span> {t(dsError)}
                  </p>
                )}
                {dsStatus === 'connected' && (
                  <p style={{ marginTop: '10px', fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✓</span> {t('DocuSign credentials verified and saved successfully.')}
                  </p>
                )}
              </>
            )}
          </div>

          {/* ── Claude AI Card ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(139,92,246,0.08)', padding: '12px', borderRadius: '12px', color: '#8b5cf6' }}>
                  <Bot size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('AI Assistant (Claude)')}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('Shared API key powering AI replies, translations, and scheduling across all tenant companies.')}</p>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', border: '1px solid',
                borderColor: claudeStatus === 'connected' ? 'rgba(16,185,129,0.3)' : claudeStatus === 'error' ? 'rgba(239,68,68,0.3)' : 'var(--border-color)',
                color: claudeStatus === 'connected' ? '#10b981' : claudeStatus === 'error' ? '#ef4444' : 'var(--text-muted)',
                background: claudeStatus === 'connected' ? 'rgba(16,185,129,0.08)' : claudeStatus === 'error' ? 'rgba(239,68,68,0.08)' : 'transparent'
              }}>
                {claudeStatus === 'connected' ? `● ${t('CONNECTED')}` : claudeStatus === 'verifying' ? `○ ${t('Verifying...')}` : claudeStatus === 'error' ? `✕ ${t('INVALID KEY')}` : `○ ${t('NOT CONNECTED')}`}
              </span>
            </div>

            {claudeStatus === 'connected' && !saasUnlocked['claude'] ? (
              /* ── Locked ── */
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
                  <span style={{ fontSize: '16px', opacity: 0.6 }}>🔒</span>
                  <span style={{ letterSpacing: '3px', opacity: 0.5 }}>{'•'.repeat(32)}</span>
                </div>
                <button
                  onClick={() => openSaasUnlock('claude')}
                  style={{ whiteSpace: 'nowrap', padding: '12px 20px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#8b5cf6'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  🔓 {t('Unlock to Edit')}
                </button>
              </div>
            ) : (
              /* ── Editable ── */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('API Key')}</label>
                    <input 
                      className="form-input" 
                      type="text" 
                      placeholder="sk-ant-xxxxxxxxxxxxxxxxxxxxxxx" 
                      value={claudeApiKey} 
                      onChange={e => setClaudeApiKey(e.target.value)} 
                      style={{ WebkitTextSecurity: 'disc' } as any}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('Model')}</label>
                    <select className="form-input" value={claudeModel} onChange={e => {
                      setClaudeModel(e.target.value);
                      const orgId = organization?.id;
                      const claudeModelKey = orgId ? `pms_claude_model_${orgId}` : 'pms_claude_model';
                      localStorage.setItem(claudeModelKey, e.target.value);
                    }} style={{ cursor: 'pointer' }}>
                      {claudeModelsList.length > 0 ? (
                        claudeModelsList.map(m => (
                          <option key={m.id} value={m.id}>{m.displayName}</option>
                        ))
                      ) : (
                        <>
                          <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                          <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                          <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                          <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
                {claudeModel && claudeModel.includes('opus') && (
                  <p style={{ marginTop: '10px', fontSize: '13px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠</span> {t('Opus models are highly capable but slow. Large requests may time out on serverless hosting (e.g. Vercel Hobby). Consider using Sonnet or Haiku models if timeouts occur.')}
                  </p>
                )}
                <div style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                   <button
                     onClick={async () => {
                       setClaudeStatus('verifying');
                       setClaudeError('');
                       const orgId = organization?.id;
                       const claudeApiKeyKey = orgId ? `pms_claude_api_key_${orgId}` : 'pms_claude_api_key';
                       const claudeModelKey = orgId ? `pms_claude_model_${orgId}` : 'pms_claude_model';
                       const claudeModelsListKey = orgId ? `pms_claude_models_list_${orgId}` : 'pms_claude_models_list';
                       try {
                         const res = await fetch('/api/settings/verify-claude', {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ apiKey: claudeApiKey.trim(), model: claudeModel }),
                         });
                         const data = await res.json();
                         if (res.ok && data.ok) {
                           localStorage.setItem(claudeApiKeyKey, claudeApiKey.trim());
                           savePref('pms_claude_api_key', claudeApiKey.trim());
                           setClaudeStatus('connected');
                           setClaudeError('');
                           setSaasUnlocked(prev => ({ ...prev, claude: false }));
                           if (data.models && data.models.length > 0) {
                             setClaudeModelsList(data.models);
                             localStorage.setItem(claudeModelsListKey, JSON.stringify(data.models));
                             savePref('pms_claude_models_list', JSON.stringify(data.models));
                             const modelIds = data.models.map((m: any) => m.id);
                             if (!modelIds.includes(claudeModel)) {
                               // Default to a fast Sonnet or Haiku model if available to prevent serverless timeouts
                               const recommended = data.models.find((m: any) => m.id.includes('sonnet') || m.id.includes('haiku')) || data.models[0];
                               setClaudeModel(recommended.id);
                               localStorage.setItem(claudeModelKey, recommended.id);
                               savePref('pms_claude_model', recommended.id);
                             } else {
                               localStorage.setItem(claudeModelKey, claudeModel);
                               savePref('pms_claude_model', claudeModel);
                             }
                           } else {
                             localStorage.setItem(claudeModelKey, claudeModel);
                             savePref('pms_claude_model', claudeModel);
                           }
                         } else {
                           setClaudeStatus('error');
                           setClaudeError(data.error || 'Verification failed. Check your API key.');
                           localStorage.removeItem(claudeApiKeyKey);
                         }
                       } catch (e) {
                         setClaudeStatus('error');
                         setClaudeError('Network error — could not reach verification server.');
                       }
                     }}
                     className="btn-primary"
                     style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
                     disabled={claudeStatus === 'verifying' || !claudeApiKey.trim()}
                   >
                     <Zap size={14} />
                     {claudeStatus === 'verifying' ? t('Verifying with Anthropic...') : t('Test & Save')}
                   </button>
                   {saasUnlocked['claude'] && (
                     <button
                       onClick={() => setSaasUnlocked(prev => ({ ...prev, claude: false }))}
                       style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#f87171', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                       title="Re-lock this field"
                     >
                       🔒
                     </button>
                   )}
                 </div>
                 {claudeStatus === 'error' && claudeError && (
                   <p style={{ marginTop: '10px', fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <span>⚠</span> {t(claudeError)}
                   </p>
                 )}
                 {claudeStatus === 'connected' && (
                   <p style={{ marginTop: '10px', fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <span>✓</span> {t('API key verified and saved successfully.')}
                   </p>
                 )}
               </>
             )}
           </div>  {/* end Claude AI card */}

          {/* Language & Translation Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(var(--accent-primary-rgb),0.08)', padding: '12px', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                <Languages size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('Language & Translation')}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {t('Choose your preferred language. Claude AI will translate content automatically.')}
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
                    {t(({ ar: 'Arabic', fr: 'French', es: 'Spanish', de: 'German', it: 'Italian', pt: 'Portuguese', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ru: 'Russian', tr: 'Turkish', nl: 'Dutch', pl: 'Polish', hi: 'Hindi' } as Record<string, string>)[uiLanguage])}
                  </strong>
                  {' '}{t('using Claude AI with a')}{' '}<strong style={{ color: 'var(--text-primary)' }}>{t(translationTone)}</strong>{' '}{t('tone.')}
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
                  window.dispatchEvent(new CustomEvent('pms-language-change', { detail: { language: uiLanguage, tone: translationTone, email } }));
                  savePref('pms_ui_language', uiLanguage);
                  savePref('pms_translation_tone', translationTone);
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
                  <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> {t('Saving...')}</>
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
      );
    }

    // ── Overview / Companies / Staff sections ────────────────────────────────
    if (loadingData) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(var(--accent-primary-rgb),0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{to{transform:rotate(360deg);}}` }} />
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>Fetching SaaS database stats...</p>
        </div>
      );
    }

    const metrics = data?.metrics || { totalOrganizations: 0, totalProperties: 0, totalBookings: 0, totalStaff: 0 };
    const organizationsList = data?.organizations || [];

    const filteredOrgs = organizationsList.filter((org: any) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) || org.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const statCards = [
      { name: t('Total Organizations'), value: String(metrics.totalOrganizations), sub: t('Holiday Home SaaS tenants'), icon: Layers },
      { name: t('Global Properties'),   value: String(metrics.totalProperties),    sub: t('Across all active portfolios'), icon: Building2 },
      { name: t('System Bookings'),     value: String(metrics.totalBookings),      sub: t('Reservations processed'), icon: CalendarDays },
      { name: t('System Staff Users'),  value: String(metrics.totalStaff),         sub: t('Registered operator accounts'), icon: Users },
    ];

    return (
      <div style={{ padding: '0 32px', maxWidth: '1400px', margin: '0 auto' }}>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{to{transform:rotate(360deg);}}` }} />

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ background: 'rgba(var(--accent-primary-rgb),0.1)', padding: '6px', borderRadius: '8px', color: 'var(--accent-primary)' }}>
                <Shield size={18} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('System Administrator')}</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>
              {saasSection === 'overview' ? t('SaaS Control Center') : t('Registered Companies')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {saasSection === 'overview'
                ? t('Platform-wide metrics and registered holiday home companies.')
                : t('All registered holiday home companies on the platform.')}
            </p>
          </div>
          {saasSection === 'organizations' && (
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="btn-primary"
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Building2 size={16} /> {t('Register New Company')}
            </button>
          )}
        </div>

        {/* Metrics — overview only */}
        {saasSection === 'overview' && (
          <div className="dashboard-grid" style={{ marginBottom: '32px' }}>
            {statCards.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.name} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <span className="card-title">{stat.name}</span>
                    <div style={{ background: 'rgba(var(--accent-primary-rgb),0.08)', padding: '8px', borderRadius: '10px', color: 'var(--accent-primary)' }}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <div className="card-value">{stat.value}</div>
                  <div className="card-sub">{stat.sub}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <input
              type="text"
              placeholder={t('Search organizations...')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '16px' }}>{t('Company Name')}</th>
                  <th style={{ padding: '16px' }}>{t('Slug')}</th>
                  <th style={{ padding: '16px' }}>{t('Created On')}</th>
                  <th style={{ padding: '16px' }}>{t('Tier')}</th>
                  <th style={{ padding: '16px', textAlign: 'center' }}>{t('Units')}</th>
                  <th style={{ padding: '16px', textAlign: 'center' }}>{t('Bookings')}</th>
                  <th style={{ padding: '16px', textAlign: 'center' }}>{t('Members')}</th>
                  <th style={{ padding: '16px' }}>{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('No organizations found.')}</td></tr>
                ) : filteredOrgs.map((org: any) => (
                  <tr 
                    key={org.id} 
                    onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(var(--accent-primary-rgb),0.25)' }}
                            onError={(e: any) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%)', display: org.logoUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <span
                          style={{ transition: 'color 0.2s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLSpanElement).style.color = 'var(--accent-primary)'}
                          onMouseLeave={e => (e.currentTarget as HTMLSpanElement).style.color = 'var(--text-primary)'}
                        >
                          {org.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}><code>{org.slug}</code></td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{new Date(org.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: org.subscriptionTier === 'enterprise' ? 'rgba(212,175,55,0.1)' : 'rgba(124,58,237,0.1)', border: `1px solid ${org.subscriptionTier === 'enterprise' ? 'var(--accent-primary)' : '#7c3aed'}`, color: org.subscriptionTier === 'enterprise' ? 'var(--accent-primary)' : '#a78bfa' }}>
                        {org.subscriptionTier}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: 700 }}>{org._count?.properties || 0}</td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: 700 }}>{org._count?.bookings || 0}</td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: 700 }}>{org.members?.length || 0}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: org.isActive ? '#10b981' : '#ef4444' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: org.isActive ? '#10b981' : '#ef4444' }} />
                        {org.isActive ? t('Active') : t('Suspended')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Register Company Modal */}
        {isRegisterModalOpen && (
          <div className="modal-overlay" onClick={() => setIsRegisterModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="modal-header">
                <h2>🏢 {t('Register New Holiday Home Company')}</h2>
                <button className="close-btn" onClick={() => setIsRegisterModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              {regError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠</span> {regError}
                </div>
              )}

              {regSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✓</span> {regSuccess}
                </div>
              )}

              <form onSubmit={handleRegisterCompanySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('Company Name')}</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="e.g. Shoreline Rentals LLC"
                    value={regCompanyName}
                    onChange={e => {
                      const val = e.target.value;
                      setRegCompanyName(val);
                      const slug = val
                        .toLowerCase()
                        .trim()
                        .replace(/[^\w\s-]/g, '')
                        .replace(/[\s_-]+/g, '-')
                        .replace(/^-+|-+$/g, '');
                      setRegCompanySlug(slug);
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('Organization URL Slug')}</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="e.g. shoreline-rentals"
                    value={regCompanySlug}
                    onChange={e => setRegCompanySlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    required
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Workspace domain: {regCompanySlug || 'slug'}.holidayhomessas.com
                  </span>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '4px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    👤 {t('Org Admin:')}
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">{t('First Name')}</label>
                    <input
                      className="form-control"
                      type="text"
                      placeholder="Ahmed"
                      value={regFirstName}
                      onChange={e => setRegFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('Last Name')}</label>
                    <input
                      className="form-control"
                      type="text"
                      placeholder="Al Mansoori"
                      value={regLastName}
                      onChange={e => setRegLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('Work Email')}</label>
                  <input
                    className="form-control"
                    type="email"
                    placeholder="ahmed@company.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('Password')}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      className="form-control"
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      required
                      style={{ paddingRight: '48px', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        outline: 'none',
                        userSelect: 'none',
                        transition: 'color 0.2s',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      {showRegPassword ? t('Hide') : t('Show')}
                    </button>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsRegisterModalOpen(false)} style={{ width: 'auto' }}>
                    {t('Cancel')}
                  </button>
                  <button type="submit" className="btn-primary" disabled={regLoading} style={{ width: 'auto' }}>
                    {regLoading ? t('Registering...') : t('Register Workspace')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ─── Tenant / Standard Admin Dashboard ────────────────────────────────────
  const handleRespondConnection = async (req: any, action: 'accept' | 'decline') => {
    try {
      let payload: any = {
        action,
        fromOrgId: req.fromOrgId,
        hostContactId: req.hostContactId
      };

      if (action === 'accept') {
        const actionsArray = req.properties.map((prop: any) => {
          const choice = propertyActions[prop.id] || { actionType: 'import' };
          return {
            sourcePropertyId: prop.id,
            actionType: choice.actionType,
            targetPropertyId: choice.targetPropertyId || null
          };
        });

        const missingLink = actionsArray.some((act: any) => act.actionType === 'link' && !act.targetPropertyId);
        if (missingLink) {
          alert('Please select a target property to link for all properties set to "Link to Existing".');
          return;
        }

        payload.propertyActions = actionsArray;
      }

      const res = await fetch('/api/dashboard/host-management/respond-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIncomingRequests(prev => prev.filter(r => !(r.fromOrgId === req.fromOrgId && r.hostContactId === req.hostContactId)));
        
        // Refresh stats/properties to reflect changes
        fetch('/api/dashboard/stats')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.success && data.stats) {
              const { activeProperties, totalBookings, escrowBalance } = data.stats;
              setActiveProperties(String(activeProperties || 0));
              setActivePropertiesChange(`${activeProperties || 0} MTD`);
              setTotalBookings(String(totalBookings || 0));
              setEscrowBalance(`AED ${Number(escrowBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
              setEscrowBalanceChange(`AED ${Math.round(Number(escrowBalance || 0))} USD 0`);
            }
          })
          .catch(err => console.error('Error fetching dashboard stats:', err));
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to respond to connection request');
      }
    } catch (err) {
      console.error('Error responding to connection request:', err);
    }
  };

  const stats = [
    { name: 'Active Properties',    value: activeProperties,    sub: 'UAE units registered',          icon: Building2,  change: activePropertiesChange,    pos: true },
    { name: 'Reservations Sync',    value: totalBookings,       sub: 'Synced from Uplisting',          icon: CalendarDays, change: isUplistingConnected ? 'Active' : 'Inactive', pos: isUplistingConnected },
    { name: 'Pending Tasks',        value: pendingTasksCount,    sub: 'Operations work orders',         icon: Clock,      change: pendingTasksChange,         pos: true },
    { name: 'Trust Escrow Balance', value: escrowBalance,       sub: 'Segregated owner/guest cash',    icon: TrendingUp, change: escrowBalanceChange,       pos: true },
  ];

  return (
    <div>
      {/* Connection Requests Banner */}
      {incomingRequests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
          {incomingRequests.map((req: any) => (
            <div 
              key={`${req.fromOrgId}-${req.hostContactId}`}
              style={{
                background: 'linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.08), rgba(18, 26, 44, 0.75))',
                border: '1px solid var(--accent-primary)',
                borderRadius: '16px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
              }}
            >
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(var(--accent-primary-rgb), 0.15)', padding: '12px', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                    <Building2 size={26} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                      Partner Connection Request
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                      <strong>{req.fromOrgName}</strong> requests to link and share reservation calendars for their managed properties. Select sync action for each property below:
                    </p>
                  </div>
                </div>
                
                {/* Global Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleRespondConnection(req, 'accept')}
                    className="btn-primary"
                    style={{
                      width: 'auto',
                      padding: '10px 24px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '10px',
                      border: 'none',
                      background: 'var(--accent-primary)',
                      color: '#000',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 14px rgba(var(--accent-primary-rgb), 0.25)'
                    }}
                  >
                    Approve & Sync
                  </button>
                  <button
                    onClick={() => handleRespondConnection(req, 'decline')}
                    style={{
                      width: 'auto',
                      padding: '10px 24px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '10px',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                  >
                    Decline Request
                  </button>
                </div>
              </div>

              {/* Properties List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                {Array.isArray(req.properties) && req.properties.map((prop: any) => {
                  const currentChoice = propertyActions[prop.id] || { actionType: 'import' };
                  return (
                    <div 
                      key={prop.id}
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}
                    >
                      {/* Property Left Details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>🏠</span>
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{prop.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {prop.propertyType || 'Apartment'} • {prop.bedrooms} BR • {prop.city || 'Dubai'}
                            {prop.dtcmPermitNumber ? ` • DTCM: ${prop.dtcmPermitNumber}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Property Action Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        {/* Segmented control */}
                        <div style={{ 
                          display: 'flex', 
                          background: 'rgba(255,255,255,0.03)', 
                          padding: '3px', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)' 
                        }}>
                          <button
                            type="button"
                            onClick={() => handlePropertyActionChange(prop.id, 'import')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: currentChoice.actionType === 'import' ? 'var(--accent-primary)' : 'transparent',
                              color: currentChoice.actionType === 'import' ? '#000' : 'var(--text-secondary)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            Import as New
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePropertyActionChange(prop.id, 'link')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: currentChoice.actionType === 'link' ? 'var(--accent-primary)' : 'transparent',
                              color: currentChoice.actionType === 'link' ? '#000' : 'var(--text-secondary)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            Link to Existing
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePropertyActionChange(prop.id, 'decline')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: currentChoice.actionType === 'decline' ? 'var(--accent-primary)' : 'transparent',
                              color: currentChoice.actionType === 'decline' ? '#000' : 'var(--text-secondary)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            Decline
                          </button>
                        </div>

                        {/* Dropdown for existing properties */}
                        {currentChoice.actionType === 'link' && (
                          <select
                            value={currentChoice.targetPropertyId || ''}
                            onChange={(e) => handlePropertyActionChange(prop.id, 'link', e.target.value)}
                            style={{
                              background: 'rgba(10, 14, 23, 0.8)',
                              border: '1px solid var(--accent-primary)',
                              borderRadius: '8px',
                              color: 'var(--text-primary)',
                              padding: '6px 12px',
                              fontSize: '12px',
                              outline: 'none',
                              cursor: 'pointer',
                              minWidth: '180px'
                            }}
                          >
                            <option value="" disabled style={{ background: '#0a0e17' }}>-- Select Existing Property --</option>
                            {myProperties.map((myProp: any) => (
                              <option key={myProp.id} value={myProp.id} style={{ background: '#0a0e17' }}>
                                {myProp.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.08), rgba(18, 26, 44, 0.4))', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          Marhaba, {user ? user.firstName : 'User'}!
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Welcome to the management control center of <strong>{organization ? organization.name : 'your organization'}</strong>. Let&apos;s get your holiday home business configured.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="dashboard-grid">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span className="card-title">{stat.name}</span>
                <div style={{ background: 'rgba(var(--accent-primary-rgb), 0.08)', padding: '8px', borderRadius: '10px', color: 'var(--accent-primary)' }}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="card-value">{stat.value}</div>
              <div className="card-sub">{stat.sub}</div>
              <div className={`card-sub ${stat.pos ? 'positive' : 'negative'}`} style={{ marginTop: '12px' }}>
                Status: <span>{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px', marginTop: '40px' }}>
        {/* Onboarding Checklist */}
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--accent-primary)' }}>System Setup Guide</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            Follow these steps to initialize your UAE holiday home operations.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { n: 1, title: 'Register Property Units', desc: 'Add your apartments or villas and input their DTCM permit credentials.' },
              { n: 2, title: 'Setup Contacts & Agreements', desc: 'Add property owners, link them to units, and generate DocuSign templates.' },
              { n: 3, title: 'Sync Uplisting Channel Manager', desc: 'Input your channel manager credentials in Settings to activate the real-time calendar block listener.' },
              { n: 4, title: 'Configure Trust Banking', desc: 'Register your UAE Escrow and operating bank accounts in the Accounting ledger.' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(var(--accent-primary-rgb), 0.1)', color: 'var(--accent-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{step.n}</div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{step.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions & Compliance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '16px', fontWeight: 600 }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { href: '/dashboard/properties', icon: Building2, label: 'Properties' },
                { href: '/dashboard/scheduler',  icon: Clock,     label: 'Operations Scheduler' },
              ].map(action => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', textDecoration: 'none', color: 'var(--text-primary)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb),0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                    <Icon size={24} color="var(--accent-primary)" />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--color-warning)', marginBottom: '8px', fontWeight: 600 }}>Dubai DTCM Compliance Reminder</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Each unit operated as a short-term holiday rental in Dubai must carry a valid DTCM permit. Ensure your permit details are accurately captured in the property profile tab before bookings begin to avoid tourism authority fines.
            </p>
          </div>
        </div>
      </div>

      {/* \u2500\u2500\u2500 Super Admin API Key Unlock Modal \u2500\u2500\u2500 */}
      {saasPwTarget && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) closeSaasUnlock(); }}
        >
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', animation: 'fadeSlideUp 0.2s ease-out' }}>
            <style>{`@keyframes fadeSlideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>\ud83d\udd12</div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Confirm Your Password</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Enter your password to unlock{' '}
                  {saasPwTarget === 'claude' ? 'the Claude AI key' : saasPwTarget === 'docusign' ? 'DocuSign credentials' : 'this section'}
                </p>
              </div>
            </div>
            <input
              type="password"
              autoFocus
              placeholder="Your account password"
              value={saasPwInput}
              onChange={e => { setSaasPwInput(e.target.value); setSaasPwError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSaasConfirmUnlock(); }}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${saasPwError ? 'rgba(239,68,68,0.5)' : 'var(--border-color)'}`, borderRadius: '10px', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
            />
            {saasPwError && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '8px' }}>\u26a0\ufe0f {saasPwError}</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={closeSaasUnlock} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={handleSaasConfirmUnlock}
                disabled={saasPwVerifying || !saasPwInput.trim()}
                style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: (!saasPwInput.trim() || saasPwVerifying) ? 'rgba(var(--accent-primary-rgb),0.4)' : 'var(--accent-primary)', color: '#000', fontSize: '13px', fontWeight: 700, cursor: saasPwVerifying ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', transition: 'all 0.2s' }}
              >
                {saasPwVerifying ? 'Verifying...' : '\ud83d\udd13 Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
