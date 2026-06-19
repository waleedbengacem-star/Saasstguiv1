'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { translateText } from '@/lib/translations';
import { 
  Settings as SettingsIcon, 
  LogOut, 
  User,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Users,
  BarChart3,
  Menu,
  X
} from 'lucide-react';

const DEFAULT_MENU_ITEMS = [
  { id: 'overview',        name: 'My Dashboard',       path: '/dashboard',                  icon: '📊' },
  { id: 'properties',     name: 'Properties',         path: '/dashboard/properties',       icon: '🏠' },
  { id: 'host-management',name: 'Host Management',    path: '/dashboard/host-management',  icon: '🤝' },
];

const SAAS_NAV_ITEMS = [
  { id: 'overview',      label: 'Overview',        icon: BarChart3 },
  { id: 'organizations', label: 'Companies',        icon: Layers },
  { id: 'settings',      label: 'Settings',         icon: SettingsIcon },
];

function SuperAdminTopBar({ activeSection, onSection, onSignOut, user, uiLanguage = 'en' }: {
  activeSection: string;
  onSection: (s: string) => void;
  onSignOut: () => void;
  user: any;
  uiLanguage?: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: '60px',
      background: scrolled ? 'rgba(10,14,23,0.96)' : 'rgba(10,14,23,0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(var(--accent-primary-rgb),0.14)',
      display: 'flex',
      alignItems: 'center',
      zIndex: 1000,
      transition: 'background 0.3s ease, box-shadow 0.3s ease',
      boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.5)' : 'none',
      padding: '0 28px',
      gap: '0',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginRight: '40px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 14px rgba(var(--accent-primary-rgb),0.35)',
          flexShrink: 0,
        }}>
          <Shield size={18} style={{ color: '#000' }} />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{translateText('SaaS Control', uiLanguage)}</div>
          <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{translateText('Center', uiLanguage)}</div>
        </div>
      </div>

      {/* Nav Items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
        {SAAS_NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSection(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'rgba(var(--accent-primary-rgb),0.13)' : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.55)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                transition: 'all 0.18s ease',
                position: 'relative',
                outline: 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)';
                }
              }}
            >
              <Icon size={14} />
              {translateText(item.label, uiLanguage)}
              {isActive && (
                <span style={{
                  position: 'absolute', bottom: '0px', left: '50%',
                  transform: 'translateX(-50%)',
                  width: '24px', height: '2px',
                  background: 'var(--accent-primary)',
                  borderRadius: '2px 2px 0 0',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* User & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{
            width: '33px', height: '33px', borderRadius: '50%',
            background: 'rgba(var(--accent-primary-rgb),0.12)',
            border: '1px solid rgba(var(--accent-primary-rgb),0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-primary)',
          }}>
            <User size={15} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
              {user ? `${user.firstName} ${user.lastName}` : 'Admin'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600, letterSpacing: '0.04em' }}>{translateText('Super Admin', uiLanguage)}</span>
          </div>
        </div>
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
        <button
          onClick={onSignOut}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', fontWeight: 500, padding: '6px 10px', borderRadius: '6px',
            transition: 'all 0.2s', outline: 'none',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)';
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
          }}
        >
          <LogOut size={14} />
          {translateText('Sign out', uiLanguage)}
        </button>
      </div>
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, organization, roleSlug, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [saasSection, setSaasSection] = useState('overview');
  const [uiLanguage, setUiLanguage] = useState('en');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Listen for language changes fired from Settings page
  useEffect(() => {
    if (loading) return;
    const email = user?.email;
    const orgId = organization?.id;
    const suffix = orgId ? `_${orgId}` : '';
    const langKey = email ? `pms_ui_language_${email}${suffix}` : `pms_ui_language${suffix}`;
    
    const loadLang = () => setUiLanguage(localStorage.getItem(langKey) || 'en');
    loadLang();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.email && detail.email !== email) return;
      if (detail?.language) setUiLanguage(detail.language);
      else loadLang();
    };
    window.addEventListener('pms-language-change', handler);
    return () => window.removeEventListener('pms-language-change', handler);
  }, [user?.email, organization?.id, loading]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !loading) {
      const email = user?.email;
      const orgId = organization?.id;
      const suffix = orgId ? `_${orgId}` : '';
      const key = email ? `pms_sidebar_collapsed_${email}${suffix}` : `pms_sidebar_collapsed${suffix}`;
      const saved = localStorage.getItem(key);
      setIsCollapsed(saved === 'true');
    }
  }, [user?.email, organization?.id, loading]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      const email = user?.email;
      const orgId = organization?.id;
      const suffix = orgId ? `_${orgId}` : '';
      const key = email ? `pms_sidebar_collapsed_${email}${suffix}` : `pms_sidebar_collapsed${suffix}`;
      localStorage.setItem(key, String(next));
      return next;
    });
  };

  // Theme application
  useEffect(() => {
    const applyTheme = () => {
      if (loading) return;
      const email = user?.email;
      const orgId = organization?.id;
      const suffix = orgId ? `_${orgId}` : '';
      const themeKey = email ? `pms_theme_${email}${suffix}` : `pms_theme${suffix}`;
      const theme = localStorage.getItem(themeKey) || 'dark';
      let isLight = false;
      if (theme === 'light') {
        isLight = true;
      } else if (theme === 'dynamic') {
        const startKey = email ? `pms_light_start_${email}${suffix}` : `pms_light_start${suffix}`;
        const endKey = email ? `pms_light_end_${email}${suffix}` : `pms_light_end${suffix}`;
        const start = localStorage.getItem(startKey) || '08:00';
        const end = localStorage.getItem(endKey) || '18:00';
        const now = new Date();
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        if (startMin < endMin) {
          isLight = nowMin >= startMin && nowMin < endMin;
        } else {
          isLight = nowMin >= startMin || nowMin < endMin;
        }
      }
      if (isLight) {
        document.documentElement.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
      }
      const root = document.documentElement;
      const hexToRgba = (hex: string, alpha: number): string => {
        let c = hex.replace('#', '').trim();
        if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
        const n = parseInt(c, 16);
        if (isNaN(n)) return `rgba(212,175,55,${alpha})`;
        return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
      };
      const hexToRgbStr = (hex: string): string => {
        let c = hex.replace('#', '').trim();
        if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
        const n = parseInt(c, 16);
        if (isNaN(n)) return '212,175,55';
        return `${(n>>16)&255},${(n>>8)&255},${n&255}`;
      };
      const apKey = email ? `pms_accent_primary_${email}${suffix}` : `pms_accent_primary${suffix}`;
      const ahKey = email ? `pms_accent_hover_${email}${suffix}` : `pms_accent_hover${suffix}`;
      const adKey = email ? `pms_accent_dark_${email}${suffix}` : `pms_accent_dark${suffix}`;
      let ap = localStorage.getItem(apKey);
      let ah = localStorage.getItem(ahKey);
      let ad = localStorage.getItem(adKey);
      if (!ap || !ah || !ad) {
        const acKey = email ? `pms_accent_color_${email}${suffix}` : `pms_accent_color${suffix}`;
        const preset = localStorage.getItem(acKey) || 'gold';
        const presets: Record<string,{primary:string;hover:string;dark:string}> = {
          gold:   {primary:'#d4af37',hover:'#f3e5ab',dark:'#aa7c11'},
          green:  {primary:'#10b981',hover:'#34d399',dark:'#047857'},
          blue:   {primary:'#3b82f6',hover:'#60a5fa',dark:'#1d4ed8'},
          pink:   {primary:'#f03b6a',hover:'#f472b6',dark:'#be185d'},
          purple: {primary:'#8b5cf6',hover:'#a78bfa',dark:'#6d28d9'},
        };
        const p = presets[preset] || presets.gold;
        ap = ap || p.primary; ah = ah || p.hover; ad = ad || p.dark;
      }
      root.style.setProperty('--accent-primary', ap);
      root.style.setProperty('--accent-hover', ah);
      root.style.setProperty('--accent-dark', ad);
      root.style.setProperty('--accent-primary-rgb', hexToRgbStr(ap));
      root.style.setProperty('--border-color', hexToRgba(ap, 0.15));
      root.style.setProperty('--border-glow', hexToRgba(ap, 0.4));
      root.style.setProperty('--accent-translucent', hexToRgba(ap, 0.1));
      root.style.setProperty('--accent-shadow', hexToRgba(ap, 0.2));
      const darkBgKey  = email ? `pms_dark_bg_${email}${suffix}` : `pms_dark_bg${suffix}`;
      const lightBgKey = email ? `pms_light_bg_${email}${suffix}` : `pms_light_bg${suffix}`;
      const darkBg  = localStorage.getItem(darkBgKey)  || 'obsidian';
      const lightBg = localStorage.getItem(lightBgKey) || 'slate';
      const DARK: Record<string,{bg:string;card:string;tertiary:string}> = {
        obsidian: {bg:'#0a0e17', card:'rgba(18,26,44,0.6)',  tertiary:'#162238'},
        coal:     {bg:'#121212', card:'rgba(30,30,30,0.65)', tertiary:'#262626'},
        navy:     {bg:'#030712', card:'rgba(17,24,39,0.65)', tertiary:'#1f2937'},
        amethyst: {bg:'#090514', card:'rgba(23,15,38,0.65)', tertiary:'#2e1065'},
      };
      const LIGHT: Record<string,{bg:string;card:string;tertiary:string}> = {
        slate:  {bg:'#f8fafc', card:'rgba(255,255,255,0.75)', tertiary:'#ffffff'},
        silver: {bg:'#f1f5f9', card:'rgba(255,255,255,0.75)', tertiary:'#ffffff'},
        cream:  {bg:'#fafaf9', card:'rgba(255,255,255,0.75)', tertiary:'#ffffff'},
        gray:   {bg:'#f3f4f6', card:'rgba(255,255,255,0.75)', tertiary:'#ffffff'},
      };
      const bg = isLight ? (LIGHT[lightBg]||LIGHT.slate) : (DARK[darkBg]||DARK.obsidian);
      root.style.setProperty('--bg-primary',    bg.bg);
      root.style.setProperty('--bg-secondary',  bg.card);
      root.style.setProperty('--bg-tertiary',   bg.tertiary);
      root.style.setProperty('--glass-bg',      bg.card);

      // Apply custom font styles
      const fontStyleKey = email ? `pms_font_style_${email}${suffix}` : `pms_font_style${suffix}`;
      const fontStyle = localStorage.getItem(fontStyleKey) || 'modern';
      const FONTS: Record<string, {sans: string; display: string}> = {
        modern:     { sans: "'Inter', sans-serif", display: "'Outfit', sans-serif" },
        classic:    { sans: "'Plus Jakarta Sans', sans-serif", display: "'Cinzel', serif" },
        clean:      { sans: "'Plus Jakarta Sans', sans-serif", display: "'DM Sans', sans-serif" },
        heritage:   { sans: "'Inter', sans-serif", display: "'Playfair Display', serif" },
        futuristic: { sans: "'Inter', sans-serif", display: "'Syne', sans-serif" }
      };
      const activeFonts = FONTS[fontStyle] || FONTS.modern;
      root.style.setProperty('--font-sans', activeFonts.sans);
      root.style.setProperty('--font-display', activeFonts.display);
    };
    applyTheme();
    const interval = setInterval(applyTheme, 30000);
    window.addEventListener('storage', applyTheme);
    window.addEventListener('pms-theme-change', applyTheme);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', applyTheme);
      window.removeEventListener('pms-theme-change', applyTheme);
    };
  }, [user?.email, organization?.id, loading]);

  // Menu reordering
  useEffect(() => {
    if (roleSlug === 'super_admin') {
      setMenuItems([{ id: 'overview', name: 'SaaS Dashboard', path: '/dashboard', icon: '📊' }]);
      return;
    }
    const loadMenuOrder = () => {
      const email = user?.email;
      const orgId = organization?.id;
      const suffix = orgId ? `_${orgId}` : '';
      const key = email ? `pms_platform_order_${email}${suffix}` : `pms_platform_order${suffix}`;
      const savedOrder = localStorage.getItem(key);
      if (savedOrder) {
        try {
          const ids = JSON.parse(savedOrder) as string[];
          const ordered = [...DEFAULT_MENU_ITEMS].sort((a, b) => {
            const iA = ids.indexOf(a.id), iB = ids.indexOf(b.id);
            if (iA === -1 && iB === -1) return 0;
            if (iA === -1) return 1; if (iB === -1) return -1;
            return iA - iB;
          });
          setMenuItems(ordered);
        } catch (e) { console.error('Failed to parse menu order:', e); }
      } else {
        setMenuItems(DEFAULT_MENU_ITEMS);
      }
    };
    loadMenuOrder();
    window.addEventListener('pms-menu-order-change', loadMenuOrder);
    return () => window.removeEventListener('pms-menu-order-change', loadMenuOrder);
  }, [roleSlug, user?.email, organization?.id]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#000000',
        backgroundImage: 'radial-gradient(at 10% 10%, rgba(240, 59, 106, 0.08) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(240, 59, 106, 0.03) 0px, transparent 50%)',
        color: '#ffffff',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          border: '3px solid rgba(240, 59, 106, 0.1)',
          borderTopColor: '#F03B6A',
          borderRadius: '50%',
          animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          marginBottom: '20px',
          boxShadow: '0 0 20px rgba(240, 59, 106, 0.2)'
        }} />
        <style dangerouslySetInnerHTML={{__html:`@keyframes spin{to{transform:rotate(360deg);}}`}} />
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '24px', fontWeight: 800, letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
          OMNI<span style={{ color: '#F03B6A', fontWeight: 400, textShadow: '0 0 20px rgba(240, 59, 106, 0.4)' }}>Better</span>
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 500, letterSpacing: '0.02em' }}>Initializing control center...</p>
      </div>
    );
  }

  // ─── Super Admin: full-width top nav, no sidebar ──────────────────────────
  if (roleSlug === 'super_admin') {
    return (
      <div style={{ minHeight:'100vh', background:'var(--bg-primary)' }}>
        <style dangerouslySetInnerHTML={{__html:`@keyframes spin{to{transform:rotate(360deg);}}`}} />
        <SuperAdminTopBar
          activeSection={saasSection}
          onSection={setSaasSection}
          onSignOut={signOut}
          user={user}
          uiLanguage={uiLanguage}
        />
        {/* hidden carrier so dashboard/page.tsx can read active section */}
        <div id="saas-section-carrier" data-section={saasSection} style={{ display:'none' }} />
        <main style={{ paddingTop:'76px', paddingBottom:'40px', minHeight:'100vh' }}>
          {children}
        </main>
      </div>
    );
  }

  // ─── Regular Tenant: sidebar layout ──────────────────────────────────────
  return (
    <div className="app-container">
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="mobile-menu-toggle"
        style={{
          position: 'fixed',
          left: '16px',
          top: '16px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(var(--accent-primary-rgb), 0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-primary)',
          zIndex: 999,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Menu size={20} />
      </button>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1999,
          }}
        />
      )}

      <aside className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="mobile-menu-close"
          style={{
            position: 'absolute',
            right: '16px',
            top: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            zIndex: 101,
          }}
        >
          <X size={20} />
        </button>

        <button
          onClick={toggleSidebar}
          style={{
            position:'absolute', right:'-14px', top:'36px',
            width:'28px', height:'28px',
            color:'var(--text-secondary)',
            display:'flex', alignItems:'center', justifyContent:'center',
            borderRadius:'6px', background:'var(--bg-primary)',
            border:'1px solid var(--border-color)',
            cursor:'pointer', transition:'all 0.2s ease',
            zIndex:100, boxShadow:'0 4px 12px rgba(0,0,0,0.3)'
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color='var(--accent-primary)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color='var(--text-secondary)'}
          title={isCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </button>

        <div className="sidebar-brand" style={{ display:'flex', alignItems:'center', gap:'12px', justifyContent:isCollapsed?'center':'space-between', marginBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{
              width:'36px', height:'36px', borderRadius:'50%',
              background:'linear-gradient(135deg,var(--brand-pink) 0%,var(--brand-pink-light) 100%)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#ffffff', fontWeight:800, fontSize:'16px',
              boxShadow:'0 4px 12px rgba(240,59,106,0.25)',
              flexShrink:0, overflow:'hidden'
            }}>
              {organization?.logoUrl ? (
                /^(http:\/\/|https:\/\/|\/|data:image)/i.test(organization.logoUrl)
                  ? <img src={organization.logoUrl} alt="Logo" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  : <span>{organization.logoUrl.substring(0,2)}</span>
              ) : (
                <span>{organization?.name ? organization.name.charAt(0).toUpperCase() : 'O'}</span>
              )}
            </div>
            {!isCollapsed && (
              <div style={{ display:'flex', flexDirection:'column' }}>
                <span style={{ fontWeight:700, fontSize:'16px', color:'var(--text-primary)', lineHeight:'1.2' }}>
                  {organization?.name || 'OMNIBetter'}
                </span>
                {organization?.settings?.subheading && (
                  <span style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:500, letterSpacing:'0.02em', marginTop:'2px', display:'block' }}>
                    {organization.settings.subheading}
                  </span>
                )}
              </div>
            )}
          </div>
          {!isCollapsed && (
            <Link
              href="/dashboard/settings"
              style={{
                color: pathname.startsWith('/dashboard/settings') ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display:'flex', alignItems:'center', justifyContent:'center',
                padding:'6px', borderRadius:'8px', marginLeft:'auto',
                cursor:'pointer', transition:'all 0.2s ease',
              }}
              title="Settings"
            >
              <SettingsIcon size={18}/>
            </Link>
          )}
        </div>

        <nav style={{ flexGrow:1 }}>
          {!isCollapsed && (
            <div style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'0 16px 12px 16px',
              fontSize:'11px', fontWeight:700, letterSpacing:'0.05em',
              color:'var(--text-muted)', textTransform:'uppercase'
            }}>
              <span>Platforms</span>
            </div>
          )}
          <ul className="sidebar-menu">
            {menuItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
              return (
                <li key={item.name} className="sidebar-item">
                  <Link
                    href={item.path}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    style={{ justifyContent:isCollapsed?'center':'flex-start', padding:isCollapsed?'10px':'9px 12px' }}
                    title={isCollapsed ? translateText(item.name, uiLanguage) : undefined}
                  >
                    <span style={{ fontSize:'18px', width:'20px', height:'20px', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {item.icon}
                    </span>
                    {!isCollapsed && <span>{translateText(item.name, uiLanguage)}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div style={{
          borderTop:'1px solid var(--border-color)', paddingTop:'20px',
          display:'flex', flexDirection:'column', gap:'12px',
          alignItems:isCollapsed?'center':'stretch', position:'relative'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{
                width:'40px', height:'40px', borderRadius:'50%',
                background:'rgba(var(--accent-primary-rgb),0.1)',
                border:'1px solid var(--border-color)',
                display:'flex', justifyContent:'center', alignItems:'center',
                color:'var(--accent-primary)', flexShrink:0
              }}>
                <User size={20}/>
              </div>
              {!isCollapsed && (
                <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
                  <span style={{ fontWeight:600, fontSize:'14px', color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {user ? `${user.firstName} ${user.lastName}` : 'Administrator'}
                  </span>
                  <span style={{ fontSize:'11px', color:'var(--text-secondary)', fontWeight:500 }}>
                    {roleSlug ? roleSlug.replace('_',' ') : 'Administrator'}
                  </span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button onClick={signOut} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-danger)', display:'flex', alignItems:'center', justifyContent:'center', padding:'6px', borderRadius:'8px', transition:'all 0.2s ease' }} title="Sign Out">
                <LogOut size={18}/>
              </button>
            )}
          </div>
          {isCollapsed && (
            <button onClick={signOut} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-danger)', display:'flex', alignItems:'center', justifyContent:'center', padding:'6px', borderRadius:'8px', transition:'all 0.2s ease' }} title="Sign Out">
              <LogOut size={20}/>
            </button>
          )}
          {!isCollapsed && (
            <div style={{ textAlign:'center', fontSize:'10px', color:'var(--text-muted)', marginTop:'8px', fontFamily:'var(--font-sans)', letterSpacing:'0.02em' }}>
              v1.0 • {organization?.name || 'OMNIBetter'} Ops
            </div>
          )}
        </div>
      </aside>

      <div className="dashboard-main" style={{ marginLeft:isCollapsed?'68px':'230px', transition:'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}
