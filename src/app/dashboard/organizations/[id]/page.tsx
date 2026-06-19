// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Users,
  Layers,
  FileText,
  DollarSign,
  AlertCircle,
  Clock,
  Shield,
  Zap,
  Globe,
  CheckCircle,
  ExternalLink,
  Ban,
  Activity,
  RefreshCw,
} from 'lucide-react';

const COLORS = {
  bgPrimary: 'var(--bg-primary, #0a0e17)',
  bgCard: 'var(--bg-secondary, rgba(255, 255, 255, 0.025))',
  bgCardHover: 'var(--bg-tertiary, rgba(255, 255, 255, 0.04))',
  accent: 'var(--accent-primary, #d4af37)',
  accentDim: 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.15)',
  accentGlow: 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.08)',
  textPrimary: 'var(--text-primary, #f3f4f6)',
  textSecondary: 'var(--text-secondary, #9ca3af)',
  textMuted: 'var(--text-muted, #6b7280)',
  border: 'var(--border-color, rgba(212, 175, 55, 0.15))',
  borderSubtle: 'var(--glass-border, rgba(255, 255, 255, 0.06))',
  success: 'var(--color-success, #10b981)',
  warning: 'var(--color-warning, #f59e0b)',
  danger: 'var(--color-danger, #ef4444)',
  info: 'var(--color-info, #3b82f6)',
};

const glassCard: React.CSSProperties = {
  background: COLORS.bgCard,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${COLORS.border}`,
  borderRadius: '16px',
  padding: '24px',
};

type Tab = 'overview' | 'properties' | 'bookings' | 'members';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <Layers size={16} /> },
  { key: 'properties', label: 'Properties', icon: <Building2 size={16} /> },
  { key: 'bookings', label: 'Bookings', icon: <Calendar size={16} /> },
  { key: 'members', label: 'Members', icon: <Users size={16} /> },
];

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, roleSlug, loading: authLoading } = useAuth();
  
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  const [toggleSubmitting, setToggleSubmitting] = useState(false);

  const isPendingMember = (member: any) => {
    return member.user?.firstName?.trim() === 'Pending' && member.user?.lastName?.trim() === 'Invitation';
  };

  const allMembers = org?.members || [];
  const activeMembers = allMembers.filter((m: any) => !isPendingMember(m) && m.isActive);
  const suspendedMembers = allMembers.filter((m: any) => !isPendingMember(m) && !m.isActive);
  const pendingMembers = allMembers.filter((m: any) => isPendingMember(m));

  useEffect(() => {
    if (authLoading) return;
    if (roleSlug !== 'super_admin') {
      setError('Unauthorized access');
      setLoading(false);
      return;
    }

    const fetchOrgDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/organizations/${params.id}`);
        if (res.status === 404) {
          setError('Organization not found');
          return;
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to load organization (${res.status})`);
        }
        const data = await res.json();
        setOrg(data.organization);
      } catch (err: any) {
        setError(err.message || 'Error loading organization');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchOrgDetails();
    }
  }, [params.id, roleSlug, authLoading]);

  const handleToggleActive = async () => {
    if (!org) return;
    
    let reason = null;
    if (org.isActive) {
      reason = prompt("Please provide a reason for suspending this tenant:");
      if (reason === null) {
        return; // User clicked Cancel
      }
      reason = reason.trim();
      if (!reason) {
        alert("Suspension cancelled: A reason is required.");
        return;
      }
    }

    setToggleSubmitting(true);
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isActive: !org.isActive,
          suspensionReason: org.isActive ? reason : null
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to update tenant status');
      }
      const data = await res.json();
      setOrg((prev: any) => ({ 
        ...prev, 
        isActive: data.organization.isActive,
        suspensionReason: data.organization.suspensionReason
      }));
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setToggleSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.accent, animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: COLORS.textMuted, fontSize: '14px' }}>Loading organization details…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${COLORS.danger}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={32} style={{ color: COLORS.danger }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: COLORS.textPrimary }}>{error || 'Error Loading Organization'}</h2>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', background: `${COLORS.accent}15`, color: COLORS.accent, fontSize: '14px', fontWeight: 500, textDecoration: 'none', border: `1px solid ${COLORS.accentDim}` }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
      
      {/* ===== HEADER ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            href="/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: COLORS.textMuted, fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textMuted)}
          >
            <ArrowLeft size={15} /> Back to SaaS Dashboard
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {org.logoUrl ? (
              <img
                src={org.logoUrl}
                alt={org.name}
                style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(var(--accent-primary-rgb),0.3)',
                  boxShadow: '0 0 14px rgba(var(--accent-primary-rgb),0.2)',
                  flexShrink: 0,
                }}
                onError={(e: any) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%)',
              display: org.logoUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px rgba(var(--accent-primary-rgb),0.25)',
              color: '#000', fontWeight: 800, fontSize: '20px', flexShrink: 0,
            }}>
              {org.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 700, color: COLORS.textPrimary, margin: 0, lineHeight: 1.2 }}>{org.name}</h1>
              <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '2px' }}>Tenant Slug: <code style={{ color: COLORS.accent }}>{org.slug}</code></p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: org.isActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', color: org.isActive ? '#10b981' : '#ef4444', border: `1px solid ${org.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: org.isActive ? '#10b981' : '#ef4444', marginRight: '6px' }} />
                {org.isActive ? 'Active' : 'Suspended'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: org.subscriptionTier === 'enterprise' ? 'rgba(212, 175, 55, 0.08)' : 'rgba(139, 92, 246, 0.08)', color: org.subscriptionTier === 'enterprise' ? COLORS.accent : '#a78bfa', border: `1px solid ${org.subscriptionTier === 'enterprise' ? COLORS.border : 'rgba(139, 92, 246, 0.2)'}` }}>
                {org.subscriptionTier}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleToggleActive}
          disabled={toggleSubmitting}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: org.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            border: `1px solid ${org.isActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
            borderRadius: '10px', padding: '10px 18px',
            color: org.isActive ? '#ef4444' : '#10b981', fontSize: '13px', fontWeight: 600,
            cursor: toggleSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', opacity: toggleSubmitting ? 0.7 : 1
          }}
          onMouseEnter={e => { if(!toggleSubmitting) e.currentTarget.style.background = org.isActive ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)' }}
          onMouseLeave={e => { if(!toggleSubmitting) e.currentTarget.style.background = org.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}
        >
          {org.isActive ? <Ban size={15} /> : <Activity size={15} />}
          {toggleSubmitting ? 'Updating...' : org.isActive ? 'Suspend Tenant' : 'Activate Tenant'}
        </button>
      </div>

      {/* ===== SUSPENSION WARNING BANNER ===== */}
      {!org.isActive && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 24px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: COLORS.danger,
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>This tenant is suspended. Reason: <strong>{org.suspensionReason || 'None provided'}</strong></span>
        </div>
      )}

      {/* ===== TABS ===== */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '0', overflowX: 'auto' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '12px 20px', fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? COLORS.accent : COLORS.textMuted,
                background: isActive ? COLORS.accentGlow : 'transparent',
                border: 'none', borderBottom: `2px solid ${isActive ? COLORS.accent : 'transparent'}`,
                borderRadius: '8px 8px 0 0', cursor: 'pointer', transition: 'all 0.25s ease', whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = COLORS.textSecondary; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = COLORS.textMuted; e.currentTarget.style.background = 'transparent'; } }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== TAB CONTENTS ===== */}
      
      {/* ── Tab: Overview ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div style={{ ...glassCard, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.accent }}>
                <Building2 size={16} />
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Properties</span>
              </div>
              <span style={{ fontSize: '28px', fontWeight: 700, color: COLORS.textPrimary }}>{org._count?.properties || 0}</span>
              <p style={{ fontSize: '11px', color: COLORS.textMuted }}>Registered local property profiles</p>
            </div>
            
            <div style={{ ...glassCard, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.accent }}>
                <Calendar size={16} />
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bookings</span>
              </div>
              <span style={{ fontSize: '28px', fontWeight: 700, color: COLORS.textPrimary }}>{org._count?.bookings || 0}</span>
              <p style={{ fontSize: '11px', color: COLORS.textMuted }}>Total reservation transactions processed</p>
            </div>

            <div style={{ ...glassCard, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.accent }}>
                <Users size={16} />
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Members</span>
              </div>
              <span style={{ fontSize: '28px', fontWeight: 700, color: COLORS.textPrimary }}>{activeMembers.length}</span>
              <p style={{ fontSize: '11px', color: COLORS.textMuted }}>Subscribed user logins inside organization</p>
            </div>
          </div>

          {/* Details Card */}
          <div style={glassCard}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: COLORS.textPrimary }}>Tenant Meta-Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', borderBottom: `1px solid ${COLORS.borderSubtle}`, paddingBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>Tenant Unique ID (UUID)</span>
                <span style={{ fontSize: '13px', color: COLORS.textPrimary, fontFamily: 'monospace' }}>{org.id}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', borderBottom: `1px solid ${COLORS.borderSubtle}`, paddingBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>Workspace Address (Slug URL)</span>
                <span style={{ fontSize: '13px', color: COLORS.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={13} style={{ color: COLORS.accent }} />
                  <code>{org.slug}.holidayhomessas.com</code>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', borderBottom: `1px solid ${COLORS.borderSubtle}`, paddingBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>Date Registered</span>
                <span style={{ fontSize: '13px', color: COLORS.textPrimary }}>
                  {new Date(org.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', borderBottom: `1px solid ${COLORS.borderSubtle}`, paddingBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>Last Settings Update</span>
                <span style={{ fontSize: '13px', color: COLORS.textPrimary }}>
                  {new Date(org.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Properties ── */}
      {activeTab === 'properties' && (
        <div style={glassCard}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: COLORS.textPrimary }}>Managed Properties ({org.properties?.length || 0})</h3>
          {org.properties?.length === 0 ? (
            <p style={{ textAlign: 'center', color: COLORS.textMuted, padding: '32px 0' }}>No properties registered yet.</p>
          ) : (
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.borderSubtle}`, borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(var(--accent-primary-rgb), 0.02)', borderBottom: `1px solid ${COLORS.borderSubtle}`, color: COLORS.accent, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px' }}>Property Name</th>
                    <th style={{ padding: '14px 20px' }}>Type</th>
                    <th style={{ padding: '14px 20px' }}>City</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Specs</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {org.properties.map((prop: any) => (
                    <tr key={prop.id} style={{ borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: COLORS.textPrimary }}>{prop.name}</td>
                      <td style={{ padding: '14px 20px', color: COLORS.textSecondary }}>{prop.propertyType}</td>
                      <td style={{ padding: '14px 20px', color: COLORS.textSecondary }}>{prop.city}</td>
                      <td style={{ padding: '14px 20px', color: COLORS.textSecondary, textAlign: 'center' }}>
                        {prop.bedrooms} Bed • {prop.bathrooms} Bath • {prop.maxGuests} Guests
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: prop.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: prop.status === 'active' ? '#10b981' : '#f59e0b', border: `1px solid ${prop.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                          {prop.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Bookings ── */}
      {activeTab === 'bookings' && (
        <div style={glassCard}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: COLORS.textPrimary }}>Recent Bookings ({org.bookings?.length || 0})</h3>
          {org.bookings?.length === 0 ? (
            <p style={{ textAlign: 'center', color: COLORS.textMuted, padding: '32px 0' }}>No bookings processed yet.</p>
          ) : (
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.borderSubtle}`, borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(var(--accent-primary-rgb), 0.02)', borderBottom: `1px solid ${COLORS.borderSubtle}`, color: COLORS.accent, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px' }}>Guest Name</th>
                    <th style={{ padding: '14px 20px' }}>Property</th>
                    <th style={{ padding: '14px 20px' }}>Dates</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Total Amount</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {org.bookings.map((booking: any) => (
                    <tr key={booking.id} style={{ borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: COLORS.textPrimary }}>{booking.guestName || 'Guest'}</td>
                      <td style={{ padding: '14px 20px', color: COLORS.textSecondary }}>{booking.property?.name || '—'}</td>
                      <td style={{ padding: '14px 20px', color: COLORS.textSecondary }}>
                        {new Date(booking.checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(booking.checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 20px', color: COLORS.textPrimary, fontWeight: 700, textAlign: 'center' }}>
                        {booking.currency || 'AED'} {Number(booking.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: booking.status === 'confirmed' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: booking.status === 'confirmed' ? '#10b981' : '#ef4444', border: `1px solid ${booking.status === 'confirmed' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Members ── */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active Members Card */}
          <div style={glassCard}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: COLORS.textPrimary }}>Active Members ({activeMembers.length})</h3>
            {activeMembers.length === 0 ? (
              <p style={{ textAlign: 'center', color: COLORS.textMuted, padding: '32px 0' }}>No active members.</p>
            ) : (
              <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.borderSubtle}`, borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(var(--accent-primary-rgb), 0.02)', borderBottom: `1px solid ${COLORS.borderSubtle}`, color: COLORS.accent, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '14px 20px' }}>User Name</th>
                      <th style={{ padding: '14px 20px' }}>Email Address</th>
                      <th style={{ padding: '14px 20px' }}>Workspace Role</th>
                      <th style={{ padding: '14px 20px' }}>Last Access</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMembers.map((member: any) => (
                      <tr key={member.id} style={{ borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: COLORS.textPrimary }}>
                          {member.user ? `${member.user.firstName} ${member.user.lastName}` : '—'}
                        </td>
                        <td style={{ padding: '14px 20px', color: COLORS.textSecondary, fontFamily: 'monospace' }}>
                          {member.user?.email || '—'}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(212,175,55,0.1)', color: COLORS.accent, border: '1px solid rgba(212,175,55,0.2)', textTransform: 'uppercase' }}>
                            {member.role?.name || 'Staff'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: COLORS.textSecondary }}>
                          {member.user?.lastLoginAt ? (
                            new Date(member.user.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          ) : (
                            'Never'
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-flex',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: 'rgba(16,185,129,0.1)',
                            color: '#10b981',
                            border: '1px solid rgba(16,185,129,0.2)'
                          }}>
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Suspended Members Card */}
          {suspendedMembers.length > 0 && (
            <div style={glassCard}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: COLORS.textPrimary }}>Suspended Members ({suspendedMembers.length})</h3>
              <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.borderSubtle}`, borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(var(--accent-primary-rgb), 0.02)', borderBottom: `1px solid ${COLORS.borderSubtle}`, color: COLORS.accent, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '14px 20px' }}>User Name</th>
                      <th style={{ padding: '14px 20px' }}>Email Address</th>
                      <th style={{ padding: '14px 20px' }}>Workspace Role</th>
                      <th style={{ padding: '14px 20px' }}>Last Access</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suspendedMembers.map((member: any) => (
                      <tr key={member.id} style={{ borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: COLORS.textPrimary }}>
                          {member.user ? `${member.user.firstName} ${member.user.lastName}` : '—'}
                        </td>
                        <td style={{ padding: '14px 20px', color: COLORS.textSecondary, fontFamily: 'monospace' }}>
                          {member.user?.email || '—'}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(212,175,55,0.1)', color: COLORS.accent, border: '1px solid rgba(212,175,55,0.2)', textTransform: 'uppercase' }}>
                            {member.role?.name || 'Staff'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: COLORS.textSecondary }}>
                          {member.user?.lastLoginAt ? (
                            new Date(member.user.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          ) : (
                            'Never'
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-flex',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: 'rgba(239,68,68,0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.2)'
                          }}>
                            Suspended
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending Invitations Card */}
          {pendingMembers.length > 0 && (
            <div style={glassCard}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: COLORS.textPrimary }}>Pending Invitations ({pendingMembers.length})</h3>
              <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.borderSubtle}`, borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(var(--accent-primary-rgb), 0.02)', borderBottom: `1px solid ${COLORS.borderSubtle}`, color: COLORS.accent, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '14px 20px' }}>User Name</th>
                      <th style={{ padding: '14px 20px' }}>Email Address</th>
                      <th style={{ padding: '14px 20px' }}>Workspace Role</th>
                      <th style={{ padding: '14px 20px' }}>Last Access</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingMembers.map((member: any) => (
                      <tr key={member.id} style={{ borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: COLORS.textPrimary }}>
                          {member.user ? `${member.user.firstName} ${member.user.lastName}` : '—'}
                        </td>
                        <td style={{ padding: '14px 20px', color: COLORS.textSecondary, fontFamily: 'monospace' }}>
                          {member.user?.email || '—'}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(212,175,55,0.1)', color: COLORS.accent, border: '1px solid rgba(212,175,55,0.2)', textTransform: 'uppercase' }}>
                            {member.role?.name || 'Staff'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: COLORS.textSecondary }}>
                          {member.user?.lastLoginAt ? (
                            new Date(member.user.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          ) : (
                            'Never'
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-flex',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: 'rgba(245,158,11,0.1)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245,158,11,0.2)'
                          }}>
                            Pending
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
