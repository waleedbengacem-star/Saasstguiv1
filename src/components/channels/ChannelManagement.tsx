'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Globe, 
  TrendingUp, 
  Building2, 
  Trash2, 
  Edit, 
  Plus, 
  Search, 
  X,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface CustomRuleCondition {
  id: string;
  field: 'nights' | 'grossAmount' | 'guests';
  operator: 'greater_than' | 'less_than' | 'equal_to';
  value: number;
  targetField: 'commissionPercent' | 'feeTotal' | 'vatPercent' | 'processingFee' | 'merchantFee';
  newValue: number;
}

interface ChannelRule {
  id: string;
  channel: string;
  accountName: string;
  commissionPercent: number;
  commissionBases: string[];
  feeTotal: number;
  vatPercent: number;
  processingFee: number;
  processingVat: number;
  merchantFee: number;
  customRules?: CustomRuleCondition[];
}

interface Property {
  id: string;
  name: string;
  extraDetails?: any;
}

interface ChannelManagementProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  channelRules: ChannelRule[];
  setChannelRules: React.Dispatch<React.SetStateAction<ChannelRule[]>>;
}

const CHANNELS_LIST = ["Airbnb", "Booking.com", "Expedia", "Agoda", "VRBO", "Airbetter.com"];

const DEFAULT_CHANNEL_RULES: ChannelRule[] = [];

const consolidateRowsIntoRules = (rows: any[], mappings: Record<string, string>): ChannelRule[] => {
  const {
    channel: channelCol,
    accountName: accountCol,
    commissionPercent: commCol,
    commissionBases: basesCol,
    feeTotal: feeCol,
    vatPercent: vatCol,
    processingFee: procCol,
    processingVat: procVatCol,
    merchantFee: merchCol,
    minNights: minNightsCol,
    maxNights: maxNightsCol
  } = mappings;

  const groups: Record<string, any[]> = {};
  rows.forEach((row, rowIndex) => {
    const rawChannel = String(row[channelCol] || '').trim();
    let channel = 'Airbnb';
    const match = CHANNELS_LIST.find(c => c.toLowerCase() === rawChannel.toLowerCase());
    if (match) {
      channel = match;
    } else if (rawChannel) {
      channel = rawChannel;
    }

    const accountName = String(row[accountCol] || `Imported Account ${rowIndex + 1}`).trim();
    const rawBases = basesCol ? String(row[basesCol] || 'GBV').trim() : 'GBV';
    const commissionBases = rawBases.split(',').map(b => b.trim()).filter(Boolean);
    const basesKey = commissionBases.join('|');

    const groupKey = `${channel}::${accountName}::${basesKey}`;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push({
      row,
      channel,
      accountName,
      commissionBases: commissionBases.length > 0 ? commissionBases : ['GBV']
    });
  });

  return Object.values(groups).map((groupItems, groupIndex) => {
    const parsedItems = groupItems.map(item => {
      const row = item.row;
      const minN = minNightsCol ? (Number(row[minNightsCol]) || 1) : 1;
      const maxN = maxNightsCol ? (Number(row[maxNightsCol]) || 999) : 999;
      
      return {
        ...item,
        minNights: minN,
        maxNights: maxN,
        commissionPercent: commCol ? (Number(row[commCol]) || 0) : 0,
        feeTotal: feeCol ? (Number(row[feeCol]) || 0) : 0,
        vatPercent: vatCol ? (Number(row[vatCol]) || 0) : 0,
        processingFee: procCol ? (Number(row[procCol]) || 0) : 0,
        processingVat: procVatCol ? (Number(row[procVatCol]) || 0) : 0,
        merchantFee: merchCol ? (Number(row[merchCol]) || 0) : 0
      };
    });

    parsedItems.sort((a, b) => a.minNights - b.minNights);

    const baseItem = parsedItems[0];
    const ruleId = `ch-rule-imported-${Date.now()}-${groupIndex}`;
    
    const channelRule: ChannelRule = {
      id: ruleId,
      channel: baseItem.channel,
      accountName: baseItem.accountName,
      commissionPercent: baseItem.commissionPercent,
      commissionBases: baseItem.commissionBases,
      feeTotal: baseItem.feeTotal,
      vatPercent: baseItem.vatPercent,
      processingFee: baseItem.processingFee,
      processingVat: baseItem.processingVat,
      merchantFee: baseItem.merchantFee,
      customRules: []
    };

    if (parsedItems.length > 1) {
      const customRules: CustomRuleCondition[] = [];
      parsedItems.slice(1).forEach((item, itemIndex) => {
        const ruleVal = item.minNights - 1;
        
        if (item.commissionPercent !== baseItem.commissionPercent) {
          customRules.push({
            id: `crule-imp-${Date.now()}-${groupIndex}-${itemIndex}-comm`,
            field: 'nights',
            operator: 'greater_than',
            value: ruleVal,
            targetField: 'commissionPercent',
            newValue: item.commissionPercent
          });
        }
        if (item.feeTotal !== baseItem.feeTotal) {
          customRules.push({
            id: `crule-imp-${Date.now()}-${groupIndex}-${itemIndex}-fee`,
            field: 'nights',
            operator: 'greater_than',
            value: ruleVal,
            targetField: 'feeTotal',
            newValue: item.feeTotal
          });
        }
        if (item.vatPercent !== baseItem.vatPercent) {
          customRules.push({
            id: `crule-imp-${Date.now()}-${groupIndex}-${itemIndex}-vat`,
            field: 'nights',
            operator: 'greater_than',
            value: ruleVal,
            targetField: 'vatPercent',
            newValue: item.vatPercent
          });
        }
        if (item.processingFee !== baseItem.processingFee) {
          customRules.push({
            id: `crule-imp-${Date.now()}-${groupIndex}-${itemIndex}-pfee`,
            field: 'nights',
            operator: 'greater_than',
            value: ruleVal,
            targetField: 'processingFee',
            newValue: item.processingFee
          });
        }
        if (item.merchantFee !== baseItem.merchantFee) {
          customRules.push({
            id: `crule-imp-${Date.now()}-${groupIndex}-${itemIndex}-mfee`,
            field: 'nights',
            operator: 'greater_than',
            value: ruleVal,
            targetField: 'merchantFee',
            newValue: item.merchantFee
          });
        }
      });
      channelRule.customRules = customRules;
    }

    return channelRule;
  });
};

export default function ChannelManagement({
  properties = [],
  setProperties,
  channelRules = [],
  setChannelRules
}: ChannelManagementProps) {
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState<'rules' | 'linking' | 'definitions'>('rules');
  
  // Search and Filter states
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleFilter, setRuleFilter] = useState('all');
  const [propSearch, setPropSearch] = useState('');
  const [propFilter, setPropFilter] = useState('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ChannelRule | null>(null);

  // Excel Import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ChannelRule[]>([]);
  const [importError, setImportError] = useState('');
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [isMappingStep, setIsMappingStep] = useState(false);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({
    channel: '',
    accountName: '',
    commissionPercent: '',
    commissionBases: '',
    feeTotal: '',
    vatPercent: '',
    processingFee: '',
    processingVat: '',
    merchantFee: '',
    minNights: '',
    maxNights: ''
  });

  // Form states
  const [formChannel, setFormChannel] = useState('Airbnb');
  const [formAccountName, setFormAccountName] = useState('');
  const [formCommissionPercent, setFormCommissionPercent] = useState<number>(15);
  const [formCommissionBases, setFormCommissionBases] = useState<string[]>(['GBV']);
  const [formFeeTotal, setFormFeeTotal] = useState<number>(15);
  const [formVatPercent, setFormVatPercent] = useState<number>(5);
  const [formProcessingFee, setFormProcessingFee] = useState<number>(0);
  const [formProcessingVat, setFormProcessingVat] = useState<number>(0);
  const [formMerchantFee, setFormMerchantFee] = useState<number>(0);
  const [formCustomRules, setFormCustomRules] = useState<CustomRuleCondition[]>([]);

  const handleAddCustomRule = () => {
    const newCRule: CustomRuleCondition = {
      id: `crule-${Date.now()}`,
      field: 'nights',
      operator: 'greater_than',
      value: 0,
      targetField: 'commissionPercent',
      newValue: 0
    };
    setFormCustomRules(prev => [...prev, newCRule]);
  };

  const handleUpdateCustomRule = (id: string, key: keyof CustomRuleCondition, val: any) => {
    setFormCustomRules(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r));
  };

  const handleDeleteCustomRule = (id: string) => {
    setFormCustomRules(prev => prev.filter(r => r.id !== id));
  };

  // Seed channel rules if empty
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const orgId = organization?.id;
      const seededKey = orgId ? `hhs_channel_rules_seeded_${orgId}` : 'hhs_channel_rules_seeded';
      const rulesKey = orgId ? `hhs_channel_rules_${orgId}` : 'hhs_channel_rules';
      
      const seeded = localStorage.getItem(seededKey);
      if (!seeded && channelRules.length === 0) {
        setChannelRules(DEFAULT_CHANNEL_RULES);
        localStorage.setItem(seededKey, 'true');
        localStorage.setItem(rulesKey, JSON.stringify(DEFAULT_CHANNEL_RULES));
        
        fetch('/api/settings/integrations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'hhs_channel_rules_seeded', value: true })
        }).catch(err => console.error('Failed to sync channel rules seed to db:', err));

        fetch('/api/settings/integrations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'hhs_channel_rules', value: DEFAULT_CHANNEL_RULES })
        }).catch(err => console.error('Failed to sync empty channel rules to db:', err));
      }
    }
  }, [channelRules, setChannelRules, organization?.id]);

  // Sync state to local storage when rules change
  const handleSetChannelRules = (updater: ChannelRule[] | ((prev: ChannelRule[]) => ChannelRule[])) => {
    const nextRules = typeof updater === 'function' ? updater(channelRules) : updater;
    setChannelRules(nextRules);
    const orgId = organization?.id;
    const rulesKey = orgId ? `hhs_channel_rules_${orgId}` : 'hhs_channel_rules';
    localStorage.setItem(rulesKey, JSON.stringify(nextRules));

    fetch('/api/settings/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'hhs_channel_rules', value: nextRules })
    }).catch(err => console.error('Failed to sync channel rules to db:', err));
  };

  // Metrics
  const avgCommission = useMemo(() => {
    if (channelRules.length === 0) return '0.0';
    const sum = channelRules.reduce((acc, rule) => acc + (rule.commissionPercent || 0), 0);
    return (sum / channelRules.length).toFixed(1);
  }, [channelRules]);

  const activeChannelsCount = useMemo(() => {
    return new Set(channelRules.map(r => r.channel)).size;
  }, [channelRules]);

  // Link status helpers
  const getChannelNameOfRule = (ruleId: string) => {
    const rule = channelRules.find(r => r.id === ruleId);
    return rule ? rule.channel : 'Airbnb';
  };

  const propertiesWithLinkings = useMemo(() => {
    return properties.map(p => {
      const extra = p.extraDetails && typeof p.extraDetails === 'object' ? p.extraDetails : {};
      const channelRuleIds = extra.channelRuleIds || {};
      const oldRuleId = extra.channelRuleId || null;

      // Ensure backwards compatibility
      if (oldRuleId && !channelRuleIds[getChannelNameOfRule(oldRuleId)]) {
        channelRuleIds[getChannelNameOfRule(oldRuleId)] = oldRuleId;
      }

      return {
        id: p.id,
        name: p.name,
        channelRuleIds,
      };
    });
  }, [properties, channelRules]);

  const linkedPropertiesCount = useMemo(() => {
    return propertiesWithLinkings.filter(p => Object.keys(p.channelRuleIds).length > 0).length;
  }, [propertiesWithLinkings]);

  // Filters logic
  const filteredProperties = useMemo(() => {
    return propertiesWithLinkings.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(propSearch.toLowerCase().trim());
      const hasLinks = Object.keys(p.channelRuleIds).length > 0;
      
      if (propFilter === 'linked') return matchSearch && hasLinks;
      if (propFilter === 'unlinked') return matchSearch && !hasLinks;
      return matchSearch;
    });
  }, [propertiesWithLinkings, propSearch, propFilter]);

  const filteredRules = useMemo(() => {
    return channelRules.filter(r => {
      const search = ruleSearch.toLowerCase().trim();
      const bases = r.commissionBases.join(', ').toLowerCase();
      const matchSearch = r.channel.toLowerCase().includes(search) || 
                          r.accountName.toLowerCase().includes(search) || 
                          bases.includes(search);
      const matchFilter = ruleFilter === 'all' || r.channel === ruleFilter;
      return matchSearch && matchFilter;
    });
  }, [channelRules, ruleSearch, ruleFilter]);

  // Colors based on Channel
  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'Airbnb':
        return { background: 'rgba(240, 59, 106, 0.08)', border: '1px solid var(--brand-pink)', color: 'var(--brand-pink)' };
      case 'Booking.com':
        return { background: 'rgba(37, 99, 235, 0.08)', border: '1px solid #3b82f6', color: '#60a5fa' };
      case 'Expedia':
        return { background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #f59e0b', color: '#fbbf24' };
      case 'Agoda':
        return { background: 'rgba(139, 92, 246, 0.08)', border: '1px solid #8b5cf6', color: '#a78bfa' };
      case 'VRBO':
        return { background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', color: '#34d399' };
      default:
        return { background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' };
    }
  };

  // Form handlers
  const handleOpenAddModal = () => {
    setEditingRule(null);
    setFormChannel('Airbnb');
    setFormAccountName('');
    setFormCommissionPercent(15);
    setFormCommissionBases(['GBV']);
    setFormFeeTotal(15);
    setFormVatPercent(5);
    setFormProcessingFee(0);
    setFormProcessingVat(0);
    setFormMerchantFee(0);
    setFormCustomRules([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: ChannelRule) => {
    setEditingRule(rule);
    setFormChannel(rule.channel);
    setFormAccountName(rule.accountName);
    setFormCommissionPercent(rule.commissionPercent);
    setFormCommissionBases(rule.commissionBases || ['GBV']);
    setFormFeeTotal(rule.feeTotal);
    setFormVatPercent(rule.vatPercent);
    setFormProcessingFee(rule.processingFee);
    setFormProcessingVat(rule.processingVat);
    setFormMerchantFee(rule.merchantFee);
    setFormCustomRules(rule.customRules || []);
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAccountName.trim()) return;

    const payload = {
      channel: formChannel,
      accountName: formAccountName.trim(),
      commissionPercent: Number(formCommissionPercent) || 0,
      commissionBases: formCommissionBases,
      feeTotal: Number(formFeeTotal) || 0,
      vatPercent: Number(formVatPercent) || 0,
      processingFee: Number(formProcessingFee) || 0,
      processingVat: Number(formProcessingVat) || 0,
      merchantFee: Number(formMerchantFee) || 0,
      customRules: formCustomRules
    };

    if (editingRule) {
      handleSetChannelRules(prev => prev.map(r => r.id === editingRule.id ? { ...r, ...payload } : r));
    } else {
      const newRule: ChannelRule = {
        id: `ch-rule-${Date.now()}`,
        ...payload
      };
      handleSetChannelRules(prev => [...prev, newRule]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (window.confirm("Are you sure you want to delete this channel rule? Any properties linked to it will be unlinked.")) {
      handleSetChannelRules(prev => prev.filter(r => r.id !== ruleId));
      
      // Clean up linked properties
      properties.forEach(async (p) => {
        const extra = p.extraDetails && typeof p.extraDetails === 'object' ? p.extraDetails : {};
        const channelRuleIds = { ...extra.channelRuleIds };
        
        let changed = false;
        Object.keys(channelRuleIds).forEach(k => {
          if (channelRuleIds[k] === ruleId) {
            delete channelRuleIds[k];
            changed = true;
          }
        });

        if (extra.channelRuleId === ruleId) {
          delete extra.channelRuleId;
          changed = true;
        }

        if (changed) {
          const updatedExtra = {
            ...extra,
            channelRuleIds
          };
          
          // Optimistically update properties list
          setProperties(prev => prev.map(prop => prop.id === p.id ? { ...prop, extraDetails: updatedExtra } : prop));

          // Save to server
          await fetch(`/api/properties/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ extraDetails: updatedExtra }),
          });
        }
      });
    }
  };

  const handleDeleteAllRules = () => {
    if (window.confirm("Are you sure you want to delete all channel rules? Any properties linked to them will be unlinked.")) {
      handleSetChannelRules([]);
      
      // Clean up linked properties
      properties.forEach(async (p) => {
        const extra = p.extraDetails && typeof p.extraDetails === 'object' ? p.extraDetails : {};
        let changed = false;
        
        if (extra.channelRuleIds && Object.keys(extra.channelRuleIds).length > 0) {
          changed = true;
        }
        if (extra.channelRuleId) {
          changed = true;
        }

        if (changed) {
          const updatedExtra = {
            ...extra,
            channelRuleIds: {},
            channelRuleId: undefined
          };
          
          // Optimistically update properties list
          setProperties(prev => prev.map(prop => prop.id === p.id ? { ...prop, extraDetails: updatedExtra } : prop));

          // Save to server
          await fetch(`/api/properties/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ extraDetails: updatedExtra }),
          });
        }
      });
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError('');
    setImportPreview([]);

    const reader = new FileReader();
    reader.onload = (evt: any) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Read as array of arrays first to find the best header row
        const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
        if (allRows.length === 0) {
          setImportError('No rows found in the sheet.');
          return;
        }

        // Score first 15 rows to detect header row
        let bestHeaderRowIndex = 0;
        let maxScore = -1;
        const keywords = ['channel', 'ota', 'platform', 'booking site', 'account', 'commission', 'vat', 'fee', 'base', 'merchant', 'processing'];
        
        for (let i = 0; i < Math.min(allRows.length, 15); i++) {
          const row = allRows[i];
          if (!row || !Array.isArray(row)) continue;
          let score = 0;
          row.forEach(cell => {
            const val = String(cell || '').toLowerCase().trim();
            if (keywords.some(k => val.includes(k))) {
              score++;
            }
          });
          if (score > maxScore) {
            maxScore = score;
            bestHeaderRowIndex = i;
          }
        }
        
        // Default to first non-empty row if score is 0
        if (maxScore <= 0) {
          for (let i = 0; i < allRows.length; i++) {
            if (allRows[i].some(cell => String(cell || '').trim() !== '')) {
              bestHeaderRowIndex = i;
              break;
            }
          }
        }

        const headers = allRows[bestHeaderRowIndex].map((h, colIdx) => {
          const val = String(h || '').trim();
          return val || `Column_${colIdx + 1}`;
        });

        // Parse data rows
        const parsedRows: any[] = [];
        for (let i = bestHeaderRowIndex + 1; i < allRows.length; i++) {
          const row = allRows[i];
          if (!row || row.every(cell => String(cell || '').trim() === '')) continue;
          
          const rowObj: any = {};
          headers.forEach((header, colIdx) => {
            rowObj[header] = row[colIdx] !== undefined ? row[colIdx] : '';
          });
          parsedRows.push(rowObj);
        }

        if (parsedRows.length === 0) {
          setImportError('No data rows found below the header row.');
          return;
        }

        // Helper to find matching keys
        const findColumn = (possibleNames: string[]): string => {
          const match = headers.find(h => 
            possibleNames.some(name => h.toLowerCase().trim() === name)
          );
          return match || '';
        };

        const channelCol = findColumn(['channel', 'ota', 'platform', 'booking site']);
        const accountCol = findColumn(['account name', 'account', 'name', 'profile name', 'accountname', 'channel account']);
        const commCol = findColumn(['commission', 'commission %', 'commission percent', 'commission rate', 'channel fee', 'channel fee %']);
        const basesCol = findColumn(['bases', 'commission bases', 'base', 'commission base', 'basis', 'commissionable base']);
        const feeCol = findColumn(['fee total', 'fee total %', 'extra fee', 'fee %', 'fee total percent', 'channel fee total %', 'gross fee']);
        const vatCol = findColumn(['vat', 'vat %', 'vat percent', 'tax %', 'vat rate']);
        const procCol = findColumn(['processing fee', 'processing fee %', 'processing', 'processing_fee', 'channel processing fee ( applies to gbv)', 'channel processing fee']);
        const procVatCol = findColumn(['processing vat', 'processing vat %', 'processing tax', 'processing_vat', 'processing fee vat']);
        const merchCol = findColumn(['merchant fee', 'merchant fee %', 'merchant', 'merchant_fee', 'merchant fee ( gnv)', 'merchant fee (gnv)']);
        const minNightsCol = findColumn(['min nights', 'min_nights', 'min night', 'minimum nights', 'min stay', 'minnights']);
        const maxNightsCol = findColumn(['max nights', 'max_nights', 'max night', 'maximum nights', 'max stay', 'maxnights']);

        const detectedMappings = {
          channel: channelCol,
          accountName: accountCol,
          commissionPercent: commCol,
          commissionBases: basesCol,
          feeTotal: feeCol,
          vatPercent: vatCol,
          processingFee: procCol,
          processingVat: procVatCol,
          merchantFee: merchCol,
          minNights: minNightsCol,
          maxNights: maxNightsCol
        };

        setImportHeaders(headers);
        setImportRows(parsedRows);
        setColumnMappings(detectedMappings);

        // If auto-detection successfully identified the required fields, go directly to preview
        if (channelCol && accountCol) {
          const initialPreview = consolidateRowsIntoRules(parsedRows, detectedMappings);
          setImportPreview(initialPreview);
          setIsMappingStep(false);
        } else {
          // Prompt manual mapping
          setIsMappingStep(true);
        }

      } catch (err: any) {
        console.error(err);
        setImportError('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleApplyMappings = () => {
    const {
      channel: channelCol,
      accountName: accountCol,
      commissionPercent: commCol,
      commissionBases: basesCol,
      feeTotal: feeCol,
      vatPercent: vatCol,
      processingFee: procCol,
      processingVat: procVatCol,
      merchantFee: merchCol,
      minNights: minNightsCol,
      maxNights: maxNightsCol
    } = columnMappings;

    if (!channelCol || !accountCol) {
      setImportError('Please select column mappings for Channel and Account Name.');
      return;
    }

    try {
      const parsedRules: ChannelRule[] = consolidateRowsIntoRules(importRows, columnMappings);
      setImportPreview(parsedRules);
      setIsMappingStep(false);
      setImportError('');
    } catch (err: any) {
      setImportError('Failed to apply column mappings: ' + err.message);
    }
  };

  const handleSaveImport = () => {
    if (importPreview.length === 0) return;
    handleSetChannelRules(prev => [...prev, ...importPreview]);
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportPreview([]);
    setImportError('');
  };

  const handleLinkRule = async (propertyId: string, channel: string, ruleId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    const extra = property.extraDetails && typeof property.extraDetails === 'object' ? property.extraDetails : {};
    const channelRuleIds = { ...(extra.channelRuleIds || {}) };

    if (ruleId) {
      channelRuleIds[channel] = ruleId;
    } else {
      delete channelRuleIds[channel];
    }

    // Determine primary rule (backwards compat fallback to Airbnb)
    const primaryRuleId = channelRuleIds['Airbnb'] || Object.values(channelRuleIds)[0] || null;

    const updatedExtra = {
      ...extra,
      channelRuleIds,
      channelRuleId: primaryRuleId
    };

    // Optimistically update state
    setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, extraDetails: updatedExtra } : p));

    // Save to server
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraDetails: updatedExtra }),
      });
      if (!res.ok) {
        throw new Error('Failed to persist property assignment');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving rule mapping to database.');
    }
  };

  const handleBaseToggle = (base: string) => {
    if (formCommissionBases.includes(base)) {
      if (formCommissionBases.length > 1) {
        setFormCommissionBases(prev => prev.filter(b => b !== base));
      }
    } else {
      setFormCommissionBases(prev => [...prev, base]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title Header */}
      <div>
        <h1 className="auth-title" style={{ fontSize: '26px', marginBottom: '4px', textAlign: 'left' }}>
          Channel Management
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Configure pricing formulas, commission rates, and VAT rules for each OTA channel account connection.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(var(--accent-primary-rgb), 0.08)', color: 'var(--accent-primary)' }}>
            <Globe size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Rules Mapped</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{channelRules.length}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(var(--accent-primary-rgb), 0.08)', color: 'var(--accent-primary)' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Avg. OTA Commission</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{avgCommission}%</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(var(--accent-primary-rgb), 0.08)', color: 'var(--accent-primary)' }}>
            <Globe size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active OTA Channels</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{activeChannelsCount}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(var(--accent-primary-rgb), 0.08)', color: 'var(--accent-primary)' }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Linked Properties</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{linkedPropertiesCount} / {properties.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
        <button
          onClick={() => setActiveTab('rules')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'rules' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'rules' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px 12px',
            borderBottom: activeTab === 'rules' ? '2px solid var(--accent-primary)' : 'none',
            outline: 'none'
          }}
        >
          📋 Channel Rules
        </button>
        <button
          onClick={() => setActiveTab('linking')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'linking' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'linking' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px 12px',
            borderBottom: activeTab === 'linking' ? '2px solid var(--accent-primary)' : 'none',
            outline: 'none'
          }}
        >
          🔗 Property Assignments
        </button>
        <button
          onClick={() => setActiveTab('definitions')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'definitions' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'definitions' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px 12px',
            borderBottom: activeTab === 'definitions' ? '2px solid var(--accent-primary)' : 'none',
            outline: 'none'
          }}
        >
          📖 Terms & Definitions
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '500px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Search rules, account names..."
                  value={ruleSearch}
                  onChange={(e) => setRuleSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', fontSize: '13px' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              </div>

              <select
                value={ruleFilter}
                onChange={(e) => setRuleFilter(e.target.value)}
                className="form-input"
                style={{ width: 'auto', fontSize: '13px' }}
              >
                <option value="all">All Channels</option>
                {CHANNELS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="btn btn-outline"
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '13px' }}
              >
                <FileSpreadsheet size={16} /> Import Excel
              </button>
              {channelRules.length > 0 && (
                <button
                  onClick={handleDeleteAllRules}
                  className="btn btn-outline"
                  style={{
                    width: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    color: '#f87171',
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                    background: 'rgba(239, 68, 68, 0.03)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                  }}
                >
                  <Trash2 size={16} /> Delete All
                </button>
              )}
              <button
                onClick={handleOpenAddModal}
                className="btn btn-primary"
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '13px' }}
              >
                <Plus size={16} /> Add Channel Rule
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 8px' }}>Channel</th>
                  <th style={{ padding: '12px 8px' }}>Account Name</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Commission %</th>
                  <th style={{ padding: '12px 8px' }}>Bases</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Fee Total %</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>VAT %</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', background: 'rgba(255,255,255,0.015)' }}>Gross Fee %</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Processing Fee</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Processing VAT</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Merchant Fee</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.length > 0 ? (
                  filteredRules.map((rule) => {
                    const grossPercent = (rule.feeTotal * (1 + rule.vatPercent / 100)).toFixed(3);
                    return (
                      <tr key={rule.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '14px 8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            ...getChannelColor(rule.channel)
                          }}>
                            {rule.channel}
                          </span>
                        </td>
                        <td style={{ padding: '14px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {rule.accountName}
                          {rule.customRules && rule.customRules.length > 0 && (
                            <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 500, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>⚡ {rule.customRules.length} special override{rule.customRules.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 500 }}>
                          {rule.commissionPercent.toFixed(1)}%
                        </td>
                        <td style={{ padding: '14px 8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {rule.commissionBases.join(', ')}
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                          {rule.feeTotal.toFixed(1)}%
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                          {rule.vatPercent}%
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(var(--accent-primary-rgb), 0.02)' }}>
                          {grossPercent}%
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                          {rule.processingFee.toFixed(1)}%
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                          {rule.processingVat}%
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                          {rule.merchantFee.toFixed(1)}%
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEditModal(rule)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                              title="Edit rule"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                              title="Delete rule"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} style={{ padding: '30px 8px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      No channel rules matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Linking Tab */}
      {activeTab === 'linking' && (
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, flex: 1, minWidth: '250px' }}>
              Link your scheduler properties to different channel rule configurations to trigger correct VAT & payout validations.
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  placeholder="Search property..."
                  value={propSearch}
                  onChange={(e) => setPropSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '32px', fontSize: '12px' }}
                />
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              </div>

              <select
                value={propFilter}
                onChange={(e) => setPropFilter(e.target.value)}
                className="form-input"
                style={{ width: 'auto', fontSize: '12px' }}
              >
                <option value="all">All Properties ({propertiesWithLinkings.length})</option>
                <option value="linked">Linked ({propertiesWithLinkings.filter(p => Object.keys(p.channelRuleIds).length > 0).length})</option>
                <option value="unlinked">Unlinked ({propertiesWithLinkings.filter(p => Object.keys(p.channelRuleIds).length === 0).length})</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredProperties.length > 0 ? (
              filteredProperties.map((prop) => {
                const isLinked = Object.keys(prop.channelRuleIds).length > 0;
                return (
                  <div
                    key={prop.id}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: isLinked ? 'rgba(45, 212, 172, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                      border: isLinked ? '1px solid rgba(45, 212, 172, 0.15)' : '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        🏢 {prop.name}
                      </span>
                      {isLinked && (
                        <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Linked ({Object.keys(prop.channelRuleIds).length} Channels)
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                      {CHANNELS_LIST.map(ch => {
                        const linkedRuleId = prop.channelRuleIds[ch] || '';
                        const rulesForChannel = channelRules.filter(r => r.channel === ch);
                        return (
                          <div
                            key={ch}
                            style={{
                              background: linkedRuleId ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.1)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                ...getChannelColor(ch)
                              }}>
                                {ch}
                              </span>
                            </div>

                            <select
                              value={linkedRuleId}
                              onChange={(e) => handleLinkRule(prop.id, ch, e.target.value)}
                              className="form-input"
                              style={{ width: '100%', fontSize: '12px', padding: '6px', height: '30px' }}
                            >
                              <option value="">(Unlinked)</option>
                              {rulesForChannel.map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.accountName} ({r.commissionPercent}% on {r.commissionBases?.join(', ') || 'Stay + Cleaning'})
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No properties matching filter requirements.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Definitions Tab */}
      {activeTab === 'definitions' && (
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} style={{ color: 'var(--accent-primary)' }} /> OTA Accounting Glossary
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Understanding bases and commission configurations mapped in the UAE Holiday Home system:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '6px' }}>GBV (Gross Booking Value)</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                The total rate computed before subtracting channel commissions. Includes stay charges, cleaning fees, and other resort additions.
              </p>
              <div style={{ fontSize: '11px', color: '#34d399', marginTop: '8px', fontWeight: 600 }}>Formula: Rent + Cleaning + Other Charges</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '6px' }}>Stay Price Base</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Applies commission exclusively to the accommodation rent nights, excluding checkout cleaning or guest processing fees.
              </p>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Standard Airbnb base rule template.</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '6px' }}>Stay + Cleaning Base</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Applies commission to the nightly rate aggregation and checkout cleaning fee. The standard Booking.com rule base.
              </p>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>VAT is calculated on top of the commission total.</div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          zIndex: 1000
        }}>
          <div className="auth-card" style={{ maxWidth: '640px', width: '100%', margin: 0, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                {editingRule ? '✏️ Edit Channel Rule' : '🔌 Add Channel Rule'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Channel</label>
                  <select value={formChannel} onChange={(e) => setFormChannel(e.target.value)} className="form-input">
                    {CHANNELS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Account Name</label>
                  <input
                    type="text"
                    value={formAccountName}
                    onChange={(e) => setFormAccountName(e.target.value)}
                    placeholder="e.g. Host Account"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Commission %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formCommissionPercent}
                    onChange={(e) => setFormCommissionPercent(Number(e.target.value))}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Commission Bases</label>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    background: 'rgba(0,0,0,0.15)',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    {["GBV", "Stay", "Stay + Cleaning"].map(b => (
                      <label key={b} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formCommissionBases.includes(b)}
                          onChange={() => handleBaseToggle(b)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{b}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Channel Fee Total %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formFeeTotal}
                    onChange={(e) => setFormFeeTotal(Number(e.target.value))}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Channel VAT %</label>
                  <input
                    type="number"
                    value={formVatPercent}
                    onChange={(e) => setFormVatPercent(Number(e.target.value))}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '10px' }}>Processing Fee %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formProcessingFee}
                    onChange={(e) => setFormProcessingFee(Number(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '10px' }}>Processing VAT %</label>
                  <input
                    type="number"
                    value={formProcessingVat}
                    onChange={(e) => setFormProcessingVat(Number(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '10px' }}>Merchant Fee %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formMerchantFee}
                    onChange={(e) => setFormMerchantFee(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{
                background: 'rgba(52, 211, 153, 0.05)',
                border: '1px solid rgba(52, 211, 153, 0.2)',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                color: '#34d399',
                marginTop: '4px'
              }}>
                <span>Gross Fee (incl. VAT):</span>
                <strong>{((Number(formFeeTotal) || 0) * (1 + (Number(formVatPercent) || 0) / 100)).toFixed(3)}%</strong>
              </div>

              {/* Special Override Rules */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '4px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '13px' }}>Special Rate Overrides (Optional)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formCustomRules.map((cRule) => (
                    <div key={cRule.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.01)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>If</span>
                      <select
                        value={cRule.field}
                        onChange={(e) => handleUpdateCustomRule(cRule.id, 'field', e.target.value as any)}
                        className="form-input"
                        style={{ width: '100px', padding: '4px 8px', height: '28px', fontSize: '11px' }}
                      >
                        <option value="nights">Nights</option>
                        <option value="grossAmount">Gross Amount</option>
                        <option value="guests">Guests</option>
                      </select>
                      <select
                        value={cRule.operator}
                        onChange={(e) => handleUpdateCustomRule(cRule.id, 'operator', e.target.value as any)}
                        className="form-input"
                        style={{ width: '110px', padding: '4px 8px', height: '28px', fontSize: '11px' }}
                      >
                        <option value="greater_than">&gt; Greater Than</option>
                        <option value="less_than">&lt; Less Than</option>
                        <option value="equal_to">= Equal To</option>
                      </select>
                      <input
                        type="number"
                        value={cRule.value}
                        onChange={(e) => handleUpdateCustomRule(cRule.id, 'value', Number(e.target.value))}
                        className="form-input"
                        style={{ width: '60px', padding: '4px 8px', height: '28px', fontSize: '11px', textAlign: 'center' }}
                        required
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>then set</span>
                      <select
                        value={cRule.targetField}
                        onChange={(e) => handleUpdateCustomRule(cRule.id, 'targetField', e.target.value as any)}
                        className="form-input"
                        style={{ width: '130px', padding: '4px 8px', height: '28px', fontSize: '11px' }}
                      >
                        <option value="commissionPercent">Commission %</option>
                        <option value="feeTotal">Fee Total %</option>
                        <option value="vatPercent">VAT %</option>
                        <option value="processingFee">Processing Fee %</option>
                        <option value="merchantFee">Merchant Fee %</option>
                      </select>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>to</span>
                      <input
                        type="number"
                        step="0.01"
                        value={cRule.newValue}
                        onChange={(e) => handleUpdateCustomRule(cRule.id, 'newValue', Number(e.target.value))}
                        className="form-input"
                        style={{ width: '50px', padding: '4px 8px', height: '28px', fontSize: '11px', textAlign: 'center' }}
                        required
                      />
                      <span style={{ fontSize: '11px' }}>%</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomRule(cRule.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: 'auto', padding: '4px' }}
                        title="Remove override condition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={handleAddCustomRule}
                    className="btn btn-outline"
                    style={{ width: 'auto', alignSelf: 'flex-start', padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                  >
                    <Plus size={12} /> Add Override Condition
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}>
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          zIndex: 1000
        }}>
          <div className="auth-card" style={{ maxWidth: '640px', width: '100%', margin: 0, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--accent-primary)' }} /> Import Channel Rules
              </h3>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportPreview([]);
                  setImportError('');
                }} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {importFile ? (
              isMappingStep ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(var(--accent-primary-rgb), 0.05)',
                    border: '1px solid rgba(var(--accent-primary-rgb), 0.2)',
                    borderRadius: '8px',
                    color: 'var(--accent-primary)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertTriangle size={14} />
                    <span>Please select which column from your Excel sheet corresponds to each channel rule property.</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                    {/* Channel (Required) */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Channel / Platform *</label>
                      <select
                        value={columnMappings.channel}
                        onChange={(e) => setColumnMappings(prev => ({ ...prev, channel: e.target.value }))}
                        className="form-input"
                        style={{ fontSize: '13px' }}
                        required
                      >
                        <option value="">(Select Column)</option>
                        {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Account Name (Required) */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Account Name *</label>
                      <select
                        value={columnMappings.accountName}
                        onChange={(e) => setColumnMappings(prev => ({ ...prev, accountName: e.target.value }))}
                        className="form-input"
                        style={{ fontSize: '13px' }}
                        required
                      >
                        <option value="">(Select Column)</option>
                        {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Commission % */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Commission %</label>
                      <select
                        value={columnMappings.commissionPercent}
                        onChange={(e) => setColumnMappings(prev => ({ ...prev, commissionPercent: e.target.value }))}
                        className="form-input"
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">(None / Skip)</option>
                        {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Commission Bases */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Commission Bases</label>
                      <select
                        value={columnMappings.commissionBases}
                        onChange={(e) => setColumnMappings(prev => ({ ...prev, commissionBases: e.target.value }))}
                        className="form-input"
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">(None / Skip)</option>
                        {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Fee Total % */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Extra Fee Total %</label>
                      <select
                        value={columnMappings.feeTotal}
                        onChange={(e) => setColumnMappings(prev => ({ ...prev, feeTotal: e.target.value }))}
                        className="form-input"
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">(None / Skip)</option>
                        {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* VAT % */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>VAT %</label>
                      <select
                        value={columnMappings.vatPercent}
                        onChange={(e) => setColumnMappings(prev => ({ ...prev, vatPercent: e.target.value }))}
                        className="form-input"
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">(None / Skip)</option>
                        {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Processing Fee */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Processing Fee %</label>
                      <select
                        value={columnMappings.processingFee}
                        onChange={(e) => setColumnMappings(prev => ({ ...prev, processingFee: e.target.value }))}
                        className="form-input"
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">(None / Skip)</option>
                        {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Processing VAT */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Processing VAT %</label>
                      <select
                        value={columnMappings.processingVat}
                        onChange={(e) => setColumnMappings(prev => ({ ...prev, processingVat: e.target.value }))}
                        className="form-input"
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">(None / Skip)</option>
                        {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Merchant Fee */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Merchant Fee %</label>
                      <select
                        value={columnMappings.merchantFee}
                        onChange={(e) => setColumnMappings(prev => ({ ...prev, merchantFee: e.target.value }))}
                        className="form-input"
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">(None / Skip)</option>
                        {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Min Nights */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Min Nights</label>
                      <select
                        value={columnMappings.minNights}
                        onChange={(e) => setColumnMappings(prev => ({ ...prev, minNights: e.target.value }))}
                        className="form-input"
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">(None / Skip)</option>
                        {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Max Nights */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Max Nights</label>
                      <select
                        value={columnMappings.maxNights}
                        onChange={(e) => setColumnMappings(prev => ({ ...prev, maxNights: e.target.value }))}
                        className="form-input"
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">(None / Skip)</option>
                        {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>

                  {importError && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      color: '#f87171',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <AlertTriangle size={14} />
                      <span>{importError}</span>
                    </div>
                  )}

                  <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ width: 'auto' }}
                      onClick={() => {
                        setImportFile(null);
                        setImportPreview([]);
                        setImportError('');
                        setIsMappingStep(false);
                      }}
                    >
                      Clear & Start Over
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ width: 'auto' }}
                      onClick={handleApplyMappings}
                    >
                      Apply & Preview
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Previewing <strong>{importPreview.length}</strong> channel rules from Excel. Click import to finalize.
                  </p>
                  <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '8px 12px' }}>Channel</th>
                          <th style={{ padding: '8px 12px' }}>Account</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Comm %</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>VAT %</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Extra Fee %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((rule, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{rule.channel}</td>
                            <td style={{ padding: '8px 12px' }}>{rule.accountName}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{rule.commissionPercent}%</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{rule.vatPercent}%</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{rule.feeTotal}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ width: 'auto' }}
                      onClick={() => {
                        setIsMappingStep(true);
                      }}
                    >
                      ✏️ Edit Mappings
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ width: 'auto' }}
                      onClick={() => {
                        setImportFile(null);
                        setImportPreview([]);
                        setImportError('');
                      }}
                    >
                      Clear & Start Over
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ width: 'auto' }}
                      onClick={handleSaveImport}
                    >
                      Import {importPreview.length} Rules
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Upload your Excel sheet (<strong>.xlsx</strong> or <strong>.xls</strong>) with channel rule details. The system will auto-detect columns like Channel, Account Name, Commission %, VAT %, etc.
                </p>
                <div 
                  onClick={() => document.getElementById('rule-excel-input')?.click()}
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.01)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <FileSpreadsheet size={40} style={{ color: 'var(--accent-primary)', marginBottom: '12px', opacity: 0.8 }} />
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Click to select Excel file</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Supports .xlsx and .xls formats</p>
                  <input
                    id="rule-excel-input"
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={handleExcelImport}
                  />
                </div>
                {importError && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    color: '#f87171',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertTriangle size={14} />
                    <span>{importError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
