'use client';

import React, { useState, useEffect } from 'react';
import { 
  Handshake, 
  Search, 
  Plus, 
  Building2, 
  FileCheck2, 
  DollarSign, 
  Check, 
  AlertCircle,
  X,
  FileText,
  Percent,
  Trash2
} from 'lucide-react';
import { translateText } from '@/lib/translations';

interface LinkedPropertyInput {
  name: string;
  commissionPct?: number;
  partnerValue?: number;
  sharePct?: number;
  contractStart?: string | null;
  contractEnd?: string | null;
  contracts?: Array<{ startDate: string; endDate: string; isAutoRenew?: boolean }>;
}

interface HostContract {
  id: string;
  ownerName: string;
  propertiesCount: number;
  propertiesList: LinkedPropertyInput[];
  commissionPct: number;
  contractStart: string | null;
  contractEnd: string | null;
  contracts: Array<{ startDate: string; endDate: string; isAutoRenew?: boolean }>;
  status: 'active' | 'pending' | 'expired';
  payoutMethod: string;
  totalPaid: number;
  dateJoined?: string | null;
  companyName?: string | null;
  trn?: string | null;
  isIntermediary?: boolean;
  partnerModel?: 'gross_pct' | 'fee_pct' | 'monthly_flat';
  partnerValue?: number;
  contactPerson?: string | null;
  bankDetails?: any;
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

const getActiveContractDates = (contractsList?: Array<{ startDate: string; endDate: string; isAutoRenew?: boolean }>) => {
  if (!contractsList || contractsList.length === 0) {
    return { contractStart: null, contractEnd: null };
  }
  
  // Find if there is an active contract (including auto-renewed or open-ended terms)
  let activeTerm = null;
  
  for (const c of contractsList) {
    const term = getEffectiveContractTerm(c.startDate, c.endDate, c.isAutoRenew);
    if (term.isActive) {
      activeTerm = term;
      break;
    }
  }
  
  if (activeTerm) {
    return { contractStart: activeTerm.startDate, contractEnd: activeTerm.endDate };
  }
  
  // Otherwise, sort by original startDate and return the latest one's effective term
  const sorted = [...contractsList].sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return b.startDate.localeCompare(a.startDate);
  });
  
  const latest = sorted[0];
  const term = getEffectiveContractTerm(latest?.startDate || null, latest?.endDate || null, latest?.isAutoRenew);
  return { contractStart: term.startDate, contractEnd: term.endDate };
};

const INITIAL_CONTRACTS: HostContract[] = [];

export default function HostManagementPage() {
  const [contracts, setContracts] = useState<HostContract[]>(INITIAL_CONTRACTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [uiLanguage, setUiLanguage] = useState('en');
  const t = (key: string) => translateText(key, uiLanguage);

  useEffect(() => {
    const getLang = () => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('pms_ui_language')) {
            const val = localStorage.getItem(key);
            if (val) return val;
          }
        }
      } catch (e) {
        console.error(e);
      }
      return 'en';
    };

    setUiLanguage(getLang());

    const handleLangChange = (e: any) => {
      if (e.detail && e.detail.language) {
        setUiLanguage(e.detail.language);
      }
    };
    window.addEventListener('pms-language-change', handleLangChange);
    return () => {
      window.removeEventListener('pms-language-change', handleLangChange);
    };
  }, []);

  const getOtherOwnersCount = (p: any, currentContactId?: string) => {
    const splits = p.extraDetails?.ownerSplits || [];
    if (Array.isArray(splits) && splits.length > 0) {
      return splits.filter((s: any) => s.contactId !== currentContactId).length;
    }
    return (p.ownerContactId && p.ownerContactId !== currentContactId) ? 1 : 0;
  };

  const getCoOwnersWarning = (p: any, currentContactId?: string) => {
    const splits = p.extraDetails?.ownerSplits || [];
    let otherOwners: string[] = [];
    if (Array.isArray(splits) && splits.length > 0) {
      otherOwners = splits
        .filter((s: any) => s.contactId !== currentContactId)
        .map((s: any) => {
          const host = hostsList.find(h => h.id === s.contactId);
          return host ? `${host.firstName} ${host.lastName}`.trim() : t('another host');
        });
    } else if (p.ownerContactId && p.ownerContactId !== currentContactId) {
      const host = hostsList.find(h => h.id === p.ownerContactId);
      otherOwners = [host ? `${host.firstName} ${host.lastName}`.trim() : t('another host')];
    }

    if (otherOwners.length === 0) return null;
    return `${t('Co-owned with')} ${otherOwners.join(', ')}`;
  };

  // Form State & Database integration
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [hostsList, setHostsList] = useState<any[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [hostType, setHostType] = useState<'individual' | 'business'>('individual');
  const [newOwner, setNewOwner] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newTrn, setNewTrn] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [isIntermediary, setIsIntermediary] = useState(false);
  const [partnerModel, setPartnerModel] = useState<'gross_pct' | 'fee_pct' | 'monthly_flat'>('fee_pct');
  const [partnerValue, setPartnerValue] = useState<number>(30);
  const [newCommPct, setNewCommPct] = useState(15);
  const [newPayout, setNewPayout] = useState('Direct Bank Transfer (ENBD)');
  const [newContractStart, setNewContractStart] = useState('');
  const [newContractEnd, setNewContractEnd] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<LinkedPropertyInput[]>([]);
  const [showPropDropdown, setShowPropDropdown] = useState(false);
  const [propSearchTerm, setPropSearchTerm] = useState('');

  // Profile & Edit State
  const [viewingLandlord, setViewingLandlord] = useState<HostContract | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editContactId, setEditContactId] = useState('');
  const [editHostType, setEditHostType] = useState<'individual' | 'business'>('individual');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editTrn, setEditTrn] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editIsIntermediary, setEditIsIntermediary] = useState(false);
  const [editPartnerModel, setEditPartnerModel] = useState<'gross_pct' | 'fee_pct' | 'monthly_flat'>('fee_pct');
  const [editPartnerValue, setEditPartnerValue] = useState<number>(0);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCommPct, setEditCommPct] = useState(15);
  const [editPayout, setEditPayout] = useState('Direct Bank Transfer (ENBD)');
  const [editContractStart, setEditContractStart] = useState('');
  const [editContractEnd, setEditContractEnd] = useState('');
  const [editSelectedProperties, setEditSelectedProperties] = useState<LinkedPropertyInput[]>([]);
  const [showEditPropDropdown, setShowEditPropDropdown] = useState(false);
  const [editPropSearchTerm, setEditPropSearchTerm] = useState('');
  const [profileTab, setProfileTab] = useState<'units' | 'financials'>('units');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

  const getPayoutsLabel = () => {
    if (selectedPeriod === 'today') return t('Owner Payouts (Today)');
    if (selectedPeriod === 'week') return t('Owner Payouts (This Week)');
    if (selectedPeriod === 'month') return t('Owner Payouts (This Month)');
    if (selectedPeriod === 'year') return t('Owner Payouts (This Year)');
    return t('Owner Payouts (YTD)');
  };

  const getCombinedPayoutsLabel = () => {
    if (selectedPeriod === 'today') return t('Combined Payouts (Today)');
    if (selectedPeriod === 'week') return t('Combined Payouts (This Week)');
    if (selectedPeriod === 'month') return t('Combined Payouts (This Month)');
    if (selectedPeriod === 'year') return t('Combined Payouts (This Year)');
    return t('Combined Payouts (YTD)');
  };

  const getHostPayoutsLabel = () => {
    if (selectedPeriod === 'today') return t('Host Payouts (Today)');
    if (selectedPeriod === 'week') return t('Host Payouts (This Week)');
    if (selectedPeriod === 'month') return t('Host Payouts (This Month)');
    if (selectedPeriod === 'year') return t('Host Payouts (This Year)');
    return t('Host Payouts (YTD)');
  };

  const getAgentPayoutsLabel = () => {
    if (selectedPeriod === 'today') return t('Agent Payouts (Today)');
    if (selectedPeriod === 'week') return t('Agent Payouts (This Week)');
    if (selectedPeriod === 'month') return t('Agent Payouts (This Month)');
    if (selectedPeriod === 'year') return t('Agent Payouts (This Year)');
    return t('Agent Payouts (YTD)');
  };

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [linkedOrganizationId, setLinkedOrganizationId] = useState('');
  const [linkedOrganizationName, setLinkedOrganizationName] = useState('');
  const [editLinkedOrganizationId, setEditLinkedOrganizationId] = useState('');
  const [editLinkedOrganizationName, setEditLinkedOrganizationName] = useState('');
  const [partnerProperties, setPartnerProperties] = useState<any[]>([]);

  // Agent States
  const [activeMainTab, setActiveMainTab] = useState<'hosts' | 'agents'>('hosts');
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [viewingAgent, setViewingAgent] = useState<any>(null);
  const [isEditingAgentProfile, setIsEditingAgentProfile] = useState(false);

  // Add/Edit Agent Form State
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<'host' | 'agent'>('host');
  const [useExistingAgent, setUseExistingAgent] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [useExistingOwnerAsAgent, setUseExistingOwnerAsAgent] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [agentFirstName, setAgentFirstName] = useState('');
  const [agentLastName, setAgentLastName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentReferralPct, setAgentReferralPct] = useState(5);
  const [agentCommissionBase, setAgentCommissionBase] = useState<'gross_revenue' | 'management_commission'>('gross_revenue');
  const [agentReferredPropertyIds, setAgentReferredPropertyIds] = useState<string[]>([]);
  const [agentPayoutMethod, setAgentPayoutMethod] = useState('Direct Bank Transfer (ENBD)');
  const [agentSearchTerm, setAgentSearchTerm] = useState('');
  const [editAgentId, setEditAgentId] = useState('');
  const [agentProfileTab, setAgentProfileTab] = useState<'referrals' | 'owned'>('referrals');

  const loadAgents = () => {
    setLoadingAgents(true);
    fetch('/api/dashboard/agent-management')
      .then(res => res.json())
      .then(data => {
        setAgents(data.agents || []);
        setLoadingAgents(false);
      })
      .catch(err => {
        console.error('Error loading agents:', err);
        setLoadingAgents(false);
      });
  };

  const propDropdownRef = React.useRef<HTMLDivElement>(null);
  const editPropDropdownRef = React.useRef<HTMLDivElement>(null);

  const loadProperties = () => {
    setLoadingProperties(true);
    setLoadingHosts(true);
    
    fetch('/api/dashboard/host-management?action=getOrgs')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.orgs) {
          setOrganizations(data.orgs);
        }
      })
      .catch(err => console.error('Error loading organizations:', err));

    Promise.all([
      fetch('/api/properties').then(res => res.json()),
      fetch('/api/dashboard/host-management').then(res => res.json())
    ])
      .then(([propertiesData, hostsData]) => {
        const props = propertiesData.properties || [];
        const hosts = hostsData.hosts || [];
        setProperties(props);
        setHostsList(hosts);
        
        const initialContracts: HostContract[] = hosts.map((host: any) => {
          const bankDetails = host.bankDetails || {};
          const ownerName = host.companyName ? host.companyName : `${host.firstName} ${host.lastName}`.trim();
          const payoutMethod = bankDetails.payoutMethod || 'Direct Bank Transfer (ENBD)';

          // Find all properties owned by this host (using ownerSplits or ownerContactId fallback)
          const hostProps = props.filter((p: any) => {
            const splits = p.extraDetails?.ownerSplits || [];
            if (Array.isArray(splits) && splits.length > 0) {
              return splits.some((s: any) => s.contactId === host.id);
            }
            return p.ownerContactId === host.id;
          });

          const propertiesList: LinkedPropertyInput[] = hostProps.map((p: any) => {
            const splits = p.extraDetails?.ownerSplits || [];
            const mySplit = Array.isArray(splits) ? splits.find((s: any) => s.contactId === host.id) : null;
            return {
              name: p.name,
              commissionPct: mySplit?.commissionPct !== undefined
                ? Number(mySplit.commissionPct)
                : (bankDetails.isIntermediary && p.linkedCommissionPct !== undefined && p.linkedCommissionPct !== null
                    ? Number(p.linkedCommissionPct)
                    : (p.extraDetails?.commissionPct !== undefined ? Number(p.extraDetails.commissionPct) : undefined)),
              partnerValue: mySplit?.partnerValue !== undefined ? Number(mySplit.partnerValue) : undefined,
              sharePct: mySplit ? Number(mySplit.sharePct) : 100,
              contractStart: mySplit?.contractStart || null,
              contractEnd: mySplit?.contractEnd || null,
              contracts: mySplit?.contracts || []
            };
          });

          let resolvedHostCommPct = Number(bankDetails.commissionPct);
          if ((!resolvedHostCommPct || resolvedHostCommPct === 0) && propertiesList.length > 0) {
            const rates = propertiesList.map(pl => pl.commissionPct).filter(r => r !== undefined) as number[];
            if (rates.length > 0) {
              resolvedHostCommPct = rates[0];
            }
          }
          if (!resolvedHostCommPct) {
            resolvedHostCommPct = 15;
          }

          const commissionPct = resolvedHostCommPct;

          let contractStart = null;
          let contractEnd = null;
          let contractsList: Array<{ startDate: string; endDate: string; isAutoRenew?: boolean }> = [];

          if (propertiesList.length > 0) {
            contractsList = propertiesList[0].contracts || [];
            if (contractsList.length > 0) {
              const active = getActiveContractDates(contractsList);
              contractStart = active.contractStart;
              contractEnd = active.contractEnd;
            } else {
              contractStart = propertiesList[0].contractStart || null;
              contractEnd = propertiesList[0].contractEnd || null;
            }
          } else {
            contractsList = bankDetails.contracts || [];
            if (contractsList.length > 0) {
              const active = getActiveContractDates(contractsList);
              contractStart = active.contractStart;
              contractEnd = active.contractEnd;
            } else {
              contractStart = bankDetails.contractStart || null;
              contractEnd = bankDetails.contractEnd || null;
            }
          }

          // Compute Date Joined (oldest contract start date across all properties)
          const allStartDates: string[] = [];
          propertiesList.forEach(p => {
            if (p.contractStart) allStartDates.push(p.contractStart);
            if (p.contracts && Array.isArray(p.contracts)) {
              p.contracts.forEach(c => {
                if (c.startDate) allStartDates.push(c.startDate);
              });
            }
          });

          if (allStartDates.length === 0) {
            if (bankDetails.contractStart) allStartDates.push(bankDetails.contractStart);
            const landlordContracts = bankDetails.contracts || [];
            if (Array.isArray(landlordContracts)) {
              landlordContracts.forEach((c: any) => {
                if (c.startDate) allStartDates.push(c.startDate);
              });
            }
          }

          if (allStartDates.length === 0 && host.createdAt) {
            allStartDates.push(new Date(host.createdAt).toISOString().split('T')[0]);
          }

          const validDates = allStartDates.filter(Boolean).sort();
          const dateJoined = validDates[0] || null;

          // Calculate total payouts for this host across all their linked properties
          let totalPaid = 0;
          hostProps.forEach((p: any) => {
            const splits = p.extraDetails?.ownerSplits || [];
            const mySplit = Array.isArray(splits) ? splits.find((s: any) => s.contactId === host.id) : null;
            const sharePct = mySplit ? Number(mySplit.sharePct) : 100;
            const propCommPct = mySplit?.commissionPct !== undefined
              ? Number(mySplit.commissionPct)
              : (bankDetails.isIntermediary && p.linkedCommissionPct !== undefined && p.linkedCommissionPct !== null
                  ? Number(p.linkedCommissionPct)
                  : (p.extraDetails?.commissionPct !== undefined ? Number(p.extraDetails.commissionPct) : commissionPct));

            let propRevenue = 0;
            let propCommission = 0;
            if (p.bookings && Array.isArray(p.bookings)) {
              p.bookings.forEach((b: any) => {
                const usdToAed = b.currency.toUpperCase() === 'USD' ? 3.6725 : 1.0;
                const bookingGross = Number(b.grossAmount || b.totalAmount) * usdToAed;
                const ownerGrossShare = bookingGross * (sharePct / 100);

                if (!!bankDetails.isIntermediary) {
                  // Partner (Stay Local) charges their host a base commission (e.g. 12%)
                  const totalDeductedFee = ownerGrossShare * (propCommPct / 100);
                  let operatorShare = 0;

                  const model = bankDetails.partnerModel || 'fee_pct';
                  const val = (mySplit && mySplit.partnerValue !== undefined && mySplit.partnerValue !== null)
                    ? Number(mySplit.partnerValue)
                    : (Number(bankDetails.partnerValue) || 0);

                  if (model === 'gross_pct') {
                    operatorShare = ownerGrossShare * (val / 100);
                  } else if (model === 'fee_pct') {
                    operatorShare = totalDeductedFee * (val / 100);
                  } else if (model === 'monthly_flat') {
                    const start = new Date(b.checkIn);
                    const end = new Date(b.checkOut);
                    const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                    const dailyRate = (val * 12) / 365.25;
                    operatorShare = dailyRate * nights;
                  }
                  operatorShare = Math.min(totalDeductedFee, operatorShare);

                  // Stay Local's net payout = totalDeductedFee - operatorShare
                  propRevenue += totalDeductedFee;
                  propCommission += operatorShare;
                } else {
                  // Standard Landlord
                  propRevenue += ownerGrossShare;
                  propCommission += ownerGrossShare * (propCommPct / 100);
                }
              });
            }
            totalPaid += Math.max(0, propRevenue - propCommission);
          });

          return {
            id: host.id,
            ownerName,
            propertiesCount: propertiesList.length,
            propertiesList,
            commissionPct,
            contractStart,
            contractEnd,
            contracts: contractsList,
            status: host.isActive ? 'active' : 'pending',
            payoutMethod,
            totalPaid,
            dateJoined,
            companyName: host.companyName,
            trn: host.trn,
            isIntermediary: !!bankDetails.isIntermediary,
            partnerModel: bankDetails.partnerModel || 'fee_pct',
            partnerValue: Number(bankDetails.partnerValue) || 0,
            contactPerson: host.companyName ? `${host.firstName} ${host.lastName}`.trim() : null,
            bankDetails
          };
        });
        
        setContracts(initialContracts);
        setLoadingProperties(false);
        setLoadingHosts(false);
      })
      .catch(err => {
        console.error('Error loading properties or hosts:', err);
        setLoadingProperties(false);
        setLoadingHosts(false);
      });
  };

  React.useEffect(() => {
    loadProperties();
    loadAgents();
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (propDropdownRef.current && !propDropdownRef.current.contains(e.target as Node)) {
        setShowPropDropdown(false);
      }
      if (editPropDropdownRef.current && !editPropDropdownRef.current.contains(e.target as Node)) {
        setShowEditPropDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uniqueHosts = React.useMemo(() => {
    return hostsList.map(h => ({
      id: h.id,
      name: `${h.firstName} ${h.lastName}`.trim()
    }));
  }, [hostsList]);

  const linkableAgents = React.useMemo(() => {
    return agents.filter(agent => {
      return !hostsList.some(h => h.id === agent.id);
    });
  }, [agents, hostsList]);

  const linkableHosts = React.useMemo(() => {
    return hostsList.filter(host => {
      return !agents.some(a => a.id === host.id);
    });
  }, [hostsList, agents]);

  const filteredHostProperties = React.useMemo(() => {
    const term = propSearchTerm.toLowerCase().trim();
    if (!term) return properties;
    return properties.filter(p => p.name.toLowerCase().includes(term));
  }, [properties, propSearchTerm]);

  const filteredAllProperties = React.useMemo(() => {
    const term = editPropSearchTerm.toLowerCase().trim();
    if (!term) return properties;
    return properties.filter(p => p.name.toLowerCase().includes(term));
  }, [properties, editPropSearchTerm]);

  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalOwnerName = hostType === 'business' ? newCompanyName : newOwner;
    if (!finalOwnerName || selectedProperties.length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      let computedContractStart = null;
      let computedContractEnd = null;
      if (selectedProperties.length > 0) {
        const firstProp = selectedProperties[0];
        const active = getActiveContractDates(
          firstProp.contracts && firstProp.contracts.length > 0 
            ? firstProp.contracts 
            : [{ startDate: firstProp.contractStart || '', endDate: firstProp.contractEnd || '' }]
        );
        computedContractStart = active.contractStart;
        computedContractEnd = active.contractEnd;
      }

      const res = await fetch('/api/dashboard/host-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: useExistingAgent ? selectedAgentId : undefined,
          ownerName: finalOwnerName,
          companyName: hostType === 'business' ? newCompanyName : null,
          trn: hostType === 'business' ? newTrn : null,
          contactPerson: hostType === 'business' ? newContactPerson : null,
          isIntermediary,
          partnerModel,
          partnerValue,
          useExistingHost: false,
          commissionPct: isIntermediary ? 0 : Number(newCommPct),
          payoutMethod: newPayout,
          selectedProperties,
          contractStart: computedContractStart,
          contractEnd: computedContractEnd,
          linkedOrganizationId: hostType === 'business' ? linkedOrganizationId : null,
          linkedOrganizationName: hostType === 'business' ? linkedOrganizationName : null
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save host agreement');
      }

      setNewOwner('');
      setNewCompanyName('');
      setNewTrn('');
      setNewContactPerson('');
      setLinkedOrganizationId('');
      setLinkedOrganizationName('');
      setHostType('individual');
      setIsIntermediary(false);
      setPartnerModel('fee_pct');
      setPartnerValue(30);
      setSelectedProperties([]);
      setNewCommPct(15);
      setNewContractStart('');
      setNewContractEnd('');
      setUseExistingAgent(false);
      setSelectedAgentId('');
      setShowAddModal(false);
      loadProperties();
    } catch (err: any) {
      alert(err.message || 'An error occurred while saving the host agreement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenProfile = (contract: HostContract) => {
    const owner = hostsList.find(h => h.id === contract.id);

    if (owner) {
      setEditContactId(owner.id);
      setEditFirstName(owner.firstName || '');
      setEditLastName(owner.lastName || '');
      setEditEmail(owner.email || '');
      setEditPhone(owner.phone || '');
      setEditCompanyName(owner.companyName || '');
      setEditTrn(owner.trn || '');
      setEditHostType(owner.companyName ? 'business' : 'individual');
      const bankDetails = owner.bankDetails || {};
      setEditIsIntermediary(!!bankDetails.isIntermediary);
      setEditPartnerModel(bankDetails.partnerModel || 'fee_pct');
      setEditPartnerValue(Number(bankDetails.partnerValue) || 0);
      setEditContactPerson(owner.companyName ? `${owner.firstName} ${owner.lastName}`.trim() : '');
      setEditLinkedOrganizationId(bankDetails.linkedOrganizationId || '');
      setEditLinkedOrganizationName(bankDetails.linkedOrganizationName || '');

      if (bankDetails.linkStatus === 'approved' && bankDetails.linkedOrganizationId) {
        fetch(`/api/dashboard/host-management?action=getLinkedProperties&targetOrgId=${bankDetails.linkedOrganizationId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.properties) {
              setPartnerProperties(data.properties);
            }
          })
          .catch(err => console.error('Error loading partner properties:', err));
      } else {
        setPartnerProperties([]);
      }
    } else {
      const nameParts = contract.ownerName.trim().split(/\s+/);
      setEditFirstName(nameParts[0] || '');
      setEditLastName(nameParts.slice(1).join(' ') || '');
      setEditEmail('');
      setEditPhone('');
      setEditContactId('');
      setEditCompanyName('');
      setEditTrn('');
      setEditHostType('individual');
      setEditIsIntermediary(false);
      setEditPartnerModel('fee_pct');
      setEditPartnerValue(0);
      setEditContactPerson('');
      setEditLinkedOrganizationId('');
      setEditLinkedOrganizationName('');
      setPartnerProperties([]);
    }

    setEditCommPct(contract.commissionPct);
    setEditPayout(contract.payoutMethod);
    setEditContractStart(contract.contractStart || '');
    setEditContractEnd(contract.contractEnd || '');
    setEditSelectedProperties(contract.propertiesList);
    setEditPropSearchTerm('');
    setShowEditPropDropdown(false);
    
    const bankDetails = owner?.bankDetails || {};
    const updatedContract = {
      ...contract,
      bankDetails: {
        ...contract.bankDetails,
        linkStatus: bankDetails.linkStatus || 'none',
        linkedOrganizationId: bankDetails.linkedOrganizationId || '',
        linkedOrganizationName: bankDetails.linkedOrganizationName || ''
      }
    };
    
    setViewingLandlord(updatedContract);
    setIsEditingProfile(false);
    setProfileTab('units');
  };

  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let firstNameToSend = editFirstName;
    let lastNameToSend = editLastName;
    
    if (editHostType === 'business' && editContactPerson) {
      const parts = editContactPerson.trim().split(/\s+/);
      firstNameToSend = parts[0] || '';
      lastNameToSend = parts.slice(1).join(' ') || '.';
    } else if (editHostType === 'business' && !editContactPerson && editCompanyName) {
      const parts = editCompanyName.trim().split(/\s+/);
      firstNameToSend = parts[0] || '';
      lastNameToSend = parts.slice(1).join(' ') || '.';
    }

    if (!editContactId || !firstNameToSend || editSelectedProperties.length === 0 || isSaving) {
      alert('First Name / Contact Person and at least one linked property are required.');
      return;
    }

    setIsSaving(true);
    try {
      let computedContractStart = null;
      let computedContractEnd = null;
      if (editSelectedProperties.length > 0) {
        const firstProp = editSelectedProperties[0];
        const active = getActiveContractDates(
          firstProp.contracts && firstProp.contracts.length > 0 
            ? firstProp.contracts 
            : [{ startDate: firstProp.contractStart || '', endDate: firstProp.contractEnd || '' }]
        );
        computedContractStart = active.contractStart;
        computedContractEnd = active.contractEnd;
      }

      const res = await fetch('/api/dashboard/host-management', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: editContactId,
          firstName: firstNameToSend,
          lastName: lastNameToSend,
          email: editEmail,
          phone: editPhone,
          commissionPct: editIsIntermediary ? 0 : Number(editCommPct),
          payoutMethod: editPayout,
          selectedProperties: editSelectedProperties,
          contractStart: computedContractStart,
          contractEnd: computedContractEnd,
          companyName: editHostType === 'business' ? editCompanyName : null,
          trn: editHostType === 'business' ? editTrn : null,
          isIntermediary: editIsIntermediary,
          partnerModel: editPartnerModel,
          partnerValue: Number(editPartnerValue) || 0,
          linkedOrganizationId: editHostType === 'business' ? editLinkedOrganizationId : null,
          linkedOrganizationName: editHostType === 'business' ? editLinkedOrganizationName : null
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update landlord profile');
      }

      // Compute Date Joined (oldest contract start date across all selected properties)
      const allStartDates: string[] = [];
      editSelectedProperties.forEach(p => {
        if (p.contractStart) allStartDates.push(p.contractStart);
        if (p.contracts && Array.isArray(p.contracts)) {
          p.contracts.forEach(c => {
            if (c.startDate) allStartDates.push(c.startDate);
          });
        }
      });
      if (allStartDates.length === 0) {
        if (editContractStart) allStartDates.push(editContractStart);
      }
      const validDates = allStartDates.filter(Boolean).sort();
      const newDateJoined = validDates[0] || null;

      setViewingLandlord(prev => prev ? {
        ...prev,
        ownerName: editHostType === 'business' ? editCompanyName : `${firstNameToSend} ${lastNameToSend}`.trim(),
        commissionPct: Number(editCommPct),
        payoutMethod: editPayout,
        contractStart: computedContractStart,
        contractEnd: computedContractEnd,
        propertiesList: editSelectedProperties,
        propertiesCount: editSelectedProperties.length,
        dateJoined: newDateJoined,
        companyName: editHostType === 'business' ? editCompanyName : null,
        trn: editHostType === 'business' ? editTrn : null,
        isIntermediary: editIsIntermediary,
        partnerModel: editPartnerModel,
        partnerValue: Number(editPartnerValue) || 0,
        contactPerson: editHostType === 'business' ? editContactPerson : null
      } : null);

      loadProperties();
      setIsEditingProfile(false);
      setProfileTab('units');
    } catch (err: any) {
      alert(err.message || 'An error occurred while updating the landlord profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = c.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.propertiesList.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'var(--color-success)';
      case 'pending': return 'var(--color-warning)';
      default: return 'var(--text-muted)';
    }
  };

  const totalPaidSum = contracts.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalProperties = contracts.reduce((acc, curr) => acc + curr.propertiesCount, 0);

  const linkedUnits = React.useMemo(() => {
    if (!viewingLandlord) return [];
    return properties.filter(p => {
      const splits = p.extraDetails?.ownerSplits || [];
      if (Array.isArray(splits) && splits.length > 0) {
        return splits.some((s: any) => s.contactId === viewingLandlord.id);
      }
      return p.ownerContactId === viewingLandlord.id;
    });
  }, [properties, viewingLandlord]);

  const landlordFinancials = React.useMemo(() => {
    if (!viewingLandlord) return { totalRevenue: 0, totalCommission: 0, ownerPayouts: 0, outstanding: 0, totalPartnerShare: 0, totalOperatorShare: 0, unitFinancials: [] };
    
    let totalRevenue = 0;
    let totalCommission = 0;
    let totalOutstanding = 0;
    let totalPartnerShare = 0;
    let totalOperatorShare = 0;
    
    const unitFinancials = linkedUnits.map((unit: any) => {
      let unitRevenue = 0;
      let unitCommission = 0;
      let unitOutstanding = 0;
      let unitPartnerShare = 0;
      let unitOperatorShare = 0;
      
      const splits = unit.extraDetails?.ownerSplits || [];
      const mySplit = Array.isArray(splits) ? splits.find((s: any) => s.contactId === viewingLandlord.id) : null;
      const sharePct = mySplit ? Number(mySplit.sharePct) : 100;
      
      const propCommPct = mySplit?.commissionPct !== undefined
        ? Number(mySplit.commissionPct)
        : (viewingLandlord.isIntermediary && unit.linkedCommissionPct !== undefined && unit.linkedCommissionPct !== null
            ? Number(unit.linkedCommissionPct)
            : (unit.extraDetails?.commissionPct !== undefined && unit.extraDetails.commissionPct !== null
                ? Number(unit.extraDetails.commissionPct)
                : (viewingLandlord.commissionPct || 0)));

      const filteredBookings = (unit.bookings && Array.isArray(unit.bookings))
        ? unit.bookings.filter((b: any) => {
            if (selectedPeriod === 'all') return true;
            if (!b.checkIn) return false;
            const checkInDate = new Date(b.checkIn);
            const today = new Date();
            if (selectedPeriod === 'today') {
              return checkInDate.getFullYear() === today.getFullYear() &&
                     checkInDate.getMonth() === today.getMonth() &&
                     checkInDate.getDate() === today.getDate();
            }
            if (selectedPeriod === 'week') {
              const diffTime = today.getTime() - checkInDate.getTime();
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              return diffDays >= 0 && diffDays <= 7;
            }
            if (selectedPeriod === 'month') {
              return checkInDate.getFullYear() === today.getFullYear() &&
                     checkInDate.getMonth() === today.getMonth();
            }
            if (selectedPeriod === 'year') {
              return checkInDate.getFullYear() === today.getFullYear();
            }
            return true;
          })
        : [];
        
      filteredBookings.forEach((b: any) => {
          const usdToAed = b.currency.toUpperCase() === 'USD' ? 3.6725 : 1.0;
          const bookingGross = Number(b.grossAmount || b.totalAmount) * usdToAed;
          const bookingTotal = Number(b.totalAmount) * usdToAed;
          
          const grossShare = bookingGross * (sharePct / 100);

          if (!!viewingLandlord.isIntermediary) {
            // Partner (Stay Local) charges their host a base commission (e.g. 12%)
            const totalDeductedFee = grossShare * (propCommPct / 100);
            let operatorShare = 0;

            const model = viewingLandlord.partnerModel || 'fee_pct';
            const val = (mySplit && mySplit.partnerValue !== undefined && mySplit.partnerValue !== null)
              ? Number(mySplit.partnerValue)
              : (Number(viewingLandlord.partnerValue) || 0);

            if (model === 'gross_pct') {
              operatorShare = grossShare * (val / 100);
            } else if (model === 'fee_pct') {
              operatorShare = totalDeductedFee * (val / 100);
            } else if (model === 'monthly_flat') {
              const start = new Date(b.checkIn);
              const end = new Date(b.checkOut);
              const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
              const dailyRate = (val * 12) / 365.25;
              operatorShare = dailyRate * nights;
            }
            operatorShare = Math.min(totalDeductedFee, operatorShare);

            // Stay Local's gross revenue is totalDeductedFee, Airbetter's commission is operatorShare
            unitRevenue += totalDeductedFee;
            unitCommission += operatorShare;
            unitOperatorShare += operatorShare;
            unitPartnerShare += Math.max(0, totalDeductedFee - operatorShare);
          } else {
            // Standard landlord contract
            const commAmt = grossShare * (propCommPct / 100);
            unitRevenue += grossShare;
            unitCommission += commAmt;

            if (unit.linkedPartnerModel) {
              const model = unit.linkedPartnerModel;
              const val = Number(unit.linkedPartnerValue) || 0;
              let opShare = 0;
              if (model === 'gross_pct') {
                opShare = grossShare * (val / 100);
              } else if (model === 'fee_pct') {
                opShare = commAmt * (val / 100);
              } else if (model === 'monthly_flat') {
                const start = new Date(b.checkIn);
                const end = new Date(b.checkOut);
                const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                const dailyRate = (val * 12) / 365.25;
                opShare = dailyRate * nights;
              }
              opShare = Math.min(commAmt, opShare);
              unitOperatorShare += opShare;
              unitPartnerShare += Math.max(0, commAmt - opShare);
            }
          }
          
          const paymentsSum = b.payments ? b.payments.reduce((sum: number, pay: any) => {
            const payUsdToAed = pay.currency.toUpperCase() === 'USD' ? 3.6725 : 1.0;
            return sum + (Number(pay.amount) * payUsdToAed);
          }, 0) : 0;
          
          let bookingOutstanding = Math.max(0, bookingTotal - paymentsSum);
          if (b.source === 'Airbnb') {
            bookingOutstanding = 0;
          }
          unitOutstanding += bookingOutstanding * (sharePct / 100);
        });
      
      const unitPayout = Math.max(0, unitRevenue - unitCommission);
      
      totalRevenue += unitRevenue;
      totalCommission += unitCommission;
      totalOutstanding += unitOutstanding;
      totalPartnerShare += unitPartnerShare;
      totalOperatorShare += unitOperatorShare;
      
      return {
        id: unit.id,
        name: unit.name,
        sharePct,
        commissionPct: propCommPct,
        bookingsCount: filteredBookings.length,
        revenue: unitRevenue,
        commission: unitCommission,
        payout: unitPayout,
        outstanding: unitOutstanding,
        partnerShare: unitPartnerShare,
        operatorShare: unitOperatorShare,
      };
    });
    
    const ownerPayouts = Math.max(0, totalRevenue - totalCommission);
    
    return {
      totalRevenue,
      totalCommission,
      ownerPayouts,
      outstanding: totalOutstanding,
      totalPartnerShare,
      totalOperatorShare,
      unitFinancials
    };
  }, [linkedUnits, viewingLandlord, selectedPeriod]);

  const agentOwnedUnits = React.useMemo(() => {
    if (!viewingAgent) return [];
    return properties.filter(p => {
      const splits = p.extraDetails?.ownerSplits || [];
      if (Array.isArray(splits) && splits.length > 0) {
        return splits.some((s: any) => s.contactId === viewingAgent.id);
      }
      return p.ownerContactId === viewingAgent.id;
    });
  }, [properties, viewingAgent]);

  const agentsCalculated = React.useMemo(() => {
    return agents.map(agent => {
      const details = agent.bankDetails || {};
      const referredHostIds = details.referredHostIds || [];
      const referredPropertyIds = details.referredPropertyIds || [];
      const referralPct = Number(details.referralPct) || 0;
      const commissionBase = details.commissionBase || 'gross_revenue';
      const payoutMethod = details.payoutMethod || 'Direct Bank Transfer (ENBD)';

      // Find all properties referred by this agent (explicit property IDs, fallback to host-level properties)
      const referredProperties = properties.filter(p => {
        if (referredPropertyIds.includes(p.id)) return true;
        
        if (referredPropertyIds.length === 0) {
          const splits = p.extraDetails?.ownerSplits || [];
          if (Array.isArray(splits) && splits.length > 0) {
            return splits.some((s: any) => referredHostIds.includes(s.contactId));
          }
          return p.ownerContactId && referredHostIds.includes(p.ownerContactId);
        }
        return false;
      });

      let totalReferredRevenue = 0;
      let totalReferredCommission = 0;
      let totalAgentPayout = 0;
      let bookingsCount = 0;

      const unitDetails = referredProperties.map((unit: any) => {
        let unitRevenue = 0;
        let unitCommission = 0;
        let unitAgentPayout = 0;

        const splits = unit.extraDetails?.ownerSplits || [];
        const activeSplits = Array.isArray(splits) && splits.length > 0
          ? splits.filter((s: any) => referredHostIds.includes(s.contactId))
          : (unit.ownerContactId && referredHostIds.includes(unit.ownerContactId)
              ? [{ contactId: unit.ownerContactId, sharePct: 100 }]
              : []);

        const filteredBookings = (unit.bookings && Array.isArray(unit.bookings))
          ? unit.bookings.filter((b: any) => {
              if (selectedPeriod === 'all') return true;
              if (!b.checkIn) return false;
              const checkInDate = new Date(b.checkIn);
              const today = new Date();
              if (selectedPeriod === 'today') {
                return checkInDate.getFullYear() === today.getFullYear() &&
                       checkInDate.getMonth() === today.getMonth() &&
                       checkInDate.getDate() === today.getDate();
              }
              if (selectedPeriod === 'week') {
                const diffTime = today.getTime() - checkInDate.getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                return diffDays >= 0 && diffDays <= 7;
              }
              if (selectedPeriod === 'month') {
                return checkInDate.getFullYear() === today.getFullYear() &&
                       checkInDate.getMonth() === today.getMonth();
              }
              if (selectedPeriod === 'year') {
                return checkInDate.getFullYear() === today.getFullYear();
              }
              return true;
            })
          : [];

        bookingsCount += filteredBookings.length;
        filteredBookings.forEach((b: any) => {
          const usdToAed = b.currency.toUpperCase() === 'USD' ? 3.6725 : 1.0;
          const bookingGross = Number(b.grossAmount || b.totalAmount) * usdToAed;

          activeSplits.forEach((split: any) => {
            const sharePct = Number(split.sharePct) || 100;
            const hostCommPct = split.commissionPct !== undefined
              ? Number(split.commissionPct)
              : (unit.owner?.bankDetails?.isIntermediary && unit.linkedCommissionPct !== undefined && unit.linkedCommissionPct !== null
                  ? Number(unit.linkedCommissionPct)
                  : (unit.owner?.bankDetails?.commissionPct !== undefined 
                      ? Number(unit.owner.bankDetails.commissionPct) 
                      : 15));
            
            const hostGrossShare = bookingGross * (sharePct / 100);
            const hostManagementFee = hostGrossShare * (hostCommPct / 100);

            unitRevenue += hostGrossShare;
            unitCommission += hostManagementFee;

            if (commissionBase === 'management_commission') {
              unitAgentPayout += hostManagementFee * (referralPct / 100);
            } else {
              unitAgentPayout += hostGrossShare * (referralPct / 100);
            }
          });
        });

        totalReferredRevenue += unitRevenue;
        totalReferredCommission += unitCommission;
        totalAgentPayout += unitAgentPayout;

        // Owner names for display
        const ownerNames = activeSplits.map((s: any) => {
          const ownerContact = properties.find(p => p.owner && p.owner.id === s.contactId)?.owner;
          return ownerContact ? `${ownerContact.firstName} ${ownerContact.lastName}`.trim() : 'Unknown';
        }).join(', ');

        return {
          id: unit.id,
          name: unit.name,
          ownerName: ownerNames || 'Unknown',
          bookingsCount: filteredBookings.length,
          revenue: unitRevenue,
          commission: unitCommission,
          agentPayout: unitAgentPayout
        };
      });

      // Find referred hosts names
      const referredHostNames = uniqueHosts
        .filter(h => referredHostIds.includes(h.id))
        .map(h => h.name);

      return {
        ...agent,
        referredHostNames,
        referredPropertiesCount: referredProperties.length,
        bookingsCount,
        totalReferredRevenue,
        totalReferredCommission,
        totalAgentPayout,
        unitDetails,
        referralPct,
        commissionBase,
        payoutMethod,
        referredHostIds
      };
    });
  }, [agents, properties, uniqueHosts, selectedPeriod]);

  const filteredAgents = React.useMemo(() => {
    const term = agentSearchTerm.toLowerCase().trim();
    return agentsCalculated.filter(a => {
      const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(term) || a.referredHostNames.some((name: string) => name.toLowerCase().includes(term));
      return matchesSearch;
    });
  }, [agentsCalculated, agentSearchTerm]);

  const handleOpenAgentProfile = (agent: any) => {
    setAgentFirstName(agent.firstName);
    setAgentLastName(agent.lastName);
    setAgentEmail(agent.email || '');
    setAgentPhone(agent.phone || '');
    setAgentReferralPct(agent.referralPct);
    setAgentCommissionBase(agent.commissionBase);
    
    // Set agentReferredPropertyIds from bankDetails
    const details = agent.bankDetails || {};
    const refPropIds = details.referredPropertyIds || [];
    
    // If referredPropertyIds is empty but referredHostIds is not, populate with all properties of those hosts for backward compatibility
    if (refPropIds.length === 0 && details.referredHostIds && details.referredHostIds.length > 0) {
      const fallbackProps = properties.filter(p => {
        const splits = p.extraDetails?.ownerSplits || [];
        if (Array.isArray(splits) && splits.length > 0) {
          return splits.some((s: any) => details.referredHostIds.includes(s.contactId));
        }
        return p.ownerContactId && details.referredHostIds.includes(p.ownerContactId);
      }).map(p => p.id);
      setAgentReferredPropertyIds(fallbackProps);
    } else {
      setAgentReferredPropertyIds(refPropIds);
    }

    setAgentPayoutMethod(agent.payoutMethod);
    setEditAgentId(agent.id);
    setViewingAgent(agent);
    setIsEditingAgentProfile(false);
    setAgentProfileTab('referrals');
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!agentFirstName && !useExistingOwnerAsAgent) || isSaving) return;

    setIsSaving(true);
    try {
      const computedReferredHostIds = Array.from(new Set(
        agentReferredPropertyIds.map(propId => {
          const prop = properties.find(p => p.id === propId);
          if (prop) {
            const splits = prop.extraDetails?.ownerSplits || [];
            if (Array.isArray(splits) && splits.length > 0) {
              return splits.map((s: any) => s.contactId);
            }
            return [prop.ownerContactId];
          }
          return [];
        }).flat().filter(Boolean)
      ));

      const res = await fetch('/api/dashboard/agent-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: useExistingOwnerAsAgent ? selectedOwnerId : undefined,
          firstName: agentFirstName,
          lastName: agentLastName,
          email: agentEmail,
          phone: agentPhone,
          referralPct: Number(agentReferralPct),
          commissionBase: agentCommissionBase,
          referredHostIds: computedReferredHostIds,
          referredPropertyIds: agentReferredPropertyIds,
          payoutMethod: agentPayoutMethod
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create agent');
      }

      setAgentFirstName('');
      setAgentLastName('');
      setAgentEmail('');
      setAgentPhone('');
      setAgentReferralPct(5);
      setAgentCommissionBase('gross_revenue');
      setAgentReferredPropertyIds([]);
      setUseExistingOwnerAsAgent(false);
      setSelectedOwnerId('');
      setShowAddAgentModal(false);
      loadAgents();
    } catch (err: any) {
      alert(err.message || 'An error occurred while creating the agent.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAgentId || !agentFirstName || isSaving) return;

    setIsSaving(true);
    try {
      const computedReferredHostIds = Array.from(new Set(
        agentReferredPropertyIds.map(propId => {
          const prop = properties.find(p => p.id === propId);
          if (prop) {
            const splits = prop.extraDetails?.ownerSplits || [];
            if (Array.isArray(splits) && splits.length > 0) {
              return splits.map((s: any) => s.contactId);
            }
            return [prop.ownerContactId];
          }
          return [];
        }).flat().filter(Boolean)
      ));

      const res = await fetch('/api/dashboard/agent-management', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: editAgentId,
          firstName: agentFirstName,
          lastName: agentLastName,
          email: agentEmail,
          phone: agentPhone,
          referralPct: Number(agentReferralPct),
          commissionBase: agentCommissionBase,
          referredHostIds: computedReferredHostIds,
          referredPropertyIds: agentReferredPropertyIds,
          payoutMethod: agentPayoutMethod
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update agent');
      }

      const data = await res.json();
      const updatedAgent = data.agent;

      setViewingAgent((prev: any) => prev ? {
        ...prev,
        firstName: agentFirstName,
        lastName: agentLastName,
        email: agentEmail,
        phone: agentPhone,
        referralPct: Number(agentReferralPct),
        commissionBase: agentCommissionBase,
        referredHostIds: computedReferredHostIds,
        referredPropertyIds: agentReferredPropertyIds,
        payoutMethod: agentPayoutMethod
      } : null);

      setIsEditingAgentProfile(false);
      loadAgents();
    } catch (err: any) {
      alert(err.message || 'An error occurred while updating the agent.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to remove this agent?')) return;

    try {
      setDeleteType('agent');
      setIsDeleting(true);
      const res = await fetch(`/api/dashboard/agent-management?id=${agentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete agent');
      }

      setViewingAgent(null);
      loadAgents();
    } catch (err: any) {
      alert(err.message || 'An error occurred while deleting the agent.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteLandlord = async (hostId: string) => {
    if (!confirm('Are you sure you want to remove this host profile? This will also unlink them from any properties.')) return;

    try {
      setDeleteType('host');
      setIsDeleting(true);
      const res = await fetch(`/api/dashboard/host-management?id=${hostId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete host');
      }

      setViewingLandlord(null);
      loadProperties();
    } catch (err: any) {
      alert(err.message || 'An error occurred while deleting the host.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderLoadingOverlay = () => {
    if (!isDeleting) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 14, 23, 0.8)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.3s ease-in-out'
      }}>
        {/* Loading Card */}
        <div style={{
          padding: '40px',
          borderRadius: '24px',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          maxWidth: '380px',
          width: '90%',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Animated Spinner with Obsidian / Gold colors */}
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            {/* Glow effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '50%',
              boxShadow: '0 0 30px rgba(var(--accent-primary-rgb), 0.3)',
              animation: 'pulse 2s infinite ease-in-out'
            }} />
            {/* Spinner outer ring (Gold) */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '4px solid rgba(var(--accent-primary-rgb), 0.15)',
              borderTopColor: 'var(--accent-primary)',
              animation: 'spin 1s linear infinite'
            }} />
            {/* Spinner inner ring rotating opposite */}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '4px solid transparent',
              borderBottomColor: '#0a0e17',
              borderTopColor: 'var(--accent-dark)',
              animation: 'spin-reverse 1.5s linear infinite'
            }} />
          </div>
          
          <div>
            <h3 style={{
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              marginBottom: '8px',
              letterSpacing: '0.5px'
            }}>
              {deleteType === 'host' ? 'Removing Host Profile' : 'Removing Agent Profile'}
            </h3>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '13px',
              lineHeight: '1.6',
              fontFamily: 'var(--font-sans)'
            }}>
              {deleteType === 'host' 
                ? 'Updating records, unlinking properties, and finalizing changes. Please do not close this window.'
                : 'Updating records, recalculating commissions, and finalizing changes. Please do not close this window.'}
            </p>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes spin-reverse {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        ` }} />
      </div>
    );
  };

  if (viewingLandlord) {
    const agentProfileForLandlord = agentsCalculated.find(a => a.id === viewingLandlord.id);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {renderLoadingOverlay()}
        {/* Top bar with back button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setViewingLandlord(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              padding: 0,
              width: 'fit-content'
            }}
          >
            ← {t('Back to Hosts')}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>
              {editFirstName} {editLastName}
            </h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleDeleteLandlord(viewingLandlord.id)}
                className="btn-secondary"
                style={{
                  width: 'auto',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-error, #ef4444)',
                  color: 'var(--color-error, #ef4444)',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              >
                {t('Remove Host')}
              </button>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px', borderRadius: '8px' }}
              >
                {isEditingProfile ? t('View Profile') : t('Edit Profile')}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div style={{ display: 'grid', gridTemplateColumns: isEditingProfile ? '1fr 1fr' : '1fr 2fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Column: Landlord Details (View or Edit mode) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(var(--accent-primary-rgb), 0.1)',
                color: 'var(--accent-primary)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                {editFirstName[0] || ''}{editLastName[0] || ''}
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{t('Landlord Account')}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {editContactId || t('Pending')}</span>
              </div>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleUpdateContract} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Host Type Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>{t('Host Type')}</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setEditHostType('individual')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        background: editHostType === 'individual' ? 'var(--accent-primary, #d4af37)' : 'rgba(255,255,255,0.05)',
                        color: editHostType === 'individual' ? 'white' : 'var(--text-secondary)',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {t('Individual')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditHostType('business')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        background: editHostType === 'business' ? 'var(--accent-primary, #d4af37)' : 'rgba(255,255,255,0.05)',
                        color: editHostType === 'business' ? 'white' : 'var(--text-secondary)',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {t('Business')}
                    </button>
                  </div>
                </div>

                {/* Name Inputs depending on Type */}
                {editHostType === 'business' ? (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t('Company Name')}</label>
                      <input
                        type="text"
                        required
                        className="form-control form-input"
                        value={editCompanyName}
                        onChange={e => setEditCompanyName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t('TRN (Tax Registration Number)')}</label>
                      <input
                        type="text"
                        className="form-control form-input"
                        value={editTrn}
                        onChange={e => setEditTrn(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t('Contact Person Name')}</label>
                      <input
                        type="text"
                        required
                        className="form-control form-input"
                        value={editContactPerson}
                        onChange={e => setEditContactPerson(e.target.value)}
                      />
                    </div>
                    {/* Organization Connection Dropdown */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>{t('Link to OMNIBetter Organization Account')}</label>
                      <select
                        className="form-control form-input"
                        value={editLinkedOrganizationId}
                        onChange={e => {
                          const val = e.target.value;
                          setEditLinkedOrganizationId(val);
                          const matched = organizations.find(o => o.id === val);
                          setEditLinkedOrganizationName(matched ? matched.name : '');
                        }}
                        style={{ width: '100%', appearance: 'none', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', fontSize: '13px' }}
                      >
                        <option value="">-- {t('No Link (Independent Host)')} --</option>
                        {organizations.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="form-label">{t('First Name')}</label>
                      <input
                        type="text"
                        required
                        className="form-control form-input"
                        value={editFirstName}
                        onChange={e => setEditFirstName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="form-label">{t('Last Name')}</label>
                      <input
                        type="text"
                        required
                        className="form-control form-input"
                        value={editLastName}
                        onChange={e => setEditLastName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('Email Address')}</label>
                  <input
                    type="email"
                    placeholder="landlord@example.com"
                    className="form-control form-input"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('Phone Number')}</label>
                  <input
                    type="text"
                    placeholder="+971 50 123 4567"
                    className="form-control form-input"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                  />
                </div>

                {!editIsIntermediary && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      {t('Commission Fee (%)')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      max={50}
                      required={!editIsIntermediary}
                      className="form-control form-input"
                      value={editCommPct}
                      onChange={e => setEditCommPct(Number(e.target.value))}
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('Payout Method')}</label>
                  <select
                    className="form-control form-input"
                    value={editPayout}
                    onChange={e => setEditPayout(e.target.value)}
                    style={{ width: '100%', appearance: 'none' }}
                  >
                    <option value="Direct Bank Transfer (ENBD)">{t('Direct Bank Transfer (ENBD)')}</option>
                    <option value="Direct Bank Transfer (ADCB)">{t('Direct Bank Transfer (ADCB)')}</option>
                    <option value="International Wire (HSBC)">{t('International Wire (HSBC)')}</option>
                    <option value="International Wire (MUFG)">{t('International Wire (MUFG)')}</option>
                  </select>
                </div>

                {/* Intermediary Partner settings in edit */}
                {editHostType === 'business' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(255,255,255,0.06)', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id="editIsIntermediaryCheckbox"
                        checked={editIsIntermediary}
                        onChange={e => setEditIsIntermediary(e.target.checked)}
                        style={{ width: 'auto', height: '14px', cursor: 'pointer' }}
                      />
                      <label htmlFor="editIsIntermediaryCheckbox" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                        {t('Intermediary Partner Contract')}
                      </label>
                    </div>

                    {editIsIntermediary && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('Operator Commercial Model')}</label>
                          <select
                            className="form-control form-input"
                            value={editPartnerModel}
                            onChange={e => setEditPartnerModel(e.target.value as any)}
                            style={{ width: '100%', background: 'rgba(10, 14, 23, 0.7)', fontSize: '12px', padding: '6px 12px' }}
                          >
                            <option value="fee_pct">{t("% of Partner's Host Fee")}</option>
                            <option value="gross_pct">{t('% of Gross Bookings')}</option>
                            <option value="monthly_flat">{t('Flat Monthly Fee per Property')}</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {t('Operator Fee Value')} ({editPartnerModel === 'monthly_flat' ? 'AED' : '%'})
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            className="form-control form-input"
                            value={editPartnerValue}
                            onChange={e => setEditPartnerValue(Number(e.target.value))}
                            style={{ width: '100%', fontSize: '12px', padding: '6px 12px' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '10px 0', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '10px 0', borderRadius: '8px', cursor: 'pointer' }}
                    disabled={isSaving || (editHostType === 'business' ? !editCompanyName : !editFirstName) || editSelectedProperties.length === 0}
                  >
                    {isSaving ? t('Saving...') : t('Save Changes')}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
                {viewingLandlord?.companyName && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Company Name')}</span>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{viewingLandlord.companyName}</p>
                  </div>
                )}
                {viewingLandlord?.trn && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('TRN')}</span>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{viewingLandlord.trn}</p>
                  </div>
                )}
                {viewingLandlord?.contactPerson && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Contact Person')}</span>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{viewingLandlord.contactPerson}</p>
                  </div>
                )}
                {viewingLandlord?.isIntermediary && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Partner Agreement Model')}</span>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>
                      {viewingLandlord.partnerModel === 'gross_pct' ? `${viewingLandlord.partnerValue}% ${t('of Gross Bookings')}` :
                       viewingLandlord.partnerModel === 'fee_pct' ? `${viewingLandlord.partnerValue}% ${t("of Partner's")} ${viewingLandlord.commissionPct}% ${t('Host Fee')}` :
                       `${viewingLandlord.partnerValue} ${t('AED Monthly Flat Fee per Unit')}`}
                    </p>
                  </div>
                )}
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Email')}</span>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{editEmail || '—'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Phone')}</span>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{editPhone || '—'}</p>
                </div>
                {!viewingLandlord?.isIntermediary && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>
                      {t('Commission Rate')}
                    </span>
                    <p style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '18px', marginTop: '2px' }}>{editCommPct}%</p>
                  </div>
                )}
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Payout Method')}</span>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{editPayout}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Date Joined')}</span>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>
                    {viewingLandlord?.dateJoined || '—'}
                  </p>
                </div>
                {viewingLandlord?.bankDetails?.linkedOrganizationId && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Partner Organization Link')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {viewingLandlord.bankDetails.linkedOrganizationName}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: viewingLandlord.bankDetails.linkStatus === 'approved' ? 'rgba(16, 185, 129, 0.1)' :
                                    viewingLandlord.bankDetails.linkStatus === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: viewingLandlord.bankDetails.linkStatus === 'approved' ? '#10b981' :
                               viewingLandlord.bankDetails.linkStatus === 'pending' ? '#f59e0b' : '#ef4444',
                        border: `1px solid ${
                          viewingLandlord.bankDetails.linkStatus === 'approved' ? 'rgba(16, 185, 129, 0.2)' :
                          viewingLandlord.bankDetails.linkStatus === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                        }`
                      }}>
                        {t(viewingLandlord.bankDetails.linkStatus === 'approved' ? 'Approved' : viewingLandlord.bankDetails.linkStatus === 'pending' ? 'Pending' : 'Declined')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Properties Checklist (if editing) OR Properties Grid View (if viewing) */}
          {isEditingProfile ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{t('Link properties')}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(var(--accent-primary-rgb), 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {editSelectedProperties.length} {t('Linked')}
                </span>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder={t('Search properties to link...')}
                  value={editPropSearchTerm}
                  onChange={e => setEditPropSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 32px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, color: 'var(--text-secondary)' }} />
              </div>

              <div style={{ 
                maxHeight: '340px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px'
              }}>
                  {filteredAllProperties.map(p => {
                  const selectedItem = editSelectedProperties.find(sp => sp.name === p.name);
                  const isSelected = !!selectedItem;
                  const coOwnersWarning = getCoOwnersWarning(p, editContactId);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => {
                        if (isSelected) {
                          setEditSelectedProperties(editSelectedProperties.filter(sp => sp.name !== p.name));
                        } else {
                          const otherOwnersCount = getOtherOwnersCount(p, editContactId);
                          const defaultShare = Math.round(100 / (otherOwnersCount + 1));
                          const defaultRate = p.extraDetails?.commissionPct !== undefined ? Number(p.extraDetails.commissionPct) : undefined;
                          setEditSelectedProperties([...editSelectedProperties, { name: p.name, sharePct: defaultShare, commissionPct: defaultRate }]);
                        }
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.1)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = isSelected ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.15)' : 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.1)' : 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ pointerEvents: 'none' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</span>
                          {coOwnersWarning && (
                            <span style={{ fontSize: '11px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <AlertCircle size={10} /> {coOwnersWarning}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '22px', marginTop: '10px', width: '100%' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('Share %:')}</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={selectedItem.sharePct !== undefined ? selectedItem.sharePct : 100}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 100 : Number(e.target.value);
                                  setEditSelectedProperties(editSelectedProperties.map(sp => 
                                    sp.name === p.name ? { ...sp, sharePct: val } : sp
                                  ));
                                }}
                                style={{
                                  width: '50px',
                                  background: 'rgba(0, 0, 0, 0.4)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '4px',
                                  padding: '2px 4px',
                                  color: 'var(--text-primary)',
                                  fontSize: '11px',
                                  outline: 'none',
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {editIsIntermediary ? t('Operator Fee:') : t('Rate:')}
                              </span>
                              <input
                                type="number"
                                step="any"
                                min={0}
                                max={100}
                                placeholder={editIsIntermediary 
                                  ? `${editPartnerValue}${editPartnerModel === 'monthly_flat' ? ' AED' : '%'}`
                                  : `${editCommPct}%`}
                                value={editIsIntermediary 
                                  ? (selectedItem.partnerValue !== undefined ? selectedItem.partnerValue : '')
                                  : (selectedItem.commissionPct !== undefined ? selectedItem.commissionPct : '')}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                                  setEditSelectedProperties(editSelectedProperties.map(sp => 
                                    sp.name === p.name 
                                      ? (editIsIntermediary ? { ...sp, partnerValue: val } : { ...sp, commissionPct: val })
                                      : sp
                                  ));
                                }}
                                style={{
                                  width: '55px',
                                  background: 'rgba(0, 0, 0, 0.4)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '4px',
                                  padding: '2px 4px',
                                  color: 'var(--text-primary)',
                                  fontSize: '11px',
                                  outline: 'none',
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '2px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{t('Contracts:')}</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {(selectedItem.contracts && selectedItem.contracts.length > 0
                                ? selectedItem.contracts
                                : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }]
                              ).map((cVal, cIdx) => (
                                <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input
                                    type="date"
                                    value={cVal.startDate || ''}
                                    onChange={(e) => {
                                      const updatedContracts = [...(selectedItem.contracts && selectedItem.contracts.length > 0
                                        ? selectedItem.contracts
                                        : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }])];
                                      updatedContracts[cIdx] = { ...updatedContracts[cIdx], startDate: e.target.value };
                                      const active = getActiveContractDates(updatedContracts);
                                      setEditSelectedProperties(editSelectedProperties.map(sp => 
                                        sp.name === p.name ? { 
                                          ...sp, 
                                          contracts: updatedContracts,
                                          contractStart: active.contractStart,
                                          contractEnd: active.contractEnd
                                        } : sp
                                      ));
                                    }}
                                    style={{
                                      background: 'rgba(0, 0, 0, 0.4)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      padding: '2px 4px',
                                      color: 'var(--text-primary)',
                                      fontSize: '11px',
                                      outline: 'none',
                                    }}
                                  />
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('to')}</span>
                                  <input
                                    type="date"
                                    value={cVal.endDate || ''}
                                    onChange={(e) => {
                                      const updatedContracts = [...(selectedItem.contracts && selectedItem.contracts.length > 0
                                        ? selectedItem.contracts
                                        : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }])];
                                      updatedContracts[cIdx] = { ...updatedContracts[cIdx], endDate: e.target.value };
                                      const active = getActiveContractDates(updatedContracts);
                                      setEditSelectedProperties(editSelectedProperties.map(sp => 
                                        sp.name === p.name ? { 
                                          ...sp, 
                                          contracts: updatedContracts,
                                          contractStart: active.contractStart,
                                          contractEnd: active.contractEnd
                                        } : sp
                                      ));
                                    }}
                                    style={{
                                      background: 'rgba(0, 0, 0, 0.4)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      padding: '2px 4px',
                                      color: 'var(--text-primary)',
                                      fontSize: '11px',
                                      outline: 'none',
                                    }}
                                  />
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                                    <input
                                      type="checkbox"
                                      checked={!!cVal.isAutoRenew}
                                      onChange={(e) => {
                                        const updatedContracts = [...(selectedItem.contracts && selectedItem.contracts.length > 0
                                          ? selectedItem.contracts
                                          : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }])];
                                        updatedContracts[cIdx] = { ...updatedContracts[cIdx], isAutoRenew: e.target.checked };
                                        const active = getActiveContractDates(updatedContracts);
                                        setEditSelectedProperties(editSelectedProperties.map(sp => 
                                          sp.name === p.name ? { 
                                            ...sp, 
                                            contracts: updatedContracts,
                                            contractStart: active.contractStart,
                                            contractEnd: active.contractEnd
                                          } : sp
                                        ));
                                      }}
                                    />
                                    {t('Auto-renew')}
                                  </label>
                                  {((selectedItem.contracts && selectedItem.contracts.length > 1) || cIdx > 0) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedContracts = (selectedItem.contracts && selectedItem.contracts.length > 0
                                          ? selectedItem.contracts
                                          : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }])
                                          .filter((_, idx) => idx !== cIdx);
                                        const active = getActiveContractDates(updatedContracts);
                                        setEditSelectedProperties(editSelectedProperties.map(sp => 
                                          sp.name === p.name ? { 
                                            ...sp, 
                                            contracts: updatedContracts,
                                            contractStart: active.contractStart,
                                            contractEnd: active.contractEnd
                                          } : sp
                                        ));
                                      }}
                                      style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 0 }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedContracts = [...(selectedItem.contracts && selectedItem.contracts.length > 0
                                  ? selectedItem.contracts
                                  : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }]), { startDate: '', endDate: '' }];
                                setEditSelectedProperties(editSelectedProperties.map(sp => 
                                  sp.name === p.name ? { ...sp, contracts: updatedContracts } : sp
                                ));
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-primary)',
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: '4px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '4px'
                              }}
                            >
                              <Plus size={10} /> {t('Add contract renewal')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Tab Selector */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
                <button
                  type="button"
                  onClick={() => setProfileTab('units')}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: profileTab === 'units' ? 600 : 400,
                    color: profileTab === 'units' ? 'var(--accent-primary)' : 'var(--text-muted)',
                    background: profileTab === 'units' ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.08)' : 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${profileTab === 'units' ? 'var(--accent-primary)' : 'transparent'}`,
                    borderRadius: '6px 6px 0 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {t('Managed Units')} ({linkedUnits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab('financials')}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: profileTab === 'financials' ? 600 : 400,
                    color: profileTab === 'financials' ? 'var(--accent-primary)' : 'var(--text-muted)',
                    background: profileTab === 'financials' ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.08)' : 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${profileTab === 'financials' ? 'var(--accent-primary)' : 'transparent'}`,
                    borderRadius: '6px 6px 0 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {t('Financial Overview')}
                </button>
              </div>

              {profileTab === 'units' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{t('Managed Units')} ({linkedUnits.length})</h2>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('Standard portfolio view')}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {linkedUnits.map(unit => (
                      <div key={unit.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{unit.name}</h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t(unit.propertyType)} in {unit.city}</p>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '12px',
                            textTransform: 'uppercase',
                            background: unit.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: unit.status === 'active' ? 'var(--color-success)' : 'var(--color-warning)',
                            border: `1px solid ${unit.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                          }}>
                            {t(unit.status === 'active' ? 'Active' : 'Pending')}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                          <p>
                            <strong>{t('Address')}:</strong>{' '}
                            {(() => {
                              const address = unit.addressLine1 || '';
                              const isUrl = address.trim().startsWith('http://') || address.trim().startsWith('https://');
                              if (isUrl) {
                                try {
                                  const url = new URL(address.trim());
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
                                    <a
                                      href={address.trim()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                                    >
                                      {displayUrl}
                                    </a>
                                  );
                                } catch {
                                  return address;
                                }
                              }
                              return address;
                            })()}
                            {unit.city ? `, ${unit.city}` : ''}
                          </p>
                          {unit.dtcmPermitNumber && <p style={{ marginTop: '4px' }}><strong>{t('DTCM Permit')}:</strong> {unit.dtcmPermitNumber}</p>}
                          {(() => {
                            const splits = unit.extraDetails?.ownerSplits || [];
                            const mySplit = Array.isArray(splits) ? splits.find((s: any) => s.contactId === viewingLandlord.id) : null;
                            const sharePct = mySplit ? Number(mySplit.sharePct) : 100;
                            const commissionPct = mySplit?.commissionPct !== undefined
                              ? Number(mySplit.commissionPct)
                              : (viewingLandlord.isIntermediary && unit.linkedCommissionPct !== undefined && unit.linkedCommissionPct !== null
                                  ? Number(unit.linkedCommissionPct)
                                  : (unit.extraDetails?.commissionPct !== undefined 
                                      ? Number(unit.extraDetails.commissionPct) 
                                      : (viewingLandlord.commissionPct || 0)));
                            const propContractStart = mySplit?.contractStart || null;
                            const propContractEnd = mySplit?.contractEnd || null;
                            const propContractsList = mySplit?.contracts || [];
                            const isIntermediary = !!viewingLandlord.isIntermediary;
                            const partnerModel = viewingLandlord.partnerModel || 'fee_pct';
                            const propPartnerValue = (mySplit && mySplit.partnerValue !== undefined && mySplit.partnerValue !== null)
                              ? Number(mySplit.partnerValue)
                              : (Number(viewingLandlord.partnerValue) || 0);
                            return (
                              <>
                                <p style={{ marginTop: '4px' }}>
                                  <strong>{t('Ownership Split')}:</strong>{' '}
                                  <span style={{ color: 'var(--color-info)', fontWeight: 600 }}>
                                    {sharePct}% {t('Share')}
                                  </span>
                                </p>
                                <p style={{ marginTop: '4px' }}>
                                  {isIntermediary ? (
                                    <>
                                      <strong>{t('Operator Fee')}:</strong>{' '}
                                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                        {partnerModel === 'monthly_flat'
                                          ? `${propPartnerValue} AED`
                                          : `${propPartnerValue.toFixed(2)}%`}{' '}
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                                          {partnerModel === 'gross_pct' ? t('of Gross') :
                                           partnerModel === 'fee_pct' ? t('of fee') :
                                           t('monthly flat')}
                                        </span>
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <strong>{t('Commission Rate')}:</strong>{' '}
                                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                        {commissionPct}%
                                      </span>
                                    </>
                                  )}
                                </p>
                                {unit.extraDetails?.linkedPropertyId && (
                                  <p style={{ marginTop: '4px' }}>
                                    <strong>{t('Linked To')}:</strong>{' '}
                                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                                      {unit.extraDetails.linkedPropertyName} ({unit.extraDetails.linkedOrganizationName})
                                    </span>
                                  </p>
                                )}
                                <div style={{ marginTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('Contracts History')}:</span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                    {propContractsList.length > 0 ? (
                                      propContractsList.map((c: any, idx: number) => {
                                        const term = getEffectiveContractTerm(c.startDate || null, c.endDate || null, c.isAutoRenew);
                                        const dateDisplay = c.endDate
                                          ? `${c.startDate} ${t('to')} ${c.endDate}${c.isAutoRenew ? ' (' + t('Auto-renew') + ')' : ''}`
                                          : `${c.startDate} ${t('to')} ${t('Present')} (${t('Open-ended')})`;
                                        return (
                                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                {dateDisplay}
                                              </span>
                                              {term.isActive && (
                                                <span style={{
                                                  fontSize: '9px',
                                                  padding: '1px 4px',
                                                  borderRadius: '3px',
                                                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                  color: '#10b981',
                                                  border: '1px solid rgba(16, 185, 129, 0.2)',
                                                  fontWeight: 600
                                                }}>
                                                  {t('Active')}
                                                </span>
                                              )}
                                            </div>
                                            {c.isAutoRenew && term.isActive && term.startDate !== c.startDate && (
                                              <span style={{ fontSize: '10px', color: 'var(--color-success)', fontStyle: 'italic', paddingLeft: '8px' }}>
                                                ↳ {t('Current Period')}: {term.startDate} {t('to')} {term.endDate}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <span style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                                        {propContractStart ? (
                                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>
                                              {propContractStart} {t('to')} {propContractEnd || t('Present')}
                                            </span>
                                            {getEffectiveContractTerm(propContractStart, propContractEnd, false).isActive && (
                                              <span style={{
                                                fontSize: '9px',
                                                padding: '1px 4px',
                                                borderRadius: '3px',
                                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10b981',
                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                fontWeight: 600
                                              }}>
                                                {t('Active')}
                                              </span>
                                            )}
                                          </span>
                                        ) : (
                                          '—'
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        <a 
                          href={`/dashboard/properties/${unit.id}`}
                          style={{
                            marginTop: 'auto',
                            textAlign: 'center',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--accent-primary)',
                            textDecoration: 'none',
                            padding: '8px 0',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: 'rgba(var(--accent-primary-rgb), 0.03)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--accent-primary)';
                            e.currentTarget.style.color = '#000';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.03)';
                            e.currentTarget.style.color = 'var(--accent-primary)';
                          }}
                        >
                          {t('View Property Profile')}
                        </a>

                        {viewingLandlord?.bankDetails?.linkStatus === 'approved' && partnerProperties.length > 0 && (
                          <div style={{ marginTop: '12px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                              {t('Link to Partner Property')}
                            </label>
                            <select
                              value={unit.extraDetails?.linkedPropertyId || ''}
                              onChange={async (e) => {
                                const targetId = e.target.value;
                                const targetProp = partnerProperties.find(p => p.id === targetId);
                                
                                const updatedExtra = {
                                  ...unit.extraDetails,
                                  linkedPropertyId: targetId || null,
                                  linkedOrganizationId: targetId ? viewingLandlord.bankDetails.linkedOrganizationId : null,
                                  linkedPropertyName: targetProp ? targetProp.name : null,
                                  linkedOrganizationName: targetProp ? viewingLandlord.bankDetails.linkedOrganizationName : null
                                };

                                if (!targetId) {
                                  delete updatedExtra.linkedPropertyId;
                                  delete updatedExtra.linkedOrganizationId;
                                  delete updatedExtra.linkedPropertyName;
                                  delete updatedExtra.linkedOrganizationName;
                                }

                                try {
                                  const res = await fetch(`/api/properties/${unit.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ extraDetails: updatedExtra })
                                  });
                                  if (res.ok) {
                                    loadProperties();
                                  } else {
                                    alert(t('Failed to update property mapping'));
                                  }
                                } catch (err) {
                                  console.error('Error linking property:', err);
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                                outline: 'none'
                              }}
                            >
                              <option value="">-- {t('Unlinked')} --</option>
                              {partnerProperties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {linkedUnits.length === 0 && (
                      <div className="card" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: '14px' }}>{t('No properties are currently linked to this landlord.')}</p>
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="btn-primary"
                          style={{ width: 'auto', margin: '16px auto 0', padding: '8px 16px', borderRadius: '6px' }}
                        >
                          {t('Link a Property')}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{t('Financial Overview')}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('Filter:')}</span>
                      <select
                        className="period-filter-select"
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value as any)}
                      >
                        <option value="all">{t('All Time')}</option>
                        <option value="today">{t('Today')}</option>
                        <option value="week">{t('This Week')}</option>
                        <option value="month">{t('This Month')}</option>
                        <option value="year">{t('This Year')}</option>
                      </select>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>| {t('Combined portfolio performance (AED)')}</span>
                    </div>
                  </div>

                  {/* Financial Stats Ribbon */}
                  <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', width: '100%' }}>
                    {agentProfileForLandlord ? (
                      <>
                        <div className="card" style={{ border: '1px solid var(--accent-primary)', padding: '16px', background: 'rgba(var(--accent-primary-rgb), 0.03)' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>{getCombinedPayoutsLabel()}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', marginTop: '8px' }}>
                            {(landlordFinancials.ownerPayouts + agentProfileForLandlord.totalAgentPayout).toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Host payouts + Agent referral earnings')}</div>
                        </div>

                        <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{getHostPayoutsLabel()}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-info)', marginTop: '8px' }}>
                            {landlordFinancials.ownerPayouts.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Net property rental payout')}</div>
                        </div>

                        <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{getAgentPayoutsLabel()}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '8px' }}>
                            {agentProfileForLandlord.totalAgentPayout.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Referral commission generated')}</div>
                        </div>

                        <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Outstanding Balance')}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-warning)', marginTop: '8px' }}>
                            {landlordFinancials.outstanding.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Awaiting guest payment')}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Total Revenue')}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', marginTop: '8px' }}>
                            {landlordFinancials.totalRevenue.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Gross rental receipts')}</div>
                        </div>

                        <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{getPayoutsLabel()}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-info)', marginTop: '8px' }}>
                            {landlordFinancials.ownerPayouts.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Net payable amount')}</div>
                        </div>

                        <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Management Fees')}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '8px' }}>
                            {landlordFinancials.totalCommission.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {landlordFinancials.totalOperatorShare > 0 ? (
                              <span>
                                {t('SL Net:')} <strong>{landlordFinancials.totalPartnerShare.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}</strong> / {t('AB:')} <strong>{landlordFinancials.totalOperatorShare.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}</strong>
                              </span>
                            ) : (
                              t('Company commission share')
                            )}
                          </div>
                        </div>

                        <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Outstanding Balance')}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-warning)', marginTop: '8px' }}>
                            {landlordFinancials.outstanding.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Awaiting guest payment')}</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Properties financial table */}
                  <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                    <table className="runsheet-table" style={{ minWidth: '600px', width: '100%' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Property')}</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>{t('Bookings')}</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Revenue')}</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Commission')}</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Net Payout')}</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Outstanding')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {landlordFinancials.unitFinancials.map((unit) => (
                          <tr key={unit.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                               {unit.name}{' '}
                               <span style={{ fontSize: '11px', color: 'var(--color-info)', fontWeight: 500 }}>
                                 ({unit.sharePct}% {t('Share')})
                               </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>{unit.bookingsCount}</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-success)', textAlign: 'right', fontWeight: 500 }}>
                              {unit.revenue.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--accent-primary)', textAlign: 'right' }}>
                              {unit.commission.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                              {unit.operatorShare > 0 && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  SL Net: {unit.partnerShare.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })} / AB: {unit.operatorShare.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-info)', textAlign: 'right', fontWeight: 600 }}>
                              {unit.payout.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-warning)', textAlign: 'right' }}>
                              {unit.outstanding.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                            </td>
                          </tr>
                        ))}
                        {landlordFinancials.unitFinancials.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                              {t('No properties linked to calculate financial overview.')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {agentProfileForLandlord && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{t('Referred Portfolio Performance')}</h2>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('Referral details for')} {agentProfileForLandlord.referredHostNames.join(', ')}</span>
                      </div>
                      <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                        <table className="runsheet-table" style={{ minWidth: '600px', width: '100%' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Property')}</th>
                              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Owner')}</th>
                              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>{t('Bookings')}</th>
                              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Referred Revenue')}</th>
                              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Referral Comm.')} ({agentProfileForLandlord.referralPct}%)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agentProfileForLandlord.unitDetails.map((unit: any) => (
                              <tr key={unit.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{unit.name}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{unit.ownerName}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>{unit.bookingsCount}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-success)', textAlign: 'right', fontWeight: 500 }}>
                                  {unit.revenue.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--accent-primary)', textAlign: 'right', fontWeight: 600 }}>
                                  {unit.agentPayout.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                                </td>
                              </tr>
                            ))}
                            {agentProfileForLandlord.unitDetails.length === 0 && (
                              <tr>
                                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                  {t('No referred property bookings to calculate commission.')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    );
  }

  if (viewingAgent) {
    // Calculate current agent's stats from agentsCalculated array
    const currentAgent = agentsCalculated.find(a => a.id === viewingAgent.id) || viewingAgent;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {renderLoadingOverlay()}
        {/* Top bar with back button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setViewingAgent(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              padding: 0,
              width: 'fit-content'
            }}
          >
            ← {t('Back to Agents')}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>
              {agentFirstName} {agentLastName}
            </h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleDeleteAgent(currentAgent.id)}
                className="btn-secondary"
                style={{
                  width: 'auto',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-error, #ef4444)',
                  color: 'var(--color-error, #ef4444)',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              >
                {t('Remove Agent')}
              </button>
              <button
                onClick={() => {
                  if (isEditingAgentProfile) {
                    setAgentFirstName(currentAgent.firstName);
                    setAgentLastName(currentAgent.lastName);
                    setAgentEmail(currentAgent.email || '');
                    setAgentPhone(currentAgent.phone || '');
                    setAgentReferralPct(currentAgent.referralPct);
                    setAgentCommissionBase(currentAgent.commissionBase);
                    const details = currentAgent.bankDetails || {};
                    const refPropIds = details.referredPropertyIds || [];
                    if (refPropIds.length === 0 && details.referredHostIds && details.referredHostIds.length > 0) {
                      const fallbackProps = properties.filter(p => {
                        const splits = p.extraDetails?.ownerSplits || [];
                        if (Array.isArray(splits) && splits.length > 0) {
                          return splits.some((s: any) => details.referredHostIds.includes(s.contactId));
                        }
                        return p.ownerContactId && details.referredHostIds.includes(p.ownerContactId);
                      }).map(p => p.id);
                      setAgentReferredPropertyIds(fallbackProps);
                    } else {
                      setAgentReferredPropertyIds(refPropIds);
                    }
                    setAgentPayoutMethod(currentAgent.payoutMethod);
                  }
                  setIsEditingAgentProfile(!isEditingAgentProfile);
                }}
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px', borderRadius: '8px' }}
              >
                {isEditingAgentProfile ? t('View Profile') : t('Edit Profile')}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div style={{ display: 'grid', gridTemplateColumns: isEditingAgentProfile ? '1fr 1fr' : '1fr 2fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Column: Agent Details (View or Edit mode) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(var(--accent-primary-rgb), 0.1)',
                color: 'var(--accent-primary)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                {agentFirstName[0] || ''}{agentLastName[0] || ''}
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{t('Referral Agent')}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {currentAgent.id}</span>
              </div>
            </div>

            {isEditingAgentProfile ? (
              <form onSubmit={handleUpdateAgent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="form-label">{t('First Name')}</label>
                    <input
                      type="text"
                      required
                      className="form-control form-input"
                      value={agentFirstName}
                      onChange={e => setAgentFirstName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="form-label">{t('Last Name')}</label>
                    <input
                      type="text"
                      required
                      className="form-control form-input"
                      value={agentLastName}
                      onChange={e => setAgentLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('Email Address')}</label>
                  <input
                    type="email"
                    placeholder="agent@example.com"
                    className="form-control form-input"
                    value={agentEmail}
                    onChange={e => setAgentEmail(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('Phone Number')}</label>
                  <input
                    type="text"
                    placeholder="+971 50 123 4567"
                    className="form-control form-input"
                    value={agentPhone}
                    onChange={e => setAgentPhone(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('Referral Rate (%)')}</label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    max={100}
                    required
                    className="form-control form-input"
                    value={agentReferralPct}
                    onChange={e => setAgentReferralPct(Number(e.target.value))}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('Commission Base')}</label>
                  <select
                    className="form-control form-input"
                    value={agentCommissionBase}
                    onChange={e => setAgentCommissionBase(e.target.value as any)}
                    style={{ width: '100%', appearance: 'none' }}
                  >
                    <option value="gross_revenue">{t('Gross Booking Revenue')}</option>
                    <option value="management_commission">{t('Management Commission')}</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('Payout Method')}</label>
                  <select
                    className="form-control form-input"
                    value={agentPayoutMethod}
                    onChange={e => setAgentPayoutMethod(e.target.value)}
                    style={{ width: '100%', appearance: 'none' }}
                  >
                    <option value="Direct Bank Transfer (ENBD)">{t('Direct Bank Transfer (ENBD)')}</option>
                    <option value="Direct Bank Transfer (ADCB)">{t('Direct Bank Transfer (ADCB)')}</option>
                    <option value="International Wire (HSBC)">{t('International Wire (HSBC)')}</option>
                    <option value="International Wire (MUFG)">{t('International Wire (MUFG)')}</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingAgentProfile(false)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '10px 0', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '10px 0', borderRadius: '8px', cursor: 'pointer' }}
                    disabled={isSaving || !agentFirstName}
                  >
                    {isSaving ? t('Saving...') : t('Save Changes')}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Email')}</span>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{agentEmail || '—'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Phone')}</span>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{agentPhone || '—'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Referral Commission')}</span>
                  <p style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '18px', marginTop: '2px' }}>
                    {agentReferralPct}% <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({agentCommissionBase === 'management_commission' ? t('of Mgmt Fees') : t('of Gross Rev')})</span>
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 500 }}>{t('Payout Method')}</span>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{t(agentPayoutMethod)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Link referred properties checklist (if editing) OR Referred Properties Performance list (if viewing) */}
          {isEditingAgentProfile ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{t('Link referred properties')}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(var(--accent-primary-rgb), 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {agentReferredPropertyIds.length} {t('Linked')}
                </span>
              </div>
              <div style={{ 
                maxHeight: '400px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                background: 'rgba(10, 14, 23, 0.4)'
              }}>
                {hostsList.map(host => {
                  const hostName = `${host.firstName} ${host.lastName}`.trim();
                  const hostProps = properties.filter(p => {
                    const splits = p.extraDetails?.ownerSplits || [];
                    if (Array.isArray(splits) && splits.length > 0) {
                      return splits.some((s: any) => s.contactId === host.id);
                    }
                    return p.ownerContactId === host.id;
                  });

                  if (hostProps.length === 0) return null;

                  return (
                    <div key={host.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                        {hostName}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' }}>
                        {hostProps.map(p => {
                          const isSelected = agentReferredPropertyIds.includes(p.id);
                          return (
                            <div 
                              key={p.id}
                              onClick={() => {
                                if (isSelected) {
                                  setAgentReferredPropertyIds(agentReferredPropertyIds.filter(id => id !== p.id));
                                } else {
                                  setAgentReferredPropertyIds([...agentReferredPropertyIds, p.id]);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'transparent',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = isSelected ? 'rgba(var(--accent-primary-rgb), 0.12)' : 'rgba(255,255,255,0.02)'}
                              onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'transparent'}
                            >
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => {}}
                                style={{ pointerEvents: 'none' }}
                              />
                              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{p.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {properties.length === 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 8px' }}>{t('No properties in the system.')}</span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Tab Selector if they are also a Landlord */}
              {(() => {
                const landlordProfileForAgent = contracts.find(c => c.id === currentAgent.id);
                if (!landlordProfileForAgent) {
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{t('Referred Properties & Performance')}</h2>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('Combined referral metrics (AED)')}</span>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
                    <button
                      type="button"
                      onClick={() => setAgentProfileTab('referrals')}
                      style={{
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: agentProfileTab === 'referrals' ? 600 : 400,
                        color: agentProfileTab === 'referrals' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        background: agentProfileTab === 'referrals' ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.08)' : 'transparent',
                        border: 'none',
                        borderBottom: `2px solid ${agentProfileTab === 'referrals' ? 'var(--accent-primary)' : 'transparent'}`,
                        borderRadius: '6px 6px 0 0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {t('Referral Portfolio')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentProfileTab('owned')}
                      style={{
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: agentProfileTab === 'owned' ? 600 : 400,
                        color: agentProfileTab === 'owned' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        background: agentProfileTab === 'owned' ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.08)' : 'transparent',
                        border: 'none',
                        borderBottom: `2px solid ${agentProfileTab === 'owned' ? 'var(--accent-primary)' : 'transparent'}`,
                        borderRadius: '6px 6px 0 0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {t('Owned Properties')} ({agentOwnedUnits.length})
                    </button>
                  </div>
                );
              })()}

              {/* Agent Stats Cards */}
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', width: '100%' }}>
                {(() => {
                  const landlordProfileForAgent = contracts.find(c => c.id === currentAgent.id);
                  if (landlordProfileForAgent) {
                    return (
                      <>
                        <div className="card" style={{ border: '1px solid var(--accent-primary)', padding: '16px', background: 'rgba(var(--accent-primary-rgb), 0.03)' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>{t('Combined Payouts (YTD)')}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', marginTop: '8px' }}>
                            {(currentAgent.totalAgentPayout + landlordProfileForAgent.totalPaid).toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Host payouts + Agent referral earnings')}</div>
                        </div>

                        <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Agent Commission')}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-warning)', marginTop: '8px' }}>
                            {currentAgent.totalAgentPayout.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Referral commission generated')}</div>
                        </div>

                        <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Host Payouts (YTD)')}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-info)', marginTop: '8px' }}>
                            {landlordProfileForAgent.totalPaid.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Net property rental payout')}</div>
                        </div>

                        <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                          <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Referred Listings')}</div>
                          <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>
                            {currentAgent.referredPropertiesCount}
                          </div>
                          <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Properties linked')}</div>
                        </div>
                      </>
                    );
                  }

                  return (
                    <>
                      <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                        <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Referred Listings')}</div>
                        <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-info)', marginTop: '8px' }}>
                          {currentAgent.referredPropertiesCount}
                        </div>
                        <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Properties linked')}</div>
                      </div>

                      <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                        <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Total Gross Revenue')}</div>
                        <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', marginTop: '8px' }}>
                          {currentAgent.totalReferredRevenue.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                        </div>
                        <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Gross referred bookings')}</div>
                      </div>

                      <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                        <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Company Fees')}</div>
                        <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '8px' }}>
                          {currentAgent.totalReferredCommission.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                        </div>
                        <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Company commission share')}</div>
                      </div>

                      <div className="card" style={{ border: '1px solid var(--border-color)', padding: '16px' }}>
                        <div className="card-title" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Agent Commission')}</div>
                        <div className="card-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-warning)', marginTop: '8px' }}>
                          {currentAgent.totalAgentPayout.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                        </div>
                        <div className="card-sub" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('Agent payout amount')}</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Tab Content */}
              {(() => {
                const landlordProfileForAgent = contracts.find(c => c.id === currentAgent.id);
                const showOwned = landlordProfileForAgent && agentProfileTab === 'owned';

                if (showOwned) {
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {agentOwnedUnits.map(unit => {
                        const splits = unit.extraDetails?.ownerSplits || [];
                        const mySplit = Array.isArray(splits) ? splits.find((s: any) => s.contactId === currentAgent.id) : null;
                        const sharePct = mySplit ? Number(mySplit.sharePct) : 100;
                        const commissionPct = mySplit?.commissionPct !== undefined
                          ? Number(mySplit.commissionPct)
                          : (landlordProfileForAgent && landlordProfileForAgent.isIntermediary && unit.linkedCommissionPct !== undefined && unit.linkedCommissionPct !== null
                              ? Number(unit.linkedCommissionPct)
                              : (unit.extraDetails?.commissionPct !== undefined 
                                  ? Number(unit.extraDetails.commissionPct) 
                                  : (landlordProfileForAgent?.commissionPct || 0)));

                        return (
                          <div key={unit.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div>
                                <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{unit.name}</h4>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{unit.propertyType} {t('in')} {unit.city}</p>
                              </div>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '4px 8px',
                                borderRadius: '12px',
                                textTransform: 'uppercase',
                                background: unit.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: unit.status === 'active' ? 'var(--color-success)' : 'var(--color-warning)',
                                border: `1px solid ${unit.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                              }}>
                                {t(unit.status)}
                              </span>
                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                              <p>
                                <strong>{t('Address')}:</strong>{' '}
                                {(() => {
                                  const address = unit.addressLine1 || '';
                                  const isUrl = address.trim().startsWith('http://') || address.trim().startsWith('https://');
                                  if (isUrl) {
                                    try {
                                      const url = new URL(address.trim());
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
                                        <a
                                          href={address.trim()}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                                        >
                                          {displayUrl}
                                        </a>
                                      );
                                    } catch {
                                      return address;
                                    }
                                  }
                                  return address;
                                })()}
                                {unit.city ? `, ${unit.city}` : ''}
                              </p>
                              {unit.dtcmPermitNumber && <p style={{ marginTop: '4px' }}><strong>{t('DTCM Permit')}:</strong> {unit.dtcmPermitNumber}</p>}
                              <p style={{ marginTop: '4px' }}>
                                <strong>{t('Ownership Split')}:</strong>{' '}
                                <span style={{ color: 'var(--color-info)', fontWeight: 600 }}>
                                  {sharePct}% {t('Share')}
                                </span>
                              </p>
                              <p style={{ marginTop: '4px' }}>
                                <strong>{t('Commission Rate')}:</strong>{' '}
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                  {commissionPct}%
                                </span>
                              </p>
                            </div>

                            <a 
                              href={`/dashboard/properties/${unit.id}`}
                              style={{
                                marginTop: 'auto',
                                textAlign: 'center',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--accent-primary)',
                                textDecoration: 'none',
                                padding: '8px 0',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: 'rgba(var(--accent-primary-rgb), 0.03)',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--accent-primary)';
                                e.currentTarget.style.color = '#000';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(var(--accent-primary-rgb), 0.03)';
                                e.currentTarget.style.color = 'var(--accent-primary)';
                              }}
                            >
                              {t('View Property Profile')}
                            </a>
                          </div>
                        );
                      })}

                      {agentOwnedUnits.length === 0 && (
                        <div className="card" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          <p style={{ fontSize: '14px' }}>{t('No properties are currently linked to this landlord.')}</p>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  /* Referred Properties Table */
                  <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                    <table className="runsheet-table" style={{ minWidth: '600px', width: '100%' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Property')}</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Landlord')}</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>{t('Bookings')}</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Revenue')}</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Company Commission')}</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Agent Payout')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentAgent.unitDetails?.map((unit: any) => (
                          <tr key={unit.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{unit.name}</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{unit.ownerName}</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>{unit.bookingsCount}</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-success)', textAlign: 'right', fontWeight: 500 }}>
                              {unit.revenue.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--accent-primary)', textAlign: 'right' }}>
                              {unit.commission.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-warning)', textAlign: 'right', fontWeight: 600 }}>
                              {unit.agentPayout.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                            </td>
                          </tr>
                        ))}
                        {(!currentAgent.unitDetails || currentAgent.unitDetails.length === 0) && (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                              {t('No referred properties linked to calculate performance.')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {renderLoadingOverlay()}
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
            {activeMainTab === 'hosts' ? t('Host Management') : t('Agent Management')}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {activeMainTab === 'hosts' 
              ? t('Configure landlord commission profiles, property linkages, and lease payout structures.') 
              : t('Configure referral agents and calculate commission shares from bookings.')}
          </p>
        </div>
        <button
          onClick={() => {
            if (activeMainTab === 'hosts') {
              setNewOwner('');
              setSelectedProperties([]);
              setShowPropDropdown(false);
              setShowAddModal(true);
            } else {
              setAgentFirstName('');
              setAgentLastName('');
              setAgentEmail('');
              setAgentPhone('');
              setAgentReferralPct(5);
              setAgentCommissionBase('gross_revenue');
              setAgentReferredPropertyIds([]);
              setShowAddAgentModal(true);
            }
          }}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px', borderRadius: '8px' }}
        >
          <Plus size={16} /> {activeMainTab === 'hosts' ? t('New Host Profile') : t('New Agent Profile')}
        </button>
      </div>

      {/* Main Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
        <button
          type="button"
          onClick={() => {
            setActiveMainTab('hosts');
            setViewingLandlord(null);
            setViewingAgent(null);
          }}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: activeMainTab === 'hosts' ? 600 : 400,
            color: activeMainTab === 'hosts' ? 'var(--accent-primary)' : 'var(--text-muted)',
            background: activeMainTab === 'hosts' ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.08)' : 'transparent',
            border: 'none',
            borderBottom: `2px solid ${activeMainTab === 'hosts' ? 'var(--accent-primary)' : 'transparent'}`,
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          HostProfiles
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveMainTab('agents');
            setViewingLandlord(null);
            setViewingAgent(null);
          }}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: activeMainTab === 'agents' ? 600 : 400,
            color: activeMainTab === 'agents' ? 'var(--accent-primary)' : 'var(--text-muted)',
            background: activeMainTab === 'agents' ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.08)' : 'transparent',
            border: 'none',
            borderBottom: `2px solid ${activeMainTab === 'agents' ? 'var(--accent-primary)' : 'transparent'}`,
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {t('Agent Management')}
        </button>
      </div>

      {activeMainTab === 'hosts' ? (
        <>
          {/* KPI Stats Ribbon */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="card">
              <div className="card-title">{t('TOTAL LANDLORDS')}</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Handshake style={{ color: 'var(--accent-primary)' }} />
                {contracts.length}
              </div>
              <div className="card-sub">{t('Active profiles registered')}</div>
            </div>

            <div className="card">
              <div className="card-title">{t('MANAGED PROPERTIES')}</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 style={{ color: 'var(--color-info)' }} />
                {totalProperties}
              </div>
              <div className="card-sub">{t('Linked across host accounts')}</div>
            </div>

            <div className="card">
              <div className="card-title">{t('AVG COMMISSION RATE')}</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-primary)' }}>
                <Percent />
                {contracts.length > 0 ? (
                  contracts.reduce((acc, curr) => {
                    if (curr.isIntermediary) {
                      if (curr.partnerModel === 'gross_pct') {
                        return acc + (curr.partnerValue || 0);
                      } else if (curr.partnerModel === 'fee_pct') {
                        return acc + (curr.commissionPct * ((curr.partnerValue || 0) / 100));
                      }
                      return acc + curr.commissionPct;
                    }
                    return acc + curr.commissionPct;
                  }, 0) / contracts.length
                ).toFixed(1) : '0.0'}%
              </div>
              <div className="card-sub">{t('Standard operations margin')}</div>
            </div>

            <div className="card">
              <div className="card-title">{t('OWNER PAYOUTS (YTD)')}</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)' }}>
                {totalPaidSum.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
              </div>
              <div className="card-sub">{t('Net payout volume processed')}</div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={t('Search hosts by name or linked property...')}
                className="form-control"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 16px 10px 36px', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                className="form-control"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '10px 16px', fontSize: '14px', minWidth: '160px' }}
              >
                <option value="all">{t('All Agreements')}</option>
                <option value="active">{t('Active')}</option>
                <option value="pending">{t('Pending')}</option>
                <option value="expired">{t('Expired')}</option>
              </select>
            </div>
          </div>

          {/* Contracts Table */}
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="runsheet-table" style={{ minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                  <th>{t('LANDLORD')}</th>
                  <th>{t('PROPERTIES')}</th>
                  <th>{t('COMMISSION')}</th>
                  <th>{t('DATE JOINED')}</th>
                  <th>{t('PAYOUT ROUTE')}</th>
                  <th>{t('DOCUSIGN STATUS')}</th>
                  <th>{t('PAYOUTS')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', minHeight: '60px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(var(--accent-primary-rgb), 0.1)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}>
                        {c.ownerName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span 
                            onClick={() => handleOpenProfile(c)}
                            style={{ 
                              cursor: 'pointer', 
                              color: 'var(--text-primary)', 
                              fontWeight: 600,
                              transition: 'color 0.2s',
                              textDecoration: 'underline decoration-dotted',
                              textUnderlineOffset: '3px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                          >
                            {c.ownerName}
                          </span>
                          {c.isIntermediary && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              color: '#3b82f6',
                              border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}>
                              Partner
                            </span>
                          )}
                          {agents.some(a => a.id === c.id) && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(var(--accent-primary-rgb), 0.1)',
                              color: 'var(--accent-primary)',
                              border: '1px solid rgba(var(--accent-primary-rgb), 0.2)'
                            }}>
                              Agent
                            </span>
                          )}
                        </div>
                        {c.contactPerson && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 'normal' }}>
                            Contact: {c.contactPerson}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 500 }}>{c.propertiesCount} {c.propertiesCount === 1 ? 'Property' : 'Properties'}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.propertiesList.map(p => `${p.name} (${p.sharePct}% share)`).join(', ')}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                      {c.isIntermediary ? (
                        <>
                          <div>
                            {c.partnerModel === 'monthly_flat'
                              ? `${c.partnerValue || 0} AED`
                              : `${(c.partnerValue || 0).toFixed(1)}%`}
                          </div>
                          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 400, marginTop: '2px' }}>
                            {c.partnerModel === 'gross_pct' ? t('Gross') :
                             c.partnerModel === 'fee_pct' ? t('of fee') :
                             t('monthly flat')}
                          </div>
                        </>
                      ) : (
                        <div>{c.commissionPct.toFixed(1)}%</div>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {c.dateJoined || '—'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {c.payoutMethod}
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: getStatusBadgeColor(c.status)
                        }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize', color: getStatusBadgeColor(c.status) }}>
                          {c.status}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                      {c.totalPaid.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Agent KPI Stats Ribbon */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="card">
              <div className="card-title">Total Referral Agents</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Handshake style={{ color: 'var(--accent-primary)' }} />
                {agentsCalculated.length}
              </div>
              <div className="card-sub">Active agents registered</div>
            </div>

            <div className="card">
              <div className="card-title">Referred Landlords</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 style={{ color: 'var(--color-info)' }} />
                {new Set(agentsCalculated.flatMap(a => a.referredHostIds)).size}
              </div>
              <div className="card-sub">Unique hosts linked</div>
            </div>

            <div className="card">
              <div className="card-title">Referred Gross Revenue</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)' }}>
                {agentsCalculated.reduce((sum, a) => sum + a.totalReferredRevenue, 0).toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
              </div>
              <div className="card-sub">Combined booking value (YTD)</div>
            </div>

            <div className="card">
              <div className="card-title">Agent Payouts (YTD)</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)' }}>
                {agentsCalculated.reduce((sum, a) => sum + a.totalAgentPayout, 0).toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
              </div>
              <div className="card-sub">Referral commissions generated</div>
            </div>
          </div>

          {/* Agent Filter Toolbar */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search agents by name or referred host..."
                className="form-control"
                value={agentSearchTerm}
                onChange={e => setAgentSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 16px 10px 36px', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Agent Table */}
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="runsheet-table" style={{ minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                  <th>Agent</th>
                  <th>Referred Hosts</th>
                  <th>Commission Rate</th>
                  <th>Calculation Base</th>
                  <th>Referred Listings</th>
                  <th>Referred Revenue</th>
                  <th>Agent Payout YTD</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', minHeight: '60px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(var(--accent-primary-rgb), 0.1)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}>
                        {a.firstName[0] || ''}{a.lastName[0] || ''}
                      </div>
                      <span 
                        onClick={() => handleOpenAgentProfile(a)}
                        style={{ 
                          cursor: 'pointer', 
                          color: 'var(--text-primary)', 
                          transition: 'color 0.2s',
                          textDecoration: 'underline decoration-dotted',
                          textUnderlineOffset: '3px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        {a.firstName} {a.lastName}
                      </span>
                      {hostsList.some(h => h.id === a.id) && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(var(--accent-primary-rgb), 0.1)',
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(var(--accent-primary-rgb), 0.2)'
                        }}>
                          Landlord
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 500 }}>{a.referredHostIds.length} {a.referredHostIds.length === 1 ? 'Host' : 'Hosts'}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.referredHostNames.join(', ') || '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                      {a.referralPct.toFixed(1)}%
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {a.commissionBase === 'management_commission' ? 'Mgmt Commission' : 'Gross Booking Rev'}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {a.referredPropertiesCount} units ({a.bookingsCount} bookings)
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {a.totalReferredRevenue.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                      {a.totalAgentPayout.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                    </td>
                  </tr>
                ))}
                {filteredAgents.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No referral agents registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            <button
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={20} />
            </button>
            
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{t('New Host Agreement')}</h2>
            
            <form onSubmit={handleAddContract} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <input
                  type="checkbox"
                  id="useExistingAgent"
                  checked={useExistingAgent}
                  onChange={e => {
                    setUseExistingAgent(e.target.checked);
                    setNewOwner('');
                    setSelectedAgentId('');
                    setSelectedProperties([]);
                    setShowPropDropdown(false);
                    setPropSearchTerm('');
                  }}
                  style={{ width: 'auto', height: '14px', cursor: 'pointer' }}
                />
                <label htmlFor="useExistingAgent" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  {t('Link to existing agent')}
                </label>
              </div>

              {/* Host Type Selector */}
              {!useExistingAgent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>{t('Host Type')}</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setHostType('individual')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        background: hostType === 'individual' ? 'var(--accent-primary, #d4af37)' : 'rgba(255,255,255,0.05)',
                        color: hostType === 'individual' ? 'white' : 'var(--text-secondary)',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {t('Individual')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHostType('business')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        background: hostType === 'business' ? 'var(--accent-primary, #d4af37)' : 'rgba(255,255,255,0.05)',
                        color: hostType === 'business' ? 'white' : 'var(--text-secondary)',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {t('Business')}
                    </button>
                  </div>
                </div>
              )}

              {/* Host Name Input (conditional on Type) */}
              {hostType === 'business' && !useExistingAgent ? (
                <>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      required
                      placeholder={t('e.g. Stay Local Holiday Homes')}
                      className="form-control form-input"
                      value={newCompanyName}
                      onChange={e => setNewCompanyName(e.target.value)}
                      style={{ width: '100%', background: 'rgba(10, 14, 23, 0.7)' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('TRN (Tax Registration Number)')}</label>
                    <input
                      type="text"
                      placeholder={t('e.g. 100234567800003')}
                      className="form-control form-input"
                      value={newTrn}
                      onChange={e => setNewTrn(e.target.value)}
                      style={{ width: '100%', background: 'rgba(10, 14, 23, 0.7)' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('Contact Person Name')}</label>
                    <input
                      type="text"
                      required
                      placeholder={t('e.g. John Doe')}
                      className="form-control form-input"
                      value={newContactPerson}
                      onChange={e => setNewContactPerson(e.target.value)}
                      style={{ width: '100%', background: 'rgba(10, 14, 23, 0.7)' }}
                    />
                  </div>
                  {/* Organization Connection Dropdown */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>{t('Link to OMNIBetter Organization Account')}</label>
                    <select
                      className="form-control form-input"
                      value={linkedOrganizationId}
                      onChange={e => {
                        const val = e.target.value;
                        setLinkedOrganizationId(val);
                        const matched = organizations.find(o => o.id === val);
                        setLinkedOrganizationName(matched ? matched.name : '');
                      }}
                      style={{ width: '100%', appearance: 'none', background: 'rgba(10, 14, 23, 0.7)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', fontSize: '13px' }}
                    >
                      <option value="">{t('-- No Link (Independent Host) --')}</option>
                      {organizations.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('Host Name')}</label>
                  {useExistingAgent ? (
                    <select
                      required
                      className="form-control form-input"
                      value={selectedAgentId}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedAgentId(val);
                        const matched = linkableAgents.find(a => a.id === val);
                        setNewOwner(matched ? `${matched.firstName} ${matched.lastName}`.trim() : '');
                        setSelectedProperties([]);
                        setShowPropDropdown(false);
                        setPropSearchTerm('');
                      }}
                      style={{ width: '100%', appearance: 'none', background: 'rgba(10, 14, 23, 0.7)' }}
                    >
                      <option value="">{t('Select an Agent')}</option>
                      {linkableAgents.map(a => (
                        <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder={t('e.g. Waleed Al-Mansoori')}
                      className="form-control form-input"
                      value={newOwner}
                      onChange={e => {
                        setNewOwner(e.target.value);
                        setShowPropDropdown(false);
                        setPropSearchTerm('');
                      }}
                      style={{ width: '100%', background: 'rgba(10, 14, 23, 0.7)' }}
                    />
                  )}
                </div>
              )}

              {/* Intermediary Partner Company Toggle & Details */}
              {hostType === 'business' && !useExistingAgent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(255,255,255,0.06)', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="isIntermediaryCheckbox"
                      checked={isIntermediary}
                      onChange={e => setIsIntermediary(e.target.checked)}
                      style={{ width: 'auto', height: '14px', cursor: 'pointer' }}
                    />
                    <label htmlFor="isIntermediaryCheckbox" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                      {t('Intermediary Partner Contract')}
                    </label>
                  </div>

                  {isIntermediary && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('Operator Commercial Model')}</label>
                        <select
                          className="form-control form-input"
                          value={partnerModel}
                          onChange={e => setPartnerModel(e.target.value as any)}
                          style={{ width: '100%', background: 'rgba(10, 14, 23, 0.7)', fontSize: '12px', padding: '6px 12px' }}
                        >
                          <option value="fee_pct">{t("% of Partner's Host Fee")}</option>
                          <option value="gross_pct">{t('% of Gross Bookings')}</option>
                          <option value="monthly_flat">{t('Flat Monthly Fee per Property')}</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {t('Operator Fee Value')} ({partnerModel === 'monthly_flat' ? 'AED' : '%'})
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          className="form-control form-input"
                          value={partnerValue}
                          onChange={e => setPartnerValue(Number(e.target.value))}
                          style={{ width: '100%', fontSize: '12px', padding: '6px 12px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isIntermediary && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    {t('Commission Fee (%)')}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    max={50}
                    required={!isIntermediary}
                    className="form-control form-input"
                    value={newCommPct}
                    onChange={e => setNewCommPct(Number(e.target.value))}
                  />
                </div>
              )}

              <div ref={propDropdownRef} className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                <label className="form-label">{t('Linked Properties')}</label>
                <div 
                  onClick={() => {
                    setShowPropDropdown(!showPropDropdown);
                    if (!showPropDropdown) {
                      setPropSearchTerm('');
                    }
                  }}
                  className="form-control form-input"
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(10, 14, 23, 0.7)',
                    minHeight: '42px',
                    padding: '10px 16px'
                  }}
                >
                  <span style={{ color: selectedProperties.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {selectedProperties.length > 0 
                      ? `${selectedProperties.length} ${selectedProperties.length > 1 ? t('properties selected') : t('property selected')}` 
                      : t('Select properties')
                    }
                  </span>
                  <span style={{ fontSize: '10px' }}>{showPropDropdown ? '▲' : '▼'}</span>
                </div>

                {showPropDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    marginTop: '4px',
                    zIndex: 1010,
                    padding: '8px',
                    boxShadow: 'var(--glass-shadow, 0 8px 32px 0 rgba(0, 0, 0, 0.37))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {/* Search Input */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder={t('Search properties...')}
                        value={propSearchTerm}
                        onChange={e => setPropSearchTerm(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '8px 12px 8px 32px',
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

                    {/* Scrollable list */}
                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {filteredHostProperties.length > 0 ? (
                        filteredHostProperties.map(p => {
                          const selectedItem = selectedProperties.find(sp => sp.name === p.name);
                          const isSelected = !!selectedItem;
                          const coOwnersWarning = getCoOwnersWarning(p);
                          return (
                            <div 
                              key={p.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedProperties(selectedProperties.filter(sp => sp.name !== p.name));
                                } else {
                                  const otherOwnersCount = getOtherOwnersCount(p);
                                  const defaultShare = Math.round(100 / (otherOwnersCount + 1));
                                  const defaultRate = p.extraDetails?.commissionPct !== undefined ? Number(p.extraDetails.commissionPct) : undefined;
                                  setSelectedProperties([...selectedProperties, { name: p.name, sharePct: defaultShare, commissionPct: defaultRate }]);
                                }
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.1)' : 'transparent',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = isSelected ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.15)' : 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.06)'}
                              onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(var(--accent-primary-rgb, 212, 175, 55), 0.1)' : 'transparent'}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => {}} // Handle click on container
                                  style={{ pointerEvents: 'none' }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</span>
                                  {coOwnersWarning && (
                                    <span style={{ fontSize: '11px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                      <AlertCircle size={10} /> {coOwnersWarning}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '22px', marginTop: '10px', width: '100%' }} onClick={e => e.stopPropagation()}>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('Share %')}:</span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={selectedItem.sharePct !== undefined ? selectedItem.sharePct : 100}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? 100 : Number(e.target.value);
                                          setSelectedProperties(selectedProperties.map(sp => 
                                            sp.name === p.name ? { ...sp, sharePct: val } : sp
                                          ));
                                        }}
                                        style={{
                                          width: '50px',
                                          background: 'rgba(0, 0, 0, 0.4)',
                                          border: '1px solid var(--border-color)',
                                          borderRadius: '4px',
                                          padding: '2px 4px',
                                          color: 'var(--text-primary)',
                                          fontSize: '11px',
                                          outline: 'none',
                                        }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        {isIntermediary ? t('Operator Fee:') : `${t('Rate')}:`}
                                      </span>
                                      <input
                                        type="number"
                                        step="any"
                                        min={0}
                                        max={100}
                                        placeholder={isIntermediary 
                                          ? `${partnerValue}${partnerModel === 'monthly_flat' ? ' AED' : '%'}`
                                          : `${newCommPct}%`}
                                        value={isIntermediary 
                                          ? (selectedItem.partnerValue !== undefined ? selectedItem.partnerValue : '')
                                          : (selectedItem.commissionPct !== undefined ? selectedItem.commissionPct : '')}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? undefined : Number(e.target.value);
                                          setSelectedProperties(selectedProperties.map(sp => 
                                            sp.name === p.name 
                                              ? (isIntermediary ? { ...sp, partnerValue: val } : { ...sp, commissionPct: val })
                                              : sp
                                          ));
                                        }}
                                        style={{
                                          width: '55px',
                                          background: 'rgba(0, 0, 0, 0.4)',
                                          border: '1px solid var(--border-color)',
                                          borderRadius: '4px',
                                          padding: '2px 4px',
                                          color: 'var(--text-primary)',
                                          fontSize: '11px',
                                          outline: 'none',
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{t('Contracts')}:</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {(selectedItem.contracts && selectedItem.contracts.length > 0
                                        ? selectedItem.contracts
                                        : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }]
                                      ).map((cVal, cIdx) => (
                                        <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <input
                                            type="date"
                                            value={cVal.startDate || ''}
                                            onChange={(e) => {
                                              const updatedContracts = [...(selectedItem.contracts && selectedItem.contracts.length > 0
                                                ? selectedItem.contracts
                                                : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }])];
                                              updatedContracts[cIdx] = { ...updatedContracts[cIdx], startDate: e.target.value };
                                              const active = getActiveContractDates(updatedContracts);
                                              setSelectedProperties(selectedProperties.map(sp => 
                                                sp.name === p.name ? { 
                                                  ...sp, 
                                                  contracts: updatedContracts,
                                                  contractStart: active.contractStart,
                                                  contractEnd: active.contractEnd
                                                } : sp
                                              ));
                                            }}
                                            style={{
                                              background: 'rgba(0, 0, 0, 0.4)',
                                              border: '1px solid var(--border-color)',
                                              borderRadius: '4px',
                                              padding: '2px 4px',
                                              color: 'var(--text-primary)',
                                              fontSize: '11px',
                                              outline: 'none',
                                            }}
                                          />
                                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('to')}</span>
                                          <input
                                            type="date"
                                            value={cVal.endDate || ''}
                                            onChange={(e) => {
                                              const updatedContracts = [...(selectedItem.contracts && selectedItem.contracts.length > 0
                                                ? selectedItem.contracts
                                                : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }])];
                                              updatedContracts[cIdx] = { ...updatedContracts[cIdx], endDate: e.target.value };
                                              const active = getActiveContractDates(updatedContracts);
                                              setSelectedProperties(selectedProperties.map(sp => 
                                                sp.name === p.name ? { 
                                                  ...sp, 
                                                  contracts: updatedContracts,
                                                  contractStart: active.contractStart,
                                                  contractEnd: active.contractEnd
                                                } : sp
                                              ));
                                            }}
                                            style={{
                                              background: 'rgba(0, 0, 0, 0.4)',
                                              border: '1px solid var(--border-color)',
                                              borderRadius: '4px',
                                              padding: '2px 4px',
                                              color: 'var(--text-primary)',
                                              fontSize: '11px',
                                              outline: 'none',
                                            }}
                                          />
                                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                                            <input
                                              type="checkbox"
                                              checked={!!cVal.isAutoRenew}
                                              onChange={(e) => {
                                                const updatedContracts = [...(selectedItem.contracts && selectedItem.contracts.length > 0
                                                  ? selectedItem.contracts
                                                  : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }])];
                                                updatedContracts[cIdx] = { ...updatedContracts[cIdx], isAutoRenew: e.target.checked };
                                                const active = getActiveContractDates(updatedContracts);
                                                setSelectedProperties(selectedProperties.map(sp => 
                                                  sp.name === p.name ? { 
                                                    ...sp, 
                                                    contracts: updatedContracts,
                                                    contractStart: active.contractStart,
                                                    contractEnd: active.contractEnd
                                                  } : sp
                                                ));
                                              }}
                                            />
                                            {t('Auto-renew')}
                                          </label>
                                          {((selectedItem.contracts && selectedItem.contracts.length > 1) || cIdx > 0) && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedContracts = (selectedItem.contracts && selectedItem.contracts.length > 0
                                                  ? selectedItem.contracts
                                                  : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }])
                                                  .filter((_, idx) => idx !== cIdx);
                                                const active = getActiveContractDates(updatedContracts);
                                                setSelectedProperties(selectedProperties.map(sp => 
                                                  sp.name === p.name ? { 
                                                    ...sp, 
                                                    contracts: updatedContracts,
                                                    contractStart: active.contractStart,
                                                    contractEnd: active.contractEnd
                                                  } : sp
                                                ));
                                              }}
                                              style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 0 }}
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedContracts = [...(selectedItem.contracts && selectedItem.contracts.length > 0
                                          ? selectedItem.contracts
                                          : [{ startDate: selectedItem.contractStart || '', endDate: selectedItem.contractEnd || '' }]), { startDate: '', endDate: '' }];
                                        setSelectedProperties(selectedProperties.map(sp => 
                                          sp.name === p.name ? { ...sp, contracts: updatedContracts } : sp
                                        ));
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--accent-primary)',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        padding: '4px 0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        marginTop: '4px'
                                      }}
                                    >
                                      <Plus size={10} /> {t('Add contract renewal')}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {properties.length > 0 ? t('No properties found') : t('No properties available')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('Payout Method')}</label>
                <select
                  className="form-control form-input"
                  value={newPayout}
                  onChange={e => setNewPayout(e.target.value)}
                  style={{ width: '100%', appearance: 'none', background: 'rgba(10, 14, 23, 0.7)' }}
                >
                  <option value="Direct Bank Transfer (ENBD)">{t('Direct Bank Transfer (ENBD)')}</option>
                  <option value="Direct Bank Transfer (ADCB)">{t('Direct Bank Transfer (ADCB)')}</option>
                  <option value="International Wire (HSBC)">{t('International Wire (HSBC)')}</option>
                  <option value="International Wire (MUFG)">{t('International Wire (MUFG)')}</option>
                </select>
              </div>



              <button
                type="submit"
                className="btn-primary"
                style={{ marginTop: '12px', padding: '12px' }}
                disabled={isSaving || selectedProperties.length === 0 || (hostType === 'business' ? !newCompanyName : !newOwner)}
              >
                {isSaving ? t('Launching...') : t('Launch Agreement Flow')}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Add Agent Modal */}
      {showAddAgentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            <button
              onClick={() => setShowAddAgentModal(false)}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={20} />
            </button>
            
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{t('New Referral Agent')}</h2>
            
            <form onSubmit={handleAddAgent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  id="useExistingOwnerAsAgent"
                  checked={useExistingOwnerAsAgent}
                  onChange={e => {
                    setUseExistingOwnerAsAgent(e.target.checked);
                    setSelectedOwnerId('');
                    setAgentFirstName('');
                    setAgentLastName('');
                    setAgentEmail('');
                    setAgentPhone('');
                  }}
                  style={{ width: 'auto', height: '14px', cursor: 'pointer' }}
                />
                <label htmlFor="useExistingOwnerAsAgent" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  {t('Link to an existing host/landlord')}
                </label>
              </div>

              {useExistingOwnerAsAgent ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('Host / Landlord')}</label>
                  <select
                    required
                    className="form-control form-input"
                    value={selectedOwnerId}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedOwnerId(val);
                      const matched = linkableHosts.find(h => h.id === val);
                      if (matched) {
                        setAgentFirstName(matched.firstName || '');
                        setAgentLastName(matched.lastName || '');
                        setAgentEmail(matched.email || '');
                        setAgentPhone(matched.phone || '');
                      } else {
                        setAgentFirstName('');
                        setAgentLastName('');
                        setAgentEmail('');
                        setAgentPhone('');
                      }
                    }}
                    style={{ width: '100%', appearance: 'none', background: 'rgba(10, 14, 23, 0.7)' }}
                  >
                    <option value="">{t('Select a Host')}</option>
                    {linkableHosts.map(h => (
                      <option key={h.id} value={h.id}>{h.firstName} {h.lastName}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="form-label">{t('First Name')}</label>
                      <input
                        type="text"
                        required
                        placeholder={t('e.g. Salim')}
                        className="form-control form-input"
                        value={agentFirstName}
                        onChange={e => setAgentFirstName(e.target.value)}
                        style={{ width: '100%', background: 'rgba(10, 14, 23, 0.7)' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="form-label">{t('Last Name')}</label>
                      <input
                        type="text"
                        required
                        placeholder={t('e.g. Al-Dhaheri')}
                        className="form-control form-input"
                        value={agentLastName}
                        onChange={e => setAgentLastName(e.target.value)}
                        style={{ width: '100%', background: 'rgba(10, 14, 23, 0.7)' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('Email Address')}</label>
                    <input
                      type="email"
                      placeholder="agent@example.com"
                      className="form-control form-input"
                      value={agentEmail}
                      onChange={e => setAgentEmail(e.target.value)}
                      style={{ width: '100%', background: 'rgba(10, 14, 23, 0.7)' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('Phone Number')}</label>
                    <input
                      type="text"
                      placeholder="+971 50 111 2222"
                      className="form-control form-input"
                      value={agentPhone}
                      onChange={e => setAgentPhone(e.target.value)}
                      style={{ width: '100%', background: 'rgba(10, 14, 23, 0.7)' }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="form-label">{t('Referral Rate (%)')}</label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    max={100}
                    required
                    className="form-control form-input"
                    value={agentReferralPct}
                    onChange={e => setAgentReferralPct(Number(e.target.value))}
                    style={{ width: '100%', background: 'rgba(10, 14, 23, 0.7)' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0, flex: 1.5 }}>
                  <label className="form-label">{t('Commission Base')}</label>
                  <select
                    className="form-control form-input"
                    value={agentCommissionBase}
                    onChange={e => setAgentCommissionBase(e.target.value as any)}
                    style={{ width: '100%', appearance: 'none', background: 'rgba(10, 14, 23, 0.7)' }}
                  >
                    <option value="gross_revenue">{t('Gross Booking Revenue')}</option>
                    <option value="management_commission">{t('Management Commission')}</option>
                  </select>
                </div>
              </div>

              {/* Link Referred Properties dropdown-checklist */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('Referred Properties')}</label>
                <div style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'rgba(10, 14, 23, 0.4)'
                }}>
                  {hostsList.map(host => {
                    const hostName = `${host.firstName} ${host.lastName}`.trim();
                    const hostProps = properties.filter(p => {
                      const splits = p.extraDetails?.ownerSplits || [];
                      if (Array.isArray(splits) && splits.length > 0) {
                        return splits.some((s: any) => s.contactId === host.id);
                      }
                      return p.ownerContactId === host.id;
                    });

                    if (hostProps.length === 0) return null;

                    return (
                      <div key={host.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          {hostName}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' }}>
                          {hostProps.map(p => {
                            const isSelected = agentReferredPropertyIds.includes(p.id);
                            return (
                              <div 
                                key={p.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setAgentReferredPropertyIds(agentReferredPropertyIds.filter(id => id !== p.id));
                                  } else {
                                    setAgentReferredPropertyIds([...agentReferredPropertyIds, p.id]);
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  background: isSelected ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'transparent',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = isSelected ? 'rgba(var(--accent-primary-rgb), 0.12)' : 'rgba(255,255,255,0.02)'}
                                onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'transparent'}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => {}}
                                  style={{ pointerEvents: 'none' }}
                                />
                                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{p.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {hostsList.length === 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 8px' }}>{t('No hosts in the system.')}</span>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('Payout Method')}</label>
                <select
                  className="form-control form-input"
                  value={agentPayoutMethod}
                  onChange={e => setAgentPayoutMethod(e.target.value)}
                  style={{ width: '100%', appearance: 'none', background: 'rgba(10, 14, 23, 0.7)' }}
                >
                  <option value="Direct Bank Transfer (ENBD)">{t('Direct Bank Transfer (ENBD)')}</option>
                  <option value="Direct Bank Transfer (ADCB)">{t('Direct Bank Transfer (ADCB)')}</option>
                  <option value="International Wire (HSBC)">{t('International Wire (HSBC)')}</option>
                  <option value="International Wire (MUFG)">{t('International Wire (MUFG)')}</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ marginTop: '12px', padding: '12px' }}
                disabled={isSaving || !agentFirstName}
              >
                {isSaving ? t('Creating...') : t('Create Agent Profile')}
              </button>
            </form>
          </div>
        </div>
      )}    </div>
  );
}
