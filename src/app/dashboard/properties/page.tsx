'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  Plus, Building2, MapPin, BadgePercent, CheckCircle, FileSignature,
  Search, X, LayoutGrid, List, ChevronRight, Bed, Bath, Users,
  Calendar, Home, Filter, Eye, Edit3, AlertTriangle, Shield, Camera,
  Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, Loader2, Trash2, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { translateText } from '@/lib/translations';

// ─── Types ───────────────────────────────────────────────────────────
interface Property {
  id: string;
  name: string;
  propertyType: string;
  addressLine1: string;
  city: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  areaSqm: number | null;
  description: string | null;
  dtcmPermitNumber: string | null;
  dtcmPermitExpiry: string | null;
  status: string;
  managedSince: string | null;
  createdAt: string;
  owner?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  managerAssignments?: Array<{
    user: { firstName: string; lastName: string };
    isPrimary: boolean;
  }>;
  _count?: {
    bookings: number;
    tasks: number;
    maintenanceRequests: number;
  };
  extraDetails?: {
    missingRequiredFields?: string[];
  } | any;
}

interface Stats {
  total: number;
  active: number;
  pendingDtcm: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function getStatusConfig(status: string) {
  switch (status) {
    case 'active': return { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', label: 'Active' };
    case 'onboarding': return { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', label: 'Onboarding' };
    case 'draft': return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', label: 'Draft' };
    case 'inactive': return { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)', label: 'Inactive' };
    case 'archived': return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', label: 'Archived' };
    default: return { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.25)', label: status };
  }
}

function getTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'villa': return '🏡';
    case 'penthouse': return '🏙️';
    case 'townhouse': return '🏘️';
    default: return '🏢';
  }
}

function getDtcmDaysLeft(expiry: string | null): number | null {
  if (!expiry) return null;
  const diff = new Date(expiry).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Property Types ──────────────────────────────────────────────────
const PROPERTY_TYPES = ['Apartment', 'Villa', 'Townhouse', 'Penthouse'];
const STATUS_OPTIONS = ['active', 'onboarding', 'draft', 'inactive'];
const UAE_CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah'];

const MAPPABLE_FIELDS = [
  { field: 'name', label: 'Property Name', required: true, description: 'The display name of the holiday home' },
  { field: 'addressLine1', label: 'Address Line 1 / Location Link', required: true, description: 'Primary address or Google Maps link' },
  { field: 'city', label: 'City', required: true, description: 'City where property is located (e.g. Dubai)' },
  { field: 'propertyType', label: 'Property Type', required: false, description: 'Apartment, Villa, Townhouse, etc.' },
  { field: 'bedrooms', label: 'Bedrooms', required: false, description: 'Number of bedrooms' },
  { field: 'bathrooms', label: 'Bathrooms', required: false, description: 'Number of bathrooms' },
  { field: 'maxGuests', label: 'Max Guests', required: false, description: 'Maximum guests allowed' },
  { field: 'areaSqm', label: 'Area (sqm)', required: false, description: 'Property size in square meters' },
  { field: 'description', label: 'Description', required: false, description: 'Long description of the property' },
  { field: 'dtcmPermitNumber', label: 'DTCM Permit Number', required: false, description: 'Dubai Tourism permit code' },
  { field: 'dtcmPermitExpiry', label: 'DTCM Permit Expiry', required: false, description: 'Expiry date of DTCM permit' },
  { field: 'status', label: 'Status', required: false, description: 'active, draft, onboarding, inactive' },
  { field: 'col_checkin_type', label: 'Check-in Type', required: false, description: 'Self Check-in or Meet & Greet' },
  { field: 'addressLine2', label: 'Address Line 2', required: false, description: 'Suite, building name, floor, etc.' },
  { field: 'state', label: 'State / Emirate', required: false, description: 'e.g. Dubai, Abu Dhabi' },
  { field: 'country', label: 'Country', required: false, description: 'Default: United Arab Emirates' },
  { field: 'postalCode', label: 'Postal Code', required: false, description: 'ZIP or Postal code' },
  { field: 'managedSince', label: 'Managed Since', required: false, description: 'Date management started' },
  { field: 'amenities', label: 'Amenities', required: false, description: 'Comma-separated lists of amenities' },
];

export default function PropertiesPage() {
  const router = useRouter();
  const { user, organization } = useAuth();
  const uiLanguage = typeof window !== 'undefined' ? localStorage.getItem('pms_ui_language') || 'en' : 'en';
  const t = (key: string) => translateText(key, uiLanguage);

  // Data states
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, pendingDtcm: 0 });
  const [loading, setLoading] = useState(true);

  // UI states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pictures Modal State
  const [selectedPropertyForPics, setSelectedPropertyForPics] = useState<Property | null>(null);
  const [picModalOpen, setPicModalOpen] = useState(false);
  const [picsList, setPicsList] = useState<string[]>([]);
  const [inputPicUrl, setInputPicUrl] = useState('');
  const [isSavingPics, setIsSavingPics] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);

  // Sync picsList when selectedPropertyForPics changes
  useEffect(() => {
    if (selectedPropertyForPics) {
      setPicsList(selectedPropertyForPics.extraDetails?.pictures || []);
    } else {
      setPicsList([]);
    }
    setInputPicUrl('');
    setSelectedIndices([]);
    setDraggedIdx(null);
    setDragOverIdx(null);
    setLastSelectedIdx(null);
  }, [selectedPropertyForPics]);

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx && dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) return;
    
    const reordered = [...picsList];
    const [draggedItem] = reordered.splice(draggedIdx, 1);
    reordered.splice(idx, 0, draggedItem);
    
    setPicsList(reordered);
    setDraggedIdx(null);
    setDragOverIdx(null);
    setSelectedIndices([]);
    setLastSelectedIdx(null);
  };

  const handleSelectToggle = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (e.shiftKey && lastSelectedIdx !== null) {
      const start = Math.min(lastSelectedIdx, idx);
      const end = Math.max(lastSelectedIdx, idx);
      const rangeIndices: number[] = [];
      for (let i = start; i <= end; i++) {
        rangeIndices.push(i);
      }
      setSelectedIndices(prev => {
        const next = [...prev];
        rangeIndices.forEach(i => {
          if (!next.includes(i)) next.push(i);
        });
        return next;
      });
    } else {
      setSelectedIndices(prev => {
        if (prev.includes(idx)) {
          return prev.filter(i => i !== idx);
        } else {
          return [...prev, idx];
        }
      });
    }
    setLastSelectedIdx(idx);
  };

  const handleAddPicUrl = () => {
    if (!inputPicUrl.trim()) return;
    setPicsList(prev => [...prev, inputPicUrl.trim()]);
    setInputPicUrl('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800; // max size
          let width = img.width;
          let height = img.height;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setPicsList(prev => [...prev, compressedBase64]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Tab & column picker states
  const [pageTab, setPageTab] = useState<'grid' | 'onoff'>('grid');
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true, pictures: true, city: true, type: true, address: true,
    bedrooms: true, bathrooms: true, maxGuests: true,
    dtcm: true, status: true, col_checkin_type: true, owner: false, managedSince: false,
    bookings: false, tasks: false,
  });
  const [columnsLoaded, setColumnsLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      const email = user.email;
      const orgId = organization?.id;
      const suffix = orgId ? `_${orgId}` : '';
      const key = `hhs_visible_property_columns_${email}${suffix}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setVisibleColumns(prev => ({ ...prev, ...parsed }));
        } catch {}
      }
    } catch (e) {
      console.error(e);
    }
    setColumnsLoaded(true);
  }, [user, organization]);

  useEffect(() => {
    if (!columnsLoaded || !user) return;
    try {
      const email = user.email;
      const orgId = organization?.id;
      const suffix = orgId ? `_${orgId}` : '';
      const key = `hhs_visible_property_columns_${email}${suffix}`;
      const valStr = JSON.stringify(visibleColumns);
      localStorage.setItem(key, valStr);

      fetch('/api/settings/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'hhs_visible_property_columns', value: valStr })
      }).catch(err => console.error('[savePreference] failed to persist hhs_visible_property_columns', err));
    } catch (e) {
      console.error(e);
    }
  }, [visibleColumns, columnsLoaded, user, organization]);

  const columnPickerRef = useRef<HTMLDivElement>(null);

  // Custom Columns State
  const [customColumns, setCustomColumns] = useState<Array<{ id: string; label: string }>>([]);
  const [customColumnsLoaded, setCustomColumnsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hhs_custom_property_columns');
      if (saved) {
        setCustomColumns(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
    
    // Fetch fresh definitions from database
    fetch('/api/settings/custom-columns')
      .then(res => res.json())
      .then(data => {
        if (data.customColumns && Array.isArray(data.customColumns)) {
          setCustomColumns(data.customColumns);
          localStorage.setItem('hhs_custom_property_columns', JSON.stringify(data.customColumns));
        }
      })
      .catch(err => console.error('Error fetching custom columns:', err))
      .finally(() => {
        setCustomColumnsLoaded(true);
      });
  }, []);

  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [showAddColumnForm, setShowAddColumnForm] = useState(false);

  // Editing cells state
  const [editingCell, setEditingCell] = useState<{ propertyId: string; colId: string; value: string } | null>(null);
  const [updatingPropertyId, setUpdatingPropertyId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
        setShowColumnPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const COLUMN_DEFS = useMemo(() => {
    const baseDefs = [
      { id: 'name', label: 'Property Name', minWidth: '200px' },
      { id: 'pictures', label: 'Pictures', minWidth: '150px' },
      { id: 'address', label: 'Location', minWidth: '150px' },
      { id: 'city', label: 'City', minWidth: '80px' },
      { id: 'type', label: 'Type', minWidth: '90px' },
      { id: 'bedrooms', label: 'Beds', minWidth: '50px' },
      { id: 'bathrooms', label: 'Baths', minWidth: '50px' },
      { id: 'maxGuests', label: 'Guests', minWidth: '55px' },
      { id: 'dtcm', label: 'DTCM', minWidth: '80px' },
      { id: 'status', label: 'Status', minWidth: '85px' },
      { id: 'col_checkin_type', label: 'Check-in Type', minWidth: '110px' },
      { id: 'owner', label: 'Owner', minWidth: '120px' },
      { id: 'managedSince', label: 'Managed Since', minWidth: '100px' },
      { id: 'bookings', label: 'Bookings', minWidth: '60px' },
      { id: 'tasks', label: 'Tasks', minWidth: '50px' },
    ];
    const customDefs = customColumns.map(col => ({
      id: col.id,
      label: col.label,
      minWidth: '130px',
      isCustom: true
    }));
    return [...baseDefs, ...customDefs];
  }, [customColumns]);

  const activeColumns = useMemo(() => {
    return COLUMN_DEFS.filter(c => visibleColumns[c.id] !== false);
  }, [COLUMN_DEFS, visibleColumns]);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);

  // Mapping wizard states
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'results'>('upload');
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [sheetRows, setSheetRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Form fields
  const [formData, setFormData] = useState({
    name: '', propertyType: 'Apartment', addressLine1: '', city: 'Dubai',
    country: 'United Arab Emirates', bedrooms: 1, bathrooms: 1, maxGuests: 2,
    dtcmPermitNumber: '', dtcmPermitExpiry: '', description: '',
    extraDetails: {
      col_checkin_type: 'Self Check-in'
    }
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchProperties(); }, []);

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      if (!res.ok) throw new Error('Failed to load properties');
      const data = await res.json();
      setProperties(data.properties || []);
      if (data.stats) setStats(data.stats);
      else {
        const props = data.properties || [];
        setStats({
          total: props.length,
          active: props.filter((p: Property) => p.status === 'active').length,
          pendingDtcm: props.filter((p: Property) => !p.dtcmPermitNumber && p.status !== 'archived').length,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error loading properties');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomColumn = async () => {
    const label = newColumnLabel.trim();
    if (!label) return;
    
    // Generate a unique ID (lowercase alphanumeric/underscore)
    const id = `custom_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    
    // Add to custom columns
    const updatedColumns = [...customColumns, { id, label }];
    setCustomColumns(updatedColumns);
    localStorage.setItem('hhs_custom_property_columns', JSON.stringify(updatedColumns));
    
    // Make it visible by default
    setVisibleColumns(prev => ({ ...prev, [id]: true }));
    
    // Reset form
    setNewColumnLabel('');
    setShowAddColumnForm(false);

    // Persist to database
    try {
      await fetch('/api/settings/custom-columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customColumns: updatedColumns })
      });
    } catch (e) {
      console.error('Failed to save custom column:', e);
    }
  };

  const handleDeleteCustomColumn = async (colId: string) => {
    const updatedColumns = customColumns.filter(c => c.id !== colId);
    setCustomColumns(updatedColumns);
    localStorage.setItem('hhs_custom_property_columns', JSON.stringify(updatedColumns));
    
    setVisibleColumns(prev => {
      const updated = { ...prev };
      delete updated[colId];
      return updated;
    });

    // Persist deletion to database
    try {
      await fetch('/api/settings/custom-columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customColumns: updatedColumns })
      });
    } catch (e) {
      console.error('Failed to delete custom column:', e);
    }
  };

  const handleSaveCell = async (propertyId: string, colId: string, value: string) => {
    setUpdatingPropertyId(propertyId);
    try {
      const prop = properties.find(p => p.id === propertyId);
      if (!prop) return;
      
      let payload: Record<string, any> = {};
      let updatedFields: Record<string, any> = {};
      const isCustomCol = customColumns.some(c => c.id === colId);

      if (isCustomCol) {
        const extraDetails = { ...(prop.extraDetails || {}) };
        extraDetails[colId] = value;
        payload = { extraDetails };
        updatedFields = { extraDetails };
      } else {
        switch (colId) {
          case 'name':
            payload = { name: value };
            updatedFields = { name: value };
            break;
          case 'address':
            payload = { addressLine1: value };
            updatedFields = { addressLine1: value };
            break;
          case 'city':
            payload = { city: value };
            updatedFields = { city: value };
            break;
          case 'type':
            payload = { propertyType: value };
            updatedFields = { propertyType: value };
            break;
          case 'bedrooms':
            payload = { bedrooms: Number(value) };
            updatedFields = { bedrooms: Number(value) };
            break;
          case 'bathrooms':
            payload = { bathrooms: Number(value) };
            updatedFields = { bathrooms: Number(value) };
            break;
          case 'maxGuests':
            payload = { maxGuests: Number(value) };
            updatedFields = { maxGuests: Number(value) };
            break;
          case 'dtcm':
            payload = { dtcmPermitNumber: value || null };
            updatedFields = { dtcmPermitNumber: value || null };
            break;
          case 'status':
            payload = { status: value };
            updatedFields = { status: value };
            break;
          case 'col_checkin_type': {
            const extraDetails = { ...(prop.extraDetails || {}) };
            extraDetails.col_checkin_type = value;
            payload = { extraDetails };
            updatedFields = { extraDetails };
            break;
          }
          case 'pictures': {
            const extraDetails = { ...(prop.extraDetails || {}) };
            extraDetails.pictures = JSON.parse(value);
            payload = { extraDetails };
            updatedFields = { extraDetails };
            break;
          }
          case 'managedSince':
            payload = { managedSince: value || null };
            updatedFields = { managedSince: value || null };
            break;
          default:
            return; // Read-only or unmapped
        }
      }
      
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update property details');
      }
      
      // Update local state
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, ...updatedFields } : p));
      setEditingCell(null);
    } catch (err: any) {
      setError(err.message || 'Error updating property');
    } finally {
      setUpdatingPropertyId(null);
    }
  };


  // Building grouping and mapping
  const buildingMap = useMemo(() => {
    const map: Record<string, { name: string; isBuilding: boolean }> = {};
    const addrCounts: Record<string, number> = {};
    properties.forEach(p => {
      if (p.addressLine1) {
        const addr = p.addressLine1.trim();
        addrCounts[addr] = (addrCounts[addr] || 0) + 1;
      }
    });

    properties.forEach(p => {
      if (!p.addressLine1) return;
      const addr = p.addressLine1.trim();
      const isMapsLink = addr.includes('google.com/maps') || addr.includes('maps.google') || addr.startsWith('http');
      const isShared = addrCounts[addr] > 1;

      if (isMapsLink || isShared) {
        let name = addr;
        if (isMapsLink) {
          try {
            const urlObj = new URL(addr);
            if (urlObj.pathname.includes('/place/')) {
              const parts = urlObj.pathname.split('/place/');
              if (parts[1]) {
                const placeName = parts[1].split('/')[0];
                if (placeName) {
                  name = decodeURIComponent(placeName.replace(/\+/g, ' '));
                }
              }
            } else {
              name = "Google Maps Location";
            }
          } catch {
            name = "Google Maps Location";
          }
        } else {
          name = addr.split(',')[0].trim();
        }
        
        if (name.length > 40) name = name.substring(0, 37) + '...';

        map[p.id] = {
          name,
          isBuilding: true
        };
      }
    });

    return map;
  }, [properties]);

  const buildingsList = useMemo(() => {
    const groups: Record<string, { name: string; count: number }> = {};
    properties.forEach(p => {
      const bInfo = buildingMap[p.id];
      if (bInfo && p.addressLine1) {
        const addr = p.addressLine1.trim();
        if (!groups[addr]) {
          groups[addr] = { name: bInfo.name, count: 0 };
        }
        groups[addr].count += 1;
      }
    });

    return Object.entries(groups).map(([addr, val]) => ({
      address: addr,
      name: `${val.name} (${val.count} unit${val.count !== 1 ? 's' : ''})`,
      count: val.count
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [properties, buildingMap]);

  // Client-side filtering
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.addressLine1?.toLowerCase().includes(q) && !p.city?.toLowerCase().includes(q)) return false;
      }
      if (filterType && p.propertyType !== filterType) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterCity && p.city !== filterCity) return false;
      if (filterBuilding && p.addressLine1 !== filterBuilding) return false;
      return true;
    });
  }, [properties, searchQuery, filterType, filterStatus, filterCity, filterBuilding]);

  const activeFilterCount = [filterType, filterStatus, filterCity, filterBuilding].filter(Boolean).length;

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create property');
      }
      setSuccess('Property successfully created!');
      setShowAddModal(false);
      setFormData({ name: '', propertyType: 'Apartment', addressLine1: '', city: 'Dubai', country: 'United Arab Emirates', bedrooms: 1, bathrooms: 1, maxGuests: 2, dtcmPermitNumber: '', dtcmPermitExpiry: '', description: '', extraDetails: { col_checkin_type: 'Self Check-in' } });
      await fetchProperties();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Import helpers ────────────────────────────────────────────────
  const getAutoMapping = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    const assigned = new Set<string>();

    const rules = [
      { field: 'addressLine2', patterns: [/address.*2/, /addr.*2/, /line\s*2/] },
      { field: 'addressLine1', patterns: [/address/, /addr/, /location/, /street/, /building/, /tower/, /unit/, /maps/, /link/, /google/] },
      { field: 'propertyType', patterns: [/property\s*type/, /prop.*type/, /^type$/, /category/, /classification/] },
      { field: 'name', patterns: [/property\s*name/, /prop.*name/, /^name$/, /^title$/, /unit\s*name/, /listing/, /label/, /^property$/] },
      { field: 'city', patterns: [/^city$/, /^town$/, /municipality/] },
      { field: 'state', patterns: [/^state$/, /^emirate$/, /^province$/, /^region$/] },
      { field: 'country', patterns: [/^country$/, /^nation$/, /^nationality$/] },
      { field: 'postalCode', patterns: [/postal/, /^zip/, /postcode/, /pincode/, /po\s*box/] },
      { field: 'bedrooms', patterns: [/bed/, /^br$/, /^bd$/, /room/] },
      { field: 'bathrooms', patterns: [/bath/, /^ba$/, /shower/, /wc/] },
      { field: 'maxGuests', patterns: [/guest/, /capacity/, /occupan/, /pax/, /sleeps/] },
      { field: 'areaSqm', patterns: [/area/, /sqm/, /sqft/, /size/, /square/, /footage/] },
      { field: 'description', patterns: [/desc/, /detail/, /about/, /summary/, /overview/, /info/] },
      { field: 'dtcmPermitExpiry', patterns: [/permit.*expir/, /dtcm.*expir/, /expir.*date/, /permit.*date/, /license.*expir/, /expiry/] },
      { field: 'dtcmPermitNumber', patterns: [/permit/, /dtcm/, /licen/, /registration/] },
      { field: 'status', patterns: [/^status$/, /^listing.*status$/] },
      { field: 'managedSince', patterns: [/managed/, /onboard/, /start.*date/, /management.*date/, /contract.*start/] },
      { field: 'amenities', patterns: [/amenit/, /facilities/, /features/] },
    ];

    for (const rule of rules) {
      for (const header of headers) {
        const norm = header.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
        if (rule.patterns.some(p => p.test(norm)) && !assigned.has(rule.field)) {
          mapping[rule.field] = header;
          assigned.add(rule.field);
          break;
        }
      }
    }

    return mapping;
  };

  const parseSelectedFile = (file: File) => {
    setImportFile(file);
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error('The workbook contains no sheets.');
        
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          defval: '',
        });
        
        if (rawRows.length === 0) throw new Error('The workbook contains no data rows.');
        
        const headers = Object.keys(rawRows[0]);
        setSheetHeaders(headers);
        setSheetRows(rawRows);
        
        const initialMapping = getAutoMapping(headers);
        setColumnMapping(initialMapping);
        setImportStep('mapping');
      } catch (err: any) {
        setError(err.message || 'Failed to parse file.');
        setImportFile(null);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResults(null);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      
      // Invert mapping from dbField -> excelHeader to excelHeader -> dbField
      const apiMapping: Record<string, string> = {};
      Object.entries(columnMapping).forEach(([dbField, excelHeader]) => {
        if (excelHeader) {
          apiMapping[excelHeader] = dbField;
        }
      });
      fd.append('mapping', JSON.stringify(apiMapping));

      const res = await fetch('/api/properties/import', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setImportResults(data);
      setImportStep('results');
      if (data.successCount > 0) {
        await fetchProperties();
      }
    } catch (err: any) {
      setError(err.message || 'Error importing properties');
    } finally {
      setImporting(false);
    }
  };

  const handleImportFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) parseSelectedFile(f);
  };

  const downloadTemplate = () => {
    const headers = ['Property Name', 'Property Type', 'Address', 'City', 'Country', 'Bedrooms', 'Bathrooms', 'Max Guests', 'Area (sqm)', 'Description', 'DTCM Permit Number', 'DTCM Permit Expiry', 'Status'];
    const sampleRow = ['Marina Heights Apt 2204', 'Apartment', 'Dubai Marina, Tower 5, Unit 2204', 'Dubai', 'United Arab Emirates', '2', '2', '4', '95', 'Luxury 2BR apartment with marina view', 'PER-2024-12345', '2025-12-31', 'draft'];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'properties_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResults(null);
    setImporting(false);
    setImportStep('upload');
    setSheetHeaders([]);
    setSheetRows([]);
    setColumnMapping({});
  };

  const clearFilters = () => { setFilterType(''); setFilterStatus(''); setFilterCity(''); setFilterBuilding(''); setSearchQuery(''); };

  // ─── Cell renderer helper ──────────────────────────────────────────
  const getEditingInitialValue = (colId: string, property: Property) => {
    switch (colId) {
      case 'name': return property.name;
      case 'address': return property.addressLine1 || '';
      case 'city': return property.city;
      case 'type': return property.propertyType;
      case 'bedrooms': return String(property.bedrooms);
      case 'bathrooms': return String(property.bathrooms);
      case 'maxGuests': return String(property.maxGuests);
      case 'dtcm': return property.dtcmPermitNumber || '';
      case 'status': return property.status;
      case 'col_checkin_type': return property.extraDetails?.col_checkin_type || 'Self Check-in';
      case 'managedSince':
        if (!property.managedSince) return '';
        try {
          return new Date(property.managedSince).toISOString().substring(0, 10);
        } catch {
          return '';
        }
      default: return property.extraDetails?.[colId] || '';
    }
  };

  // ─── Cell renderer helper ──────────────────────────────────────────
  const renderCell = (colId: string, property: Property) => {
    const statusCfg = getStatusConfig(property.status);
    const dtcmDays = getDtcmDaysLeft(property.dtcmPermitExpiry);
    const ownerName = property.owner ? `${property.owner.firstName} ${property.owner.lastName}` : null;

    const EDITABLE_COLUMNS = ['name', 'address', 'city', 'type', 'bedrooms', 'bathrooms', 'maxGuests', 'dtcm', 'status', 'col_checkin_type', 'managedSince'];
    const isEditable = EDITABLE_COLUMNS.includes(colId) || customColumns.some(c => c.id === colId);
    const isEditing = editingCell && editingCell.propertyId === property.id && editingCell.colId === colId;

    const renderCellEditor = () => {
      const inputStyle: React.CSSProperties = {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid var(--accent-primary)',
        borderRadius: '4px',
        color: 'var(--text-primary)',
        fontSize: '12px',
        padding: '2px 6px',
        width: '100%',
        minWidth: '80px',
        outline: 'none',
        fontFamily: 'var(--font-sans)',
        flex: 1,
      };

      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleSaveCell(property.id, colId, editingCell!.value);
        } else if (e.key === 'Escape') {
          setEditingCell(null);
        }
      };

      const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        const currentTarget = e.currentTarget;
        setTimeout(() => {
          if (!document.activeElement || !currentTarget.parentElement?.contains(document.activeElement)) {
            handleSaveCell(property.id, colId, editingCell?.value ?? '');
          }
        }, 150);
      };

      let editorElement = null;

      switch (colId) {
        case 'city':
          editorElement = (
            <select
              value={editingCell?.value}
              onChange={e => {
                const val = e.target.value;
                setEditingCell({ ...editingCell!, value: val });
                handleSaveCell(property.id, colId, val);
              }}
              onBlur={handleBlur}
              style={inputStyle}
              autoFocus
            >
              {UAE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          );
          break;
        case 'type':
          editorElement = (
            <select
              value={editingCell?.value}
              onChange={e => {
                const val = e.target.value;
                setEditingCell({ ...editingCell!, value: val });
                handleSaveCell(property.id, colId, val);
              }}
              onBlur={handleBlur}
              style={inputStyle}
              autoFocus
            >
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          );
          break;
        case 'status':
          editorElement = (
            <select
              value={editingCell?.value}
              onChange={e => {
                const val = e.target.value;
                setEditingCell({ ...editingCell!, value: val });
                handleSaveCell(property.id, colId, val);
              }}
              onBlur={handleBlur}
              style={inputStyle}
              autoFocus
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          );
          break;
        case 'col_checkin_type':
          editorElement = (
            <select
              value={editingCell?.value}
              onChange={e => {
                const val = e.target.value;
                setEditingCell({ ...editingCell!, value: val });
                handleSaveCell(property.id, colId, val);
              }}
              onBlur={handleBlur}
              style={inputStyle}
              autoFocus
            >
              {['Self Check-in', 'Meet & Greet'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          );
          break;
        case 'bedrooms':
        case 'bathrooms':
        case 'maxGuests':
          editorElement = (
            <input
              type="number"
              min="0"
              value={editingCell?.value}
              onChange={e => setEditingCell({ ...editingCell!, value: e.target.value })}
              onBlur={handleBlur}
              style={inputStyle}
              autoFocus
              onKeyDown={handleKeyDown}
            />
          );
          break;
        case 'managedSince':
          editorElement = (
            <input
              type="date"
              value={editingCell?.value}
              onChange={e => setEditingCell({ ...editingCell!, value: e.target.value })}
              onBlur={handleBlur}
              style={inputStyle}
              autoFocus
              onKeyDown={handleKeyDown}
            />
          );
          break;
        default:
          editorElement = (
            <input
              type="text"
              value={editingCell?.value}
              onChange={e => setEditingCell({ ...editingCell!, value: e.target.value })}
              onBlur={handleBlur}
              style={inputStyle}
              autoFocus
              onKeyDown={handleKeyDown}
            />
          );
          break;
      }

      return (
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', minWidth: '100px' }}
          onClick={e => e.stopPropagation()} // Prevent navigating to detail page
        >
          {editorElement}
          <button
            onClick={() => handleSaveCell(property.id, colId, editingCell!.value)}
            disabled={updatingPropertyId === property.id}
            style={{
              background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '2px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}
            title="Save"
          >
            {updatingPropertyId === property.id ? (
              <div style={{ width: '12px', height: '12px', border: '2px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <CheckCircle2 size={14} />
            )}
          </button>
          <button
            onClick={() => setEditingCell(null)}
            style={{
              background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      );
    };

    if (isEditing) {
      return renderCellEditor();
    }

    const wrapEditable = (element: React.ReactNode) => {
      if (!isEditable) return element;
      const isCenterAligned = ['bedrooms', 'bathrooms', 'maxGuests'].includes(colId);
      return (
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isCenterAligned ? 'center' : 'space-between',
            gap: '8px', 
            minHeight: '24px',
            width: '100%',
            paddingRight: '4px',
            position: 'relative'
          }}
          className="editable-cell-hover"
        >
          <div style={{ minWidth: 0, textAlign: isCenterAligned ? 'center' : 'left', width: !isCenterAligned ? '100%' : undefined }}>
            {element}
          </div>
          <span 
            className="pencil-icon" 
            style={{ 
              color: 'var(--text-muted)', 
              opacity: 0, 
              transition: 'opacity 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
              position: isCenterAligned ? 'absolute' : 'static',
              right: isCenterAligned ? '4px' : undefined
            }}
          >
            <Edit3 size={11} />
          </span>
        </div>
      );
    };

    const getRawCellContent = () => {
      switch (colId) {
        case 'pictures': {
          const pics = property.extraDetails?.pictures || [];
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPropertyForPics(property);
                  setPicModalOpen(true);
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {pics.length === 0 ? (
                  <div style={{ 
                    width: '28px', height: '28px', borderRadius: '6px', 
                    border: '1px dashed var(--text-muted, #4b5563)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted, #4b5563)', fontSize: '12px'
                  }}>
                    <Camera size={14} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {pics.slice(0, 3).map((pic: string, index: number) => (
                      <img 
                        key={index} 
                        src={pic} 
                        alt="Property thumbnail"
                        style={{ 
                          width: '28px', height: '28px', borderRadius: '6px', 
                          objectFit: 'cover', 
                          border: '2px solid var(--bg-primary, #0a0e17)',
                          marginLeft: index > 0 ? '-10px' : '0px',
                          zIndex: 3 - index
                        }} 
                      />
                    ))}
                    {pics.length > 3 && (
                      <div style={{ 
                        width: '28px', height: '28px', borderRadius: '6px', 
                        background: 'rgba(255,255,255,0.08)',
                        border: '1.5px solid var(--border-color, rgba(255,255,255,0.08))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: 700, color: 'var(--text-primary, #ffffff)',
                        marginLeft: '-10px', zIndex: 0
                      }}>
                        +{pics.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }
        case 'name':
          const missingFields = property.extraDetails?.missingRequiredFields;
          const isIncomplete = Array.isArray(missingFields) && missingFields.length > 0;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'rgba(var(--accent-primary-rgb), 0.06)',
                border: '1px solid rgba(var(--accent-primary-rgb), 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', flexShrink: 0
              }}>
                {getTypeIcon(property.propertyType)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/properties/${property.id}`);
                    }}
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  >
                    {property.name}
                  </span>
                  {isIncomplete && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: 'rgba(245,158,11,0.08)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.2)',
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        cursor: 'help',
                      }}
                      title={`Missing fields: ${missingFields.join(', ')}`}
                    >
                      ⚠️ Incomplete
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        case 'address':
          const isUrl = property.addressLine1?.trim().startsWith('http://') || property.addressLine1?.trim().startsWith('https://');
          const isInvalid = property.extraDetails?.invalidLocationLink;
          
          if (isUrl) {
            try {
              const url = new URL(property.addressLine1.trim());
              let displayUrl = `Map Link (${url.hostname})`;
              if (url.hostname.includes('google') && url.pathname.includes('/place/')) {
                const parts = url.pathname.split('/place/');
                if (parts[1]) {
                  const placeName = parts[1].split('/')[0];
                  if (placeName) {
                    displayUrl = decodeURIComponent(placeName.replace(/\+/g, ' '));
                  }
                }
              }
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <a 
                    href={property.addressLine1.trim()} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: '12px', color: isInvalid ? '#ef4444' : 'var(--accent-primary)', textDecoration: 'underline', fontWeight: isInvalid ? 600 : 'normal' }}
                  >
                    📍 {displayUrl}
                  </a>
                  {isInvalid && (
                    <span 
                      style={{ color: '#ef4444', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '2px', cursor: 'help' }}
                      title="Invalid Google Maps link. The system cannot parse coordinates from this link for distance scheduling."
                    >
                      ⚠️ Invalid
                    </span>
                  )}
                </div>
              );
            } catch {}
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{property.addressLine1 || '—'}</span>
              {isInvalid && (
                <span 
                  style={{ color: '#ef4444', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '2px', cursor: 'help' }}
                  title="Invalid Google Maps link. The system cannot parse coordinates from this link for distance scheduling."
                >
                  ⚠️ Invalid
                </span>
              )}
            </div>
          );
        case 'city':
          return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{property.city}</span>;
        case 'type':
          return (
            <span style={{
              display: 'inline-block', padding: '2px 9px', borderRadius: '20px',
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px',
              background: 'rgba(var(--accent-primary-rgb), 0.06)', color: 'var(--accent-primary)',
              border: '1px solid rgba(var(--accent-primary-rgb), 0.15)',
            }}>{property.propertyType}</span>
          );
        case 'bedrooms':
          return <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', display: 'block' }}>{property.bedrooms}</span>;
        case 'bathrooms':
          return <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', display: 'block' }}>{property.bathrooms}</span>;
        case 'maxGuests':
          return <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', display: 'block' }}>{property.maxGuests}</span>;
        case 'dtcm':
          return property.dtcmPermitNumber ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
              <Shield size={12} style={{ color: dtcmDays && dtcmDays < 30 ? '#f59e0b' : '#10b981', flexShrink: 0 }} />
              <span style={{ color: dtcmDays !== null ? (dtcmDays < 0 ? '#ef4444' : dtcmDays < 30 ? '#f59e0b' : '#10b981') : 'var(--text-secondary)', fontWeight: 600 }}>
                {dtcmDays !== null ? (dtcmDays < 0 ? 'Expired' : `${dtcmDays}d`) : 'Active'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#f59e0b' }}>
              <AlertTriangle size={12} /> Missing
            </div>
          );
        case 'status':
          return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '2px 9px', borderRadius: '20px',
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              background: statusCfg.bg, color: statusCfg.color,
              border: `1px solid ${statusCfg.border}`, whiteSpace: 'nowrap',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusCfg.color }} />
              {statusCfg.label}
            </span>
          );
        case 'col_checkin_type':
          const checkinVal = property.extraDetails?.col_checkin_type || 'Self Check-in';
          const isMeet = checkinVal === 'Meet & Greet';
          return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '2px 9px', borderRadius: '20px',
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              background: isMeet ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.06)',
              color: isMeet ? '#3b82f6' : 'var(--text-secondary)',
              border: `1px solid ${isMeet ? 'rgba(59,130,246,0.25)' : 'var(--border-color)'}`,
              whiteSpace: 'nowrap',
            }}>
              {checkinVal}
            </span>
          );
        case 'owner':
          return <span style={{ fontSize: '12px', color: ownerName ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{ownerName || '—'}</span>;
        case 'managedSince':
          return <span style={{ fontSize: '12px', color: property.managedSince ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{property.managedSince ? new Date(property.managedSince).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>;
        case 'bookings':
          return <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', display: 'block' }}>{property._count?.bookings ?? '—'}</span>;
        case 'tasks':
          return <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', display: 'block' }}>{property._count?.tasks ?? '—'}</span>;
        default:
          const val = property.extraDetails?.[colId] || '';
          return <span>{val || '—'}</span>;
      }
    };

    return wrapEditable(getRawCellContent());
  };

  const totalBookings = properties.reduce((s, p) => s + (p._count?.bookings ?? 0), 0);

  // ─── RENDER ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ═══ Header ═══ */}
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Properties
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          {stats.total} propert{stats.total !== 1 ? 'ies' : 'y'} · {totalBookings} booking{totalBookings !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ═══ Stats Cards ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Properties', value: stats.total, icon: Building2, color: '#d4af37' },
          { label: 'Active Listings', value: stats.active, icon: CheckCircle, color: '#10b981' },
          { label: 'Missing DTCM', value: stats.pendingDtcm, icon: AlertTriangle, color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'transform 0.2s, border-color 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${stat.color}40`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: `${stat.color}12`, border: `1px solid ${stat.color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: stat.color,
            }}>
              <stat.icon size={22} />
            </div>
            <div>
              <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                {stat.value}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Tab Bar ═══ */}
      <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '4px', width: 'fit-content' }}>
        <button
          onClick={() => setPageTab('grid')}
          style={{
            padding: '0.4rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: pageTab === 'grid'
              ? 'linear-gradient(135deg, rgba(var(--accent-primary-rgb),0.25), rgba(var(--accent-primary-rgb),0.1))'
              : 'transparent',
            boxShadow: pageTab === 'grid' ? 'inset 0 0 0 1px rgba(var(--accent-primary-rgb),0.35)' : 'none',
            color: pageTab === 'grid' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px', fontWeight: pageTab === 'grid' ? 700 : 400,
            transition: 'all 0.18s', fontFamily: 'var(--font-sans)',
          }}
        >
          📊 Property Info
        </button>
        <button
          onClick={() => setPageTab('onoff')}
          style={{
            padding: '0.4rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: pageTab === 'onoff'
              ? 'linear-gradient(135deg, rgba(var(--accent-primary-rgb),0.25), rgba(var(--accent-primary-rgb),0.1))'
              : 'transparent',
            boxShadow: pageTab === 'onoff' ? 'inset 0 0 0 1px rgba(var(--accent-primary-rgb),0.35)' : 'none',
            color: pageTab === 'onoff' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px', fontWeight: pageTab === 'onoff' ? 700 : 400,
            transition: 'all 0.18s', fontFamily: 'var(--font-sans)',
          }}
        >
          🏠 Onboarding / Offboarding
        </button>
      </div>

      {/* ═══ Alerts ═══ */}
      {error && <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '14px 18px', borderRadius: '10px', fontSize: '14px' }}>{error}</div>}
      {success && <div style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '14px 18px', borderRadius: '10px', fontSize: '14px' }}>{success}</div>}

      {/* ═══ Content ═══ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid rgba(212,175,55,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          Loading properties...
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            .editable-cell-hover:hover .pencil-icon { opacity: 1 !important; }
          `}</style>
        </div>
      ) : pageTab === 'grid' ? (
        /* ═══════════════════════════════════════════════════ */
        /* ═══ PROPERTY INFO TAB — Excel-like Data Grid  ═══ */
        /* ═══════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* ── Toolbar row ── */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 36px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px',
                  fontFamily: 'var(--font-sans)', outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Filter size={13} style={{ color: 'var(--text-muted)' }} />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{
                padding: '6px 10px', background: filterType ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filterType ? 'rgba(212,175,55,0.3)' : 'var(--border-color)'}`,
                borderRadius: '20px', color: filterType ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: 'pointer', outline: 'none',
              }}>
                <option value="">{t('All Types')}</option>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
                padding: '6px 10px', background: filterStatus ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filterStatus ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}`,
                borderRadius: '20px', color: filterStatus ? '#10b981' : 'var(--text-secondary)',
                fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: 'pointer', outline: 'none',
              }}>
                <option value="">{t('All Status')}</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <select value={filterCity} onChange={e => setFilterCity(e.target.value)} style={{
                padding: '6px 10px', background: filterCity ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filterCity ? 'rgba(59,130,246,0.3)' : 'var(--border-color)'}`,
                borderRadius: '20px', color: filterCity ? '#3b82f6' : 'var(--text-secondary)',
                fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: 'pointer', outline: 'none',
              }}>
                <option value="">All Cities</option>
                {UAE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {buildingsList.length > 0 && (
                <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)} style={{
                  padding: '6px 10px', background: filterBuilding ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${filterBuilding ? 'rgba(168,85,247,0.3)' : 'var(--border-color)'}`,
                  borderRadius: '20px', color: filterBuilding ? '#a855f7' : 'var(--text-secondary)',
                  fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: 'pointer', outline: 'none',
                  maxWidth: '180px',
                }}>
                  <option value="">All Buildings</option>
                  {buildingsList.map(b => (
                    <option key={b.address} value={b.address}>{b.name}</option>
                  ))}
                </select>
              )}
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} style={{
                  padding: '5px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '20px', color: '#ef4444', fontSize: '11px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '3px',
                }}>
                  <X size={11} /> Clear ({activeFilterCount})
                </button>
              )}
            </div>

            {/* Column picker */}
            <div style={{ position: 'relative' }} ref={columnPickerRef}>
              <button
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                style={{
                  padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
                  background: showColumnPicker ? 'rgba(var(--accent-primary-rgb),0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${showColumnPicker ? 'rgba(var(--accent-primary-rgb),0.3)' : 'var(--border-color)'}`,
                  color: showColumnPicker ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
                }}
              >
                <Eye size={13} /> Columns
              </button>
              {showColumnPicker && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 50,
                  background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                  borderRadius: '12px', padding: '12px 14px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
                  minWidth: '220px',
                  display: 'flex', flexDirection: 'column', gap: '4px',
                }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Toggle Columns</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                    {COLUMN_DEFS.map(col => {
                      const isColVisible = visibleColumns[col.id] !== false;
                      return (
                        <div
                          key={col.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            padding: '2px 4px',
                            borderRadius: '6px',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <label style={{
                            display: 'flex', alignItems: 'center', gap: '8px', cursor: col.id === 'name' ? 'not-allowed' : 'pointer',
                            fontSize: '12px', flex: 1, minWidth: 0,
                            color: isColVisible ? 'var(--text-primary)' : 'var(--text-muted)',
                          }}>
                            <input
                              type="checkbox"
                              checked={isColVisible}
                              disabled={col.id === 'name'}
                              onChange={() => {
                                if (col.id === 'name') return;
                                setVisibleColumns(prev => ({ ...prev, [col.id]: !isColVisible }));
                              }}
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {col.label}
                            </span>
                          </label>
                          {(col as any).isCustom && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomColumn(col.id);
                              }}
                              style={{
                                background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                                padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '4px', transition: 'background 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              title="Delete Column"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!showAddColumnForm ? (
                    <button
                      onClick={() => setShowAddColumnForm(true)}
                      style={{
                        marginTop: '8px',
                        padding: '6px 8px',
                        background: 'rgba(var(--accent-primary-rgb), 0.08)',
                        border: '1px dashed rgba(var(--accent-primary-rgb), 0.25)',
                        borderRadius: '6px',
                        color: 'var(--accent-primary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.12)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.08)'}
                    >
                      <Plus size={12} /> Add Custom Column
                    </button>
                  ) : (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Column Name (e.g. WiFi Details)"
                        value={newColumnLabel}
                        onChange={e => setNewColumnLabel(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          padding: '5px 8px',
                          outline: 'none'
                        }}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleCreateCustomColumn();
                          } else if (e.key === 'Escape') {
                            setShowAddColumnForm(false);
                            setNewColumnLabel('');
                          }
                        }}
                      />
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={handleCreateCustomColumn}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            background: 'var(--accent-primary)',
                            color: 'var(--bg-primary)',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setShowAddColumnForm(false);
                            setNewColumnLabel('');
                          }}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,0.06)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Property count */}
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              {filteredProperties.length} propert{filteredProperties.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>

          {/* ── Data Grid ── */}
          {filteredProperties.length === 0 ? (
            <div style={{
              padding: '60px', textAlign: 'center',
              background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
              border: '1px dashed var(--border-color)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
            }}>
              <Building2 size={52} style={{ color: 'var(--accent-primary)', opacity: 0.5 }} />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {searchQuery || activeFilterCount > 0 ? 'No matching properties' : 'No properties yet'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '400px' }}>
                  {searchQuery || activeFilterCount > 0
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'Get started by registering your first holiday home property.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: activeColumns.length > 6 ? '900px' : undefined }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                    {activeColumns.map(col => (
                      <th key={col.id} style={{
                        padding: '11px 16px', fontSize: '10px', fontWeight: 700,
                        color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1.3px',
                        textAlign: ['bedrooms', 'bathrooms', 'maxGuests', 'bookings', 'tasks'].includes(col.id) ? 'center' : 'left',
                        whiteSpace: 'nowrap', minWidth: col.minWidth,
                      }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((property, idx) => (
                    <tr
                      key={property.id}
                      style={{
                        borderBottom: idx < filteredProperties.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {activeColumns.map(col => {
                        const EDITABLE_COLUMNS = ['name', 'address', 'city', 'type', 'bedrooms', 'bathrooms', 'maxGuests', 'dtcm', 'status', 'col_checkin_type', 'managedSince'];
                        const isEditable = EDITABLE_COLUMNS.includes(col.id) || customColumns.some(c => c.id === col.id);
                        const isEditing = editingCell && editingCell.propertyId === property.id && editingCell.colId === col.id;
                        return (
                          <td 
                            key={col.id} 
                            style={{
                              padding: '12px 16px', 
                              verticalAlign: 'middle',
                              textAlign: ['bedrooms', 'bathrooms', 'maxGuests', 'bookings', 'tasks'].includes(col.id) ? 'center' : 'left',
                            }}
                            onClick={isEditable ? (e) => {
                              if (isEditing) return;
                              e.stopPropagation();
                              setEditingCell({ 
                                propertyId: property.id, 
                                colId: col.id, 
                                value: getEditingInitialValue(col.id, property) 
                              });
                            } : undefined}
                          >
                            {renderCell(col.id, property)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════ */
        /* ═══ ONBOARDING / OFFBOARDING TAB                  ═══ */
        /* ═══════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* ── Onboard New Property ── */}
          <div className="card" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>
              Onboard New Property
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Add individual properties or bulk-import from a spreadsheet to onboard them into your portfolio.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', padding: '10px 22px', fontSize: '14px' }}
              >
                <Plus size={18} /> Add Property
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: 'auto',
                  padding: '10px 22px', fontSize: '14px', fontWeight: 500,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                  borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.08)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <Upload size={16} /> Import Excel
              </button>
            </div>
          </div>

          {/* ── Active Properties List with Offboard ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Active Properties</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{properties.filter(p => p.status !== 'archived').length} properties in portfolio</p>
              </div>
            </div>

            {properties.filter(p => p.status !== 'archived').length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Building2 size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
                <p>No active properties to display.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '10px 24px', fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1.3px', textAlign: 'left' }}>Property</th>
                    <th style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1.3px', textAlign: 'left' }}>{t('Status')}</th>
                    <th style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1.3px', textAlign: 'left' }}>Managed Since</th>
                    <th style={{ padding: '10px 24px', fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1.3px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.filter(p => p.status !== 'archived').map((property, idx, arr) => {
                    const statusCfg = getStatusConfig(property.status);
                    return (
                      <tr
                        key={property.id}
                        style={{
                          borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '16px' }}>{getTypeIcon(property.propertyType)}</span>
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{property.name}</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{property.city}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '2px 9px', borderRadius: '20px',
                            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                            background: statusCfg.bg, color: statusCfg.color,
                            border: `1px solid ${statusCfg.border}`,
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusCfg.color }} />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {property.managedSince ? new Date(property.managedSince).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                          <button
                            onClick={() => { console.log('Offboard property:', property.id, property.name); }}
                            style={{
                              padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
                              color: '#ef4444', fontSize: '11px', fontWeight: 600,
                              fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.18)'; }}
                          >
                            Offboard
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ ADD PROPERTY MODAL ═══ */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowAddModal(false)}
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
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Register New Property</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Add a single-unit holiday home to your portfolio</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{
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
            <form onSubmit={handleCreateProperty} style={{ padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">{t('Property Name')}</label>
                  <input type="text" className="form-input" placeholder="e.g. Burj Khalifa Luxury Residence Apt 304" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('Property Type')}</label>
                  <select className="form-input" value={formData.propertyType} onChange={e => setFormData({ ...formData, propertyType: e.target.value })}>
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('City')}</label>
                  <select className="form-input" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })}>
                    {UAE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('Check-in Type')}</label>
                  <select 
                    className="form-input" 
                    value={formData.extraDetails?.col_checkin_type || 'Self Check-in'} 
                    onChange={e => setFormData({ 
                      ...formData, 
                      extraDetails: { ...(formData.extraDetails || {}), col_checkin_type: e.target.value } 
                    })}
                    required
                  >
                    <option value="Self Check-in">{t('Self Check-in')}</option>
                    <option value="Meet & Greet">Meet & Greet</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Location (Google Maps Link)</label>
                  <input type="text" className="form-input" placeholder="e.g. https://maps.google.com/?q=..." value={formData.addressLine1} onChange={e => setFormData({ ...formData, addressLine1: e.target.value })} required />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">{t('Bedrooms')}</label>
                    <input type="number" min="0" className="form-input" value={formData.bedrooms} onChange={e => setFormData({ ...formData, bedrooms: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('Bathrooms')}</label>
                    <input type="number" min="0" className="form-input" value={formData.bathrooms} onChange={e => setFormData({ ...formData, bathrooms: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('Max Guests')}</label>
                    <input type="number" min="1" className="form-input" value={formData.maxGuests} onChange={e => setFormData({ ...formData, maxGuests: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">DTCM Permit Number</label>
                  <input type="text" className="form-input" placeholder="e.g. PER-123-DTCM" value={formData.dtcmPermitNumber} onChange={e => setFormData({ ...formData, dtcmPermitNumber: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">DTCM Expiry Date</label>
                  <input type="date" className="form-input" value={formData.dtcmPermitExpiry} onChange={e => setFormData({ ...formData, dtcmPermitExpiry: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Description (optional)</label>
                  <textarea className="form-input" rows={3} placeholder="Brief description of the property..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ resize: 'vertical', minHeight: '80px' }} />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{
                  padding: '10px 24px', borderRadius: '10px',
                  border: '1px solid var(--border-color)', background: 'transparent',
                  color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}>{t('Cancel')}</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Register Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ IMPORT MODAL ═══ */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={resetImportModal}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              width: '90%',
              maxWidth: '640px',
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
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileSpreadsheet size={22} style={{ color: 'var(--accent-primary)' }} />
                  Import Properties
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Bulk import properties from an Excel or CSV file</p>
              </div>
              <button onClick={resetImportModal} style={{
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

            {/* Modal Body */}
            <div style={{ padding: '24px 28px' }}>

              {/* ── Results step ── */}
              {importStep === 'results' && importResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Summary */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px',
                  }}>
                    <div style={{
                       padding: '16px', borderRadius: '12px', textAlign: 'center',
                       background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                    }}>
                      <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{importResults.total}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Rows</p>
                    </div>
                    <div style={{
                      padding: '16px', borderRadius: '12px', textAlign: 'center',
                      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                    }}>
                      <p style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{importResults.successCount}</p>
                      <p style={{ fontSize: '11px', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Imported</p>
                    </div>
                    <div style={{
                      padding: '16px', borderRadius: '12px', textAlign: 'center',
                      background: importResults.errorCount > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${importResults.errorCount > 0 ? 'rgba(239,68,68,0.15)' : 'var(--border-color)'}`,
                    }}>
                      <p style={{ fontSize: '24px', fontWeight: 700, color: importResults.errorCount > 0 ? '#ef4444' : 'var(--text-primary)' }}>{importResults.errorCount}</p>
                      <p style={{ fontSize: '11px', color: importResults.errorCount > 0 ? '#ef4444' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Failed</p>
                    </div>
                  </div>

                  {/* Row-by-row results */}
                  <div style={{
                    maxHeight: '220px', overflowY: 'auto',
                    border: '1px solid var(--border-color)', borderRadius: '12px',
                  }}>
                    {importResults.results?.map((r: any, i: number) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 16px', fontSize: '13px',
                        borderBottom: i < importResults.results.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        background: r.status === 'error' ? 'rgba(239,68,68,0.03)' : 'transparent',
                      }}>
                        {r.status === 'success' ? (
                          <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                        ) : (
                          <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                        )}
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', minWidth: '44px' }}>Row {r.row}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                        {r.error && <span style={{ color: '#ef4444', fontSize: '11px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.error}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Column mapping details */}
                  {importResults.columnMapping && (
                    <details style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                      <summary style={{
                        padding: '10px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                        color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <FileSpreadsheet size={13} style={{ color: 'var(--accent-primary)' }} />
                        Smart Column Detection ({Object.keys(importResults.columnMapping).length} mapped)
                      </summary>
                      <div style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {Object.entries(importResults.columnMapping).map(([header, field]: [string, any]) => {
                          return (
                            <div key={header} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                              <span style={{ color: 'var(--text-secondary)', minWidth: '100px' }}>{header}</span>
                              <span style={{ color: 'var(--text-muted)' }}>→</span>
                              <span style={{ color: '#10b981', fontWeight: 500 }}>{field}</span>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}

                  {/* Done actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                    {importResults.errorCount > 0 && (
                      <button
                        onClick={() => { setImportStep('upload'); setImportFile(null); setImportResults(null); }}
                        style={{
                          padding: '10px 24px', borderRadius: '10px',
                          border: '1px solid var(--border-color)', background: 'transparent',
                          color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500,
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >Import Another File</button>
                    )}
                    <button onClick={resetImportModal} className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }}>Done</button>
                  </div>
                </div>
              ) : importStep === 'mapping' ? (
                /* ── Mapping step ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileSpreadsheet size={20} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Map columns for <strong>{importFile?.name}</strong>
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    For each system field below, select the corresponding column header from your spreadsheet. If required fields (marked with <span style={{ color: '#ef4444' }}>*</span>) are missing, we will import them as draft properties with fallbacks so you can correct them in the dashboard later.
                  </p>

                  {/* Field selectors list */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '12px',
                    maxHeight: '320px', overflowY: 'auto', paddingRight: '8px',
                    border: '1px solid var(--border-color)', borderRadius: '12px',
                    padding: '16px', background: 'rgba(0,0,0,0.1)'
                  }}>
                    {MAPPABLE_FIELDS.map((f) => (
                      <div key={f.field} style={{
                        display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px',
                        alignItems: 'center', padding: '8px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.03)'
                      }}>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {f.label}
                            {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                          </span>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {f.description}
                          </span>
                        </div>
                        <div>
                          <select
                            value={columnMapping[f.field] || ''}
                            onChange={(e) => setColumnMapping({ ...columnMapping, [f.field]: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              color: 'var(--text-primary)',
                              fontSize: '13px',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">-- Don't Import / Skip --</option>
                            {sheetHeaders.map((header) => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Live mapping preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Live Import Preview (First 2 Rows)
                    </p>
                    <div style={{
                      overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px',
                      background: 'rgba(0,0,0,0.1)'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)' }}>Row</th>
                            {MAPPABLE_FIELDS.filter(f => columnMapping[f.field]).map(f => (
                              <th key={f.field} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>{f.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sheetRows.slice(0, 2).map((row, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: rIdx === 0 ? '1px solid rgba(255,255,255,0.02)' : 'none' }}>
                              <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>#{rIdx + 2}</td>
                              {MAPPABLE_FIELDS.filter(f => columnMapping[f.field]).map(f => {
                                const excelCol = columnMapping[f.field];
                                return (
                                  <td key={f.field} style={{ padding: '8px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {String(row[excelCol] ?? '') || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>empty</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => setImportStep('upload')}
                      style={{
                        padding: '10px 24px', borderRadius: '10px',
                        border: '1px solid var(--border-color)', background: 'transparent',
                        color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      }}
                    >Back</button>
                    <button
                      onClick={resetImportModal}
                      style={{
                        padding: '10px 24px', borderRadius: '10px',
                        border: '1px solid var(--border-color)', background: 'transparent',
                        color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      }}
                    >{t('Cancel')}</button>
                    <button
                      onClick={handleImport}
                      className="btn-primary"
                      style={{ width: 'auto', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '8px' }}
                      disabled={importing}
                    >
                      {importing ? (
                        <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Importing...</>
                      ) : (
                        <><Upload size={16} /> Import Properties</>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Upload step ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Template download hint */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px', borderRadius: '12px',
                    background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.12)',
                  }}>
                    <FileSpreadsheet size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Need a template? Download our pre-formatted spreadsheet.</p>
                    </div>
                    <button onClick={downloadTemplate} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                      background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
                      color: 'var(--accent-primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      whiteSpace: 'nowrap', transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.18)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,175,55,0.1)'}
                    >
                      <Download size={13} /> Template
                    </button>
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleImportFileDrop}
                    onClick={() => document.getElementById('import-file-input')?.click()}
                    style={{
                      padding: '40px 20px',
                      borderRadius: '14px',
                      border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      background: dragOver ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.015)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                      cursor: 'pointer', transition: 'all 0.25s ease',
                      textAlign: 'center',
                    }}
                  >
                    <input
                      id="import-file-input"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) parseSelectedFile(f);
                      }}
                    />
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '16px',
                      background: importFile ? 'rgba(16,185,129,0.1)' : 'rgba(212,175,55,0.08)',
                      border: `1px solid ${importFile ? 'rgba(16,185,129,0.2)' : 'rgba(212,175,55,0.15)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {importFile
                        ? <CheckCircle2 size={26} style={{ color: '#10b981' }} />
                        : <Upload size={26} style={{ color: 'var(--accent-primary)' }} />
                      }
                    </div>
                    {importFile ? (
                      <>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{importFile.name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {(importFile.size / 1024).toFixed(1)} KB — Click to change file
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Drop your file here or <span style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>browse</span></p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Supports .xlsx, .xls, and .csv (max 5 MB, 500 rows)</p>
                      </>
                    )}
                  </div>

                  {/* Column mapping guide */}
                  <details style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <summary style={{
                      padding: '12px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                      color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                      <FileSpreadsheet size={14} style={{ color: 'var(--accent-primary)' }} />
                      Expected Columns
                    </summary>
                    <div style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
                        {[
                          { col: 'Property Name', req: true },
                          { col: 'Property Type', req: false },
                          { col: 'Address', req: true },
                          { col: 'City', req: true },
                          { col: 'Country', req: false },
                          { col: 'Bedrooms', req: false },
                          { col: 'Bathrooms', req: false },
                          { col: 'Max Guests', req: false },
                          { col: 'Area (sqm)', req: false },
                          { col: 'Description', req: false },
                          { col: 'DTCM Permit Number', req: false },
                          { col: 'DTCM Permit Expiry', req: false },
                          { col: 'Status', req: false },
                        ].map(c => (
                          <div key={c.col} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: c.req ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{c.req ? '●' : '○'}</span>
                            <span>{c.col}</span>
                            {c.req && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>Required</span>}
                          </div>
                        ))}
                      </div>
                      <p style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Column names are flexible — e.g. &quot;beds&quot; maps to Bedrooms, &quot;permit number&quot; maps to DTCM Permit Number.
                      </p>
                    </div>
                  </details>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                    <button onClick={resetImportModal} style={{
                      padding: '10px 24px', borderRadius: '10px',
                      border: '1px solid var(--border-color)', background: 'transparent',
                      color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}>{t('Cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Picture Manager Modal */}
      {picModalOpen && selectedPropertyForPics && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-secondary, #0e1420)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
            borderRadius: '16px', width: '100%', maxWidth: '800px',
            padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Manage Pictures: {selectedPropertyForPics.name}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Add property photos via local file upload or image links.
                </p>
              </div>
              <button 
                onClick={() => setPicModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
                  width: '28px', height: '28px', color: 'var(--text-primary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Bulk Actions Bar */}
            {picsList.length > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid var(--border-color, rgba(255,255,255,0.08))'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedIndices.length === picsList.length) {
                        setSelectedIndices([]);
                      } else {
                        setSelectedIndices(picsList.map((_, i) => i));
                      }
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-secondary, #9ca3af)',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: '4px'
                    }}
                  >
                    {selectedIndices.length === picsList.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedIndices.length > 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>
                      {selectedIndices.length} selected
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {selectedIndices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const remaining = picsList.filter((_, i) => !selectedIndices.includes(i));
                        setPicsList(remaining);
                        setSelectedIndices([]);
                      }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#ef4444', padding: '4px 10px', borderRadius: '6px',
                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: '4px'
                      }}
                    >
                      <Trash2 size={12} /> Delete Selected
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete all photos?')) {
                        setPicsList([]);
                        setSelectedIndices([]);
                        setLastSelectedIdx(null);
                      }
                    }}
                    style={{
                      background: 'none', border: 'none', color: '#ef4444',
                      fontSize: '12px', fontWeight: 500, cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Existing Pictures Grid with Drag-and-Drop and Selection */}
            <div style={{
              maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
              borderRadius: '10px', padding: '12px', background: 'rgba(0,0,0,0.2)',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px'
            }}>
              {picsList.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1', height: '100px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #6b7280)',
                  fontSize: '13px', gap: '8px'
                }}>
                  <Camera size={24} />
                  No pictures added yet.
                </div>
              ) : (
                picsList.map((pic, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  const isDragOver = dragOverIdx === idx && draggedIdx !== idx;
                  return (
                    <div 
                      key={idx} 
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={() => setDragOverIdx(null)}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={() => {
                        setDraggedIdx(null);
                        setDragOverIdx(null);
                      }}
                      onClick={(e) => handleSelectToggle(e, idx)}
                      style={{
                        position: 'relative', 
                        width: '100%', 
                        aspectRatio: '1', 
                        borderRadius: '8px',
                        overflow: 'hidden', 
                        border: isDragOver
                          ? '2.5px dashed var(--accent-primary, #d4af37)'
                          : isSelected 
                            ? '2.5px solid var(--accent-primary, #d4af37)' 
                            : '1px solid var(--border-color, rgba(255,255,255,0.08))',
                        boxShadow: isDragOver 
                          ? '0 0 12px rgba(212,175,55,0.5)'
                          : isSelected 
                            ? '0 0 10px rgba(212,175,55,0.3)' 
                            : 'none',
                        cursor: 'grab',
                        opacity: draggedIdx === idx ? 0.4 : 1,
                        transform: isDragOver ? 'scale(1.05)' : 'scale(1)',
                        zIndex: isDragOver ? 2 : 1,
                        transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.2s, transform 0.2s'
                      }}
                    >
                      <img 
                        src={pic} 
                        alt={`Property ${idx}`} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          userSelect: 'none', 
                          pointerEvents: 'none' 
                        }} 
                      />
                      
                      {/* Checkbox for selection */}
                      <div 
                        onClick={(e) => handleSelectToggle(e, idx)}
                        style={{
                          position: 'absolute', top: '6px', left: '6px',
                          width: '18px', height: '18px', borderRadius: '4px',
                          border: `1.5px solid ${isSelected ? 'var(--accent-primary, #d4af37)' : 'rgba(255,255,255,0.6)'}`,
                          background: isSelected ? 'var(--accent-primary, #d4af37)' : 'rgba(0,0,0,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', zIndex: 10
                        }}
                      >
                        {isSelected && <Check size={12} style={{ color: 'var(--bg-secondary, #0e1420)', fontWeight: 'bold' }} />}
                      </div>

                      {/* Hover individual remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPicsList(prev => prev.filter((_, i) => i !== idx));
                          setSelectedIndices(prev => prev.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
                        }}
                        style={{
                          position: 'absolute', top: '6px', right: '6px', background: 'rgba(239, 68, 68, 0.9)',
                          border: 'none', borderRadius: '50%', width: '18px', height: '18px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', cursor: 'pointer', zIndex: 10
                        }}
                        title="Remove picture"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* File Upload input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Upload Local Pictures
                </label>
                <div style={{
                  border: '1px dashed var(--border-color, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '16px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', background: 'rgba(255,255,255,0.02)', position: 'relative',
                  transition: 'border-color 0.2s'
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color, rgba(255,255,255,0.08))'}
                >
                  <Upload size={20} style={{ color: 'var(--text-muted)', marginBottom: '6px' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Click to browse files
                  </span>
                  <input 
                    type="file" 
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      opacity: 0, cursor: 'pointer', width: '100%', height: '100%'
                    }}
                  />
                </div>
              </div>

              {/* URL input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Or Add Picture via URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="https://example.com/image.jpg"
                    value={inputPicUrl}
                    onChange={e => setInputPicUrl(e.target.value)}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                      color: 'var(--text-primary)', fontSize: '13px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddPicUrl}
                    style={{
                      padding: '8px 16px', borderRadius: '8px',
                      background: 'rgba(var(--accent-primary-rgb), 0.1)',
                      border: '1px solid rgba(var(--accent-primary-rgb), 0.2)',
                      color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Add Link
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingTop: '16px' }}>
              <button
                onClick={() => setPicModalOpen(false)}
                style={{
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)', border: 'none',
                  color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsSavingPics(true);
                  try {
                    await handleSaveCell(selectedPropertyForPics.id, 'pictures', JSON.stringify(picsList));
                    setPicModalOpen(false);
                  } catch {}
                  setIsSavingPics(false);
                }}
                disabled={isSavingPics}
                style={{
                  padding: '8px 20px', borderRadius: '8px',
                  background: 'var(--accent-primary)', border: 'none',
                  color: 'white', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {isSavingPics ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </>
                ) : 'Save Pictures'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
