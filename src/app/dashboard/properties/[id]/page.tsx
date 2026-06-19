'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Bed,
  Bath,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Wrench,
  ClipboardList,
  Shield,
  ExternalLink,
  Edit3,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OwnerContact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  companyName?: string | null;
  trn?: string | null;
  contactType?: string;
  bankDetails?: any;
}

interface ManagerAssignment {
  id: string;
  userId: string;
  isPrimary: boolean;
  assignedAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
}

interface BookingGuest {
  id: string;
  firstName: string;
  lastName: string;
}

interface Booking {
  id: string;
  source: string;
  checkIn: string;
  checkOut: string;
  totalAmount: string | number;
  grossAmount?: string | number | null;
  currency: string;
  status: string;
  guest?: BookingGuest | null;
  guestName?: string | null;
  payments?: Array<{ amount: string | number; currency: string }> | null;
}

interface Task {
  id: string;
  title: string;
  taskType: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

interface OwnerPropertyLink {
  id: string;
  ownerId: string;
  ownershipPercentage: string | number;
  managementFeePct: string | number;
  contractStart: string | null;
  contractEnd: string | null;
}

interface Property {
  id: string;
  name: string;
  propertyType: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  country: string;
  postalCode?: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  areaSqm?: number | string | null;
  description?: string | null;
  amenities: string[] | any;
  dtcmPermitNumber?: string | null;
  dtcmPermitExpiry?: string | null;
  status: string;
  managedSince?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: OwnerContact | null;
  ownerProperties: OwnerPropertyLink[];
  managerAssignments: ManagerAssignment[];
  bookings: Booking[];
  tasks: Task[];
  _count: {
    bookings: number;
    tasks: number;
    maintenanceRequests: number;
    claims: number;
    documents: number;
    photos: number;
  };
  extraDetails?: any;
  ownerContactId?: string | null;
  linkedCommissionPct?: number | null;
  linkedPartnerModel?: 'gross_pct' | 'fee_pct' | 'monthly_flat';
  linkedPartnerValue?: number;
  financials?: {
    totalRevenue: number;
    ownerPayouts: number;
    managementCommission: number;
    outstanding: number;
  };
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

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

const glassCardCompact: React.CSSProperties = {
  ...glassCard,
  padding: '20px',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const getEffectiveContractTerm = (startDate: string | null, endDate: string | null, isAutoRenew?: boolean) => {
  if (!startDate) return { startDate: null, endDate: null, isActive: false };
  
  const today = new Date().toISOString().split('T')[0];
  
  // If there is no end date, the contract is active indefinitely from the start date onwards
  if (!endDate) {
    return { startDate, endDate: null, isActive: today >= startDate };
  }
  
  if (today >= startDate && today <= endDate) {
    return { startDate, endDate, isActive: true };
  }
  
  if (isAutoRenew && today > endDate) {
    // Roll forward annually
    let start = new Date(startDate);
    let end = new Date(endDate);
    
    // Add years until end covers today
    const todayDate = new Date(today);
    while (end < todayDate) {
      start.setFullYear(start.getFullYear() + 1);
      end.setFullYear(end.getFullYear() + 1);
    }
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    return {
      startDate: startStr,
      endDate: endStr,
      isActive: today >= startStr && today <= endStr
    };
  }
  
  return { startDate, endDate, isActive: false };
};

const getPropertyContracts = (property: Property) => {
  const splits = property.extraDetails?.ownerSplits || [];
  const contractsList: Array<{ startDate: string; endDate: string | null; isAutoRenew?: boolean; ownerId?: string }> = [];
  
  if (Array.isArray(splits)) {
    splits.forEach((split: any) => {
      const splitContracts = split.contracts || [];
      if (splitContracts.length > 0) {
        splitContracts.forEach((c: any) => {
          contractsList.push({
            startDate: c.startDate,
            endDate: c.endDate || null,
            isAutoRenew: !!c.isAutoRenew,
            ownerId: split.contactId
          });
        });
      } else if (split.contractStart) {
        contractsList.push({
          startDate: split.contractStart,
          endDate: split.contractEnd || null,
          isAutoRenew: false,
          ownerId: split.contactId
        });
      }
    });
  }
  
  if (contractsList.length === 0 && property.ownerProperties?.[0]) {
    const op = property.ownerProperties[0];
    if (op.contractStart) {
      contractsList.push({
        startDate: op.contractStart,
        endDate: op.contractEnd || null,
        isAutoRenew: false,
        ownerId: op.ownerId
      });
    }
  }
  
  return contractsList;
};

const expandContractTerms = (contractsList: Array<{ startDate: string; endDate: string | null; isAutoRenew?: boolean }>) => {
  const terms: Array<{ startDate: string; endDate: string | null; label: string }> = [];
  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date(today);
  
  contractsList.forEach((c) => {
    if (!c.startDate) return;
    
    if (!c.endDate) {
      terms.push({
        startDate: c.startDate,
        endDate: null,
        label: `Open-ended (from ${formatDate(c.startDate)})`
      });
      return;
    }
    
    if (!c.isAutoRenew) {
      terms.push({
        startDate: c.startDate,
        endDate: c.endDate,
        label: `Term: ${formatDate(c.startDate)} to ${formatDate(c.endDate)}`
      });
      return;
    }
    
    let start = new Date(c.startDate);
    let end = new Date(c.endDate);
    
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const yearDiff = endYear - startYear;
    
    let iterations = 0;
    while (iterations < 20) {
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      const isCurrent = today >= startStr && today <= endStr;
      terms.push({
        startDate: startStr,
        endDate: endStr,
        label: `${isCurrent ? 'Current Term' : 'Term'}: ${formatDate(startStr)} to ${formatDate(endStr)}`
      });
      
      if (end >= todayDate) {
        break;
      }
      
      start.setFullYear(start.getFullYear() + yearDiff);
      end.setFullYear(end.getFullYear() + yearDiff);
      iterations++;
    }
  });
  
  // Sort terms latest first
  return terms.sort((a, b) => b.startDate.localeCompare(a.startDate));
};

interface PartnerConfig {
  isIntermediary: boolean;
  partnerModel?: 'gross_pct' | 'fee_pct' | 'monthly_flat';
  partnerValue?: number;
}

const calculateBookingSplits = (
  bookingGross: number,
  checkIn: string,
  checkOut: string,
  commissionPct: number,
  partnerConfig: PartnerConfig
) => {
  const totalDeductedFee = bookingGross * (commissionPct / 100);
  const hostPayout = Math.max(0, bookingGross - totalDeductedFee);
  
  if (!partnerConfig.isIntermediary) {
    return {
      operatorShare: totalDeductedFee,
      partnerShare: 0,
      hostPayout,
    };
  }

  const model = partnerConfig.partnerModel || 'fee_pct';
  const val = Number(partnerConfig.partnerValue) || 0;

  let operatorShare = 0;
  if (model === 'gross_pct') {
    operatorShare = bookingGross * (val / 100);
  } else if (model === 'fee_pct') {
    operatorShare = totalDeductedFee * (val / 100);
  } else if (model === 'monthly_flat') {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyRate = (val * 12) / 365.25;
    operatorShare = dailyRate * nights;
  }

  // Cap operatorShare at totalDeductedFee to prevent negative partner share
  operatorShare = Math.min(totalDeductedFee, operatorShare);
  const partnerShare = Math.max(0, totalDeductedFee - operatorShare);

  return {
    operatorShare,
    partnerShare,
    hostPayout,
  };
};

const getFinancialBreakdown = (
  bookings: Booking[],
  commissionPct: number,
  groupBy: 'year' | 'month' | 'day' | 'none',
  partnerConfig: PartnerConfig
) => {
  if (groupBy === 'none') return [];
  
  const groups: Record<string, { period: string; bookingsCount: number; revenue: number; payouts: number; commission: number; partnerShare: number }> = {};
  
  const statsBookings = bookings.filter(b => 
    ['confirmed', 'checked_in', 'checked_out'].includes(b.status.toLowerCase())
  );
  
  statsBookings.forEach((b) => {
    const date = new Date(b.checkIn);
    let key = '';
    
    if (groupBy === 'year') {
      key = String(date.getFullYear());
    } else if (groupBy === 'month') {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    } else if (groupBy === 'day') {
      key = b.checkIn;
    }
    
    if (!groups[key]) {
      groups[key] = {
        period: key,
        bookingsCount: 0,
        revenue: 0,
        payouts: 0,
        commission: 0,
        partnerShare: 0
      };
    }
    
    const usdToAed = b.currency.toUpperCase() === 'USD' ? 3.6725 : 1.0;
    const bookingGross = Number(b.grossAmount || b.totalAmount) * usdToAed;
    const splits = calculateBookingSplits(bookingGross, b.checkIn, b.checkOut, commissionPct, partnerConfig);
    
    groups[key].bookingsCount += 1;
    groups[key].revenue += bookingGross;
    groups[key].commission += splits.operatorShare;
    groups[key].payouts += splits.hostPayout;
    groups[key].partnerShare += splits.partnerShare;
  });
  
  return Object.values(groups).sort((a, b) => {
    const dateA = new Date(a.period.includes(' ') ? `1 ${a.period}` : a.period);
    const dateB = new Date(b.period.includes(' ') ? `1 ${b.period}` : b.period);
    return dateB.getTime() - dateA.getTime(); // Latest first
  });
};

function formatCurrency(amount: string | number, currency = 'AED'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (['active', 'confirmed', 'completed', 'checked_in'].includes(s)) return COLORS.success;
  if (['pending', 'draft', 'in_progress'].includes(s)) return COLORS.warning;
  if (['cancelled', 'expired', 'overdue', 'inactive'].includes(s)) return COLORS.danger;
  return COLORS.info;
}

function priorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent': return COLORS.danger;
    case 'high': return '#f97316';
    case 'normal': case 'medium': return COLORS.info;
    case 'low': return COLORS.textMuted;
    default: return COLORS.textSecondary;
  }
}

function taskTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'cleaning': return '#8b5cf6';
    case 'check_in': return COLORS.success;
    case 'check_out': return COLORS.info;
    case 'maintenance': return COLORS.warning;
    case 'inspection': return '#ec4899';
    default: return COLORS.textSecondary;
  }
}

// ---------------------------------------------------------------------------
// Badge component
// ---------------------------------------------------------------------------

function Badge({
  label,
  color,
  filled = false,
}: {
  label: string;
  color: string;
  filled?: boolean;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        background: filled ? color : `${color}15`,
        color: filled ? '#fff' : color,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stat card for Financials tab
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  color = COLORS.accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ ...glassCard, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: '13px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: '24px', fontWeight: 700, color: COLORS.textPrimary }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type Tab = 'overview' | 'bookings' | 'tasks' | 'documents' | 'financials';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <Building2 size={16} /> },
  { key: 'bookings', label: 'Bookings', icon: <Calendar size={16} /> },
  { key: 'tasks', label: 'Tasks', icon: <ClipboardList size={16} /> },
  { key: 'documents', label: 'Documents', icon: <FileText size={16} /> },
  { key: 'financials', label: 'Financials', icon: <DollarSign size={16} /> },
];

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  // Date Filtering States
  const [selectedTermIndex, setSelectedTermIndex] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'none' | 'year' | 'month' | 'day'>('none');
  
  // Custom columns state loaded from local storage
  const [customColumns, setCustomColumns] = useState<Array<{ id: string; label: string }>>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hhs_custom_property_columns');
      if (saved) setCustomColumns(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load custom columns', e);
    }
  }, []);

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editFormData, setEditFormData] = useState({
    name: '', propertyType: 'Apartment', addressLine1: '', addressLine2: '', city: 'Dubai',
    state: '', country: 'United Arab Emirates', bedrooms: 1, bathrooms: 1, maxGuests: 2,
    areaSqm: '', description: '', dtcmPermitNumber: '', dtcmPermitExpiry: '', status: 'draft',
    managedSince: '', extraDetails: {} as any
  });

  const handleStartEdit = () => {
    if (!property) return;
    setEditError('');
    setEditFormData({
      name: property.name || '',
      propertyType: property.propertyType || 'Apartment',
      addressLine1: property.addressLine1 || '',
      addressLine2: property.addressLine2 || '',
      city: property.city || 'Dubai',
      state: property.state || '',
      country: property.country || 'United Arab Emirates',
      bedrooms: property.bedrooms || 1,
      bathrooms: property.bathrooms || 1,
      maxGuests: property.maxGuests || 2,
      areaSqm: property.areaSqm !== null && property.areaSqm !== undefined ? String(property.areaSqm) : '',
      description: property.description || '',
      dtcmPermitNumber: property.dtcmPermitNumber || '',
      dtcmPermitExpiry: property.dtcmPermitExpiry ? new Date(property.dtcmPermitExpiry).toISOString().substring(0, 10) : '',
      status: property.status || 'draft',
      managedSince: property.managedSince ? new Date(property.managedSince).toISOString().substring(0, 10) : '',
      extraDetails: property.extraDetails || {}
    });
    setShowEditModal(true);
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update property');
      }
      
      const refreshRes = await fetch(`/api/properties/${property.id}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setProperty(refreshData.property);
      }
      
      setShowEditModal(false);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  useEffect(() => {
    if (!params.id) return;
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/properties/${params.id}`);
        if (res.status === 404) {
          setError('Property not found');
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to load property');
        }
        const data = await res.json();
        setProperty(data.property);
      } catch (err: any) {
        setError(err.message || 'Error loading property');
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [params.id]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: `3px solid ${COLORS.border}`,
            borderTopColor: COLORS.accent,
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ color: COLORS.textMuted, fontSize: '14px' }}>Loading property details…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ---- Error / 404 state ----
  if (error || !property) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: `${COLORS.danger}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AlertCircle size={32} style={{ color: COLORS.danger }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: COLORS.textPrimary }}>
          {error === 'Property not found' ? 'Property Not Found' : 'Error Loading Property'}
        </h2>
        <p style={{ color: COLORS.textMuted, fontSize: '14px', maxWidth: '360px', textAlign: 'center' }}>
          {error === 'Property not found'
            ? 'The property you\'re looking for doesn\'t exist or has been removed.'
            : error || 'An unexpected error occurred.'}
        </p>
        <Link
          href="/dashboard/properties"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            background: `${COLORS.accent}15`,
            color: COLORS.accent,
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none',
            border: `1px solid ${COLORS.accentDim}`,
            transition: 'all 0.2s ease',
          }}
        >
          <ArrowLeft size={16} />
          Back to Properties
        </Link>
      </div>
    );
  }

  // ---- Computed values ----
  const ownerProperty = property.ownerProperties?.[0] ?? null;
  const amenitiesList: string[] = Array.isArray(property.amenities) ? property.amenities : [];
  const permitDays = daysUntil(property.dtcmPermitExpiry);
  const permitStatusColor =
    permitDays === null
      ? COLORS.textMuted
      : permitDays > 30
        ? COLORS.success
        : permitDays > 0
          ? COLORS.warning
          : COLORS.danger;
  const permitStatusLabel =
    permitDays === null
      ? 'No Permit'
      : permitDays > 30
        ? 'Active'
        : permitDays > 0
          ? 'Expiring Soon'
          : 'Expired';

  // ---- Contracts & Dynamic Financials ----
  const contracts = property ? getPropertyContracts(property) : [];
  const terms = property ? expandContractTerms(contracts) : [];

  let effectiveStartDate: string | null = null;
  let effectiveEndDate: string | null = null;

  if (selectedTermIndex === 'all') {
    effectiveStartDate = null;
    effectiveEndDate = null;
  } else if (selectedTermIndex === 'custom') {
    effectiveStartDate = customStartDate || null;
    effectiveEndDate = customEndDate || null;
  } else {
    const idx = Number(selectedTermIndex);
    if (terms[idx]) {
      effectiveStartDate = terms[idx].startDate;
      effectiveEndDate = terms[idx].endDate;
    }
  }

  const filteredBookings = property
    ? property.bookings.filter((b) => {
        if (effectiveStartDate && b.checkIn < effectiveStartDate) return false;
        if (effectiveEndDate && b.checkIn > effectiveEndDate) return false;
        return true;
      })
    : [];

  let commissionPct = 15.0;
  const splits = property.extraDetails?.ownerSplits || [];
  const mySplit = Array.isArray(splits) ? splits.find((s: any) => s.contactId === property.ownerContactId) : null;

  if (property) {
    if (mySplit?.commissionPct !== undefined && mySplit.commissionPct !== null) {
      commissionPct = Number(mySplit.commissionPct);
    } else if (property.owner?.bankDetails?.isIntermediary && property.linkedCommissionPct !== undefined && property.linkedCommissionPct !== null) {
      commissionPct = Number(property.linkedCommissionPct);
    } else if (property.extraDetails?.commissionPct !== undefined && property.extraDetails?.commissionPct !== null) {
      commissionPct = Number(property.extraDetails.commissionPct);
    } else if (property.owner?.bankDetails?.commissionPct !== undefined && property.owner?.bankDetails?.commissionPct !== null) {
      commissionPct = Number(property.owner.bankDetails.commissionPct);
    } else if (ownerProperty?.managementFeePct !== undefined && ownerProperty?.managementFeePct !== null) {
      commissionPct = Number(ownerProperty.managementFeePct);
    }
  }

  let partnerValue = Number(property.owner?.bankDetails?.partnerValue) || 0;
  if (mySplit && mySplit.partnerValue !== undefined && mySplit.partnerValue !== null) {
    partnerValue = Number(mySplit.partnerValue);
  }

  const hasLinkedPartner = !!property.linkedPartnerModel;

  const partnerConfig = {
    isIntermediary: !!property.owner?.bankDetails?.isIntermediary || hasLinkedPartner,
    partnerModel: hasLinkedPartner ? property.linkedPartnerModel : property.owner?.bankDetails?.partnerModel,
    partnerValue: hasLinkedPartner ? (property.linkedPartnerValue ?? 0) : partnerValue,
  };

  let totalRevenue = 0;
  let totalCommission = 0; // Operator Share
  let totalPartnerShare = 0; // Partner Share
  let ownerPayouts = 0; // Host Payout
  let totalOutstanding = 0;

  const statsBookings = filteredBookings.filter(b => 
    ['confirmed', 'checked_in', 'checked_out'].includes(b.status.toLowerCase())
  );

  for (const b of statsBookings) {
    const usdToAed = b.currency.toUpperCase() === 'USD' ? 3.6725 : 1.0;
    const bookingGross = Number(b.grossAmount || b.totalAmount) * usdToAed;
    const bookingTotal = Number(b.totalAmount) * usdToAed;

    const splits = calculateBookingSplits(bookingGross, b.checkIn, b.checkOut, commissionPct, partnerConfig);

    totalRevenue += bookingGross;
    totalCommission += splits.operatorShare;
    totalPartnerShare += splits.partnerShare;
    ownerPayouts += splits.hostPayout;

    const paymentsSum = (b.payments || []).reduce((sum: number, pay: any) => {
      const payUsdToAed = pay.currency.toUpperCase() === 'USD' ? 3.6725 : 1.0;
      return sum + (Number(pay.amount) * payUsdToAed);
    }, 0);

    let bookingOutstanding = Math.max(0, bookingTotal - paymentsSum);
    if (b.source === 'Airbnb') {
      bookingOutstanding = 0;
    }
    totalOutstanding += bookingOutstanding;
  }

  const dynamicFinancials = {
    totalRevenue,
    ownerPayouts,
    managementCommission: totalCommission,
    partnerShare: totalPartnerShare,
    outstanding: totalOutstanding,
  };

  // ---- Render ----
  const missingFields = property.extraDetails?.missingRequiredFields;
  const isIncomplete = Array.isArray(missingFields) && missingFields.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ===== HEADER ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            href="/dashboard/properties"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: COLORS.textMuted,
              fontSize: '13px',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textMuted)}
          >
            <ArrowLeft size={15} />
            Back to Properties
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: COLORS.textPrimary,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {property.name}
            </h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Badge label={property.propertyType} color={COLORS.accent} />
              <Badge label={property.status} color={statusColor(property.status)} />
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            width: 'auto',
            fontSize: '13px',
            padding: '10px 20px',
          }}
          onClick={handleStartEdit}
        >
          <Edit3 size={15} />
          Edit Property
        </button>
      </div>

      {/* ===== INCOMPLETE DETAILS BANNER ===== */}
      {isIncomplete && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'rgba(245, 158, 11, 0.06)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          color: '#f59e0b',
          fontSize: '13px',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, color: COLORS.textPrimary }}>Incomplete Property Details (Spreadsheet Import)</p>
              <p style={{ color: COLORS.textSecondary, fontSize: '12px', marginTop: '2px' }}>
                This property was imported with missing required fields: <strong style={{ color: COLORS.accent }}>{missingFields.map(f => f === 'addressLine1' ? 'Location' : f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}</strong>.
                You can fill these fields in directly inside the system to resolve the warning.
              </p>
            </div>
          </div>
          <button
            onClick={handleStartEdit}
            style={{
              padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
              background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b', fontSize: '11px', fontWeight: 600,
              fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)'; }}
          >
            Resolve Now
          </button>
        </div>
      )}

      {/* ===== INVALID LOCATION LINK BANNER ===== */}
      {property.extraDetails?.invalidLocationLink && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: COLORS.danger,
          fontSize: '13px',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, color: COLORS.textPrimary }}>Invalid Location / Google Maps Link</p>
              <p style={{ color: COLORS.textSecondary, fontSize: '12px', marginTop: '2px' }}>
                The scheduler cannot compute driving distances and routes for this property because the provided location link is invalid and cannot be resolved to coordinates.
              </p>
            </div>
          </div>
          <button
            onClick={handleStartEdit}
            style={{
              padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
              background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
              color: COLORS.danger, fontSize: '11px', fontWeight: 600,
              fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; }}
          >
            Fix Location Link
          </button>
        </div>
      )}

      {/* ===== TABS ===== */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: `1px solid ${COLORS.border}`,
          paddingBottom: '0',
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? COLORS.accent : COLORS.textMuted,
                background: isActive ? COLORS.accentGlow : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? COLORS.accent : 'transparent'}`,
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = COLORS.textSecondary;
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = COLORS.textMuted;
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== FILTER BAR ===== */}
      {property && (activeTab === 'bookings' || activeTab === 'financials') && (
        <div style={{
          ...glassCardCompact,
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'rgba(255, 255, 255, 0.015)',
          borderColor: 'rgba(212, 175, 55, 0.1)',
          padding: '12px 20px',
          marginTop: '-12px',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Filter by Contract:</span>
            <select
              value={selectedTermIndex}
              onChange={(e) => setSelectedTermIndex(e.target.value)}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '6px',
                padding: '6px 12px',
                color: COLORS.textPrimary,
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Time (No Filter)</option>
              {terms.map((t, idx) => (
                <option key={idx} value={String(idx)}>{t.label}</option>
              ))}
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {selectedTermIndex === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s' }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '6px',
                  padding: '5px 10px',
                  color: COLORS.textPrimary,
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '13px', color: COLORS.textMuted }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '6px',
                  padding: '5px 10px',
                  color: COLORS.textPrimary,
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {activeTab === 'financials' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Breakdown:</span>
              <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '2px', border: `1px solid ${COLORS.borderSubtle}` }}>
                {(['none', 'year', 'month', 'day'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setGroupBy(mode)}
                    style={{
                      background: groupBy === mode ? COLORS.accent : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      color: groupBy === mode ? '#000' : COLORS.textSecondary,
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textTransform: 'capitalize'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB CONTENT ===== */}
      {activeTab === 'overview' && (
        <OverviewTab 
          property={property} 
          amenitiesList={amenitiesList} 
          ownerProperty={ownerProperty} 
          permitDays={permitDays} 
          permitStatusColor={permitStatusColor} 
          permitStatusLabel={permitStatusLabel} 
          customColumns={customColumns}
        />
      )}
      {activeTab === 'bookings' && <BookingsTab bookings={filteredBookings} />}
      {activeTab === 'tasks' && <TasksTab tasks={property.tasks} />}
      {activeTab === 'documents' && <DocumentsTab count={property._count.documents} />}
      {activeTab === 'financials' && (
        <FinancialsTab 
          property={property} 
          financials={dynamicFinancials}
          bookings={filteredBookings}
          commissionPct={commissionPct}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
        />
      )}

      {/* ===== EDIT PROPERTY MODAL ===== */}
      {showEditModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowEditModal(false)}
        >
          <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '0',
              width: '90%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflow: 'auto',
              animation: 'slideUp 0.3s ease-out',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Edit Property</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Update holiday home details</p>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{
                background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%',
                width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-secondary)', transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateProperty} style={{ padding: '24px 28px' }}>
              {editError && (
                <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px' }}>
                  {editError}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Property Name</label>
                  <input type="text" className="form-input" placeholder="e.g. Burj Khalifa Luxury Residence Apt 304" value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Property Type</label>
                  <select className="form-input" value={editFormData.propertyType} onChange={e => setEditFormData({ ...editFormData, propertyType: e.target.value })}>
                    {['Apartment', 'Villa', 'Townhouse', 'Penthouse'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">City</label>
                  <select className="form-input" value={editFormData.city} onChange={e => setEditFormData({ ...editFormData, city: e.target.value })}>
                    {['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Check-in Type</label>
                  <select 
                    className="form-input" 
                    value={editFormData.extraDetails?.col_checkin_type || 'Self Check-in'} 
                    onChange={e => setEditFormData({ 
                      ...editFormData, 
                      extraDetails: { ...(editFormData.extraDetails || {}), col_checkin_type: e.target.value } 
                    })}
                    required
                  >
                    <option value="Self Check-in">Self Check-in</option>
                    <option value="Meet & Greet">Meet & Greet</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Location (Google Maps Link)</label>
                  <input type="text" className="form-input" placeholder="e.g. https://maps.google.com/?q=..." value={editFormData.addressLine1} onChange={e => setEditFormData({ ...editFormData, addressLine1: e.target.value })} required />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Address Line 2 (optional)</label>
                  <input type="text" className="form-input" placeholder="e.g. Near Dubai Mall" value={editFormData.addressLine2} onChange={e => setEditFormData({ ...editFormData, addressLine2: e.target.value })} />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Bedrooms</label>
                    <input type="number" min="0" className="form-input" value={editFormData.bedrooms} onChange={e => setEditFormData({ ...editFormData, bedrooms: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bathrooms</label>
                    <input type="number" min="0" className="form-input" value={editFormData.bathrooms} onChange={e => setEditFormData({ ...editFormData, bathrooms: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Guests</label>
                    <input type="number" min="1" className="form-input" value={editFormData.maxGuests} onChange={e => setEditFormData({ ...editFormData, maxGuests: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">DTCM Permit Number</label>
                  <input type="text" className="form-input" placeholder="e.g. PER-123-DTCM" value={editFormData.dtcmPermitNumber} onChange={e => setEditFormData({ ...editFormData, dtcmPermitNumber: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">DTCM Expiry Date</label>
                  <input type="date" className="form-input" value={editFormData.dtcmPermitExpiry} onChange={e => setEditFormData({ ...editFormData, dtcmPermitExpiry: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={editFormData.status} onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}>
                    {['active', 'onboarding', 'draft', 'inactive'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Managed Since</label>
                  <input type="date" className="form-input" value={editFormData.managedSince} onChange={e => setEditFormData({ ...editFormData, managedSince: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Description (optional)</label>
                  <textarea className="form-input" rows={3} placeholder="Brief description of the property..." value={editFormData.description} onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} style={{ resize: 'vertical', minHeight: '80px' }} />
                </div>

                {customColumns.length > 0 && (
                  <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', borderTop: '1px solid var(--border-color)', paddingTop: '18px', marginTop: '6px' }}>
                    <h4 style={{ gridColumn: 'span 2', fontSize: '14px', fontWeight: 600, color: COLORS.accent, margin: 0 }}>Additional Information</h4>
                    {customColumns.map(col => (
                      <div key={col.id} className="form-group">
                        <label className="form-label">{col.label}</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={`Enter ${col.label.toLowerCase()}`}
                          value={editFormData.extraDetails?.[col.id] || ''}
                          onChange={e => {
                            const updatedDetails = { ...(editFormData.extraDetails || {}) };
                            updatedDetails[col.id] = e.target.value;
                            setEditFormData({ ...editFormData, extraDetails: updatedDetails });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{
                  padding: '10px 24px', borderRadius: '10px',
                  border: '1px solid var(--border-color)', background: 'transparent',
                  color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} disabled={editSubmitting}>
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Overview Tab
// ===========================================================================

function OverviewTab({
  property,
  amenitiesList,
  ownerProperty,
  permitDays,
  permitStatusColor,
  permitStatusLabel,
  customColumns,
}: {
  property: Property;
  amenitiesList: string[];
  ownerProperty: OwnerPropertyLink | null;
  permitDays: number | null;
  permitStatusColor: string;
  permitStatusLabel: string;
  customColumns: Array<{ id: string; label: string }>;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'start' }}>
      {/* ---- Left Column ---- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Location */}
        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: `${COLORS.accent}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.accent,
              }}
            >
              <MapPin size={18} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>Location</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {property.addressLine1?.trim().startsWith('http') ? (
              <>
                <InfoRow label="Location" value={property.addressLine1} isInvalidLocation={!!property.extraDetails?.invalidLocationLink} />
                {property.addressLine2 && <InfoRow label="Address Line 2" value={property.addressLine2} />}
              </>
            ) : (
              <InfoRow label="Address" value={[property.addressLine1, property.addressLine2].filter(Boolean).join(', ')} isInvalidLocation={!!property.extraDetails?.invalidLocationLink} />
            )}
            <InfoRow label="City" value={property.city} />
            {property.state && <InfoRow label="State" value={property.state} />}
            <InfoRow label="Country" value={property.country} />
            {property.postalCode && <InfoRow label="Postal Code" value={property.postalCode} />}
            <InfoRow label="Check-in Type" value={property.extraDetails?.col_checkin_type || 'Self Check-in'} />
          </div>
        </div>

        {/* Property Specs */}
        <div style={glassCard}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary, margin: '0 0 16px 0' }}>
            Property Specifications
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <SpecItem icon={<Bed size={20} />} value={property.bedrooms} label="Bedrooms" />
            <SpecItem icon={<Bath size={20} />} value={property.bathrooms} label="Bathrooms" />
            <SpecItem icon={<Users size={20} />} value={property.maxGuests} label="Max Guests" />
            <SpecItem
              icon={<Building2 size={20} />}
              value={property.areaSqm ? `${property.areaSqm}` : '—'}
              label="Area (sqm)"
            />
          </div>
        </div>

        {/* Pictures Gallery */}
        {property.extraDetails?.pictures && Array.isArray(property.extraDetails.pictures) && property.extraDetails.pictures.length > 0 && (
          <div style={glassCard}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary, margin: '0 0 16px 0' }}>
              Property Pictures
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
              {property.extraDetails.pictures.map((pic: string, i: number) => (
                <div 
                  key={i} 
                  style={{ 
                    position: 'relative', 
                    borderRadius: '8px', 
                    overflow: 'hidden', 
                    aspectRatio: '1.5',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  onClick={() => window.open(pic, '_blank')}
                  title="Click to view full image"
                >
                  <img src={pic} alt={`Property ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {property.description && (
          <div style={glassCard}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary, margin: '0 0 12px 0' }}>
              Description
            </h3>
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: COLORS.textSecondary, margin: 0 }}>
              {property.description}
            </p>
          </div>
        )}

        {/* Amenities */}
        {amenitiesList.length > 0 && (
          <div style={glassCard}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary, margin: '0 0 14px 0' }}>
              Amenities
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {amenitiesList.map((amenity, i) => (
                <span
                  key={i}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: `${COLORS.accent}10`,
                    color: COLORS.accent,
                    border: `1px solid ${COLORS.accentDim}`,
                  }}
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Additional Details (Custom Columns) */}
        {customColumns.length > 0 && (
          <div style={glassCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: `${COLORS.accent}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.accent,
                }}
              >
                <FileText size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>Additional Details</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {customColumns.map(col => (
                <InfoRow 
                  key={col.id} 
                  label={col.label} 
                  value={property.extraDetails?.[col.id] || '—'} 
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---- Right Column ---- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Owner Info */}
        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: `${COLORS.info}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.info,
              }}
            >
              <Users size={18} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
              {property.owner?.bankDetails?.isIntermediary ? "Intermediary Partner Info" : "Owner Information"}
            </h3>
          </div>
          {property.owner ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {property.owner.bankDetails?.isIntermediary ? (
                <>
                  <InfoRow label="Host Type" value="Intermediary Partner (Company)" />
                  {property.owner.companyName && <InfoRow label="Company Name" value={property.owner.companyName} />}
                  {property.owner.trn && <InfoRow label="TRN" value={property.owner.trn} />}
                  <InfoRow label="Contact Person" value={`${property.owner.firstName} ${property.owner.lastName}`} />
                  {property.owner.email && <InfoRow label="Email" value={property.owner.email} />}
                  {property.owner.phone && <InfoRow label="Phone" value={property.owner.phone} />}
                  {(() => {
                    let commissionPct = 15.0;
                    if (property.extraDetails?.commissionPct !== undefined && property.extraDetails?.commissionPct !== null) {
                      commissionPct = Number(property.extraDetails.commissionPct);
                    } else if (property.owner?.bankDetails?.commissionPct !== undefined && property.owner?.bankDetails?.commissionPct !== null) {
                      commissionPct = Number(property.owner.bankDetails.commissionPct);
                    } else if (ownerProperty?.managementFeePct !== undefined && ownerProperty?.managementFeePct !== null) {
                      commissionPct = Number(ownerProperty.managementFeePct);
                    }

                    const model = property.owner.bankDetails.partnerModel;
                    const val = property.owner.bankDetails.partnerValue;
                    let modelLabel = '—';
                    if (model === 'gross_pct') {
                      modelLabel = `${val}% of Gross Bookings`;
                    } else if (model === 'fee_pct') {
                      modelLabel = `${val}% of Partner's Fee (${commissionPct}%)`;
                    } else if (model === 'monthly_flat') {
                      modelLabel = `AED ${val} monthly flat fee / property`;
                    }
                    return <InfoRow label="Operator Commercial Model" value={modelLabel} />;
                  })()}
                </>
              ) : (
                <>
                  {property.owner.companyName && <InfoRow label="Company Name" value={property.owner.companyName} />}
                  {property.owner.trn && <InfoRow label="TRN" value={property.owner.trn} />}
                  <InfoRow label="Name" value={`${property.owner.firstName} ${property.owner.lastName}`} />
                  {property.owner.email && <InfoRow label="Email" value={property.owner.email} />}
                  {property.owner.phone && <InfoRow label="Phone" value={property.owner.phone} />}
                  {ownerProperty && (
                    <>
                      <InfoRow label="Ownership" value={`${ownerProperty.ownershipPercentage}%`} />
                      <InfoRow label="Management Fee" value={`${ownerProperty.managementFeePct}%`} />
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <p style={{ color: COLORS.textMuted, fontSize: '13px', margin: 0 }}>No owner assigned</p>
          )}
        </div>

        {/* DTCM Permit */}
        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: `${permitStatusColor}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: permitStatusColor,
              }}
            >
              <Shield size={18} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>DTCM Permit</h3>
          </div>
          {property.dtcmPermitNumber ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <InfoRow label="Permit Number" value={property.dtcmPermitNumber} />
              <InfoRow label="Expiry Date" value={formatDate(property.dtcmPermitExpiry)} />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: `${permitStatusColor}10`,
                  border: `1px solid ${permitStatusColor}25`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {permitDays !== null && permitDays > 0 ? (
                    <CheckCircle size={16} style={{ color: permitStatusColor }} />
                  ) : (
                    <AlertCircle size={16} style={{ color: permitStatusColor }} />
                  )}
                  <span style={{ fontSize: '13px', fontWeight: 600, color: permitStatusColor }}>
                    {permitStatusLabel}
                  </span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: permitStatusColor }}>
                  {permitDays !== null ? (permitDays > 0 ? `${permitDays} days remaining` : `${Math.abs(permitDays)} days overdue`) : '—'}
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                borderRadius: '10px',
                border: `1px dashed ${COLORS.warning}30`,
                background: `${COLORS.warning}08`,
              }}
            >
              <AlertCircle size={16} style={{ color: COLORS.warning }} />
              <span style={{ fontSize: '13px', color: COLORS.warning }}>No DTCM permit registered</span>
            </div>
          )}
        </div>

        {/* Manager Assignments */}
        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: `${COLORS.accent}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.accent,
              }}
            >
              <ClipboardList size={18} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
              Manager Assignments
            </h3>
          </div>
          {property.managerAssignments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {property.managerAssignments.map((ma) => (
                <div
                  key={ma.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${COLORS.borderSubtle}`,
                  }}
                >
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary }}>
                      {ma.user ? `${ma.user.firstName} ${ma.user.lastName}` : 'Unknown User'}
                    </span>
                    {ma.user?.email && (
                      <span style={{ display: 'block', fontSize: '12px', color: COLORS.textMuted }}>{ma.user.email}</span>
                    )}
                  </div>
                  {ma.isPrimary && <Badge label="Primary" color={COLORS.accent} />}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: COLORS.textMuted, fontSize: '13px', margin: 0 }}>No managers assigned</p>
          )}
        </div>

        {/* Managed Since */}
        {property.managedSince && (
          <div style={glassCardCompact}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={16} style={{ color: COLORS.accent }} />
              <span style={{ fontSize: '13px', color: COLORS.textMuted }}>Managed since</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textPrimary }}>
                {formatDate(property.managedSince)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Bookings Tab
// ===========================================================================

function BookingsTab({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={40} />}
        title="No Bookings Yet"
        description="Bookings for this property will appear here."
      />
    );
  }

  return (
    <div style={glassCard}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Guest', 'Source', 'Check-in', 'Check-out', 'Amount', 'Status'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 16px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: COLORS.textMuted,
                    textAlign: 'left',
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const guestName = b.guestName || (b.guest ? `${b.guest.firstName} ${b.guest.lastName}` : '—');
              const bookingStatusColor =
                b.status === 'confirmed'
                  ? COLORS.success
                  : b.status === 'pending'
                    ? COLORS.warning
                    : b.status === 'cancelled'
                      ? COLORS.danger
                      : b.status === 'checked_in'
                        ? COLORS.info
                        : COLORS.textMuted;

              return (
                <tr
                  key={b.id}
                  style={{
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}>{guestName}</td>
                  <td style={tdStyle}>
                    <Badge label={b.source} color={COLORS.info} />
                  </td>
                  <td style={tdStyle}>{formatDate(b.checkIn)}</td>
                  <td style={tdStyle}>{formatDate(b.checkOut)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: COLORS.textPrimary }}>
                    {formatCurrency(b.totalAmount, b.currency)}
                  </td>
                  <td style={tdStyle}>
                    <Badge label={b.status.replace('_', ' ')} color={bookingStatusColor} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: '13px',
  color: COLORS.textSecondary,
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
};

// ===========================================================================
// Tasks Tab
// ===========================================================================

function TasksTab({ tasks }: { tasks: Task[] }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={40} />}
        title="No Tasks Yet"
        description="Tasks assigned to this property will appear here."
      />
    );
  }

  // Get unique task types dynamically from tasks list
  const uniqueTypes = Array.from(new Set(tasks.map((t) => t.taskType))).sort();

  // Filter tasks based on status, type, and search query
  const filteredTasks = tasks.filter((t) => {
    // Search query filter
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.taskType.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Status/completion filter
    if (statusFilter !== 'all') {
      const s = t.status.toLowerCase();
      if (statusFilter === 'completed') {
        if (s !== 'completed' && s !== 'verified') return false;
      } else if (statusFilter === 'pending') {
        if (s !== 'pending' && s !== 'assigned' && s !== 'in_progress') return false;
      } else if (statusFilter === 'cancelled') {
        if (s !== 'cancelled') return false;
      }
    }
    // Task type filter
    if (typeFilter !== 'all' && t.taskType !== typeFilter) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters Bar */}
      <div style={{
        ...glassCardCompact,
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        background: 'rgba(255, 255, 255, 0.015)',
        borderColor: 'rgba(212, 175, 55, 0.1)',
        padding: '12px 20px',
        borderRadius: '12px'
      }}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px' }}>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '6px',
              padding: '6px 12px',
              color: COLORS.textPrimary,
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Completion Status Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Completion:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '6px',
              padding: '6px 12px',
              color: COLORS.textPrimary,
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending / Active</option>
            <option value="completed">Completed / Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Task Type Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Task Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '6px',
              padding: '6px 12px',
              color: COLORS.textPrimary,
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery !== '') && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setTypeFilter('all');
              setSearchQuery('');
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(212, 175, 55, 0.1)',
              border: `1px solid ${COLORS.border}`,
              color: COLORS.accent,
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)'}
          >
            Clear Filters
          </button>
        )}

        {/* Task Counter */}
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: COLORS.textMuted }}>
          Showing <strong>{filteredTasks.length}</strong> of <strong>{tasks.length}</strong> tasks
        </div>
      </div>

      {/* Tasks Table */}
      <div style={glassCard}>
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={40} />}
            title="No Matching Tasks"
            description="Adjust your filters or query to find the tasks you are looking for."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Title', 'Type', 'Priority', 'Due Date', 'Status'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: COLORS.textMuted,
                        textAlign: 'left',
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <tr
                    key={t.id}
                    style={{ transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, fontWeight: 500, color: COLORS.textPrimary }}>{t.title}</td>
                    <td style={tdStyle}>
                      <Badge label={t.taskType.replace('_', ' ')} color={taskTypeColor(t.taskType)} />
                    </td>
                    <td style={tdStyle}>
                      <Badge label={t.priority} color={priorityColor(t.priority)} />
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} style={{ color: COLORS.textMuted }} />
                        {formatDate(t.dueDate)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <Badge label={t.status.replace('_', ' ')} color={statusColor(t.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Documents Tab
// ===========================================================================

function DocumentsTab({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          ...glassCardCompact,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            background: `${COLORS.accent}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.accent,
          }}
        >
          <FileText size={20} />
        </div>
        <div>
          <span style={{ fontSize: '22px', fontWeight: 700, color: COLORS.textPrimary }}>{count}</span>
          <span style={{ fontSize: '13px', color: COLORS.textMuted, marginLeft: '8px' }}>
            document{count !== 1 ? 's' : ''} on file
          </span>
        </div>
      </div>

      {count === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="No Documents"
          description="Property documents such as contracts, permits, and agreements will appear here."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
            <div
              key={i}
              style={{
                ...glassCardCompact,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.bgCardHover;
                e.currentTarget.style.borderColor = COLORS.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.bgCard;
                e.currentTarget.style.borderColor = COLORS.border;
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: `${COLORS.info}12`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.info,
                  flexShrink: 0,
                }}
              >
                <FileText size={18} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: COLORS.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Document {i + 1}
                </span>
                <span style={{ fontSize: '11px', color: COLORS.textMuted }}>View document</span>
              </div>
              <ExternalLink size={14} style={{ color: COLORS.textMuted, marginLeft: 'auto', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Financials Tab
// ===========================================================================

function FinancialsTab({
  property,
  financials,
  bookings,
  commissionPct,
  groupBy,
  setGroupBy,
}: {
  property: Property;
  financials: {
    totalRevenue: number;
    ownerPayouts: number;
    managementCommission: number;
    outstanding: number;
    partnerShare?: number;
  };
  bookings: Booking[];
  commissionPct: number;
  groupBy: 'none' | 'year' | 'month' | 'day';
  setGroupBy: (mode: 'none' | 'year' | 'month' | 'day') => void;
}) {
  const isIntermediary = !!property.owner?.bankDetails?.isIntermediary;
  const hasLinkedPartner = !!property.linkedPartnerModel;
  const showSplit = isIntermediary || hasLinkedPartner;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <StatCard
          icon={<DollarSign size={20} />}
          label="Total Revenue"
          value={formatCurrency(financials.totalRevenue)}
          color={COLORS.success}
        />
        <StatCard
          icon={<Users size={20} />}
          label={isIntermediary ? "Host Payout" : "Owner Payouts"}
          value={formatCurrency(financials.ownerPayouts)}
          color={COLORS.info}
        />
        {showSplit && (
          <StatCard
            icon={<Users size={20} />}
            label={hasLinkedPartner ? "Stay Local Net Share" : "Partner Share"}
            value={formatCurrency(financials.partnerShare || 0)}
            color="#8b5cf6"
          />
        )}
        <StatCard
          icon={<Building2 size={20} />}
          label={
            hasLinkedPartner
              ? "Airbetter Share"
              : isIntermediary
              ? "Operator Share"
              : "Management Commission"
          }
          value={formatCurrency(financials.managementCommission)}
          color={COLORS.accent}
        />
        <StatCard
          icon={<AlertCircle size={20} />}
          label="Outstanding"
          value={formatCurrency(financials.outstanding)}
          color={COLORS.warning}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Calendar size={16} style={{ color: COLORS.accent }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
              Booking Activity
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: COLORS.textPrimary }}>
              {bookings.length}
            </span>
            <span style={{ fontSize: '13px', color: COLORS.textMuted }}>filtered bookings</span>
          </div>
        </div>

        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Wrench size={16} style={{ color: COLORS.warning }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
              Maintenance
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: COLORS.textPrimary }}>
              {property._count.maintenanceRequests}
            </span>
            <span style={{ fontSize: '13px', color: COLORS.textMuted }}>maintenance requests</span>
          </div>
        </div>
      </div>

      {groupBy !== 'none' && (
        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <ClipboardList size={16} style={{ color: COLORS.accent }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
              Financial Performance Breakdown ({groupBy})
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {(property.linkedPartnerModel
                    ? ['Period', 'Bookings', 'Total Revenue', 'Owner Payout', 'Stay Local Net Share', 'Airbetter Share']
                    : isIntermediary
                    ? ['Period', 'Bookings', 'Total Revenue', 'Host Payout', 'Partner Share', 'Operator Share']
                    : ['Period', 'Bookings', 'Total Revenue', 'Owner Payout', 'Management Fee']
                  ).map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: COLORS.textMuted,
                        textAlign: 'left',
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getFinancialBreakdown(bookings, commissionPct, groupBy, {
                  isIntermediary: isIntermediary || hasLinkedPartner,
                  partnerModel: hasLinkedPartner ? property.linkedPartnerModel : property.owner?.bankDetails?.partnerModel,
                  partnerValue: hasLinkedPartner ? (property.linkedPartnerValue ?? 0) : (property.owner?.bankDetails?.partnerValue ?? 0),
                }).map((row) => (
                  <tr
                    key={row.period}
                    style={{ transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600, color: COLORS.textPrimary }}>{row.period}</td>
                    <td style={tdStyle}>{row.bookingsCount}</td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: COLORS.success }}>
                      {formatCurrency(row.revenue)}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: COLORS.info }}>
                      {formatCurrency(row.payouts)}
                    </td>
                    {(isIntermediary || hasLinkedPartner) && (
                      <td style={{ ...tdStyle, fontWeight: 500, color: '#8b5cf6' }}>
                        {formatCurrency(row.partnerShare || 0)}
                      </td>
                    )}
                    <td style={{ ...tdStyle, fontWeight: 500, color: COLORS.accent }}>
                      {formatCurrency(row.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Shared small components
// ===========================================================================

function InfoRow({ label, value, isInvalidLocation = false }: { label: string; value: string; isInvalidLocation?: boolean }) {
  const isUrl = value?.trim().startsWith('http://') || value?.trim().startsWith('https://');
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ fontSize: '13px', color: COLORS.textMuted }}>{label}</span>
      {isUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ fontSize: '13px', fontWeight: 500, color: isInvalidLocation ? COLORS.danger : COLORS.accent, textDecoration: 'underline', textAlign: 'right' }}
          >
            Open Link 🔗
          </a>
          {isInvalidLocation && (
            <span style={{ color: COLORS.danger, fontSize: '12px', fontWeight: 600 }}>⚠️ Invalid link for scheduler</span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: COLORS.textPrimary, textAlign: 'right' }}>{value}</span>
          {isInvalidLocation && (
            <span style={{ color: COLORS.danger, fontSize: '12px', fontWeight: 600 }}>⚠️ Invalid link for scheduler</span>
          )}
        </div>
      )}
    </div>
  );
}

function SpecItem({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '16px 8px',
        background: 'rgba(255,255,255,0.015)',
        borderRadius: '12px',
        border: `1px solid ${COLORS.borderSubtle}`,
      }}
    >
      <div style={{ color: COLORS.accent }}>{icon}</div>
      <span style={{ fontSize: '20px', fontWeight: 700, color: COLORS.textPrimary }}>{value}</span>
      <span style={{ fontSize: '11px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        borderRadius: '16px',
        border: `1px dashed ${COLORS.border}`,
        background: 'rgba(255,255,255,0.01)',
        gap: '16px',
      }}
    >
      <div style={{ color: COLORS.accent, opacity: 0.6 }}>{icon}</div>
      <h3 style={{ fontSize: '17px', fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>{title}</h3>
      <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0, textAlign: 'center', maxWidth: '300px' }}>
        {description}
      </p>
    </div>
  );
}
