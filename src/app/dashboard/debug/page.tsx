'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RefreshCw, Play, ShieldAlert, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export default function DebugStoragePage() {
  const { user, organization, roleSlug, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [localStorageKeys, setLocalStorageKeys] = useState<{ key: string; value: string }[]>([]);
  const [revealValues, setRevealValues] = useState<Record<string, boolean>>({});

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const loadStorageKeys = () => {
    if (typeof window === 'undefined') return;
    const items: { key: string; value: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        items.push({ key, value: localStorage.getItem(key) || '' });
      }
    }
    items.sort((a, b) => a.key.localeCompare(b.key));
    setLocalStorageKeys(items);
  };

  useEffect(() => {
    loadStorageKeys();
  }, []);

  const toggleReveal = (key: string) => {
    setRevealValues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleForceMigration = () => {
    if (typeof window === 'undefined') return;
    setLogs([]);
    addLog('Starting manual migration check...');

    if (!user?.email || !organization?.id) {
      addLog('❌ Error: Migration aborted. User session or active Organization ID is missing in context.');
      return;
    }

    const email = user.email;
    const orgId = organization.id;
    const suffix = `_${orgId}`;
    addLog(`Targeting Org: ${orgId}`);
    addLog(`Targeting User Email: ${email}`);

    const isEmpty = (val: string | null) => {
      if (val === null || val === '') return true;
      if (val === '[]' || val === '{}') return true;
      return false;
    };

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
      'hhs_bookings_currency',
      'pms_property_mappings',
      'hhs_properties',
      'hhs_tasks',
      'hhs_hq',
      'hhs_offdays',
      'hhs_collapsed_cards_v4',
      'hhs_schedule_notes',
      'hhs_completed_tasks',
      'hhs_expert_rules',
      'hhs_scheduler_layout_v3',
      'hhs_creation_mode',
      'hhs_channels_seeded'
    ];

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
      'pms_sidebar_collapsed'
    ];

    let migrateCount = 0;

    // 1. Organization Scoped Keys
    orgKeys.forEach(baseKey => {
      const scopedKey = `${baseKey}${suffix}`;
      const scopedVal = localStorage.getItem(scopedKey);
      const legacyVal = localStorage.getItem(baseKey);

      addLog(`Checking org key: "${baseKey}"...`);
      if (legacyVal !== null) {
        addLog(`  -> Legacy value found: "${legacyVal.substring(0, 30)}${legacyVal.length > 30 ? '...' : ''}"`);
        if (isEmpty(scopedVal)) {
          addLog(`  -> Scoped key "${scopedKey}" is empty/null. Copying legacy value!`);
          localStorage.setItem(scopedKey, legacyVal);
          migrateCount++;
        } else {
          addLog(`  -> Scoped key already populated: "${(scopedVal || '').substring(0, 30)}${(scopedVal || '').length > 30 ? '...' : ''}"`);
        }
      } else {
        addLog(`  -> No legacy value found for "${baseKey}".`);
      }
    });

    // 2. Staff Special Key
    const scopedStaffKey = `pms_staff_data${suffix}`;
    const scopedStaffVal = localStorage.getItem(scopedStaffKey);
    const legacyStaffVal = localStorage.getItem('pms_staff_data') ?? localStorage.getItem('hhs_staff');

    addLog('Checking staff data...');
    if (legacyStaffVal !== null) {
      addLog(`  -> Legacy staff found: ${legacyStaffVal.substring(0, 40)}...`);
      if (isEmpty(scopedStaffVal)) {
        addLog(`  -> Scoped staff key "${scopedStaffKey}" is empty/null. Copying!`);
        localStorage.setItem(scopedStaffKey, legacyStaffVal);
        migrateCount++;
      } else {
        addLog(`  -> Scoped staff key already populated: ${(scopedStaffVal || '').substring(0, 40)}...`);
      }
    } else {
      addLog('  -> No legacy staff data found.');
    }

    // 3. Personal Keys
    personalKeys.forEach(baseKey => {
      const scopedKey = `${baseKey}_${email}${suffix}`;
      const legacyKey = `${baseKey}_${email}`;
      const scopedVal = localStorage.getItem(scopedKey);
      const legacyVal = localStorage.getItem(legacyKey) ?? localStorage.getItem(baseKey);

      addLog(`Checking personal key: "${baseKey}"...`);
      if (legacyVal !== null) {
        addLog(`  -> Legacy personal found: "${legacyVal}"`);
        if (isEmpty(scopedVal)) {
          addLog(`  -> Scoped personal "${scopedKey}" is empty/null. Copying!`);
          localStorage.setItem(scopedKey, legacyVal);
          migrateCount++;
        } else {
          addLog(`  -> Scoped personal already populated: "${scopedVal}"`);
        }
      } else {
        addLog(`  -> No legacy personal value found.`);
      }
    });

    addLog(`Migration completed. Migrated ${migrateCount} keys successfully!`);
    loadStorageKeys();
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', backgroundColor: '#0c0c0e', color: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#f03b6a' }}>SaaS Multi-Tenancy Storage Diagnostic Tool</h1>
            <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '14px' }}>Analyze localStorage partitions, verify active session context, and force key migrations.</p>
          </div>
          <button 
            onClick={loadStorageKeys}
            style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} /> Refresh Storage View
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Left Column: Auth Status & Manual Migration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Auth Details Card */}
            <div style={{ background: 'rgba(20, 20, 22, 0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} color="#f03b6a" /> Resolved Active Session Context
              </h2>
              {authLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af' }}>
                  <RefreshCw size={16} className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} />
                  Fetching Active Session...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr' }}>
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>Authentication State:</span>
                    <span style={{ fontWeight: 600, color: user ? '#10b981' : '#ef4444' }}>
                      {user ? 'AUTHENTICATED ✅' : 'UNAUTHENTICATED ❌'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr' }}>
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>User Email:</span>
                    <span style={{ fontWeight: 600 }}>{user?.email || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr' }}>
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>Organization ID:</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{organization?.id || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr' }}>
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>Organization Name:</span>
                    <span style={{ fontWeight: 600 }}>{organization?.name || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr' }}>
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>Role Slug:</span>
                    <span style={{ fontWeight: 600, textTransform: 'uppercase', color: '#f59e0b' }}>{roleSlug || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Run Migration Panel */}
            <div style={{ background: 'rgba(20, 20, 22, 0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0' }}>Trigger Key Auto-Migration</h2>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '13px' }}>Force copy legacy settings (Uplisting keys, staff data, rules, layouts) to the active tenant scoped keys.</p>
              </div>
              
              <button 
                onClick={handleForceMigration}
                disabled={!user || !organization}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: (!user || !organization) ? 'rgba(255,255,255,0.05)' : '#f03b6a',
                  color: (!user || !organization) ? '#4b5563' : '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: (!user || !organization) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Play size={16} /> Execute Partition Migration
              </button>

              {/* Console Logs Output */}
              <div style={{ flex: 1, minHeight: '300px', background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ color: '#888', borderBottom: '1px solid #222', paddingBottom: '4px', marginBottom: '4px' }}>--- Migration Output Terminal ---</div>
                {logs.length === 0 ? (
                  <span style={{ color: '#666' }}>Click "Execute Partition Migration" to display output logs here...</span>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} style={{
                      color: log.includes('Migrating') ? '#d4af37' : log.includes('❌') ? '#ef4444' : log.includes('✅') ? '#10b981' : '#aaa',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column: LocalStorage Inspector */}
          <div style={{ background: 'rgba(20, 20, 22, 0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>Browser LocalStorage Explorer</h2>
            <p style={{ margin: '0 0 16px 0', color: '#9ca3af', fontSize: '13px' }}>Lists all keys currently registered in your browser partition.</p>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {localStorageKeys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#4b5563', fontSize: '14px' }}>No keys found in localStorage.</div>
              ) : (
                localStorageKeys.map(({ key, value }) => {
                  const isScoped = key.includes(organization?.id || 'NO_ORG') || key.includes(user?.email || 'NO_USER');
                  return (
                    <div key={key} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isScoped ? '#10b981' : '#f59e0b', fontSize: '13px' }}>
                          {key}
                        </span>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: isScoped ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: isScoped ? '#10b981' : '#f59e0b' }}>
                          {isScoped ? 'Scoped 🔒' : 'Legacy Unscoped ⚠️'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                        <button 
                          onClick={() => toggleReveal(key)}
                          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0 }}
                          title={revealValues[key] ? 'Hide Value' : 'Show Value'}
                        >
                          {revealValues[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#ccc', wordBreak: 'break-all' }}>
                          {revealValues[key] 
                            ? value 
                            : (value.length > 50 ? `${value.substring(0, 50)}... [length: ${value.length}]` : value || '[Empty]')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
