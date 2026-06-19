'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  LayoutGrid, 
  List, 
  Edit, 
  Trash2, 
  X,
  User,
  Wrench
} from 'lucide-react';
import { Property, Booking } from '@/components/bookings/BookingsList';
import { translateText, TranslationAssistant } from '@/lib/translations';

export function formatPropertyName(name: string): string {
  if (!name) return '';
  let cleanName = name.trim();
  
  if (cleanName.startsWith('http://') || cleanName.startsWith('https://')) {
    try {
      const url = new URL(cleanName);
      if (url.hostname.includes('google') && url.pathname.includes('/place/')) {
        const parts = url.pathname.split('/place/');
        if (parts[1]) {
          const placeName = parts[1].split('/')[0];
          if (placeName) {
            return decodeURIComponent(placeName.replace(/\+/g, ' '));
          }
        }
      }
      if (url.hostname === 'maps.app.goo.gl') {
        return `Map Link (${url.pathname.replace(/^\//, '')})`;
      }
      return `Link: ${url.hostname}${url.pathname.substring(0, 15)}...`;
    } catch (e) {}
  }
  
  if (cleanName.length > 35) {
    return cleanName.substring(0, 35) + '...';
  }
  return cleanName;
}

export interface Issue {
  id: string;
  propertyId: string;
  propertyName: string;
  guestName: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved';
  dateReported: string;
  assigneeId: string;
  assigneeName: string;
  notes: string;
}

export interface Staff {
  id: string;
  name: string;
  roles: string[];
  has_car: boolean;
  start_time_mins: number;
  end_time_mins: number;
}

interface ReservationsProps {
  properties: Property[];
  bookings: Booking[];
  issues: Issue[];
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  staff: Staff[];
  orgId?: string;
  currentLanguage?: string;
  aiTranslationEnabled?: boolean;
  onTriggerWhatsApp?: () => void;
}

export default function Reservations({
  properties = [],
  bookings = [],
  issues = [],
  setIssues,
  staff = [],
  orgId = '',
  currentLanguage = 'en',
  aiTranslationEnabled = true,
  onTriggerWhatsApp
}: ReservationsProps) {
  
  const t = (key: string) => translateText(key, currentLanguage);

  // States
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [guestFilter, setGuestFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  // Property search in modal
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  useEffect(() => {
    if (!showAddModal && !showEditModal) {
      setPropertySearchQuery('');
    }
  }, [showAddModal, showEditModal]);

  // Form Fields
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedGuestName, setSelectedGuestName] = useState('');
  const [isGuestLinked, setIsGuestLinked] = useState(false);
  const [reportedDate, setReportedDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueSeverity, setIssueSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Medium');
  const [issueStatus, setIssueStatus] = useState<'Open' | 'In Progress' | 'Resolved'>('Open');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueNotes, setIssueNotes] = useState('');

  // Memoized unique guest list for filter dropdown
  const uniqueGuests = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];
    const guests = new Set<string>();
    bookings.forEach(b => {
      if (b.guest_name && b.guest_name.trim()) {
        guests.add(b.guest_name.trim());
      }
    });
    return Array.from(guests).sort((a, b) => a.localeCompare(b));
  }, [bookings]);

  // Properties mapping for filter dropdown
  const propertyDropdownOptions = useMemo(() => {
    const list = [{ id: 'all', name: t('All Properties') }];
    properties.forEach(p => {
      list.push({ id: p.id, name: formatPropertyName(p.name) });
    });
    return list;
  }, [properties, currentLanguage]);

  // Guests mapping for filter dropdown
  const guestDropdownOptions = useMemo(() => {
    const list = [
      { id: 'all', name: t('All Guests') },
      { id: 'internal', name: 'Staff / Internal (No Guest)' }
    ];
    uniqueGuests.forEach(g => {
      list.push({ id: g, name: g });
    });
    return list;
  }, [uniqueGuests, currentLanguage]);

  // Map of properties id -> name
  const propertyNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    properties.forEach(p => {
      map[p.id] = formatPropertyName(p.name);
    });
    return map;
  }, [properties]);

  // Filter bookings by selected property for the form link
  const linkedBookings = useMemo(() => {
    if (!selectedPropertyId || !bookings) return [];
    return bookings.filter(b => b.property_id === selectedPropertyId && b.status !== 'cancelled');
  }, [selectedPropertyId, bookings]);

  // Unique guest names list for linking in form
  const propertyGuests = useMemo(() => {
    const guests = new Set<string>();
    linkedBookings.forEach(b => {
      if (b.guest_name && b.guest_name.trim()) {
        guests.add(b.guest_name.trim());
      }
    });
    return Array.from(guests).sort((a, b) => a.localeCompare(b));
  }, [linkedBookings]);

  // Handle property change in issue form
  const handlePropertyFormChange = (pId: string) => {
    setSelectedPropertyId(pId);
    setSelectedGuestName('');
    setIsGuestLinked(false);
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = issues.length;
    const active = issues.filter(i => i.status !== 'Resolved').length;
    const highAndCritical = issues.filter(i => (i.severity === 'High' || i.severity === 'Critical') && i.status !== 'Resolved').length;
    const resolved = issues.filter(i => i.status === 'Resolved').length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 100;
    return { total, active, highAndCritical, resolved, rate };
  }, [issues]);

  // Filter & Search Incidents
  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      const matchProperty = propertyFilter === 'all' || i.propertyId === propertyFilter;
      let matchGuest = true;
      if (guestFilter === 'internal') {
        matchGuest = i.guestName === 'Staff / Internal';
      } else if (guestFilter !== 'all') {
        matchGuest = i.guestName === guestFilter;
      }
      const matchStatus = statusFilter === 'all' || i.status === statusFilter;
      const matchSeverity = severityFilter === 'all' || i.severity === severityFilter;
      
      const query = searchQuery.trim().toLowerCase();
      const matchSearch = query === '' ||
        (i.description || '').toLowerCase().includes(query) ||
        (i.guestName || '').toLowerCase().includes(query) ||
        (i.propertyName || '').toLowerCase().includes(query) ||
        (i.assigneeName || '').toLowerCase().includes(query) ||
        (i.notes || '').toLowerCase().includes(query);
        
      return matchProperty && matchGuest && matchStatus && matchSeverity && matchSearch;
    }).sort((a, b) => new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime());
  }, [issues, propertyFilter, guestFilter, statusFilter, severityFilter, searchQuery]);

  // Open Form modal to Add
  const openAddIssueModal = () => {
    // Default to empty so user must explicitly pick a property (prevents all issues going to first property)
    setSelectedPropertyId('');
    setSelectedGuestName('');
    setIsGuestLinked(false);
    setReportedDate(new Date().toISOString().split('T')[0]);
    setIssueSeverity('Medium');
    setIssueStatus('Open');
    setAssigneeId('');
    setAssigneeName('');
    setIssueDescription('');
    setIssueNotes('');
    setPropertySearchQuery('');
    setShowAddModal(true);
  };

  // Open Form modal to Edit
  const openEditIssueModal = (issue: Issue) => {
    setActiveIssue(issue);
    setSelectedPropertyId(issue.propertyId);
    setSelectedGuestName(issue.guestName);
    setReportedDate(issue.dateReported);
    setIssueSeverity(issue.severity);
    setIssueStatus(issue.status);
    setAssigneeId(issue.assigneeId || '');
    setAssigneeName(issue.assigneeName || '');
    setIssueDescription(issue.description);
    setIssueNotes(issue.notes || '');
    setIsGuestLinked(issue.guestName !== 'Staff / Internal');
    setShowEditModal(true);
  };

  // Push issue to scheduler task list so it shows on the schedule
  const pushIssueToScheduler = (issue: Issue, orgId?: string) => {
    if (!issue.assigneeId || !issue.propertyId) return;
    try {
      const suffix = orgId ? `_${orgId}` : '';
      const key = `hhs_tasks${suffix}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      // Remove old task for this issue if it exists
      const filtered = existing.filter((t: any) => t.source_issue_id !== issue.id);
      // Build a Maintenance task for the scheduler
      const task = {
        id: `issue_task_${issue.id}`,
        source_issue_id: issue.id,
        property_id: issue.propertyId,
        task_type: 'Maintenance',
        required_roles: ['Handyman'],
        priority: issue.severity === 'Critical' ? 1 : issue.severity === 'High' ? 1 : 2,
        target_day: issue.dateReported === new Date().toISOString().split('T')[0] ? 'today' : null,
        assigned_date: issue.dateReported || null,
        time_window_start_mins: 480,
        time_window_end_mins: 1200,
        notes: `[Issue] ${issue.description}${issue.notes ? ' | ' + issue.notes : ''}`,
        preferred_staff_id: issue.assigneeId,
        preferred_staff_name: issue.assigneeName,
        duration_mins: 60
      };
      localStorage.setItem(key, JSON.stringify([...filtered, task]));
      // Dispatch event so Scheduler re-reads if it's open in the same tab
      window.dispatchEvent(new StorageEvent('storage', { key }));
    } catch (err) {
      console.error('Failed to push issue to scheduler:', err);
    }
  };

  // Remove issue task from scheduler when issue is deleted or resolved
  const removeIssueFromScheduler = (issueId: string, orgId?: string) => {
    try {
      const suffix = orgId ? `_${orgId}` : '';
      const key = `hhs_tasks${suffix}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = existing.filter((t: any) => t.source_issue_id !== issueId);
      localStorage.setItem(key, JSON.stringify(filtered));
      window.dispatchEvent(new StorageEvent('storage', { key }));
    } catch (err) {
      console.error('Failed to remove issue from scheduler:', err);
    }
  };

  // Handle Save New Issue
  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) {
      alert('Please select a property unit.');
      return;
    }
    if (!issueDescription.trim()) {
      alert('Please enter an issue description.');
      return;
    }
    const newIssue: Issue = {
      id: 'issue-' + Date.now(),
      propertyId: selectedPropertyId,
      propertyName: propertyNameMap[selectedPropertyId] || 'Unknown Property',
      guestName: isGuestLinked ? selectedGuestName || 'Unknown Guest' : 'Staff / Internal',
      description: issueDescription.trim(),
      severity: issueSeverity,
      status: issueStatus,
      dateReported: reportedDate,
      assigneeId: assigneeId || '',
      assigneeName: assigneeName || '',
      notes: issueNotes.trim()
    };
    setIssues(prev => [newIssue, ...prev]);
    // Push to scheduler if an assignee was set
    if (assigneeId) {
      pushIssueToScheduler(newIssue, orgId);
    }
    setShowAddModal(false);
  };

  // Handle Update Issue
  const handleUpdateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue) return;
    if (!issueDescription.trim()) {
      alert('Please enter an issue description.');
      return;
    }
    const updatedIssue: Issue = {
      ...activeIssue,
      propertyId: selectedPropertyId,
      propertyName: propertyNameMap[selectedPropertyId] || 'Unknown Property',
      guestName: isGuestLinked ? selectedGuestName || 'Unknown Guest' : 'Staff / Internal',
      description: issueDescription.trim(),
      severity: issueSeverity,
      status: issueStatus,
      dateReported: reportedDate,
      assigneeId: assigneeId || '',
      assigneeName: assigneeName || '',
      notes: issueNotes.trim()
    };
    setIssues(prev => prev.map(item => item.id === activeIssue.id ? updatedIssue : item));
    // Sync to scheduler
    if (assigneeId) {
      pushIssueToScheduler(updatedIssue, orgId);
    } else {
      // Assignee removed — take it off the schedule
      removeIssueFromScheduler(activeIssue.id, orgId);
    }
    setShowEditModal(false);
    setActiveIssue(null);
  };

  // Direct Resolve Button action
  const handleResolveIssue = (id: string) => {
    setIssues(prev => prev.map(item => item.id === id ? {
      ...item,
      status: 'Resolved' as const
    } : item));
  };

  // Delete Action
  const handleDeleteIssue = (id: string) => {
    if (window.confirm('Are you sure you want to delete this reported issue?')) {
      setIssues(prev => prev.filter(item => item.id !== id));
      removeIssueFromScheduler(id, orgId);
    }
  };

  // Get style colors by severity
  const getSeverityStyle = (sev: string, isBorderLeft = false) => {
    switch (sev) {
      case 'Critical':
        return isBorderLeft ? '5px solid #ef4444' : {
          bg: 'rgba(239, 68, 68, 0.15)',
          text: '#ef4444',
          border: 'rgba(239, 68, 68, 0.3)',
          glow: '0 0 12px rgba(239, 68, 68, 0.2)'
        };
      case 'High':
        return isBorderLeft ? '5px solid #f97316' : {
          bg: 'rgba(249, 115, 22, 0.15)',
          text: '#f97316',
          border: 'rgba(249, 115, 22, 0.3)',
          glow: 'none'
        };
      case 'Medium':
        return isBorderLeft ? '5px solid #6366f1' : {
          bg: 'rgba(99, 102, 241, 0.15)',
          text: '#818cf8',
          border: 'rgba(99, 102, 241, 0.3)',
          glow: 'none'
        };
      default:
        return isBorderLeft ? '5px solid #94a3b8' : {
          bg: 'rgba(148, 163, 184, 0.15)',
          text: '#94a3b8',
          border: 'rgba(148, 163, 184, 0.3)',
          glow: 'none'
        };
    }
  };

  // Get style colors by status
  const getStatusStyle = (stat: string) => {
    switch (stat) {
      case 'Resolved':
        return {
          bg: 'rgba(45, 212, 172, 0.15)',
          text: '#2dd4af',
          border: 'rgba(45, 212, 172, 0.3)'
        };
      case 'In Progress':
        return {
          bg: 'rgba(167, 139, 250, 0.15)',
          text: '#c084fc',
          border: 'rgba(167, 139, 250, 0.3)'
        };
      default:
        return {
          bg: 'rgba(251, 191, 36, 0.15)',
          text: '#fbbf24',
          border: 'rgba(251, 191, 36, 0.3)'
        };
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Update staff assignee name when assigneeId changes in form
  const handleAssigneeIdChange = (id: string) => {
    setAssigneeId(id);
    const selectedStaff = staff.find(s => s.id === id);
    setAssigneeName(selectedStaff ? selectedStaff.name : '');
  };

  return (
    <div style={{ padding: '2rem', minHeight: '100%', color: 'var(--text-primary)', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Platform Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            🛎️ {t('Reservations Platform')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Coordinate guest concerns, track unit maintenance, and resolve reported issues in real time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {onTriggerWhatsApp && (
            <button
              onClick={onTriggerWhatsApp}
              style={{
                background: '#25D366',
                color: 'white',
                border: 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              💬 WhatsApp Import
            </button>
          )}
          <button
            onClick={openAddIssueModal}
            style={{
              background: 'linear-gradient(135deg, var(--brand-pink) 0%, var(--brand-pink-light) 100%)',
              color: 'white',
              border: 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(240, 59, 106, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Plus size={16} />
            Report Unit Issue
          </button>
        </div>
      </div>

      {/* KPI Cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Card 1 */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Concerns
            </span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <MessageSquare size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{kpis.total}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>All reported unit incidents</div>
        </div>

        {/* Card 2 */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Issues
            </span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(251, 191, 36, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>{kpis.active}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>Pending resolution</div>
        </div>

        {/* Card 3 */}
        <div className="glass-card" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: kpis.highAndCritical > 0 ? '0 0 15px rgba(239, 68, 68, 0.15)' : 'none',
          border: kpis.highAndCritical > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-glass)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Critical / High
            </span>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              animation: kpis.highAndCritical > 0 ? 'pulse 2s infinite' : 'none'
            }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{kpis.highAndCritical}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>Require immediate dispatch</div>
        </div>

        {/* Card 4 */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Resolution Rate
            </span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(45, 212, 172, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>{kpis.rate}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{kpis.resolved} resolved cases</div>
        </div>
      </div>

      {/* Filter and layout toolbar */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Property Filter Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '160px', maxWidth: '260px', flex: 1 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Filter by Property</span>
            <select
              value={propertyFilter}
              onChange={e => setPropertyFilter(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', height: '36px', width: '100%', textOverflow: 'ellipsis' }}
            >
              {propertyDropdownOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Guest Filter Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '160px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Filter by Guest</span>
            <select
              value={guestFilter}
              onChange={e => setGuestFilter(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', height: '36px' }}
            >
              {guestDropdownOptions.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '120px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', height: '36px' }}
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Severity Filter Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '120px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Severity</span>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', height: '36px' }}
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '200px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Search Description/Notes</span>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search queries..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ padding: '0.4rem 0.75rem 0.4rem 2.2rem', fontSize: '0.82rem', height: '36px', width: '100%' }}
              />
            </div>
          </div>

          {/* Layout switches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignSelf: 'stretch', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-glass)', height: '36px', alignItems: 'center' }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  background: viewMode === 'grid' ? 'var(--accent-primary)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  background: viewMode === 'table' ? 'var(--accent-primary)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Table list"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid/table */}
      {filteredIssues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed var(--border-glass)' }}>
          <Wrench size={40} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Reported Concerns Found</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '400px', margin: '0.25rem auto 0 auto' }}>
            There are no reported unit problems matching your filters. Click "Report Unit Issue" to list a new issue.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredIssues.map(issue => {
            const sevStyle = getSeverityStyle(issue.severity) as any;
            const statStyle = getStatusStyle(issue.status);
            return (
              <div
                key={issue.id}
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  borderLeft: getSeverityStyle(issue.severity, true) as string,
                  boxShadow: sevStyle.glow,
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatPropertyName(issue.propertyName)}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Guest: <strong style={{ color: issue.guestName === 'Staff / Internal' ? 'var(--text-secondary)' : 'var(--accent-primary)' }}>{issue.guestName}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      className="icon-btn"
                      onClick={() => openEditIssueModal(issue)}
                      style={{ padding: '4px' }}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="icon-btn danger-soft"
                      onClick={() => handleDeleteIssue(issue.id)}
                      style={{ padding: '4px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                    {issue.description}
                  </p>
                  <TranslationAssistant
                    text={issue.description}
                    targetLanguage={currentLanguage}
                    enabled={aiTranslationEnabled}
                  />

                  {issue.notes && (
                    <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '2px solid var(--border-glass)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Staff Notes</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{issue.notes}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {/* Severity chip */}
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: sevStyle.bg,
                      color: sevStyle.text,
                      border: `1px solid ${sevStyle.border}`,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 4
                    }}>
                      {issue.severity}
                    </span>

                    {/* Status chip */}
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: statStyle.bg,
                      color: statStyle.text,
                      border: `1px solid ${statStyle.border}`,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 4
                    }}>
                      {issue.status}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {issue.dateReported}
                  </span>
                </div>

                {issue.status !== 'Resolved' && (
                  <button
                    onClick={() => handleResolveIssue(issue.id)}
                    style={{
                      marginTop: '0.5rem',
                      width: '100%',
                      padding: '0.45rem',
                      background: 'rgba(45, 212, 172, 0.08)',
                      border: '1px solid rgba(45, 212, 172, 0.25)',
                      color: 'var(--success)',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--success)';
                      e.currentTarget.style.color = '#111';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(45, 212, 172, 0.08)';
                      e.currentTarget.style.color = 'var(--success)';
                    }}
                  >
                    <CheckCircle size={13} />
                    Mark Resolved
                  </button>
                )}

                {/* Assignee Footer badge */}
                {issue.assigneeName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700 }}>
                      {getInitials(issue.assigneeName)}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Assignee: <strong>{issue.assigneeName}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Property / Guest</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '100px' }}>Severity</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '100px' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '120px' }}>Assignee</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '100px' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '120px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map(issue => {
                  const sevStyle = getSeverityStyle(issue.severity) as any;
                  const statStyle = getStatusStyle(issue.status);
                  return (
                    <tr key={issue.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}>
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{formatPropertyName(issue.propertyName)}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{issue.guestName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top', maxWidth: '350px' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{issue.description}</p>
                          <TranslationAssistant text={issue.description} targetLanguage={currentLanguage} enabled={aiTranslationEnabled} />
                          {issue.notes && (
                            <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              Note: {issue.notes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: sevStyle.bg,
                          color: sevStyle.text,
                          border: `1px solid ${sevStyle.border}`,
                          padding: '0.1rem 0.35rem',
                          borderRadius: 4
                        }}>
                          {issue.severity}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: statStyle.bg,
                          color: statStyle.text,
                          border: `1px solid ${statStyle.border}`,
                          padding: '0.1rem 0.35rem',
                          borderRadius: 4
                        }}>
                          {issue.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                        {issue.assigneeName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 700 }}>
                              {getInitials(issue.assigneeName)}
                            </div>
                            <span style={{ fontSize: '0.78rem' }}>{issue.assigneeName}</span>
                          </div>
                        ) : (
                          <span style={{ opacity: 0.4 }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {issue.dateReported}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          {issue.status !== 'Resolved' && (
                            <button
                              onClick={() => handleResolveIssue(issue.id)}
                              className="icon-btn accent"
                              style={{ padding: '4px' }}
                              title="Resolve"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button
                            className="icon-btn"
                            onClick={() => openEditIssueModal(issue)}
                            style={{ padding: '4px' }}
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => handleDeleteIssue(issue.id)}
                            style={{ padding: '4px' }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Issue Modal Dialog */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2>🛎️ Report Unit Issue</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>
              
              {/* Select Property */}
              <div className="form-group">
                <label>Select Property / Unit</label>
                <input
                  type="text"
                  placeholder="🔍 Search property units..."
                  className="form-control"
                  style={{ 
                    marginBottom: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                  value={propertySearchQuery}
                  onChange={(e) => setPropertySearchQuery(e.target.value)}
                />
                <select
                  value={selectedPropertyId}
                  onChange={e => handlePropertyFormChange(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="" disabled>-- Select property unit --</option>
                  {properties
                    .filter(p => 
                      formatPropertyName(p.name).toLowerCase().includes(propertySearchQuery.toLowerCase())
                    )
                    .map(p => (
                      <option key={p.id} value={p.id}>{formatPropertyName(p.name)}</option>
                    ))}
                  {properties.filter(p => 
                    formatPropertyName(p.name).toLowerCase().includes(propertySearchQuery.toLowerCase())
                  ).length === 0 && (
                    <option value="" disabled>No matching properties</option>
                  )}
                </select>
              </div>

              {/* Guest Link / Internal Choice */}
              <div className="form-group">
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input
                      type="radio"
                      name="guest_type"
                      checked={!isGuestLinked}
                      onChange={() => {
                        setIsGuestLinked(false);
                        setSelectedGuestName('');
                      }}
                    />
                    Staff / Internal incident (No Guest)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input
                      type="radio"
                      name="guest_type"
                      checked={isGuestLinked}
                      onChange={() => setIsGuestLinked(true)}
                    />
                    Linked to Active Guest Booking
                  </label>
                </div>
              </div>

              {/* Guest Selector if Linked */}
              {isGuestLinked && (
                <div className="form-group" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                  <label>Linked Guest Name</label>
                  {propertyGuests.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.4rem', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid var(--border-glass)' }}>
                      No active guest bookings found for this unit. You can type in a guest name below:
                      <input
                        type="text"
                        value={selectedGuestName}
                        onChange={e => setSelectedGuestName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="form-control"
                        style={{ marginTop: '0.4rem' }}
                      />
                    </div>
                  ) : (
                    <select
                      value={selectedGuestName}
                      onChange={e => setSelectedGuestName(e.target.value)}
                      className="form-control"
                      required
                    >
                      <option value="" disabled>-- Select Guest Booking --</option>
                      {propertyGuests.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Severity, Status and Date */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Severity Level</label>
                  <select
                    value={issueSeverity}
                    onChange={e => setIssueSeverity(e.target.value as any)}
                    className="form-control"
                  >
                    <option value="Critical">🔴 Critical (Immediate Action)</option>
                    <option value="High">🟠 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">⚪ Low</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Report Date</label>
                  <input
                    type="date"
                    value={reportedDate}
                    onChange={e => setReportedDate(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              {/* Assignee Selector */}
              <div className="form-group">
                <label>Assign Operations Agent</label>
                <select
                  value={assigneeId}
                  onChange={e => handleAssigneeIdChange(e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Leave Unassigned --</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.roles.join(', ')})</option>
                  ))}
                </select>
              </div>

              {/* Issue Description */}
              <div className="form-group">
                <label>Issue Description</label>
                <textarea
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  placeholder="e.g. Master bedroom AC is not cooling properly and blowing warm air."
                  className="form-control"
                  style={{ minHeight: '90px', resize: 'vertical' }}
                  required
                />
              </div>

              {/* Internal Notes */}
              <div className="form-group">
                <label>Staff internal notes</label>
                <input
                  type="text"
                  value={issueNotes}
                  onChange={e => setIssueNotes(e.target.value)}
                  placeholder="e.g. Handyman dispatched, waiting for spare fan motor parts."
                  className="form-control"
                />
              </div>

              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Report Unit Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Issue Modal Dialog */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2>🛎️ Edit Reported Issue</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateIssue} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>
              
              {/* Select Property */}
              <div className="form-group">
                <label>Property Unit</label>
                <input
                  type="text"
                  placeholder="🔍 Search property units..."
                  className="form-control"
                  style={{ 
                    marginBottom: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                  value={propertySearchQuery}
                  onChange={(e) => setPropertySearchQuery(e.target.value)}
                />
                <select
                  value={selectedPropertyId}
                  onChange={e => handlePropertyFormChange(e.target.value)}
                  className="form-control"
                  required
                >
                  {properties
                    .filter(p => 
                      formatPropertyName(p.name).toLowerCase().includes(propertySearchQuery.toLowerCase())
                    )
                    .map(p => (
                      <option key={p.id} value={p.id}>{formatPropertyName(p.name)}</option>
                    ))}
                  {properties.filter(p => 
                    formatPropertyName(p.name).toLowerCase().includes(propertySearchQuery.toLowerCase())
                  ).length === 0 && (
                    <option value="" disabled>No matching properties</option>
                  )}
                </select>
              </div>

              {/* Guest Link / Internal Choice */}
              <div className="form-group">
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input
                      type="radio"
                      name="edit_guest_type"
                      checked={!isGuestLinked}
                      onChange={() => {
                        setIsGuestLinked(false);
                        setSelectedGuestName('');
                      }}
                    />
                    Staff / Internal incident
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input
                      type="radio"
                      name="edit_guest_type"
                      checked={isGuestLinked}
                      onChange={() => setIsGuestLinked(true)}
                    />
                    Linked to Guest Booking
                  </label>
                </div>
              </div>

              {/* Guest Selector if Linked */}
              {isGuestLinked && (
                <div className="form-group" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                  <label>Guest Name</label>
                  <input
                    type="text"
                    value={selectedGuestName}
                    onChange={e => setSelectedGuestName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="form-control"
                  />
                </div>
              )}

              {/* Severity, Status and Date */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Severity Level</label>
                  <select
                    value={issueSeverity}
                    onChange={e => setIssueSeverity(e.target.value as any)}
                    className="form-control"
                  >
                    <option value="Critical">🔴 Critical (Immediate Action)</option>
                    <option value="High">🟠 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">⚪ Low</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Issue Status</label>
                  <select
                    value={issueStatus}
                    onChange={e => setIssueStatus(e.target.value as any)}
                    className="form-control"
                  >
                    <option value="Open">🟡 Open</option>
                    <option value="In Progress">🟣 In Progress</option>
                    <option value="Resolved">🟢 Resolved</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Report Date</label>
                <input
                  type="date"
                  value={reportedDate}
                  onChange={e => setReportedDate(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              {/* Assignee Selector */}
              <div className="form-group">
                <label>Assign Operations Agent</label>
                <select
                  value={assigneeId}
                  onChange={e => handleAssigneeIdChange(e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Leave Unassigned --</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.roles.join(', ')})</option>
                  ))}
                </select>
              </div>

              {/* Issue Description */}
              <div className="form-group">
                <label>Issue Description</label>
                <textarea
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  className="form-control"
                  style={{ minHeight: '90px', resize: 'vertical' }}
                  required
                />
              </div>

              {/* Internal Notes */}
              <div className="form-group">
                <label>Staff internal notes</label>
                <input
                  type="text"
                  value={issueNotes}
                  onChange={e => setIssueNotes(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
