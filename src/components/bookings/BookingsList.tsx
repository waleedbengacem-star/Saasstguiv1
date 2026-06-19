'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { translateText } from '@/lib/translations';
import { 
  Plus, 
  Trash2, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Globe, 
  RefreshCw, 
  AlertTriangle,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface Property {
  id: string;
  name: string;
  propertyType?: string;
  city?: string;
  bedrooms?: number;
  bathrooms?: number;
  col_bedrooms?: string;
  col_baths?: string;
  col_building_name?: string;
  col_maps?: string;
  col_checkin_type?: string;
  extraDetails?: any;
  uplistingPropertyId?: string;
}

export interface Booking {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  channel: string;
  payout?: string;
  cleaning_fee?: string;
  discounts?: string;
  service_charge?: string;
  destination_fee?: string;
  resort_fee?: string;
  dtcm_fee?: string;
  vat_amount?: string;
  tax_amount?: string;
  payment_processing_fee?: string;
  commission?: string;
  commission_vat?: string;
  commission_base?: string;
  booked_at?: string;
  is_extension?: boolean;
  extension_of?: string;
  extension_dismissed?: boolean;
  is_transferred?: boolean;
  transfer_type?: string;
  original_property_id?: string;
  manual_channel_rule_id?: string;
  notes?: string;
  raw_property_name?: string;
  raw_booking?: any;
  extras?: any;
  nights?: string | number;
  rowNumber?: number;
  isMatched?: boolean;
  raw_check_in?: string;
  raw_check_out?: string;
  hasDateError?: boolean;
}

export interface CustomRuleCondition {
  id: string;
  field: 'nights' | 'grossAmount' | 'guests';
  operator: 'greater_than' | 'less_than' | 'equal_to';
  value: number;
  targetField: 'commissionPercent' | 'feeTotal' | 'vatPercent' | 'processingFee' | 'merchantFee';
  newValue: number;
}

export interface ChannelRule {
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

interface BookingsListProps {
  currentUser?: any;
  bookings: Booking[];
  setBookings: (bookings: Booking[] | ((prev: Booking[]) => Booking[])) => void;
  properties: Property[];
  channelRules?: ChannelRule[];
  onAddProperty?: (property: any) => Promise<string> | string;
  customConfirm?: (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    confirmText?: string,
    cancelText?: string
  ) => void;
}

// Synonyms mapping for excel columns detection
const propertySynonyms = ["property", "property name", "unit", "unit name", "apartment", "villa", "room", "accommodation"];
const guestSynonyms = ["guest", "guest name", "client", "customer", "visitor", "name"];
const checkInSynonyms = ["check-in", "check in", "checkin", "arrival", "start date", "arrival date", "co check in", "co-check-in", "co check-in"];
const checkOutSynonyms = ["check-out", "check out", "checkout", "departure", "end date", "departure date"];
const statusSynonyms = ["status", "booking status", "state", "booking state"];
const notesSynonyms = ["notes", "remarks", "comments", "comment", "guest note", "info", "reservations comment", "reservation comment"];
const channelSynonyms = ["channel", "booking channel", "source", "platform", "booking source", "site", "booking_channel"];

function findClosestHeader(headers: string[], synonyms: string[]): string | null {
  return headers.find(h => synonyms.includes(h.toLowerCase().trim())) || null;
}

function parseExcelDate(val: any): string {
  if (val == null || val === "") return "";
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const r = val.toString().trim();
  if (!r) return "";
  const match = r.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (match) {
    let day = parseInt(match[1], 10);
    let month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dy = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dy}`;
    }
  }
  const a = new Date(r);
  if (!isNaN(a.getTime())) {
    const y = a.getFullYear();
    const m = String(a.getMonth() + 1).padStart(2, "0");
    const dy = String(a.getDate()).padStart(2, "0");
    return `${y}-${m}-${dy}`;
  }
  return "";
}

function normalizeStatus(val: any): string {
  if (!val) return "confirmed";
  const r = val.toString().toLowerCase().trim();
  if (r.includes("checked") || (r.includes("check") && r.includes("in"))) return "checked_in";
  if (r.includes("confirm")) return "confirmed";
  if (r.includes("cxl") || r.includes("cancel") || r.includes("no show") || r.includes("noshow")) return "cancelled";
  if (r.includes("pending")) return "pending";
  return "confirmed";
}

function calculateNights(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 864e5));
}

function formatDate(dateStr: string): string {
  return dateStr
    ? new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : "—";
}

const statusStyles: Record<string, { bg: string; border: string; text: string }> = {
  confirmed: {
    bg: "rgba(45,212,172,0.15)",
    border: "rgba(45,212,172,0.4)",
    text: "#2dd4af"
  },
  pending: {
    bg: "rgba(251,191,36,0.15)",
    border: "rgba(251,191,36,0.4)",
    text: "#fbbf24"
  },
  cancelled: {
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    text: "#f87171"
  },
  checked_in: {
    bg: "rgba(96,165,250,0.15)",
    border: "rgba(96,165,250,0.4)",
    text: "#60a5fa"
  }
};

const emptyBookingForm: Booking = {
  id: "",
  property_id: "",
  guest_name: "",
  check_in_date: "",
  check_in_time: "15:00",
  check_out_date: "",
  check_out_time: "11:00",
  nights: "",
  status: "confirmed",
  notes: "",
  payout: "",
  cleaning_fee: "",
  channel: "Direct",
  destination_fee: "",
  resort_fee: "",
  dtcm_fee: "",
  service_charge: "",
  vat_amount: "",
  tax_amount: "",
  payment_processing_fee: "",
  commission: "",
  commission_base: "GBV",
  discounts: "",
  commission_vat: "",
  booked_at: "",
  is_transferred: false,
  transfer_type: "none",
  original_property_id: "",
  manual_channel_rule_id: ""
};

// Searchable selector
// Translation helper - reads language from localStorage
function t(key: string): string {
  const lang = typeof window !== 'undefined' ? localStorage.getItem('pms_ui_language') || 'en' : 'en';
  return translateText(key, lang);
}


function SearchableDropdown({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { id: string; name: string }[]; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const selected = options.find(o => String(o.id) === String(value));
  const filtered = options.filter(o => (o.name || "").toLowerCase().includes(search.toLowerCase().trim()));

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div 
        onClick={() => { setOpen(!open); if (!open) setSearch(""); }}
        style={{
          background: "var(--input-bg)",
          border: "1px solid var(--border-glass)",
          borderRadius: "8px",
          color: "var(--text-primary)",
          padding: "0.45rem 0.75rem",
          fontSize: "0.85rem",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none",
          height: "35px",
          boxSizing: "border-box"
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "85%" }}>
          {selected ? selected.name : placeholder}
        </span>
        <span style={{ fontSize: "0.6rem", opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
      </div>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "var(--bg-glass)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--border-glass-strong)",
          borderRadius: 10,
          boxShadow: "0 12px 32px var(--shadow-glow)",
          zIndex: 1000,
          padding: "0.6rem",
          maxHeight: "220px",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          boxSizing: "border-box"
        }}>
          <input 
            type="text" 
            placeholder="Search..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border-glass)",
              borderRadius: 6,
              padding: "0.35rem 0.5rem",
              color: "var(--text-primary)",
              outline: "none",
              fontSize: "0.8rem",
              width: "100%",
              boxSizing: "border-box"
            }}
            autoFocus
          />
          <div style={{ overflowY: "auto", maxHeight: "150px" }} className="custom-scrollbar">
            {filtered.length > 0 ? (
              filtered.map(opt => {
                const isSelected = String(opt.id) === String(value);
                return (
                  <div 
                    key={opt.id}
                    onClick={() => { onChange(opt.id); setOpen(false); }}
                    style={{
                      padding: "0.5rem 0.65rem",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      color: isSelected ? "var(--brand-pink)" : "var(--text-primary)",
                      background: isSelected ? "rgba(240, 59, 106, 0.08)" : "transparent",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      transition: "background 0.15s",
                      display: "block",
                      margin: "2px 0"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--row-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = isSelected ? "rgba(240, 59, 106, 0.08)" : "transparent"}
                  >
                    {opt.name}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "0.5rem", color: "var(--text-secondary)", fontSize: "0.75rem", textAlign: "center" }}>No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Excel Import Modal Component
function ExcelImportModal({ onImport, onClose, properties = [] }: { onImport: (bookings: Booking[]) => void; onClose: () => void; properties: Property[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "analyse" | "review" | "import">("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Column Mappings
  const [propCol, setPropCol] = useState("");
  const [guestCol, setGuestCol] = useState("");
  const [checkInCol, setCheckInCol] = useState("");
  const [checkOutCol, setCheckOutCol] = useState("");
  const [statusCol, setStatusCol] = useState("");
  const [notesCol, setNotesCol] = useState("");
  const [channelCol, setChannelCol] = useState("");

  const [extraCols, setExtraCols] = useState<{ original: string; label: string; type: string; enabled: boolean }[]>([]);
  const [importPreview, setImportPreview] = useState<Booking[] | null>(null);

  const toggleExtraCol = useCallback((orig: string) => {
    setExtraCols(prev => prev.map(c => c.original === orig ? { ...c, enabled: !c.enabled } : c));
  }, []);

  const selectAllExtras = useCallback(() => {
    setExtraCols(prev => prev.map(c => ({ ...c, enabled: true })));
  }, []);

  const deselectAllExtras = useCallback(() => {
    setExtraCols(prev => prev.map(c => ({ ...c, enabled: false })));
  }, []);

  const removeRowFromPreview = useCallback((id: string) => {
    setImportPreview(prev => (prev ? prev.filter(b => b.id !== id) : null));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);
    setStep("upload");
    setAiResult(null);
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = async (evt: any) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!jsonRows.length) {
          setErrorMsg("The sheet appears to be empty.");
          return;
        }

        const sheetHeaders = Object.keys(jsonRows[0]);
        setHeaders(sheetHeaders);
        setRows(jsonRows);

        // Autofill closest columns using synonyms
        setPropCol(findClosestHeader(sheetHeaders, propertySynonyms) || sheetHeaders[0] || "");
        setGuestCol(findClosestHeader(sheetHeaders, guestSynonyms) || "");
        setCheckInCol(findClosestHeader(sheetHeaders, checkInSynonyms) || "");
        setCheckOutCol(findClosestHeader(sheetHeaders, checkOutSynonyms) || "");
        setStatusCol(findClosestHeader(sheetHeaders, statusSynonyms) || "");
        setNotesCol(findClosestHeader(sheetHeaders, notesSynonyms) || "");
        setChannelCol(findClosestHeader(sheetHeaders, channelSynonyms) || "");

        await runAnalysis(sheetHeaders, jsonRows);
      } catch (err: any) {
        setErrorMsg("Failed to parse file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const runAnalysis = useCallback(async (h: string[], r: any[]) => {
    setLoading(true);
    setStep("analyse");
    setErrorMsg(null);
    try {
      const token = localStorage.getItem("hhs_auth_token");
      const res = await fetch("/api/analyse-excel-bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          headers: h,
          sampleRows: r.slice(0, 5)
        })
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const ai = await res.json();
      if (ai.error) throw new Error(ai.error);

      setAiResult(ai);
      
      if (ai.property_col) setPropCol(ai.property_col);
      if (ai.guest_col !== undefined) setGuestCol(ai.guest_col || "");
      if (ai.check_in_col) setCheckInCol(ai.check_in_col);
      if (ai.check_out_col) setCheckOutCol(ai.check_out_col);
      if (ai.status_col !== undefined) setStatusCol(ai.status_col || "");
      if (ai.notes_col !== undefined) setNotesCol(ai.notes_col || "");
      if (ai.channel_col !== undefined) setChannelCol(ai.channel_col || "");

      const mappedSet = new Set([
        ai.property_col || propCol,
        ai.guest_col || guestCol,
        ai.check_in_col || checkInCol,
        ai.check_out_col || checkOutCol,
        ai.status_col || statusCol,
        ai.notes_col || notesCol,
        ai.channel_col || channelCol
      ].filter(Boolean));

      const aiExtras = (ai.extra_cols || []).map((x: any) => ({ ...x, enabled: true }));
      const aiExtraOriginals = new Set(aiExtras.map((x: any) => x.original));
      const remainingHeaders = h.filter(hdr => !mappedSet.has(hdr) && !aiExtraOriginals.has(hdr)).map(hdr => ({
        original: hdr,
        label: hdr,
        type: "text",
        enabled: false
      }));

      setExtraCols([...aiExtras, ...remainingHeaders]);
      setStep("review");
    } catch (err: any) {
      setErrorMsg(`AI analysis failed: ${err.message}. Map columns manually.`);
      const mappedSet = new Set([propCol, guestCol, checkInCol, checkOutCol, statusCol, notesCol, channelCol].filter(Boolean));
      const manualExtras = h.filter(hdr => !mappedSet.has(hdr)).map(hdr => ({
        original: hdr,
        label: hdr,
        type: "text",
        enabled: false
      }));
      setExtraCols(manualExtras);
      setStep("review");
    } finally {
      setLoading(false);
    }
  }, [propCol, guestCol, checkInCol, checkOutCol, statusCol, notesCol, channelCol]);

  const handleRowValueChange = useCallback((id: string, field: string, val: any) => {
    setImportPreview(prev => {
      if (!prev) return null;
      return prev.map(item => {
        if (item.id !== id) return item;
        const nextItem = { ...item, [field]: val };
        const inOk = nextItem.check_in_date && !isNaN(new Date(nextItem.check_in_date).getTime());
        const outOk = nextItem.check_out_date && !isNaN(new Date(nextItem.check_out_date).getTime());
        nextItem.hasDateError = !inOk || !outOk;
        nextItem.nights = inOk && outOk ? calculateNights(nextItem.check_in_date, nextItem.check_out_date) : 0;
        return nextItem;
      });
    });
  }, []);

  const generatePreview = useCallback(() => {
    setErrorMsg(null);
    if (!propCol || !checkInCol || !checkOutCol) {
      setErrorMsg("Property Name, Check-in Date, and Check-out Date columns are required.");
      return;
    }

    const previewList = rows.map((row, idx) => {
      const pName = (row[propCol] ?? "").toString().trim();
      if (!pName) return null;

      const gName = guestCol ? (row[guestCol] ?? "").toString().trim() : "";
      const checkInParsed = parseExcelDate(row[checkInCol]);
      const checkOutParsed = parseExcelDate(row[checkOutCol]);
      const bookingStatus = statusCol ? normalizeStatus(row[statusCol]) : "confirmed";
      const notesVal = notesCol ? (row[notesCol] ?? "").toString().trim() : "";
      const channelVal = channelCol ? (row[channelCol] ?? "").toString().trim() : "Direct";
      const rawIn = (row[checkInCol] ?? "").toString().trim();
      const rawOut = (row[checkOutCol] ?? "").toString().trim();
      const dateErr = !checkInParsed || !checkOutParsed;

      if (!gName && !checkInParsed && !checkOutParsed || /all properties|new units|added this month|onboarding|no show|relocated|not sure|booking status|check status/i.test(pName)) {
        return null;
      }

      const extras: Record<string, any> = {};
      extraCols.filter(col => col.enabled).forEach(col => {
        extras[col.label] = (row[col.original] ?? "").toString().trim();
      });

      const matchedProp = properties.find(p => p.name.toLowerCase().trim() === pName.toLowerCase().trim());

      return {
        id: `bk_imp_${Date.now()}_${idx}`,
        rowNumber: idx + 2,
        property_id: matchedProp ? matchedProp.id : "",
        raw_property_name: pName,
        guest_name: gName,
        check_in_date: checkInParsed,
        check_in_time: "15:00",
        check_out_date: checkOutParsed,
        check_out_time: "11:00",
        nights: checkInParsed && checkOutParsed ? calculateNights(checkInParsed, checkOutParsed) : 0,
        status: bookingStatus,
        notes: notesVal,
        channel: channelVal || "Direct",
        isMatched: !!matchedProp,
        raw_check_in: rawIn,
        raw_check_out: rawOut,
        hasDateError: dateErr,
        extras
      } as Booking & { isMatched: boolean; raw_check_in: string; raw_check_out: string; hasDateError: boolean };
    }).filter(Boolean) as Booking[];

    setImportPreview(previewList);
    setStep("import");
  }, [rows, propCol, guestCol, checkInCol, checkOutCol, statusCol, notesCol, channelCol, extraCols, properties]);

  const executeImport = () => {
    if (!importPreview?.length) return;
    const errors = importPreview.filter(b => (b as any).hasDateError);
    if (errors.length > 0) {
      const names = errors.map(e => `Row ${e.rowNumber} (${e.raw_property_name})`).slice(0, 5).join(", ");
      const extraCount = errors.length > 5 ? ` and ${errors.length - 5} more` : "";
      alert(`⚠️ Unable to import bookings: There are invalid check-in or check-out dates for:\n\n${names}${extraCount}.\n\nPlease correct or delete these rows before importing.`);
      return;
    }
    onImport(importPreview);
    onClose();
  };

  const currentStepIndex = ["upload", "analyse", "review", "import"].indexOf(step);
  const unassignedCount = importPreview ? importPreview.filter(b => !b.property_id).length : 0;
  const matchedCount = importPreview ? importPreview.filter(b => b.property_id).length : 0;
  const hasDateErrors = importPreview ? importPreview.some(b => (b as any).hasDateError) : false;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: 740 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📅 Import Bookings from Excel</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: "1.25rem" }}>
          {[
            { key: "upload", label: "1. Upload" },
            { key: "analyse", label: "2. AI Analyse" },
            { key: "review", label: "3. Review" },
            { key: "import", label: "4. Preview" }
          ].map((item, idx) => (
            <Fragment key={item.key}>
              <div 
                style={{
                  fontSize: "0.72rem",
                  fontWeight: currentStepIndex >= idx ? 700 : 400,
                  color: currentStepIndex >= idx ? "var(--brand-pink)" : "var(--text-secondary)",
                  padding: "0.2rem 0.5rem",
                  borderRadius: 6,
                  background: currentStepIndex === idx ? "rgba(240,59,106,0.12)" : "transparent",
                  border: currentStepIndex === idx ? "1px solid rgba(240,59,106,0.3)" : "1px solid transparent",
                  whiteSpace: "nowrap"
                }}
              >
                {item.label}
              </div>
              {idx < 3 && <ChevronRight size={12} style={{ opacity: 0.3, flexShrink: 0 }} />}
            </Fragment>
          ))}
        </div>

        {step === "upload" && (
          <div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem", fontSize: "0.9rem" }}>
              Upload your bookings Excel sheet (<strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong>). The AI will automatically identify columns for Property Name, Guest, Check-in/out Dates, Status, and Notes.
            </p>
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet size={32} style={{ opacity: 0.6 }} />
              <p style={{ margin: "0.5rem 0 0" }}>{fileName || "Click to select file"}</p>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                style={{ display: "none" }} 
                onChange={handleFileUpload} 
              />
            </div>
          </div>
        )}

        {step === "analyse" && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
              <RefreshCw size={36} style={{ color: "var(--brand-pink)", animation: "spin 2s linear infinite" }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.4rem" }}>
              AI is mapping your bookings columns...
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.83rem" }}>
              {fileName} · {headers.length} columns · {rows.length} rows
            </div>
          </div>
        )}

        {step === "review" && (
          <div>
            {aiResult && (
              <div style={{
                background: "rgba(240,59,106,0.06)",
                border: "1px solid rgba(240,59,106,0.2)",
                borderRadius: 10,
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.82rem"
              }}>
                <Globe size={14} style={{ color: "var(--brand-pink)", flexShrink: 0 }} />
                <span>AI mapped bookings fields successfully. Review mappings below before previewing.</span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1rem", marginBottom: "1.25rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Property Name Column * {aiResult?.property_col && <span style={{ color: "var(--success)", marginLeft: "0.4rem", fontSize: "0.7rem" }}>✓ AI matched</span>}</label>
                <select className="form-control" value={propCol} onChange={e => setPropCol(e.target.value)}>
                  <option value="">Select column...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Guest Name Column {aiResult?.guest_col && <span style={{ color: "var(--success)", marginLeft: "0.4rem", fontSize: "0.7rem" }}>✓ AI matched</span>}</label>
                <select className="form-control" value={guestCol} onChange={e => setGuestCol(e.target.value)}>
                  <option value="">— none —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Check-in Date Column * {aiResult?.check_in_col && <span style={{ color: "var(--success)", marginLeft: "0.4rem", fontSize: "0.7rem" }}>✓ AI matched</span>}</label>
                <select className="form-control" value={checkInCol} onChange={e => setCheckInCol(e.target.value)}>
                  <option value="">Select column...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Check-out Date Column * {aiResult?.check_out_col && <span style={{ color: "var(--success)", marginLeft: "0.4rem", fontSize: "0.7rem" }}>✓ AI matched</span>}</label>
                <select className="form-control" value={checkOutCol} onChange={e => setCheckOutCol(e.target.value)}>
                  <option value="">Select column...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Booking Status Column {aiResult?.status_col && <span style={{ color: "var(--success)", marginLeft: "0.4rem", fontSize: "0.7rem" }}>✓ AI matched</span>}</label>
                <select className="form-control" value={statusCol} onChange={e => setStatusCol(e.target.value)}>
                  <option value="">— default to &quot;confirmed&quot; —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Booking Channel Column {aiResult?.channel_col && <span style={{ color: "var(--success)", marginLeft: "0.4rem", fontSize: "0.7rem" }}>✓ AI matched</span>}</label>
                <select className="form-control" value={channelCol} onChange={e => setChannelCol(e.target.value)}>
                  <option value="">— default to &quot;Direct&quot; —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Booking Notes Column {aiResult?.notes_col && <span style={{ color: "var(--success)", marginLeft: "0.4rem", fontSize: "0.7rem" }}>✓ AI matched</span>}</label>
                <select className="form-control" value={notesCol} onChange={e => setNotesCol(e.target.value)}>
                  <option value="">— none —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {extraCols.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
                    Select Additional Columns to Import as Custom Details:
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="button" onClick={selectAllExtras} style={{ background: "none", border: "none", color: "var(--brand-pink)", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", padding: 0 }}>Select All</button>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.72rem", opacity: 0.5 }}>|</span>
                    <button type="button" onClick={deselectAllExtras} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", padding: 0 }}>Deselect All</button>
                  </div>
                </div>
                <div 
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "0.5rem",
                    maxHeight: 140,
                    overflowY: "auto",
                    padding: "0.6rem",
                    background: "rgba(0,0,0,0.15)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: 8
                  }}
                  className="custom-scrollbar"
                >
                  {extraCols.map(c => (
                    <div 
                      key={c.original}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        padding: "0.45rem 0.6rem",
                        background: c.enabled ? "rgba(240,59,106,0.06)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${c.enabled ? "rgba(240,59,106,0.25)" : "var(--border-glass)"}`,
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                      onClick={() => toggleExtraCol(c.original)}
                    >
                      <div 
                        style={{
                          width: 28,
                          height: 16,
                          borderRadius: 8,
                          background: c.enabled ? "var(--brand-pink)" : "rgba(255,255,255,0.1)",
                          position: "relative",
                          transition: "background-color 0.2s",
                          flexShrink: 0
                        }}
                      >
                        <div 
                          style={{
                            position: "absolute",
                            top: 2,
                            left: c.enabled ? 14 : 2,
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: "white",
                            transition: "left 0.2s"
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.78rem", color: c.enabled ? "var(--text-primary)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.original}>
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="error-message" style={{ marginBottom: "1rem" }}>
                <AlertTriangle size={16} /> <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-outline" style={{ width: "auto" }} onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={generatePreview} disabled={!propCol || !checkInCol || !checkOutCol}>
                Preview Bookings →
              </button>
            </div>
          </div>
        )}

        {step === "import" && importPreview && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--success)" }}>
                <Check size={16} /> <strong>{importPreview.length} bookings ready</strong>
              </div>
              <span style={{ fontSize: "0.78rem", color: "var(--success)" }}>🟢 {matchedCount} Matched properties</span>
              {unassignedCount > 0 && (
                <span style={{ fontSize: "0.78rem", color: "var(--brand-pink)", fontWeight: 600 }}>
                  ⚠️ {unassignedCount} Unassigned bookings (to be put in queue)
                </span>
              )}
              {hasDateErrors && (
                <span style={{ fontSize: "0.78rem", color: "#f87171", fontWeight: 700 }}>
                  ⚠️ Date corrections required
                </span>
              )}
            </div>

            <div style={{ maxHeight: 270, overflowY: "auto", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "0.25rem" }} className="custom-scrollbar">
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.3fr 1.3fr 1.2fr", gap: "0.75rem", padding: "0.4rem 0.5rem", fontSize: "0.72rem", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-glass)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <span>Booking Info</span>
                <span>Check-in Date</span>
                <span>Check-out Date</span>
                <span style={{ textAlign: "right" }}>Nights & Status</span>
              </div>
              
              {importPreview.map((item, idx) => {
                const hasDateErr = (item as any).hasDateError;
                return (
                  <div 
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1.3fr 1.3fr 1.2fr",
                      gap: "0.75rem",
                      padding: "0.5rem 0.5rem",
                      borderBottom: "1px solid var(--border-glass)",
                      fontSize: "0.8rem",
                      background: hasDateErr ? "rgba(239,68,68,0.06)" : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      borderLeft: hasDateErr ? "3px solid #f87171" : "3px solid transparent",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600, color: (item as any).isMatched ? "var(--text-primary)" : "var(--brand-pink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.raw_property_name} {!(item as any).isMatched && "⚠️"}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        👤 {item.guest_name || "No Guest"} (Row {item.rowNumber})
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <input 
                        type="date" 
                        value={item.check_in_date}
                        onChange={e => handleRowValueChange(item.id, "check_in_date", e.target.value)}
                        className="form-control"
                        style={{
                          padding: "0.2rem 0.4rem",
                          fontSize: "0.78rem",
                          height: "auto",
                          borderColor: item.check_in_date ? "var(--border-glass)" : "#f87171",
                          background: item.check_in_date ? "rgba(0,0,0,0.25)" : "rgba(239,68,68,0.1)",
                          color: "var(--text-primary)"
                        }}
                      />
                      {!item.check_in_date && (
                        <span style={{ fontSize: "0.65rem", color: "#f87171", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Excel: &quot;{(item as any).raw_check_in || "empty"}&quot;
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <input 
                        type="date" 
                        value={item.check_out_date}
                        onChange={e => handleRowValueChange(item.id, "check_out_date", e.target.value)}
                        className="form-control"
                        style={{
                          padding: "0.2rem 0.4rem",
                          fontSize: "0.78rem",
                          height: "auto",
                          borderColor: item.check_out_date ? "var(--border-glass)" : "#f87171",
                          background: item.check_out_date ? "rgba(0,0,0,0.25)" : "rgba(239,68,68,0.1)",
                          color: "var(--text-primary)"
                        }}
                      />
                      {!item.check_out_date && (
                        <span style={{ fontSize: "0.65rem", color: "#f87171", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Excel: &quot;{(item as any).raw_check_out || "empty"}&quot;
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                        {hasDateErr ? "—" : `${item.nights} night${item.nights !== 1 ? "s" : ""}`}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.2rem" }}>
                        <span style={{
                          fontSize: 0.72,
                          textTransform: "capitalize",
                          color: item.status === "cancelled" ? "#f87171" : item.status === "pending" ? "#fbbf24" : item.status === "checked_in" ? "#60a5fa" : "#2dd4af"
                        }}>
                          {item.status ? item.status.replace("_", " ") : ""}
                        </span>
                        <button 
                          onClick={e => { e.stopPropagation(); removeRowFromPreview(item.id); }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#f87171",
                            cursor: "pointer",
                            padding: "0.1rem 0.2rem",
                            borderRadius: 4,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: 0.7,
                            transition: "opacity 0.2s"
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                          title="Remove booking"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasDateErrors && (
              <div style={{
                color: "#f87171",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8,
                padding: "0.5rem 0.75rem",
                fontSize: "0.78rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                marginTop: "0.75rem"
              }}>
                <AlertTriangle size={14} />
                <span>Please select valid dates for the highlighted bookings marked in red (refer to raw Excel strings).</span>
              </div>
            )}

            <div className="form-actions" style={{ marginTop: "1rem" }}>
              <button className="btn btn-outline" style={{ width: "auto" }} onClick={() => setStep("review")}>← Back</button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={executeImport} disabled={hasDateErrors}>
                ✨ Import {importPreview.length} Bookings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main BookingsList component
export default function BookingsList({
  currentUser,
  bookings = [],
  setBookings,
  properties = [],
  channelRules = [],
  onAddProperty,
  customConfirm
}: BookingsListProps) {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const [currency, setCurrency] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = orgId ? localStorage.getItem(`hhs_bookings_currency_${orgId}`) : null;
      return saved || localStorage.getItem("hhs_bookings_currency") || "AED";
    }
    return "AED";
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && orgId) {
      const saved = localStorage.getItem(`hhs_bookings_currency_${orgId}`);
      if (saved) {
        setCurrency(saved);
      } else {
        setCurrency("AED");
      }
    }
  }, [orgId]);
  
  const [exchangeRate, setExchangeRate] = useState(1 / 3.6725);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState<Booking>({ ...emptyBookingForm });

  // Filter States
  const [statusFilter, setStatusFilter] = useState("all");
  const [calendarFilterMode, setCalendarFilterMode] = useState<"stay" | "book">("stay");
  const [sidebarMonth, setSidebarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [mismatchDropdownId, setMismatchDropdownId] = useState<string | null>(null);
  const [mismatchSearchText, setMismatchSearchText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [bookingFilterTab, setBookingFilterTab] = useState<'verified' | 'norule' | 'mismatch'>('verified');

  // Load exchange rate dynamically
  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/AED")
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.USD) {
          setExchangeRate(data.rates.USD);
        }
      })
      .catch(err => console.warn("Exchange rate API offline. Using pegged rate.", err));
  }, []);

  const formatValue = (val: any) => {
    if (val == null || val === "") return "";
    const num = Number(val);
    const scale = currency === "USD" ? exchangeRate : 1;
    const prefix = currency === "USD" ? "$" : "AED ";
    return isNaN(num) 
      ? `${prefix}${val}`
      : `${prefix}${(num * scale).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPropertyById = useCallback((id: string) => {
    if (!id || !properties) return null;
    return properties.find(p => p.id === id || (p.uplistingPropertyId && String(p.uplistingPropertyId) === String(id)));
  }, [properties]);

  const getResolvedChannelName = useCallback((b: Booking) => {
    if (!b.property_id || !b.channel || !properties || !channelRules) return b.channel || "";
    
    if (b.manual_channel_rule_id) {
      const rule = channelRules.find(r => r.id === b.manual_channel_rule_id);
      if (rule) return rule.accountName;
    }
    
    const propId = b.original_property_id || b.property_id;
    const prop = getPropertyById(propId);
    if (!prop) return b.channel || "";

    let matchedRuleId = null;
    const chanKey = b.channel.toLowerCase();
    const extra = prop.extraDetails && typeof prop.extraDetails === 'object' ? prop.extraDetails : {};

    if (extra.channelRuleIds) {
      const matchedKey = Object.keys(extra.channelRuleIds).find(k => chanKey.includes(k.toLowerCase()) || k.toLowerCase().includes(chanKey));
      if (matchedKey) {
        matchedRuleId = extra.channelRuleIds[matchedKey];
      }
    }

    if (!matchedRuleId && extra.channelRuleId) {
      const fallbackRule = channelRules.find(r => r.id === extra.channelRuleId);
      if (fallbackRule && (chanKey.includes(fallbackRule.channel.toLowerCase()) || fallbackRule.channel.toLowerCase().includes(chanKey))) {
        matchedRuleId = extra.channelRuleId;
      }
    }

    const ruleObj = matchedRuleId ? channelRules.find(r => r.id === matchedRuleId) : null;
    return ruleObj ? ruleObj.accountName : b.channel;
  }, [properties, channelRules, getPropertyById]);

  // Derived Bookings Lists
  const unmatchedBookings = useMemo(() => {
    return bookings.filter(b => !b.property_id);
  }, [bookings]);

  const unassignedRuleBookings = useMemo(() => {
    return bookings.filter(b => {
      if (!b.property_id || b.channel === "direct" || b.channel === "uplisting" || (b.manual_channel_rule_id && channelRules.find(r => r.id === b.manual_channel_rule_id))) {
        return false;
      }
      const propId = b.original_property_id || b.property_id;
      const prop = properties.find(p => p.id === propId);
      if (!prop) return false;

      let matchedRuleId = null;
      const extra = prop.extraDetails && typeof prop.extraDetails === 'object' ? prop.extraDetails : {};

      if (extra.channelRuleIds) {
        const key = Object.keys(extra.channelRuleIds).find(k => k.toLowerCase() === b.channel.toLowerCase());
        if (key) matchedRuleId = extra.channelRuleIds[key];
      }

      if (!matchedRuleId && extra.channelRuleId) {
        const rule = channelRules.find(r => r.id === extra.channelRuleId);
        if (rule && rule.channel.toLowerCase() === b.channel.toLowerCase()) {
          matchedRuleId = extra.channelRuleId;
        }
      }

      return !matchedRuleId;
    });
  }, [bookings, properties, channelRules]);

  const payoutDiscrepancyBookings = useMemo(() => {
    return bookings.filter(b => {
      if (!b.property_id || b.channel === "direct" || b.channel === "uplisting") return false;
      
      let rule: ChannelRule | null = null;
      if (b.manual_channel_rule_id) {
        rule = channelRules.find(r => r.id === b.manual_channel_rule_id) || null;
      } else {
        const propId = b.original_property_id || b.property_id;
        const prop = properties.find(p => p.id === propId);
        if (!prop) return false;

        let ruleId = null;
        const extra = prop.extraDetails && typeof prop.extraDetails === 'object' ? prop.extraDetails : {};
        if (extra.channelRuleIds) {
          const key = Object.keys(extra.channelRuleIds).find(k => k.toLowerCase() === b.channel.toLowerCase());
          if (key) ruleId = extra.channelRuleIds[key];
        }
        if (!ruleId && extra.channelRuleId) {
          const r = channelRules.find(x => x.id === extra.channelRuleId);
          if (r && r.channel.toLowerCase() === b.channel.toLowerCase()) {
            ruleId = extra.channelRuleId;
          }
        }
        rule = ruleId ? channelRules.find(r => r.id === ruleId) || null : null;
      }

      if (!rule) return false;

      const payoutAmt = parseFloat(b.payout || "0") || 0;
      const cleanAmt = parseFloat(b.cleaning_fee || "0") || 0;
      const servAmt = parseFloat(b.service_charge || "0") || 0;
      const resortAmt = parseFloat(b.resort_fee || "0") || 0;
      const destAmt = parseFloat(b.destination_fee || "0") || 0;
      const dtcmAmt = parseFloat(b.dtcm_fee || "0") || 0;
      const discountAmt = parseFloat(b.discounts || "0") || 0;
      const commAmt = parseFloat(b.commission || "0") || 0;
      const commVatAmt = parseFloat(b.commission_vat || "0") || 0;
      const vatAmt = parseFloat(b.vat_amount || "0") || 0;
      const taxAmt = parseFloat(b.tax_amount || "0") || 0;
      const processAmt = parseFloat(b.payment_processing_fee || "0") || 0;

      const totalCalculatedRevenue = payoutAmt + cleanAmt + servAmt + resortAmt + destAmt - discountAmt;
      const commBases = rule.commissionBases || ["Stay + Cleaning"];
      
      let commBaseAmount = payoutAmt + cleanAmt;
      if (commBases.length > 0) {
        const base = commBases[0];
        if (base === "Stay") {
          commBaseAmount = payoutAmt - discountAmt + servAmt;
        } else if (base === "Stay + Cleaning") {
          commBaseAmount = payoutAmt - discountAmt + servAmt + cleanAmt;
        } else {
          commBaseAmount = payoutAmt + cleanAmt + destAmt + resortAmt + dtcmAmt + servAmt - discountAmt;
        }
      }

      const bookingNights = calculateNights(b.check_in_date, b.check_out_date) || parseFloat(String(b.nights || "0")) || 0;
      const bookingGross = parseFloat(b.payout || "0") || 0;
      const bookingGuests = b.raw_booking && b.raw_booking.guests != null ? Number(b.raw_booking.guests) : 2;

      let commissionPercent = rule.commissionPercent;
      let vatPercent = rule.vatPercent;
      let feeTotal = rule.feeTotal;
      let processingFee = rule.processingFee;
      let merchantFee = rule.merchantFee;

      if (rule.customRules && Array.isArray(rule.customRules)) {
        rule.customRules.forEach((cRule: any) => {
          let matches = false;
          let valToCheck = 0;
          if (cRule.field === 'nights') valToCheck = bookingNights;
          else if (cRule.field === 'grossAmount') valToCheck = bookingGross;
          else if (cRule.field === 'guests') valToCheck = bookingGuests;

          if (cRule.operator === 'greater_than' && valToCheck > cRule.value) matches = true;
          else if (cRule.operator === 'less_than' && valToCheck < cRule.value) matches = true;
          else if (cRule.operator === 'equal_to' && valToCheck === cRule.value) matches = true;

          if (matches) {
            if (cRule.targetField === 'commissionPercent') {
              commissionPercent = cRule.newValue;
            } else if (cRule.targetField === 'feeTotal') {
              feeTotal = cRule.newValue;
            } else if (cRule.targetField === 'vatPercent') {
              vatPercent = cRule.newValue;
            } else if (cRule.targetField === 'processingFee') {
              processingFee = cRule.newValue;
            } else if (cRule.targetField === 'merchantFee') {
              merchantFee = cRule.newValue;
            }
          }
        });
      }

      const expectedComm = commBaseAmount * (commissionPercent / 100);
      const expectedCommVat = expectedComm * (vatPercent / 100);
      
      const commMismatch = Math.abs(commAmt - expectedComm) > 0.05;
      const vatMismatch = Math.abs(commVatAmt - expectedCommVat) > 0.05;
      
      const computedPayout = totalCalculatedRevenue + vatAmt + dtcmAmt + taxAmt - processAmt - commAmt - commVatAmt;
      const rawPayout = b.raw_booking && b.raw_booking.total_payout != null ? parseFloat(b.raw_booking.total_payout) : null;
      
      const payoutMismatch = rawPayout !== null && Math.abs(computedPayout - rawPayout) > 0.05;

      return commMismatch || vatMismatch || payoutMismatch;
    });
  }, [bookings, properties, channelRules]);

  const alertList = useMemo(() => {
    return [...unassignedRuleBookings, ...payoutDiscrepancyBookings];
  }, [unassignedRuleBookings, payoutDiscrepancyBookings]);

  // Click handler for mismatches
  useEffect(() => {
    function globalClick(e: MouseEvent) {
      if (mismatchDropdownId && !(e.target as HTMLElement).closest("[data-dropdown-container]")) {
        setMismatchDropdownId(null);
      }
    }
    document.addEventListener("click", globalClick);
    return () => document.removeEventListener("click", globalClick);
  }, [mismatchDropdownId]);

  // Handle mismatch resolution selection
  const handleResolveMismatch = async (booking: Booking, targetId: string) => {
    if (targetId === "__new__") {
      if (currentUser && !currentUser.permissions?.create_property) {
        alert("Permission Denied: You do not have permission to register new properties.");
        return;
      }
      if (onAddProperty) {
        const newId = await onAddProperty({
          name: booking.raw_property_name,
          mapUrl: "",
          checkin_type: "Self",
          bedrooms: 2
        });
        
        setBookings(prev => prev.map(item => item.id === booking.id ? { ...item, property_id: newId } : item));

        // Sync with API
        await fetch(`/api/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: booking.id, property_id: newId })
        });
      } else {
        alert("Error: Property creation callback is not available.");
      }
    } else if (targetId) {
      setBookings(prev => prev.map(item => item.id === booking.id ? { ...item, property_id: targetId } : item));
      
      await fetch(`/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, property_id: targetId })
      });
    }
  };

  const handleImportExcel = (imported: Booking[]) => {
    // Save each imported booking to database
    imported.forEach(async (b) => {
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(b)
        });
        if (!res.ok) throw new Error("Failed to save imported booking");
        
        const data = await res.json();
        const savedBooking = {
          ...b,
          id: data.booking.id,
          property_id: data.booking.propertyId
        };
        
        setBookings(prev => {
          // Check if already in list
          if (prev.some(x => x.id === savedBooking.id)) return prev;
          return [savedBooking, ...prev];
        });
      } catch (err) {
        console.error("Error saving imported booking:", err);
      }
    });
  };

  // Form value updates
  const setFormVal = (key: keyof Booking, value: any) => {
    setBookingForm(prev => {
      const next = { ...prev, [key]: value };
      if ((key === "check_in_date" || key === "nights") && next.check_in_date && next.nights) {
        const d = new Date(next.check_in_date + "T00:00:00");
        d.setDate(d.getDate() + parseInt(String(next.nights)));
        next.check_out_date = d.toISOString().slice(0, 10);
      }
      if ((key === "check_in_date" || key === "check_out_date") && next.check_in_date && next.check_out_date) {
        next.nights = String(calculateNights(next.check_in_date, next.check_out_date));
      }
      return next;
    });
  };

  const handleOpenAdd = () => {
    const firstProp = properties[0]?.id || "";
    setBookingForm({
      ...emptyBookingForm,
      property_id: firstProp
    });
    setEditingBookingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (booking: Booking) => {
    setEditingBookingId(booking.id);
    const toIsoDate = (val: any) => {
      if (!val) return "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch {}
      return val;
    };

    const raw = booking.raw_booking || {};
    const hasRaw = !!booking.raw_booking;

    const valPayout = booking.payout != null && booking.payout !== "" ? booking.payout : (hasRaw && raw.accomodation_total != null ? raw.accomodation_total : "");
    const valClean = booking.cleaning_fee != null && booking.cleaning_fee !== "" ? booking.cleaning_fee : (hasRaw && raw.cleaning_fee != null ? raw.cleaning_fee : "");
    const valServ = booking.service_charge != null && booking.service_charge !== "" ? booking.service_charge : (hasRaw && (raw.extra_charges ?? raw.other_charges) != null ? (raw.extra_charges ?? raw.other_charges) : "");
    const valDest = booking.destination_fee != null && booking.destination_fee !== "" ? booking.destination_fee : (hasRaw && raw.destination_charge != null ? raw.destination_charge : "");
    const valResort = booking.resort_fee != null && booking.resort_fee !== "" ? booking.resort_fee : (hasRaw && raw.resort_fee != null ? raw.resort_fee : "");
    const valVat = booking.vat_amount != null && booking.vat_amount !== "" ? booking.vat_amount : (hasRaw && raw.booking_taxes != null ? raw.booking_taxes : "");
    const valDtcm = booking.dtcm_fee != null && booking.dtcm_fee !== "" ? booking.dtcm_fee : (hasRaw && raw.lodging_tax != null ? raw.lodging_tax : "");
    const valTax = booking.tax_amount != null && booking.tax_amount !== "" ? booking.tax_amount : "";
    const valProc = booking.payment_processing_fee != null && booking.payment_processing_fee !== "" ? booking.payment_processing_fee : (hasRaw && raw.payment_processing_fee != null ? raw.payment_processing_fee : "");
    const valComm = booking.commission != null && booking.commission !== "" ? booking.commission : (hasRaw && raw.commission != null ? raw.commission : "");
    const valCommVat = booking.commission_vat != null && booking.commission_vat !== "" ? booking.commission_vat : (hasRaw && raw.commission_vat != null ? raw.commission_vat : "");
    const valDiscounts = booking.discounts != null && booking.discounts !== "" ? booking.discounts : (hasRaw && raw.discounts != null ? raw.discounts : "");
    const valBookedAt = booking.booked_at != null && booking.booked_at !== "" ? booking.booked_at : (hasRaw && raw.booked_at != null ? raw.booked_at : "");

    const factor = currency === "USD" ? exchangeRate : 1;
    const formatScale = (v: any) => v == null || v === "" ? "" : (parseFloat(v) * factor).toFixed(2);

    setBookingForm({
      ...booking,
      channel: booking.channel || "Direct",
      check_in_date: toIsoDate(booking.check_in_date),
      check_out_date: toIsoDate(booking.check_out_date),
      nights: String(calculateNights(booking.check_in_date, booking.check_out_date)),
      payout: formatScale(valPayout),
      cleaning_fee: formatScale(valClean),
      service_charge: formatScale(valServ),
      destination_fee: formatScale(valDest),
      resort_fee: formatScale(valResort),
      vat_amount: formatScale(valVat),
      dtcm_fee: formatScale(valDtcm),
      tax_amount: formatScale(valTax),
      payment_processing_fee: formatScale(valProc),
      commission: formatScale(valComm),
      commission_base: booking.commission_base || "GBV",
      discounts: formatScale(valDiscounts),
      commission_vat: formatScale(valCommVat),
      booked_at: valBookedAt
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = async () => {
    if (!bookingForm.property_id || !bookingForm.check_in_date || !bookingForm.check_out_date) return;

    const scale = currency === "USD" ? 1 / exchangeRate : 1;
    const scaleValue = (v: any) => {
      if (v == null || v === "") return undefined;
      const n = parseFloat(v);
      return isNaN(n) ? undefined : Math.round(n * scale * 100) / 100;
    };

    const payload = {
      ...bookingForm,
      channel: bookingForm.channel || "Direct",
      booked_at: bookingForm.booked_at || new Date().toISOString(),
      nights: calculateNights(bookingForm.check_in_date, bookingForm.check_out_date),
      payout: scaleValue(bookingForm.payout),
      cleaning_fee: scaleValue(bookingForm.cleaning_fee),
      destination_fee: scaleValue(bookingForm.destination_fee),
      resort_fee: scaleValue(bookingForm.resort_fee),
      dtcm_fee: scaleValue(bookingForm.dtcm_fee),
      service_charge: scaleValue(bookingForm.service_charge),
      vat_amount: scaleValue(bookingForm.vat_amount),
      tax_amount: scaleValue(bookingForm.tax_amount),
      payment_processing_fee: scaleValue(bookingForm.payment_processing_fee),
      commission: scaleValue(bookingForm.commission),
      commission_base: bookingForm.commission_base || "GBV",
      discounts: scaleValue(bookingForm.discounts),
      commission_vat: scaleValue(bookingForm.commission_vat)
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          id: editingBookingId || undefined
        })
      });

      if (!res.ok) throw new Error("Failed to save booking details");
      const data = await res.json();
      
      const finalBooking: Booking = {
        ...bookingForm,
        id: data.booking.id,
        property_id: data.booking.propertyId
      };

      setBookings(prev => {
        if (editingBookingId) {
          return prev.map(item => item.id === editingBookingId ? finalBooking : item);
        } else {
          return [finalBooking, ...prev];
        }
      });
      setIsModalOpen(false);
      setEditingBookingId(null);
    } catch (err: any) {
      console.error("Save booking failed:", err);
      alert("Error saving booking: " + err.message);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    const performDelete = async () => {
      try {
        const res = await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete booking");

        setBookings(prev => prev.filter(b => b.id !== id));
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Error deleting booking.");
      }
    };

    if (customConfirm) {
      customConfirm(
        "Delete Booking",
        "Delete this booking? This will remove all double-entry ledger listings associated with it.",
        performDelete,
        "Delete Booking",
        "Keep Booking"
      );
    } else {
      if (window.confirm("Delete this booking? This will remove all double-entry ledger listings associated with it.")) {
        await performDelete();
      }
    }
  };

  // Stay extensions confirmations
  const handleConfirmExtension = (priorId: string, extId: string) => {
    const booking = bookings.find(b => b.id === extId);
    if (!booking) return;

    setBookings(prev => prev.map(b => b.id === extId ? { ...b, is_extension: true, extension_of: priorId } : b));
    
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ...booking,
        is_extension: true, 
        extension_of: priorId 
      })
    }).catch(err => console.error("Failed to confirm extension:", err));
  };

  const handleDismissExtension = (extId: string) => {
    const booking = bookings.find(b => b.id === extId);
    if (!booking) return;

    setBookings(prev => prev.map(b => b.id === extId ? { ...b, extension_dismissed: true } : b));
    
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ...booking,
        extension_dismissed: true 
      })
    }).catch(err => console.error("Failed to dismiss extension:", err));
  };

  const handleUnlinkExtension = (id: string) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    setBookings(prev => prev.map(b => {
      if (b.id === id) {
        const next = { ...b };
        delete next.is_extension;
        delete next.extension_of;
        return next;
      }
      return b;
    }));
    
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ...booking,
        is_extension: false, 
        extension_of: null 
      })
    }).catch(err => console.error("Failed to unlink extension:", err));
  };

  const handleUnlinkChildExtension = (priorId: string) => {
    const child = bookings.find(b => b.is_extension && String(b.extension_of) === String(priorId));
    if (!child) return;

    setBookings(prev => prev.map(b => {
      if (b.is_extension && String(b.extension_of) === String(priorId)) {
        const next = { ...b };
        delete next.is_extension;
        delete next.extension_of;
        return next;
      }
      return b;
    }));

    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...child,
        is_extension: false,
        extension_of: null
      })
    }).catch(err => console.error("Failed to unlink child extension:", err));
  };

  // Generate cleaning and arrival tasks locally for display
  const getAutoScheduledTasks = (b: Booking) => {
    if (!b.check_in_date || !b.check_out_date) return [];
    const list = [];
    
    // Check if checkOut is not consecutive with another booking
    const hasChildExtension = bookings.some(x => x.is_extension && String(x.extension_of) === String(b.id) && x.status !== "cancelled");

    if (!hasChildExtension) {
      list.push({ label: "Checkout Cleaning", date: b.check_out_date, time: b.check_out_time || "—", color: "#a78bfa", icon: "🧹" });
    }

    if (!b.is_extension) {
      // Find previous booking of same property
      const priorBooking = bookings
        .filter(x => x.id !== b.id && x.property_id === b.property_id && x.status !== "cancelled" && x.check_out_date && x.check_out_date <= b.check_in_date)
        .sort((x, y) => y.check_out_date.localeCompare(x.check_out_date))[0];

      const gap = priorBooking ? Math.round((new Date(b.check_in_date).getTime() - new Date(priorBooking.check_out_date).getTime()) / 864e5) : null;

      if (gap === 0) {
        list.push({ label: "No check-in cleaning (same-day checkout covers it)", date: b.check_in_date, time: "—", color: "var(--text-secondary)", icon: "✅", dim: true });
      } else if (gap !== null && gap <= 7) {
        list.push({ label: `Touch Up only (prev checkout ${gap}d ago)`, date: b.check_in_date, time: "10:00", color: "#fbbf24", icon: "🧽" });
      } else {
        list.push({ label: "Check-in Cleaning", date: b.check_in_date, time: "10:00", color: "#60a5fa", icon: "🛏️" });
      }

      list.push({ label: "Check-in / Meet & Greet", date: b.check_in_date, time: b.check_in_time || "—", color: "#2dd4af", icon: "✈️" });
    }

    return list;
  };

  // Proposed stay extensions detector (consecutive stays)
  const proposedExtensions = useMemo(() => {
    const list: { prior: Booking; extension: Booking; exactMatch: boolean }[] = [];
    const activeBookings = bookings.filter(b => b.status !== "cancelled" && b.property_id);
    
    activeBookings.forEach(prior => {
      if (prior.is_extension || prior.extension_dismissed) return;
      const consecutive = activeBookings.find(ext => 
        ext.id !== prior.id && 
        ext.property_id === prior.property_id && 
        ext.check_in_date === prior.check_out_date &&
        !ext.is_extension &&
        !ext.extension_dismissed
      );
      if (consecutive) {
        const priorGuest = (prior.guest_name || "").trim().toLowerCase();
        const consecutiveGuest = (consecutive.guest_name || "").trim().toLowerCase();
        
        if (priorGuest && consecutiveGuest) {
          if (priorGuest === consecutiveGuest) {
            list.push({ prior, extension: consecutive, exactMatch: true });
          } else if (priorGuest.startsWith(consecutiveGuest) || consecutiveGuest.startsWith(priorGuest) || (priorGuest.split(" ")[0] === consecutiveGuest.split(" ")[0] && priorGuest.split(" ")[0].length >= 3)) {
            list.push({ prior, extension: consecutive, exactMatch: false });
          }
        }
      }
    });
    return list;
  }, [bookings]);

  // Calendar Sidebar calculations
  const { year, month } = sidebarMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = new Date(year, month, 1).getDay();
  const monthLabel = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });

  const calendarDayBookings = useMemo(() => {
    const map: Record<string, (Booking & { propertyName: string; isCheckIn?: boolean; isCheckOut?: boolean; isBookDate?: boolean })[]> = {};
    bookings.filter(b => b.status !== "cancelled" && b.property_id).forEach(b => {
      const prop = getPropertyById(b.property_id);
      const propName = prop ? prop.name : "Unknown Property";

      if (calendarFilterMode === "book") {
        const bookDate = b.booked_at ? b.booked_at.slice(0, 10) : (b.raw_booking?.booked_at ? b.raw_booking.booked_at.slice(0, 10) : b.check_in_date);
        if (bookDate) {
          if (!map[bookDate]) map[bookDate] = [];
          map[bookDate].push({ ...b, propertyName: propName, isBookDate: true });
        }
      } else {
        const start = new Date(b.check_in_date + "T00:00:00");
        const end = new Date(b.check_out_date + "T00:00:00");
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateKey = d.toISOString().slice(0, 10);
          if (!map[dateKey]) map[dateKey] = [];
          map[dateKey].push({
            ...b,
            propertyName: propName,
            isCheckIn: dateKey === b.check_in_date,
            isCheckOut: dateKey === b.check_out_date
          });
        }
      }
    });
    return map;
  }, [bookings, calendarFilterMode, getPropertyById]);

  const changeMonth = (offset: number) => {
    setSidebarMonth(prev => {
      const d = new Date(prev.year, prev.month + offset, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  // Helper to filter any booking list by user criteria (search, status, date)
  const applyListFilters = useCallback((inputList: Booking[]) => {
    let list = [...inputList];

    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      list = list.filter(b => {
        const prop = getPropertyById(b.property_id);
        return !!(prop && prop.name.toLowerCase().includes(q));
      });
    }

    if (statusFilter !== "all") {
      list = list.filter(b => b.status === statusFilter);
    }

    if (selectedDateFilter) {
      if (calendarFilterMode === "book") {
        list = list.filter(b => {
          const bDate = b.booked_at ? b.booked_at.slice(0, 10) : (b.raw_booking?.booked_at ? b.raw_booking.booked_at.slice(0, 10) : b.check_in_date);
          return bDate === selectedDateFilter;
        });
      } else {
        list = list.filter(b => getAutoScheduledTasks(b).some(t => t.date === selectedDateFilter));
      }
    }

    return list.sort((x, y) => x.check_in_date.localeCompare(y.check_in_date));
  }, [searchText, statusFilter, selectedDateFilter, calendarFilterMode, getPropertyById]);

  // Main filtered table bookings lists by category
  const filteredVerifiedBookings = useMemo(() => {
    const unmatchedIds = new Set(alertList.map(a => a.id));
    const verified = bookings.filter(b => b.property_id && !unmatchedIds.has(b.id));
    return applyListFilters(verified);
  }, [bookings, alertList, applyListFilters]);

  const filteredNoRuleBookings = useMemo(() => {
    return applyListFilters(unassignedRuleBookings);
  }, [unassignedRuleBookings, applyListFilters]);

  const filteredMismatchBookings = useMemo(() => {
    return applyListFilters(payoutDiscrepancyBookings);
  }, [payoutDiscrepancyBookings, applyListFilters]);

  const activeBookingsList = useMemo(() => {
    if (bookingFilterTab === 'norule') return filteredNoRuleBookings;
    if (bookingFilterTab === 'mismatch') return filteredMismatchBookings;
    return filteredVerifiedBookings;
  }, [bookingFilterTab, filteredVerifiedBookings, filteredNoRuleBookings, filteredMismatchBookings]);

  // Legacy reference for other parts of codebase
  const filteredBookings = filteredVerifiedBookings;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top action row */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <input 
          type="text" 
          placeholder="🔍 Search property by name..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="form-control"
          style={{ width: "250px", fontSize: "0.82rem", padding: "0.35rem 0.7rem" }}
        />
        
        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="form-control"
          style={{ width: "auto", fontSize: "0.82rem", padding: "0.35rem 0.7rem" }}
        >
          <option value="all">All Statuses</option>
          <option value="confirmed">{t('Confirmed')}</option>
          <option value="pending">Pending</option>
          <option value="cancelled">{t('Cancelled')}</option>
          <option value="checked_in">Checked In</option>
        </select>

        <select 
          value={currency}
          onChange={e => { 
            const val = e.target.value;
            setCurrency(val); 
            const key = orgId ? `hhs_bookings_currency_${orgId}` : "hhs_bookings_currency";
            localStorage.setItem(key, val); 
          }}
          className="form-control"
          style={{ width: "auto", fontSize: "0.82rem", padding: "0.35rem 0.7rem" }}
        >
          <option value="AED">AED (Dirhams)</option>
          <option value="USD">USD (Dollars)</option>
        </select>

        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", alignSelf: "center", opacity: 0.7 }}>
            {activeBookingsList.length} booking{activeBookingsList.length !== 1 ? "s" : ""}
          </span>
          {(!currentUser || currentUser.permissions?.import_bookings) && (
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="btn btn-outline"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.9rem", width: "auto", fontSize: "0.82rem", cursor: "pointer" }}
            >
              📂 Import Excel
            </button>
          )}
          <button 
            onClick={handleOpenAdd}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.9rem", width: "auto", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={14} /> Add Booking
          </button>
        </div>
      </div>

      {/* Extension warnings notifications */}
      {proposedExtensions.length > 0 && (
        <div style={{
          background: "rgba(99, 102, 241, 0.04)",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          borderRadius: 14,
          padding: "1.25rem",
          marginBottom: "1.25rem",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.08)"
        }}>
          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 800, color: "#818cf8", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            🔗 Extension Verifications ({proposedExtensions.length})
          </h3>
          <p style={{ margin: "0 0 1rem 0", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
            The following bookings appear to be guest stay extensions (same property, consecutive dates). Confirming them will suppress Checkout Cleaning on the first stay, and Check-in tasks (cleaning, touch-up, meet & greet) on the second stay.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "0.85rem" }}>
            {proposedExtensions.map((item, idx) => {
              const prop = getPropertyById(item.extension.property_id);
              return (
                <div 
                  key={`${item.prior.id}_${item.extension.id}_${idx}`}
                  style={{
                    background: "rgba(255, 255, 255, 0.015)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: 10,
                    padding: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.65rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)" }}>
                      🏢 {prop ? prop.name : "Unknown Property"}
                    </span>
                    <span style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "0.15rem 0.45rem",
                      borderRadius: 4,
                      background: item.exactMatch ? "rgba(45, 212, 172, 0.08)" : "rgba(251, 191, 36, 0.08)",
                      border: item.exactMatch ? "1px solid rgba(45, 212, 172, 0.25)" : "1px solid rgba(251, 191, 36, 0.25)",
                      color: item.exactMatch ? "#2dd4af" : "#fbbf24"
                    }}>
                      {item.exactMatch ? "✓ Exact Name Match" : "⚠️ Similar Name Match"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "0.5rem", background: "rgba(255, 255, 255, 0.01)", padding: "0.6rem 0.75rem", borderRadius: 8, border: "1px solid var(--border-glass)" }}>
                    <div style={{ overflow: "hidden" }}>
                      <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.15rem" }}>Stay 1 (Prior)</span>
                      <strong style={{ fontSize: "0.78rem", color: "var(--text-primary)", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={item.prior.guest_name}>
                        👤 {item.prior.guest_name}
                      </strong>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginTop: "0.15rem" }}>
                        Out: <strong>{formatDate(item.prior.check_out_date)}</strong>
                      </span>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", opacity: 0.7, display: "block" }}>{item.prior.channel}</span>
                    </div>
                    <div style={{ fontSize: "1rem", color: "var(--text-secondary)", opacity: 0.4, padding: "0 0.2rem" }}>➜</div>
                    <div style={{ overflow: "hidden" }}>
                      <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.15rem" }}>Stay 2 (Extension)</span>
                      <strong style={{ fontSize: "0.78rem", color: "var(--text-primary)", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={item.extension.guest_name}>
                        👤 {item.extension.guest_name}
                      </strong>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginTop: "0.15rem" }}>
                        In: <strong>{formatDate(item.extension.check_in_date)}</strong>
                      </span>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", opacity: 0.7, display: "block" }}>{item.extension.channel}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end", marginTop: "0.2rem" }}>
                    <button 
                      onClick={() => handleDismissExtension(item.extension.id)}
                      className="btn btn-outline"
                      style={{ padding: "0.3rem 0.75rem", fontSize: "0.72rem", width: "auto" }}
                    >
                      Dismiss
                    </button>
                    <button 
                      onClick={() => handleConfirmExtension(item.prior.id, item.extension.id)}
                      className="btn btn-primary"
                      style={{ padding: "0.3rem 0.75rem", fontSize: "0.72rem", width: "auto" }}
                    >
                      Confirm Extension
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid Layout: Left Table + Right Sidebar Calendar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem", alignItems: "start" }}>
        
        {/* Left Column: Bookings Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          
          {/* Sub-Tabs for Bookings Categorization */}
          <div style={{
            display: "flex",
            gap: "0.4rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-glass)",
            padding: "0.3rem",
            borderRadius: "10px",
            marginBottom: "0.3rem"
          }}>
            <button
              onClick={() => setBookingFilterTab('verified')}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 600,
                transition: "all 0.18s",
                background: bookingFilterTab === 'verified' ? "rgba(45, 212, 172, 0.12)" : "transparent",
                color: bookingFilterTab === 'verified' ? "#2dd4af" : "var(--text-secondary)",
                boxShadow: bookingFilterTab === 'verified' ? "0 0 0 1px rgba(45, 212, 172, 0.25)" : "none"
              }}
            >
              ✅ Verified ({filteredVerifiedBookings.length})
            </button>
            <button
              onClick={() => setBookingFilterTab('norule')}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 600,
                transition: "all 0.18s",
                background: bookingFilterTab === 'norule' ? "rgba(251, 191, 36, 0.1)" : "transparent",
                color: bookingFilterTab === 'norule' ? "#fbbf24" : "var(--text-secondary)",
                boxShadow: bookingFilterTab === 'norule' ? "0 0 0 1px rgba(251, 191, 36, 0.2)" : "none"
              }}
            >
              ⚠️ No Rule ({filteredNoRuleBookings.length})
            </button>
            <button
              onClick={() => setBookingFilterTab('mismatch')}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 600,
                transition: "all 0.18s",
                background: bookingFilterTab === 'mismatch' ? "rgba(244, 63, 94, 0.1)" : "transparent",
                color: bookingFilterTab === 'mismatch' ? "#f43f5e" : "var(--text-secondary)",
                boxShadow: bookingFilterTab === 'mismatch' ? "0 0 0 1px rgba(244, 63, 94, 0.2)" : "none"
              }}
            >
              ❌ Mismatch ({filteredMismatchBookings.length})
            </button>
          </div>

          {selectedDateFilter && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(240,59,106,0.1)",
              border: "1px solid rgba(240,59,106,0.25)",
              borderRadius: 10,
              padding: "0.5rem 0.85rem",
              fontSize: "0.78rem",
              color: "var(--text-primary)",
              gap: "0.5rem"
            }}>
              <span>
                📅 {calendarFilterMode === "book" ? "Showing bookings made on" : "Showing auto-assigned tasks for"}{" "}
                <strong>{formatDate(selectedDateFilter)}</strong>
              </span>
              <button 
                onClick={() => setSelectedDateFilter(null)}
                style={{ background: "none", border: "none", color: "var(--brand-pink)", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", opacity: 0.85 }}
                title="Clear date filter"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {activeBookingsList.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--text-secondary)",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 12,
              border: "1px dashed var(--border-glass)"
            }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📅</div>
              {selectedDateFilter ? (
                <p style={{ margin: 0, opacity: 0.6 }}>
                  No bookings matching date <strong>{formatDate(selectedDateFilter)}</strong>. Click another day or clear the filter.
                </p>
              ) : (
                <p style={{ margin: 0, opacity: 0.6 }}>
                  {bookingFilterTab === 'norule' ? "No bookings in this section missing rules." :
                   bookingFilterTab === 'mismatch' ? "No bookings in this section with pricing mismatches." :
                   "No verified bookings yet. Click Add Booking to get started."}
                </p>
              )}
            </div>
          )}

          {activeBookingsList.map((b, idx) => {
            const prop = getPropertyById(b.property_id);
            const style = statusStyles[b.status] || statusStyles.confirmed;
            const tasks = getAutoScheduledTasks(b);
            const activeTasks = selectedDateFilter ? tasks.filter(t => t.date === selectedDateFilter) : tasks;
            const nightsCount = calculateNights(b.check_in_date, b.check_out_date);

            const hasActiveExtension = bookings.some(x => x.is_extension && String(x.extension_of) === String(b.id) && x.status !== "cancelled");

            return (
              <div 
                key={`${b.id}_${b.property_id || "unassigned"}_${idx}`}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-glass)",
                  borderRadius: 14,
                  padding: "1rem 1.25rem",
                  transition: "border-color 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                        🏠 {prop ? prop.name : "Unknown Property"}
                      </span>
                      <span style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.55rem",
                        borderRadius: 20,
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        color: style.text,
                        textTransform: "capitalize"
                      }}>
                        {b.status ? b.status.replace("_", " ") : ""}
                      </span>

                      {b.is_extension && (
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.55rem",
                          borderRadius: 20,
                          background: "rgba(99, 102, 241, 0.15)",
                          border: "1px solid rgba(99, 102, 241, 0.4)",
                          color: "#a5b4fc",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.2rem"
                        }} title="This booking is confirmed as an extension stay">
                          <span>🔗 Confirmed Extension</span>
                        </span>
                      )}

                      {!b.is_extension && hasActiveExtension && (
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.55rem",
                          borderRadius: 20,
                          background: "rgba(99, 102, 241, 0.15)",
                          border: "1px solid rgba(99, 102, 241, 0.4)",
                          color: "#a5b4fc",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.2rem"
                        }} title="This booking has a confirmed extension stay following it">
                          <span>🔗 Extended Stay</span>
                        </span>
                      )}

                      {b.channel && (
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.55rem",
                          borderRadius: 20,
                          background: Wt(b.channel).bg,
                          border: `1px solid ${Wt(b.channel).border}`,
                          color: Wt(b.channel).text,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.15rem"
                        }}>
                          <span>{Wt(b.channel).icon}</span>
                          <span>{getResolvedChannelName(b)}</span>
                        </span>
                      )}

                      {b.is_transferred && (() => {
                        const originalProp = properties.find(p => p.id === b.original_property_id);
                        const origName = originalProp ? ` from ${originalProp.name}` : "";
                        const label = b.transfer_type === "channel" ? "Channel Transfer" : b.transfer_type === "internal" ? "Internal Transfer" : "Manual Transfer";
                        return (
                          <span 
                            title={`${label}${origName}`}
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "0.15rem 0.55rem",
                              borderRadius: 20,
                              background: b.transfer_type === "channel" ? "rgba(59, 130, 246, 0.15)" : b.transfer_type === "internal" ? "rgba(249, 115, 22, 0.15)" : "rgba(168, 85, 247, 0.15)",
                              border: b.transfer_type === "channel" ? "1px solid rgba(59, 130, 246, 0.4)" : b.transfer_type === "internal" ? "1px solid rgba(249, 115, 22, 0.4)" : "1px solid rgba(168, 85, 247, 0.4)",
                              color: b.transfer_type === "channel" ? "#60a5fa" : b.transfer_type === "internal" ? "#fb923c" : "#c084fc",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.2rem"
                            }}
                          >
                            <span>🔄</span>
                            <span>{label}{origName}</span>
                          </span>
                        );
                      })()}
                    </div>

                    {b.guest_name && (
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <User size={12} /> {b.guest_name}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }}>
                    {b.is_extension && (
                      <button onClick={() => handleUnlinkExtension(b.id)} className="btn btn-outline" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", width: "auto" }}>
                        Unlink
                      </button>
                    )}
                    {!b.is_extension && hasActiveExtension && (
                      <button onClick={() => handleUnlinkChildExtension(b.id)} className="btn btn-outline" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", width: "auto" }}>
                        Unlink
                      </button>
                    )}
                    <button onClick={() => handleOpenEdit(b)} className="btn btn-outline" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", width: "auto" }}>
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteBooking(b.id)} 
                      style={{ 
                        padding: "0.25rem 0.4rem", 
                        background: "rgba(239, 68, 68, 0.05)",
                        border: "1px solid rgba(239, 68, 68, 0.2)", 
                        color: "#f87171", 
                        borderRadius: "8px",
                        width: "auto",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.45)";
                        e.currentTarget.style.color = "#ef4444";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)";
                        e.currentTarget.style.color = "#f87171";
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  <div style={{ background: "rgba(45,212,172,0.08)", border: "1px solid rgba(45,212,172,0.2)", borderRadius: 8, padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>
                    <div style={{ fontSize: "0.62rem", color: "#2dd4af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t('Check-in')}</div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatDate(b.check_in_date)}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{b.check_in_time}</div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.78rem", opacity: 0.5 }}>
                    → {nightsCount} night{nightsCount !== 1 ? "s" : ""} →
                  </div>

                  <div style={{ background: "rgba(240,59,106,0.08)", border: "1px solid rgba(240,59,106,0.2)", borderRadius: 8, padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>
                    <div style={{ fontSize: "0.62rem", color: "#f43f5e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t('Check-out')}</div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatDate(b.check_out_date)}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{b.check_out_time}</div>
                  </div>
                </div>

                {activeTasks.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>
                      Auto-scheduled tasks
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {activeTasks.map((tItem, tIdx) => (
                        <span 
                          key={tIdx}
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.2rem 0.6rem",
                            borderRadius: 6,
                            background: `${tItem.color}18`,
                            border: `1px solid ${tItem.color}40`,
                            color: tItem.dim ? "var(--text-secondary)" : tItem.color,
                            fontWeight: 600,
                            opacity: tItem.dim ? 0.7 : 1
                          }}
                        >
                          {tItem.icon} {tItem.label} · {formatDate(tItem.date)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {b.notes && (
                  <div style={{ marginTop: "0.6rem", fontSize: "0.78rem", color: "var(--text-secondary)", opacity: 0.7, fontStyle: "italic", borderTop: "1px solid var(--border-glass)", paddingTop: "0.5rem" }}>
                    📝 {b.notes}
                  </div>
                )}

                {(b.payout !== undefined || b.cleaning_fee !== undefined) && (
                  <div style={{ marginTop: "0.6rem", fontSize: "0.74rem", borderTop: "1px solid var(--border-glass)", paddingTop: "0.5rem", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                    {b.payout !== undefined && (
                      <div>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Booking Value:</span>{" "}
                        <span style={{ color: "#2dd4af", fontWeight: 700 }}>{formatValue(b.payout)}</span>
                      </div>
                    )}
                    {b.cleaning_fee !== undefined && (
                      <div>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Cleaning Fee:</span>{" "}
                        <span style={{ color: "#60a5fa", fontWeight: 700 }}>{formatValue(b.cleaning_fee)}</span>
                      </div>
                    )}
                  </div>
                )}

                {b.extras && Object.keys(b.extras).length > 0 && (
                  <div style={{ marginTop: "0.6rem", fontSize: "0.74rem", borderTop: "1px solid var(--border-glass)", paddingTop: "0.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.4rem 0.75rem" }}>
                    {Object.entries(b.extras).map(([kKey, vVal]) => {
                      if (vVal == null || vVal === "") return null;
                      return (
                        <div key={kKey} style={{ display: "flex", gap: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${kKey}: ${vVal}`}>
                          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{kKey}:</span>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{String(vVal)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column 1: Date Filters Sidebar Calendar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "sticky", top: "1rem", maxHeight: "calc(100vh - 160px)", overflowY: "auto" }} className="custom-scrollbar">
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", borderRadius: 14, padding: "1rem" }}>
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.85rem", background: "rgba(255,255,255,0.03)", padding: "0.25rem", borderRadius: 8, border: "1px solid var(--border-glass)" }}>
              <button 
                onClick={() => { setCalendarFilterMode("stay"); setSelectedDateFilter(null); }}
                style={{
                  flex: 1,
                  padding: "0.35rem 0.5rem",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: calendarFilterMode === "stay" ? "var(--brand-pink)" : "transparent",
                  color: calendarFilterMode === "stay" ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.15s ease"
                }}
              >
                📅 Stay Date
              </button>
              <button 
                onClick={() => { setCalendarFilterMode("book"); setSelectedDateFilter(null); }}
                style={{
                  flex: 1,
                  padding: "0.35rem 0.5rem",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: calendarFilterMode === "book" ? "var(--brand-pink)" : "transparent",
                  color: calendarFilterMode === "book" ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.15s ease"
                }}
              >
                📝 Book Date
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <button onClick={() => changeMonth(-1)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.2rem" }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{monthLabel}</span>
              <button onClick={() => changeMonth(1)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.2rem" }}>
                <ChevronRight size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.15rem", textAlign: "center" }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                <div key={idx} style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-secondary)", opacity: 0.5, padding: "0.2rem 0" }}>
                  {d}
                </div>
              ))}

              {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} />
              ))}

              {Array.from({ length: daysInMonth }, (_, idx) => idx + 1).map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayBookings = calendarDayBookings[dateStr] || [];
                
                const isCheckIn = calendarFilterMode === "stay" && dayBookings.some(db => db.isCheckIn);
                const isCheckOut = calendarFilterMode === "stay" && dayBookings.some(db => db.isCheckOut);
                const isStay = calendarFilterMode === "stay" && dayBookings.length > 0 && !isCheckIn && !isCheckOut;
                const isBooked = calendarFilterMode === "book" && dayBookings.length > 0;
                
                const isToday = new Date().toISOString().slice(0, 10) === dateStr;
                const isSelected = selectedDateFilter === dateStr;

                let bg = "transparent";
                let color = "var(--text-secondary)";
                if (isSelected) {
                  bg = "var(--brand-pink)";
                  color = "#ffffff";
                } else if (isCheckIn) {
                  bg = "rgba(45,212,172,0.25)";
                  color = "#2dd4af";
                } else if (isCheckOut) {
                  bg = "rgba(240,59,106,0.2)";
                  color = "#f43f5e";
                } else if (isStay) {
                  bg = "rgba(96,165,250,0.12)";
                  color = "#60a5fa";
                } else if (isBooked) {
                  bg = "rgba(240,59,106,0.15)";
                  color = "var(--brand-pink)";
                } else if (isToday) {
                  color = "var(--brand-pink)";
                }

                const titleText = dayBookings.map(db => 
                  calendarFilterMode === "book" 
                    ? `${db.propertyName} 📝 booked`
                    : `${db.propertyName}${db.isCheckIn ? " ✈ IN" : db.isCheckOut ? " ✈ OUT" : " 🌙 stay"}`
                ).join("\n");

                return (
                  <div 
                    key={day}
                    onClick={() => setSelectedDateFilter(prev => prev === dateStr ? null : dateStr)}
                    style={{
                      padding: "0.25rem 0.1rem",
                      borderRadius: 6,
                      fontSize: "0.72rem",
                      fontWeight: isSelected ? 800 : dayBookings.length ? 700 : 400,
                      background: bg,
                      color: color,
                      border: isSelected ? "1px solid var(--text-primary)" : isToday ? "1px solid rgba(240,59,106,0.5)" : "1px solid transparent",
                      cursor: "pointer",
                      position: "relative",
                      boxShadow: isSelected ? "0 0 10px rgba(240,59,106,0.6)" : "none",
                      transition: "all 0.15s ease"
                    }}
                    title={titleText}
                  >
                    {day}
                    {dayBookings.length > 0 && (
                      <div style={{
                        position: "absolute",
                        bottom: 2,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: isSelected ? "#ffffff" : isCheckIn ? "#2dd4af" : isCheckOut ? "#f43f5e" : isStay ? "#60a5fa" : "var(--brand-pink)"
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-glass)" }}>
              {calendarFilterMode === "stay" ? (
                [["#2dd4af", "Check-in"], ["#f43f5e", "Check-out"], ["#60a5fa", "Stay"]].map(([col, label]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: col, opacity: 0.8 }} />
                    {label}
                  </div>
                ))
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--brand-pink)", opacity: 0.8 }} />
                  Booked Date
                </div>
              )}
            </div>
          </div>

          {/* Unmatched / Errors Warnings List */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: unmatchedBookings.length > 0 ? "1px solid rgba(240,59,106,0.3)" : "1px solid var(--border-glass)", borderRadius: 14, padding: "1.25rem 1rem" }}>
            {unmatchedBookings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                  🛡️ Unmatched Bookings (0)
                </h3>
                <div style={{ background: "rgba(45, 212, 172, 0.06)", border: "1px solid rgba(45, 212, 172, 0.2)", borderRadius: 10, padding: "1rem 0.75rem", fontSize: "0.75rem", color: "var(--success)", lineHeight: 1.4 }}>
                  <span style={{ fontSize: "1.2rem", display: "block", marginBottom: "0.25rem" }}>✓</span>
                  All synced bookings are successfully matched to properties. No errors detected.
                </div>
              </div>
            ) : (
              <Fragment>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--brand-pink)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  ⚠️ Unmatched Bookings ({unmatchedBookings.length})
                </h3>
                <p style={{ margin: "0 0 1rem", fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  These bookings are for properties not recognised in the system. Fix these mismatches below.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {unmatchedBookings.map((b, uIdx) => {
                    const payoutAmt = parseFloat(b.payout || "0") || 0;
                    const cleanAmt = parseFloat(b.cleaning_fee || "0") || 0;
                    const servAmt = parseFloat(b.service_charge || "0") || 0;
                    const resortAmt = parseFloat(b.resort_fee || "0") || 0;
                    const destAmt = parseFloat(b.destination_fee || "0") || 0;
                    const vatAmt = parseFloat(b.vat_amount || "0") || 0;
                    const dtcmAmt = parseFloat(b.dtcm_fee || "0") || 0;
                    const taxAmt = parseFloat(b.tax_amount || "0") || 0;
                    const discountAmt = parseFloat(b.discounts || "0") || 0;
                    const processAmt = parseFloat(b.payment_processing_fee || "0") || 0;
                    const commAmt = parseFloat(b.commission || "0") || 0;
                    const commVatAmt = parseFloat(b.commission_vat || "0") || 0;

                    const computedTotal = payoutAmt + cleanAmt + servAmt + resortAmt + destAmt - discountAmt + vatAmt + dtcmAmt + taxAmt - processAmt - commAmt - commVatAmt;
                    const rawPayout = b.raw_booking && b.raw_booking.total_payout != null ? parseFloat(b.raw_booking.total_payout) : null;
                    const payoutDiff = rawPayout !== null ? computedTotal - rawPayout : 0;
                    const payoutDiscrepancy = rawPayout !== null && Math.abs(payoutDiff) > 0.05;

                    return (
                      <div 
                        key={`${b.id}_unassigned_${uIdx}`}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border-glass)",
                          borderRadius: 10,
                          padding: "0.75rem",
                          fontSize: "0.8rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.4rem"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            🏢 &quot;{b.raw_property_name || "Unnamed Property"}&quot;
                          </span>
                          {b.channel && (
                            <span style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              padding: "0.1rem 0.4rem",
                              borderRadius: 4,
                              background: Wt(b.channel).bg,
                              border: `1px solid ${Wt(b.channel).border}`,
                              color: Wt(b.channel).text,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.15rem"
                            }}>
                              <span>{Wt(b.channel).icon}</span>
                              <span>{getResolvedChannelName(b)}</span>
                            </span>
                          )}
                        </div>

                        {b.guest_name && (
                          <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                            👤 Guest: <strong>{b.guest_name}</strong>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.72rem" }}>
                          <span>In: {formatDate(b.check_in_date)}</span>
                          <span>Out: {formatDate(b.check_out_date)}</span>
                        </div>

                        <div style={{
                          background: "rgba(239, 68, 68, 0.05)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          borderRadius: 6,
                          padding: "0.4rem 0.5rem",
                          fontSize: "0.7rem",
                          color: "#f87171",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.2rem"
                        }}>
                          <div style={{ fontWeight: 700 }}>⚠️ Unmatched Property Error</div>
                          <div>No property matched: &apos;{b.raw_property_name}&apos;</div>
                          <div style={{ color: "var(--text-secondary)", fontSize: 0.68, marginTop: "0.1rem" }}>
                            🔄 Reverted to raw values:
                            <ul style={{ paddingLeft: "1rem", marginTop: "0.1rem" }}>
                              <li>Commission: {formatValue(commAmt)}</li>
                              <li>VAT: {formatValue(commVatAmt)}</li>
                              <li>Payment Fee: {formatValue(processAmt)}</li>
                            </ul>
                          </div>

                          {payoutDiscrepancy && (
                            <div style={{ color: "#fbbf24", fontWeight: 600, marginTop: "0.2rem" }}>
                              ⚠️ Payout Discrepancy: {payoutDiff > 0 ? "+" : ""}{formatValue(payoutDiff)} ({formatValue(computedTotal)} vs raw {formatValue(rawPayout)})
                            </div>
                          )}
                        </div>

                        {/* Searchable Mismatch Resolution */}
                        <div style={{ position: "relative", marginTop: "0.25rem" }} data-dropdown-container>
                          <button 
                            onClick={e => { e.stopPropagation(); setMismatchDropdownId(prev => prev === b.id ? null : b.id); setMismatchSearchText(""); }}
                            className="form-control"
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.4rem 0.6rem",
                              height: "auto",
                              background: "rgba(0,0,0,0.3)",
                              cursor: "pointer",
                              textAlign: "left",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              border: "1px solid var(--border-glass)",
                              borderRadius: 6,
                              width: "100%",
                              color: "var(--text-primary)"
                            }}
                          >
                            <span>-- Resolve Property Mismatch --</span>
                            <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>▼</span>
                          </button>

                          {mismatchDropdownId === b.id && (
                            <div style={{
                              position: "absolute",
                              bottom: "100%",
                              left: 0,
                              right: 0,
                              zIndex: 1000,
                              marginBottom: "4px",
                              background: "var(--bg-glass)",
                              backdropFilter: "blur(16px)",
                              WebkitBackdropFilter: "blur(16px)",
                              border: "1px solid var(--border-glass-strong)",
                              borderRadius: 8,
                              boxShadow: "0 -10px 25px -5px var(--shadow-glow)",
                              padding: "0.5rem",
                              animation: "fadeIn 0.15s ease-out"
                            }}>
                              <input 
                                type="text"
                                placeholder="Search properties..."
                                value={mismatchSearchText}
                                onChange={e => setMismatchSearchText(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{
                                  width: "100%",
                                  fontSize: "0.78rem",
                                  padding: "0.35rem 0.5rem",
                                  background: "var(--input-bg)",
                                  border: "1px solid var(--border-glass)",
                                  borderRadius: 4,
                                  color: "var(--text-primary)",
                                  outline: "none",
                                  marginBottom: "0.5rem"
                                }}
                                autoFocus
                              />
                              <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }} className="custom-scrollbar">
                                {!mismatchSearchText && (!currentUser || currentUser.permissions?.create_property) && onAddProperty && (
                                  <div 
                                    onClick={() => { handleResolveMismatch(b, "__new__"); setMismatchDropdownId(null); }}
                                    style={{
                                      fontSize: "0.75rem",
                                      padding: "0.4rem 0.5rem",
                                      borderRadius: 4,
                                      cursor: "pointer",
                                      color: "var(--brand-pink)",
                                      fontWeight: 600,
                                      background: "rgba(240,59,106,0.06)",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.3rem",
                                      border: "1px solid rgba(240,59,106,0.15)"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(240,59,106,0.12)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "rgba(240,59,106,0.06)"}
                                  >
                                    🆕 Register as new property: &quot;{b.raw_property_name}&quot;
                                  </div>
                                )}
                                
                                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-secondary)", opacity: 0.5, padding: "0.3rem 0.5rem 0.15rem", textTransform: "uppercase" }}>
                                  Assign to existing property:
                                </div>

                                {properties.filter(p => p.name.toLowerCase().includes(mismatchSearchText.toLowerCase())).map(p => (
                                  <div 
                                    key={p.id}
                                    onClick={() => { handleResolveMismatch(b, p.id); setMismatchDropdownId(null); }}
                                    style={{
                                      fontSize: "0.75rem",
                                      padding: "0.4rem 0.5rem",
                                      borderRadius: 4,
                                      cursor: "pointer",
                                      color: "var(--text-primary)",
                                      display: "flex",
                                      alignItems: "center",
                                      transition: "background 0.1s"
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "var(--row-hover)"; e.currentTarget.style.color = "var(--brand-pink)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-primary)"; }}
                                  >
                                    🏢 {p.name}
                                  </div>
                                ))}

                                {properties.filter(p => p.name.toLowerCase().includes(mismatchSearchText.toLowerCase())).length === 0 && (
                                  <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", opacity: 0.6, fontStyle: "italic", padding: "0.5rem", textAlign: "center" }}>
                                    No matching properties found
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={() => handleDeleteBooking(b.id)}
                          style={{
                            alignSelf: "flex-end",
                            background: "none",
                            border: "none",
                            color: "#f87171",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                            padding: "0.1rem 0.3rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.2rem",
                            opacity: 0.6
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
                        >
                          <Trash2 size={10} /> Delete Booking
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Fragment>
            )}
          </div>
        </div>
      </div>

      {/* Booking Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ zIndex: 900 }}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBookingId ? "✏️ Edit Booking" : "📅 New Booking"}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Property *</label>
                <select className="form-control" value={bookingForm.property_id} onChange={e => setFormVal("property_id", e.target.value)}>
                  <option value="">Select property...</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>{t('Guest Name')}</label>
                <input 
                  className="form-control" 
                  placeholder="e.g. John Smith" 
                  value={bookingForm.guest_name} 
                  onChange={e => setFormVal("guest_name", e.target.value)} 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Check-in Date *</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={bookingForm.check_in_date} 
                    onChange={e => setFormVal("check_in_date", e.target.value)} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Check-in Time</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={bookingForm.check_in_time} 
                    onChange={e => setFormVal("check_in_time", e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Number of Nights</label>
                <input 
                  type="number" 
                  min="1" 
                  className="form-control" 
                  placeholder="e.g. 3" 
                  value={bookingForm.nights} 
                  onChange={e => setFormVal("nights", e.target.value)} 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Check-out Date *</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={bookingForm.check_out_date} 
                    onChange={e => setFormVal("check_out_date", e.target.value)} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Check-out Time</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={bookingForm.check_out_time} 
                    onChange={e => setFormVal("check_out_time", e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Booked Date (Date Made)</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={bookingForm.booked_at ? bookingForm.booked_at.slice(0, 10) : ""} 
                  onChange={e => setFormVal("booked_at", e.target.value ? `${e.target.value}T12:00:00Z` : "")} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>{t('Status')}</label>
                <select className="form-control" value={bookingForm.status} onChange={e => setFormVal("status", e.target.value)}>
                  <option value="confirmed">{t('Confirmed')}</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">{t('Cancelled')}</option>
                  <option value="checked_in">Checked In</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Booking Channel</label>
                <select className="form-control" value={bookingForm.channel} onChange={e => setFormVal("channel", e.target.value)}>
                  <option value="Direct">Direct / Airbetter</option>
                  <option value="Airbnb">Airbnb</option>
                  <option value="Booking.com">Booking.com</option>
                  <option value="VRBO">VRBO</option>
                  <option value="Expedia">Expedia</option>
                  <option value="Agoda">Agoda</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {editingBookingId && (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", borderRadius: 12, padding: "0.85rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", userSelect: "none", margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={!!bookingForm.is_transferred} 
                      onChange={e => {
                        const checked = e.target.checked;
                        setBookingForm(prev => ({
                          ...prev,
                          is_transferred: checked,
                          transfer_type: checked ? (prev.transfer_type !== "none" ? prev.transfer_type : "manual") : "none",
                          original_property_id: checked ? prev.original_property_id : "",
                          manual_channel_rule_id: checked ? prev.manual_channel_rule_id : ""
                        }));
                      }}
                      style={{ cursor: "pointer", accentColor: "var(--brand-pink)" }}
                    />
                    🔄 Is this a transferred booking?
                  </label>

                  {bookingForm.is_transferred && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", paddingLeft: "0.75rem", borderLeft: "2px solid var(--brand-pink)" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Transfer Type</label>
                        <select 
                          className="form-control" 
                          value={bookingForm.transfer_type || "manual"} 
                          onChange={e => setFormVal("transfer_type", e.target.value)}
                          style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem", height: "32px" }}
                        >
                          <option value="manual">Manual Transfer (pricing stays same, rule uses original property)</option>
                          <option value="internal">Internal Transfer (duplicated/old unit to active unit)</option>
                          <option value="channel">Channel Transfer (moved on Uplisting)</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Original Property (Source)</label>
                        <SearchableDropdown 
                          value={bookingForm.original_property_id || ""}
                          onChange={v => setFormVal("original_property_id", v)}
                          options={properties.map(p => ({ id: p.id, name: p.name }))}
                          placeholder="Select original property..."
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Override Channel Account (Rule)</label>
                        <select 
                          className="form-control" 
                          value={bookingForm.manual_channel_rule_id || ""} 
                          onChange={e => setFormVal("manual_channel_rule_id", e.target.value)}
                          style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem", height: "32px" }}
                        >
                          <option value="">Use property rule mapping...</option>
                          {channelRules.map(r => (
                            <option key={r.id} value={r.id}>{r.channel} · {r.accountName} ({r.commissionPercent}%)</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Price breakdown inside dialog */}
            {(() => {
              const grossVal = parseFloat(bookingForm.payout || "0") || 0;
              const cleanVal = parseFloat(bookingForm.cleaning_fee || "0") || 0;
              const servVal = parseFloat(bookingForm.service_charge || "0") || 0;
              const resortVal = parseFloat(bookingForm.resort_fee || "0") || 0;
              const destVal = parseFloat(bookingForm.destination_fee || "0") || 0;
              const vatVal = parseFloat(bookingForm.vat_amount || "0") || 0;
              const dtcmVal = parseFloat(bookingForm.dtcm_fee || "0") || 0;
              const taxVal = parseFloat(bookingForm.tax_amount || "0") || 0;
              const discountVal = parseFloat(bookingForm.discounts || "0") || 0;

              const totalRevenue = grossVal + cleanVal + servVal + resortVal + destVal - discountVal;

              // Find matched rule
              let activeRule: ChannelRule | null = null;
              if (bookingForm.manual_channel_rule_id) {
                activeRule = channelRules.find(r => r.id === bookingForm.manual_channel_rule_id) || null;
              } else {
                const propId = bookingForm.original_property_id || bookingForm.property_id;
                const prop = properties.find(p => p.id === propId);
                if (prop) {
                  let ruleId = null;
                  const extra = prop.extraDetails && typeof prop.extraDetails === 'object' ? prop.extraDetails : {};
                  if (extra.channelRuleIds) {
                    const key = Object.keys(extra.channelRuleIds).find(k => k.toLowerCase() === bookingForm.channel.toLowerCase());
                    if (key) ruleId = extra.channelRuleIds[key];
                  }
                  if (!ruleId && extra.channelRuleId) {
                    const r = channelRules.find(x => x.id === extra.channelRuleId);
                    if (r && r.channel.toLowerCase() === bookingForm.channel.toLowerCase()) {
                      ruleId = extra.channelRuleId;
                    }
                  }
                  activeRule = ruleId ? channelRules.find(r => r.id === ruleId) || null : null;
                }
              }

              const isBookingcom = bookingForm.channel === "Booking.com";
              const isAgoda = bookingForm.channel === "Agoda";
              
              const bookingNights = calculateNights(bookingForm.check_in_date, bookingForm.check_out_date) || parseFloat(String(bookingForm.nights || "0")) || 0;
              const bookingGross = parseFloat(bookingForm.payout || "0") || 0;
              const bookingGuests = bookingForm.raw_booking && bookingForm.raw_booking.guests != null ? Number(bookingForm.raw_booking.guests) : 2;

              let comPercent = activeRule ? activeRule.commissionPercent : (isBookingcom || isAgoda ? 15 : 0);
              let feeTotal = activeRule ? activeRule.feeTotal : 15;
              let vatPct = activeRule ? activeRule.vatPercent : (bookingForm.channel === "Airbnb" ? 5 : 0);
              let procFeePct = activeRule ? activeRule.processingFee : 0;
              let merchantFeePct = activeRule ? activeRule.merchantFee : 0;

              if (activeRule && activeRule.customRules && Array.isArray(activeRule.customRules)) {
                activeRule.customRules.forEach((cRule: any) => {
                  let matches = false;
                  let valToCheck = 0;
                  if (cRule.field === 'nights') valToCheck = bookingNights;
                  else if (cRule.field === 'grossAmount') valToCheck = bookingGross;
                  else if (cRule.field === 'guests') valToCheck = bookingGuests;

                  if (cRule.operator === 'greater_than' && valToCheck > cRule.value) matches = true;
                  else if (cRule.operator === 'less_than' && valToCheck < cRule.value) matches = true;
                  else if (cRule.operator === 'equal_to' && valToCheck === cRule.value) matches = true;

                  if (matches) {
                    if (cRule.targetField === 'commissionPercent') {
                      comPercent = cRule.newValue;
                    } else if (cRule.targetField === 'feeTotal') {
                      feeTotal = cRule.newValue;
                    } else if (cRule.targetField === 'vatPercent') {
                      vatPct = cRule.newValue;
                    } else if (cRule.targetField === 'processingFee') {
                      procFeePct = cRule.newValue;
                    } else if (cRule.targetField === 'merchantFee') {
                      merchantFeePct = cRule.newValue;
                    }
                  }
                });
              }

              const bases = activeRule ? activeRule.commissionBases || [] : ["Stay + Cleaning"];
              
              let baseAmt = grossVal + cleanVal;
              if (activeRule && bases.length > 0) {
                const base = bases[0];
                if (base === "Stay") {
                  baseAmt = grossVal - discountVal + servVal;
                } else if (base === "Stay + Cleaning") {
                  baseAmt = grossVal - discountVal + servVal + cleanVal;
                } else {
                  baseAmt = grossVal + cleanVal + destVal + resortVal + dtcmVal + servVal - discountVal;
                }
              }

              const scale = currency === "USD" ? exchangeRate : 1;
              const rawComm = bookingForm.raw_booking && bookingForm.raw_booking.commission != null ? parseFloat(bookingForm.raw_booking.commission) * scale : null;
              const calculatedComm = activeRule ? baseAmt * (comPercent / 100) : (rawComm !== null ? rawComm : baseAmt * (comPercent / 100));

              const rawProc = bookingForm.raw_booking && bookingForm.raw_booking.payment_processing_fee != null ? parseFloat(bookingForm.raw_booking.payment_processing_fee) * scale : null;
              const calculatedProc = activeRule ? totalRevenue * (procFeePct / 100) : (rawProc !== null ? rawProc : totalRevenue * (procFeePct / 100));

              const valCommInput = bookingForm.commission !== undefined && bookingForm.commission !== "" ? parseFloat(bookingForm.commission) || 0 : calculatedComm;
              
              const rawCommVat = bookingForm.raw_booking && bookingForm.raw_booking.commission_vat != null ? parseFloat(bookingForm.raw_booking.commission_vat) * scale : null;
              const calculatedCommVat = activeRule ? valCommInput * (vatPct / 100) : (rawCommVat !== null ? rawCommVat : valCommInput * (vatPct / 100));

              const valProcInput = bookingForm.payment_processing_fee !== undefined && bookingForm.payment_processing_fee !== "" ? parseFloat(bookingForm.payment_processing_fee) || 0 : calculatedProc;
              const valCommVatInput = bookingForm.commission_vat !== undefined && bookingForm.commission_vat !== "" ? parseFloat(bookingForm.commission_vat) || 0 : (activeRule ? (bookingForm.channel === "Airbnb" || activeRule.vatPercent > 0 ? calculatedCommVat : 0) : (rawCommVat !== null ? rawCommVat : (bookingForm.channel === "Airbnb" ? calculatedCommVat : 0)));

              const finalPayout = totalRevenue + vatVal + dtcmVal + taxVal - valProcInput - valCommInput - valCommVatInput;
              
              const rawTotalPayout = bookingForm.raw_booking && bookingForm.raw_booking.total_payout != null ? parseFloat(bookingForm.raw_booking.total_payout) * scale : null;
              const payoutDifference = rawTotalPayout !== null ? Math.round((finalPayout - rawTotalPayout) * 100) / 100 : 0;
              const showPayoutWarning = rawTotalPayout !== null && Math.abs(payoutDifference) > 0.05;

              const expectedCommText = calculatedComm;
              const expectedCommVatText = calculatedCommVat;
              const showCommWarning = activeRule && Math.abs(valCommInput - expectedCommText) > 0.05;
              const showVatWarning = activeRule && Math.abs(valCommVatInput - expectedCommVatText) > 0.05;

              return (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", borderRadius: 12, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.25rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--brand-pink)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.4rem", marginBottom: "0.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ textDecoration: "underline" }}>Price Breakdown</span>
                    {activeRule && (
                      <span style={{ fontSize: "0.68rem", background: "rgba(240, 59, 106, 0.12)", border: "1px solid rgba(240, 59, 106, 0.3)", color: "var(--brand-pink)", padding: "0.1rem 0.5rem", borderRadius: 6, textTransform: "none", fontWeight: 600 }}>
                        🔌 Rule: {activeRule.accountName}
                      </span>
                    )}
                  </div>

                  {(showCommWarning || showVatWarning) && (
                    <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: 8, padding: "0.6rem 0.8rem", fontSize: "0.75rem", color: "#fbbf24", marginBottom: "0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div style={{ fontWeight: 700 }}>⚠️ Channel Rule Mismatch</div>
                      <div style={{ lineHeight: 1.3 }}>
                        This booking&apos;s commission or VAT does not match the assigned rule &quot;{activeRule?.accountName}&quot;.
                        {showCommWarning && <div>• Expected Commission: <strong>{formatValue(expectedCommText)}</strong> (instead of {formatValue(valCommInput)})</div>}
                        {showVatWarning && <div>• Expected Commission VAT: <strong>{formatValue(expectedCommVatText)}</strong> (instead of {formatValue(valCommVatInput)})</div>}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (showCommWarning) setFormVal("commission", String(Math.round(expectedCommText * 100) / 100));
                          if (showVatWarning) setFormVal("commission_vat", String(Math.round(expectedCommVatText * 100) / 100));
                        }}
                        style={{
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.4)",
                          borderRadius: 6,
                          padding: "0.25rem 0.6rem",
                          color: "#ffffff",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          width: "fit-content",
                          marginTop: "0.15rem"
                        }}
                      >
                        Apply Expected Rule Values
                      </button>
                    </div>
                  )}

                  {showPayoutWarning && (
                    <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: 8, padding: "0.6rem 0.8rem", fontSize: "0.75rem", color: "#f87171", marginBottom: "0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div style={{ fontWeight: 700 }}>⚠️ Pricing Discrepancy</div>
                      <div style={{ lineHeight: 1.3 }}>
                        Calculated payout ({formatValue(finalPayout)}) does not match raw Uplisting payout ({formatValue(rawTotalPayout)}). Difference: {formatValue(finalPayout - rawTotalPayout)}.
                      </div>
                      {finalPayout + valCommVatInput - rawTotalPayout >= 0 && (
                        <button 
                          type="button" 
                          onClick={() => setFormVal("commission_vat", String(Math.round((finalPayout + valCommVatInput - rawTotalPayout) * 100) / 100))}
                          style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            borderRadius: 6,
                            padding: "0.25rem 0.6rem",
                            color: "#ffffff",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            width: "fit-content",
                            marginTop: "0.15rem"
                          }}
                        >
                          Adjust Commission VAT to {formatValue(finalPayout + valCommVatInput - rawTotalPayout)} to match
                        </button>
                      )}
                    </div>
                  )}

                  {/* Breakdown Fields */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    {[
                      { key: "payout", label: "Accommodation total" },
                      { key: "cleaning_fee", label: "Cleaning Fee" },
                      { key: "discounts", label: "Length of stay discount", isDiscount: true }
                    ].map(row => {
                      const isD = (row as any).isDiscount;
                      return (
                        <div key={row.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0.5rem", fontSize: "0.82rem" }}>
                          <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
                          <div style={{ display: "flex", alignItems: "center", color: isD ? "#10b981" : "var(--text-primary)", fontWeight: 600 }}>
                            <span style={{ marginRight: "0.25rem" }}>{isD ? "-" : ""}{currency === "USD" ? "$" : "AED"}</span>
                            <input 
                              type="number" 
                              min="0" 
                              step="any" 
                              placeholder="0.00" 
                              value={(bookingForm as any)[row.key]}
                              onChange={e => setFormVal(row.key as any, e.target.value)}
                              style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", textAlign: "right", width: "80px", padding: 0, outline: "none" }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {(bookingForm.channel !== "Airbnb" || servVal > 0 || destVal > 0 || resortVal > 0) && (
                      <Fragment>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0.5rem", fontSize: "0.82rem" }}>
                          <span style={{ color: "var(--text-secondary)" }}>{bookingForm.channel === "Airbnb" ? "Service Charge / Seasonal Adjustment" : "Service Charge"}</span>
                          <div style={{ display: "flex", alignItems: "center", color: "var(--text-primary)", fontWeight: 600 }}>
                            <span style={{ marginRight: "0.25rem" }}>{currency === "USD" ? "$" : "AED"}</span>
                            <input 
                              type="number" 
                              min="0" 
                              step="any" 
                              placeholder="0.00" 
                              value={bookingForm.service_charge}
                              onChange={e => setFormVal("service_charge", e.target.value)}
                              style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", textAlign: "right", width: "80px", padding: 0, outline: "none" }}
                            />
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0.5rem", fontSize: "0.82rem" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Destination Fee</span>
                          <div style={{ display: "flex", alignItems: "center", color: "var(--text-primary)", fontWeight: 600 }}>
                            <span style={{ marginRight: "0.25rem" }}>{currency === "USD" ? "$" : "AED"}</span>
                            <input 
                              type="number" 
                              min="0" 
                              step="any" 
                              placeholder="0.00" 
                              value={bookingForm.destination_fee}
                              onChange={e => setFormVal("destination_fee", e.target.value)}
                              style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", textAlign: "right", width: "80px", padding: 0, outline: "none" }}
                            />
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0.5rem", fontSize: "0.82rem" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Resort Fee</span>
                          <div style={{ display: "flex", alignItems: "center", color: "var(--text-primary)", fontWeight: 600 }}>
                            <span style={{ marginRight: "0.25rem" }}>{currency === "USD" ? "$" : "AED"}</span>
                            <input 
                              type="number" 
                              min="0" 
                              step="any" 
                              placeholder="0.00" 
                              value={bookingForm.resort_fee}
                              onChange={e => setFormVal("resort_fee", e.target.value)}
                              style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", textAlign: "right", width: "80px", padding: 0, outline: "none" }}
                            />
                          </div>
                        </div>
                      </Fragment>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0.5rem", fontSize: "0.85rem", fontWeight: 700, background: "rgba(255, 255, 255, 0.06)", borderRadius: "6px", color: "var(--text-primary)", margin: "0.15rem 0" }}>
                      <span>SubTotal</span>
                      <span>{currency === "USD" ? "$" : "AED"} {totalRevenue.toFixed(2)}</span>
                    </div>

                    {/* Tax & Fees */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0.5rem", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{bookingForm.channel === "Airbnb" ? "VAT on Airbnb service fee" : "VAT Amount"}</span>
                      <div style={{ display: "flex", alignItems: "center", color: "var(--text-primary)", fontWeight: 600 }}>
                        <span style={{ marginRight: "0.25rem" }}>{currency === "USD" ? "$" : "AED"}</span>
                        <input 
                          type="number" 
                          min="0" 
                          step="any" 
                          placeholder="0.00" 
                          value={bookingForm.vat_amount}
                          onChange={e => setFormVal("vat_amount", e.target.value)}
                          style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", textAlign: "right", width: "80px", padding: 0, outline: "none" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0.5rem", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Tourism Fee (DTCM)</span>
                      <div style={{ display: "flex", alignItems: "center", color: "var(--text-primary)", fontWeight: 600 }}>
                        <span style={{ marginRight: "0.25rem" }}>{currency === "USD" ? "$" : "AED"}</span>
                        <input 
                          type="number" 
                          min="0" 
                          step="any" 
                          placeholder="0.00" 
                          value={bookingForm.dtcm_fee}
                          onChange={e => setFormVal("dtcm_fee", e.target.value)}
                          style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", textAlign: "right", width: "80px", padding: 0, outline: "none" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0.5rem", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Additional Taxes</span>
                      <div style={{ display: "flex", alignItems: "center", color: "var(--text-primary)", fontWeight: 600 }}>
                        <span style={{ marginRight: "0.25rem" }}>{currency === "USD" ? "$" : "AED"}</span>
                        <input 
                          type="number" 
                          min="0" 
                          step="any" 
                          placeholder="0.00" 
                          value={bookingForm.tax_amount}
                          onChange={e => setFormVal("tax_amount", e.target.value)}
                          style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", textAlign: "right", width: "80px", padding: 0, outline: "none" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0.5rem", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Payment Processing Fee</span>
                      <div style={{ display: "flex", alignItems: "center", color: "var(--text-primary)", fontWeight: 600 }}>
                        <span style={{ marginRight: "0.25rem" }}>{currency === "USD" ? "$" : "AED"}</span>
                        <input 
                          type="number" 
                          min="0" 
                          step="any" 
                          placeholder="0.00" 
                          value={bookingForm.payment_processing_fee}
                          onChange={e => setFormVal("payment_processing_fee", e.target.value)}
                          style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", textAlign: "right", width: "80px", padding: 0, outline: "none" }}
                        />
                      </div>
                    </div>

                    {/* Deductions */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0.5rem", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Commission Deducted ({comPercent}%)</span>
                      <div style={{ display: "flex", alignItems: "center", color: "#f43f5e", fontWeight: 600 }}>
                        <span style={{ marginRight: "0.25rem" }}>-{currency === "USD" ? "$" : "AED"}</span>
                        <input 
                          type="number" 
                          min="0" 
                          step="any" 
                          placeholder="0.00" 
                          value={bookingForm.commission}
                          onChange={e => setFormVal("commission", e.target.value)}
                          style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", textAlign: "right", width: "80px", padding: 0, outline: "none" }}
                        />
                      </div>
                    </div>

                    {(bookingForm.channel === "Airbnb" || vatPct > 0 || valCommVatInput > 0) && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0.5rem", fontSize: "0.82rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>VAT on Commission ({vatPct}%)</span>
                        <div style={{ display: "flex", alignItems: "center", color: "#f43f5e", fontWeight: 600 }}>
                          <span style={{ marginRight: "0.25rem" }}>-{currency === "USD" ? "$" : "AED"}</span>
                          <input 
                            type="number" 
                            min="0" 
                            step="any" 
                            placeholder="0.00" 
                            value={bookingForm.commission_vat}
                            onChange={e => setFormVal("commission_vat", e.target.value)}
                            style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", textAlign: "right", width: "80px", padding: 0, outline: "none" }}
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.5rem", fontSize: "0.9rem", fontWeight: 800, background: "rgba(45, 212, 172, 0.12)", border: "1px solid rgba(45, 212, 172, 0.25)", borderRadius: "6px", color: "#2dd4af", margin: "0.25rem 0" }}>
                      <span>Estimated Net Payout</span>
                      <span>{currency === "USD" ? "$" : "AED"} {finalPayout.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Form actions */}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-outline" style={{ padding: "0.45rem 1rem", fontSize: "0.85rem", width: "auto" }}>
                Cancel
              </button>
              <button 
                onClick={handleSaveForm} 
                className="btn btn-primary" 
                style={{ padding: "0.45rem 1.1rem", fontSize: "0.85rem", width: "auto" }}
                disabled={!bookingForm.property_id || !bookingForm.check_in_date || !bookingForm.check_out_date}
              >
                {editingBookingId ? "Save Changes" : "Add Booking & Generate Tasks"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Dialog mounting */}
      {isImportModalOpen && (
        <ExcelImportModal 
          onImport={handleImportExcel}
          onClose={() => setIsImportModalOpen(false)}
          properties={properties}
        />
      )}
    </div>
  );
}

// Helper to determine status style parameters
function Wt(channel: string) {
  const c = String(channel || "").toLowerCase().trim();
  if (c.includes("airbnb")) return { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)", text: "#f87171", icon: "🔴" };
  if (c.includes("booking")) return { bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.4)", text: "#60a5fa", icon: "🔵" };
  if (c.includes("vrbo")) return { bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.4)", text: "#34d399", icon: "🟢" };
  if (c.includes("expedia")) return { bg: "rgba(234, 179, 8, 0.15)", border: "rgba(234, 179, 8, 0.4)", text: "#facc15", icon: "🟡" };
  if (c.includes("agoda")) return { bg: "rgba(139, 92, 246, 0.15)", border: "rgba(139, 92, 246, 0.4)", text: "#a78bfa", icon: "🟣" };
  if (c.includes("direct") || c.includes("airbetter")) return { bg: "rgba(240, 59, 106, 0.15)", border: "rgba(240, 59, 106, 0.4)", text: "#f43f5e", icon: "💖" };
  return { bg: "rgba(156, 163, 175, 0.15)", border: "rgba(156, 163, 175, 0.4)", text: "#9ca3af", icon: "🔌" };
}
