'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Search, 
  X,
  Sparkles,
  Building
} from 'lucide-react';

import { translateText } from '@/lib/translations';

interface Property {
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
}

interface Booking {
  id: string;
  property_id: string;
  guest_name: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  channel: string;
  notes?: string;
  is_transferred?: boolean;
}

interface MasterCalendarProps {
  properties: Property[];
  bookings: Booking[];
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  confirmed: {
    bg: "rgba(45, 212, 172, 0.15)",
    border: "rgba(45, 212, 172, 0.4)",
    text: "#2dd4af"
  },
  pending: {
    bg: "rgba(251, 191, 36, 0.15)",
    border: "rgba(251, 191, 36, 0.4)",
    text: "#fbbf24"
  },
  cancelled: {
    bg: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.4)",
    text: "#f87171"
  },
  checked_in: {
    bg: "rgba(96, 165, 250, 0.15)",
    border: "rgba(96, 165, 250, 0.4)",
    text: "#60a5fa"
  }
};

function formatDateGB(dateStr: string): string {
  return dateStr
    ? new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : "—";
}

export default function MasterCalendar({ properties = [], bookings = [] }: MasterCalendarProps) {
  const uiLanguage = typeof window !== 'undefined' ? localStorage.getItem('pms_ui_language') || 'en' : 'en';
  const t = (key: string) => translateText(key, uiLanguage);
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [daysCount, setDaysCount] = useState(12);
  const [locationFilter, setLocationFilter] = useState("all");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [propertySearch, setPropertySearch] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [bedroomsFilter, setBedroomsFilter] = useState("all");
  const [showEmptyOnly, setShowEmptyOnly] = useState(false);
  const [vacancyStart, setVacancyStart] = useState("");
  const [vacancyEnd, setVacancyEnd] = useState("");
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPropertyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  // Compute date array for grid columns
  const daysArray = useMemo(() => {
    const arr = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [currentDate, daysCount]);

  const totalDays = daysArray.length;
  const firstDay = daysArray[0];
  const lastDay = daysArray[daysArray.length - 1];

  // Unique bedroom options
  const bedroomOptions = useMemo(() => {
    const set = new Set<string>();
    properties.forEach(p => {
      if (p.col_bedrooms) set.add(String(p.col_bedrooms).trim());
    });
    return Array.from(set).sort((x, y) => {
      const nx = parseFloat(x);
      const ny = parseFloat(y);
      return isNaN(nx) && isNaN(ny) ? x.localeCompare(y) : isNaN(nx) ? 1 : isNaN(ny) ? -1 : nx - ny;
    });
  }, [properties]);

  // Unique building options
  const buildingGroups = useMemo(() => {
    const map: Record<string, Property[]> = {};
    properties.forEach(p => {
      const link = String(p.col_maps ?? "").trim();
      if (link) {
        if (!map[link]) map[link] = [];
        map[link].push(p);
      }
    });
    return Object.entries(map)
      .filter(([_, list]) => list.length > 1)
      .map(([link, list]) => {
        const firstWithBld = list.find(p => p.col_building_name);
        return {
          link,
          name: firstWithBld?.col_building_name || `Unnamed Building (${list.length} units)`
        };
      });
  }, [properties]);

  const offsetCalendarDays = (offset: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + offset);
      return d;
    });
  };

  const resetCalendarToToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  };

  // Filter properties
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      if (locationFilter !== "all" && String(p.col_maps ?? "").trim() !== locationFilter.trim()) return false;
      if (selectedPropertyIds.size > 0 && !selectedPropertyIds.has(p.id)) return false;
      if (propertySearch.trim() && !p.name.toLowerCase().includes(propertySearch.toLowerCase())) return false;
      
      if (guestSearch.trim()) {
        const hasMatchingGuest = bookings
          .filter(b => b.property_id === p.id && b.status !== "cancelled")
          .some(b => (b.guest_name || "").toLowerCase().includes(guestSearch.toLowerCase()));
        if (!hasMatchingGuest) return false;
      }

      if (bedroomsFilter !== "all" && String(p.col_bedrooms ?? "").trim() !== bedroomsFilter) return false;

      if (showEmptyOnly) {
        const startStr = vacancyStart || firstDay.toISOString().slice(0, 10);
        const endStr = vacancyEnd || lastDay.toISOString().slice(0, 10);
        const start = new Date(startStr + "T00:00:00");
        const end = new Date(endStr + "T23:59:59");
        
        const hasOverlayBooking = bookings
          .filter(b => b.property_id === p.id && b.status !== "cancelled")
          .some(b => {
            const inDate = new Date(b.check_in_date + "T00:00:00");
            const outDate = new Date(b.check_out_date + "T23:59:59");
            return inDate < end && outDate > start;
          });
        if (hasOverlayBooking) return false;
      }

      return true;
    });
  }, [properties, bookings, locationFilter, selectedPropertyIds, propertySearch, guestSearch, bedroomsFilter, showEmptyOnly, vacancyStart, vacancyEnd, firstDay, lastDay]);

  // Compute left offset and width percent of a booking on calendar
  const getBookingLayout = (b: Booking) => {
    if (b.status === "cancelled") return null;
    const inDate = new Date(b.check_in_date + "T00:00:00");
    const outDate = new Date(b.check_out_date + "T00:00:00");
    const checkInOffset = (inDate.getTime() - firstDay.getTime()) / 864e5;
    const checkOutOffset = (outDate.getTime() - firstDay.getTime()) / 864e5;

    if (checkOutOffset <= 0 || checkInOffset >= totalDays) return null;
    
    let leftIndex = Math.round(checkInOffset * 2) + 1;
    let rightIndex = Math.round(checkOutOffset * 2);

    if (leftIndex < 0) leftIndex = 0;
    if (rightIndex > totalDays * 2) rightIndex = totalDays * 2;
    if (leftIndex >= rightIndex) return null;

    const leftPercent = (leftIndex * 100) / (totalDays * 2);
    const widthPercent = ((rightIndex - leftIndex) * 100) / (totalDays * 2);
    return { leftPercent, widthPercent };
  };

  const getFormatWeekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const getFormatDay = (d: Date) => String(d.getDate()).padStart(2, "0");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}>
      {/* Search and Filters Bar */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border-glass)",
          borderRadius: 12,
          padding: "0.75rem 1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          
          {/* Date Picker Input */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--button-secondary-bg)", border: "1px solid var(--border-glass)", padding: "0.2rem 0.5rem", borderRadius: 8 }}>
            <Calendar size={13} style={{ color: "var(--brand-pink)", opacity: 0.8 }} />
            <input 
              type="date" 
              value={currentDate.toISOString().slice(0, 10)}
              onChange={e => e.target.value && setCurrentDate(new Date(e.target.value + "T00:00:00"))}
              style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "0.8rem", outline: "none", cursor: "pointer" }}
            />
          </div>

          <button onClick={resetCalendarToToday} className="btn btn-outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", width: "auto" }}>
            Reset
          </button>

          {/* Location Selector */}
          <select 
            style={{
              padding: "0.4rem 0.6rem",
              background: locationFilter !== "all" ? "rgba(240,59,106,0.15)" : "var(--button-secondary-bg)",
              border: `1px solid ${locationFilter !== "all" ? "rgba(240,59,106,0.4)" : "var(--border-glass)"}`,
              borderRadius: 8,
              color: locationFilter !== "all" ? "var(--brand-pink)" : "var(--text-secondary)",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontWeight: locationFilter !== "all" ? 600 : 400
            }}
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
          >
            <option value="all">🏢 All Locations</option>
            {buildingGroups.map(bg => (
              <option key={bg.link} value={bg.link}>{bg.name}</option>
            ))}
          </select>

          {/* Searchable property select dropdown */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button 
              onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                fontSize: "0.8rem",
                padding: "0.4rem 0.8rem",
                background: selectedPropertyIds.size > 0 ? "rgba(240,59,106,0.15)" : "var(--button-secondary-bg)",
                border: `1px solid ${selectedPropertyIds.size > 0 ? "rgba(240,59,106,0.4)" : "var(--border-glass)"}`,
                borderRadius: 8,
                color: selectedPropertyIds.size > 0 ? "var(--brand-pink)" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: selectedPropertyIds.size > 0 ? 600 : 400,
                width: 175,
                textAlign: "left"
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                🏠 {selectedPropertyIds.size === 0 ? "Property Name" : `${selectedPropertyIds.size} Selected`}
              </span>
              <span style={{ fontSize: "0.6rem", opacity: 0.6 }}>▼</span>
            </button>

            {propertyDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 100,
                background: "var(--bg-glass)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid var(--border-glass-strong)",
                borderRadius: 12,
                padding: "0.75rem",
                width: 250,
                boxShadow: "0 10px 25px var(--shadow-glow)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}>
                <input 
                  type="text" 
                  placeholder="Search properties..." 
                  value={propertySearch}
                  onChange={e => setPropertySearch(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: "0.78rem",
                    padding: "0.35rem 0.5rem",
                    background: "var(--input-bg)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: 6,
                    color: "var(--text-primary)",
                    outline: "none"
                  }}
                  autoFocus
                />
                <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
                  <button 
                    onClick={() => setSelectedPropertyIds(new Set(properties.map(p => p.id)))}
                    style={{ background: "none", border: "none", color: "var(--brand-pink)", fontSize: "0.7rem", cursor: "pointer", fontWeight: 600 }}
                  >
                    Select All
                  </button>
                  <button 
                    onClick={() => setSelectedPropertyIds(new Set())}
                    style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.7rem", cursor: "pointer" }}
                  >
                    Clear All
                  </button>
                </div>
                <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }} className="custom-scrollbar">
                  {properties
                    .filter(p => p.name.toLowerCase().includes(propertySearch.toLowerCase()))
                    .map(p => {
                      const isSel = selectedPropertyIds.has(p.id);
                      return (
                        <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", cursor: "pointer", color: "var(--text-primary)", userSelect: "none" }}>
                          <input 
                            type="checkbox" 
                            checked={isSel}
                            onChange={() => {
                              setSelectedPropertyIds(prev => {
                                const next = new Set(prev);
                                if (next.has(p.id)) next.delete(p.id);
                                else next.add(p.id);
                                return next;
                              });
                            }}
                            style={{ cursor: "pointer", accentColor: "var(--brand-pink)" }}
                          />
                          {p.name}
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Search Guest Name input */}
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} />
            <input 
              type="text" 
              placeholder="Search Guest..." 
              value={guestSearch}
              onChange={e => setGuestSearch(e.target.value)}
              style={{
                paddingLeft: "1.75rem",
                paddingRight: "0.5rem",
                paddingTop: "0.4rem",
                paddingBottom: "0.4rem",
                background: "var(--input-bg)",
                border: "1px solid var(--border-glass)",
                borderRadius: 8,
                color: "var(--text-primary)",
                fontSize: "0.8rem",
                width: 130,
                outline: "none"
              }}
            />
          </div>

          {/* Bedrooms Selector */}
          <select 
            style={{
              padding: "0.4rem 0.6rem",
              background: bedroomsFilter !== "all" ? "rgba(240,59,106,0.15)" : "var(--button-secondary-bg)",
              border: `1px solid ${bedroomsFilter !== "all" ? "rgba(240,59,106,0.4)" : "var(--border-glass)"}`,
              borderRadius: 8,
              color: bedroomsFilter !== "all" ? "var(--brand-pink)" : "var(--text-secondary)",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontWeight: bedroomsFilter !== "all" ? 600 : 400
            }}
            value={bedroomsFilter}
            onChange={e => setBedroomsFilter(e.target.value)}
          >
            <option value="all">🛏 All Bedrooms</option>
            {bedroomOptions.map(opt => (
              <option key={opt} value={opt}>
                {opt.toLowerCase().includes("studio") || opt === "0" ? opt : `${opt} Bed`}
              </option>
            ))}
          </select>

          {/* Show empty properties button */}
          <button 
            onClick={() => setShowEmptyOnly(!showEmptyOnly)}
            style={{
              padding: "0.4rem 0.75rem",
              background: showEmptyOnly ? "rgba(240,59,106,0.15)" : "var(--button-secondary-bg)",
              border: `1px solid ${showEmptyOnly ? "rgba(240,59,106,0.4)" : "var(--border-glass)"}`,
              borderRadius: 8,
              color: showEmptyOnly ? "var(--brand-pink)" : "var(--text-secondary)",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontWeight: showEmptyOnly ? 600 : 400,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              width: "auto"
            }}
          >
            <Sparkles size={13} />
            <span>{showEmptyOnly ? "Showing Vacant" : "Show Empty Units"}</span>
          </button>
        </div>

        {/* Calendar Month label and Scroll Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "var(--button-secondary-bg)", border: "1px solid var(--border-glass)", padding: "0.25rem 0.5rem", borderRadius: 10 }}>
          <button onClick={() => offsetCalendarDays(-7)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.2rem" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", minWidth: 160, textAlign: "center" }}>
            {formatDateGB(firstDay.toISOString().slice(0, 10)).slice(0, 6)} - {formatDateGB(lastDay.toISOString().slice(0, 10))}
          </span>
          <button onClick={() => offsetCalendarDays(7)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.2rem" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Vacancy Period filter inputs when active */}
      {showEmptyOnly && (
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "var(--bg-glass)",
            border: "1px solid var(--border-glass)",
            borderRadius: 12,
            padding: "0.5rem 1rem",
            fontSize: "0.8rem",
            marginTop: "-0.5rem",
            marginBottom: "0.5rem",
            flexWrap: "wrap"
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Vacancy Period:</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--button-secondary-bg)", border: "1px solid var(--border-glass)", padding: "0.2rem 0.5rem", borderRadius: 6 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>From</span>
            <input 
              type="date" 
              value={vacancyStart || firstDay.toISOString().slice(0, 10)}
              onChange={e => setVacancyStart(e.target.value)}
              style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "0.78rem", outline: "none", cursor: "pointer" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--button-secondary-bg)", border: "1px solid var(--border-glass)", padding: "0.2rem 0.5rem", borderRadius: 6 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>To</span>
            <input 
              type="date" 
              value={vacancyEnd || lastDay.toISOString().slice(0, 10)}
              onChange={e => setVacancyEnd(e.target.value)}
              style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "0.78rem", outline: "none", cursor: "pointer" }}
            />
          </div>
          <button 
            onClick={() => { setVacancyStart(""); setVacancyEnd(""); }}
            style={{ background: "none", border: "none", color: "var(--brand-pink)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
          >
            Reset to Visible Calendar Dates
          </button>
        </div>
      )}

      {/* Main Grid Calendar Container */}
      <div 
        style={{
          overflowX: "auto",
          borderRadius: 14,
          border: "1px solid var(--border-glass)",
          background: "rgba(255,255,255,0.02)",
          boxShadow: "0 8px 32px 0 var(--shadow-glow)"
        }}
      >
        <div style={{ minWidth: 900 }}>
          
          {/* Header Row: Days names and numbers */}
          <div 
            style={{
              display: "grid",
              gridTemplateColumns: `240px repeat(${totalDays}, 1fr)`,
              borderBottom: "1px solid var(--border-glass)",
              background: "rgba(255,255,255,0.04)"
            }}
          >
            <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", fontWeight: 800, fontSize: "0.82rem", borderRight: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}>
              Unit Name
            </div>
            {daysArray.map((day, idx) => {
              const wkDay = getFormatWeekday(day);
              const dayNum = getFormatDay(day);
              const isWkEnd = wkDay === "SAT" || wkDay === "SUN";
              return (
                <div 
                  key={idx}
                  style={{
                    padding: "0.5rem 0.2rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRight: idx === totalDays - 1 ? "none" : "1px solid var(--border-glass)",
                    background: isWkEnd ? "rgba(255,255,255,0.02)" : "transparent"
                  }}
                >
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, opacity: 0.5, color: isWkEnd ? "var(--brand-pink)" : "var(--text-secondary)" }}>
                    {wkDay}
                  </span>
                  <span style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: isWkEnd ? "var(--brand-pink)" : "var(--text-primary)",
                    marginTop: "0.1rem"
                  }}>
                    {dayNum}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Properties Rows */}
          {filteredProperties.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🏢</div>
              <p style={{ margin: 0, opacity: 0.6 }}>No units found matching filters.</p>
            </div>
          ) : (
            filteredProperties.map(p => {
              const unitBookings = bookings.filter(b => b.property_id === p.id);
              return (
                <div 
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `240px repeat(${totalDays}, 1fr)`,
                    borderBottom: "1px solid var(--border-glass)",
                    alignItems: "stretch",
                    minHeight: "62px"
                  }}
                >
                  {/* Property Info Cell */}
                  <div style={{ padding: "0.6rem 1rem", borderRight: "1px solid var(--border-glass)", display: "flex", flexDirection: "column", justifyContent: "center", background: "rgba(255,255,255,0.01)", overflow: "hidden" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.name}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", opacity: 0.65, marginTop: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.col_bedrooms ? `${p.col_bedrooms} Bed` : ""}{p.col_baths ? ` · ${p.col_baths} Bath` : ""}{p.col_building_name ? ` · ${p.col_building_name}` : ""}
                    </span>
                  </div>

                  {/* Grid Cells and overlay Bookings */}
                  <div style={{ gridColumn: `2 / span ${totalDays}`, position: "relative", display: "flex", alignItems: "stretch" }}>
                    {/* Background columns */}
                    <div style={{ display: "flex", position: "absolute", inset: 0, zIndex: 1 }}>
                      {daysArray.map((day, idx) => {
                        const wkDay = getFormatWeekday(day);
                        const isWkEnd = wkDay === "SAT" || wkDay === "SUN";
                        return (
                          <div 
                            key={idx}
                            style={{
                              flex: 1,
                              borderRight: idx === totalDays - 1 ? "none" : "1px solid var(--border-glass)",
                              background: isWkEnd ? "rgba(255,255,255,0.015)" : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.003)"
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Overlay bookings cards */}
                    {unitBookings.map((b, idx) => {
                      const layout = getBookingLayout(b);
                      if (!layout) return null;

                      let grad = "linear-gradient(135deg, rgba(251,191,36,0.88), rgba(217,119,6,0.98))"; // pending / other
                      let borderCol = "rgba(251,191,36,0.4)";
                      let shadowHover = "0 4px 12px rgba(251,191,36,0.5)";

                      if (b.status === "checked_in") {
                        grad = "linear-gradient(135deg, rgba(59,130,246,0.88), rgba(96,165,250,0.98))";
                        borderCol = "rgba(59,130,246,0.4)";
                        shadowHover = "0 4px 12px rgba(59,130,246,0.5)";
                      } else if (b.status === "confirmed") {
                        grad = "linear-gradient(135deg, rgba(240,59,106,0.88), rgba(244,63,94,0.98))";
                        borderCol = "rgba(240,59,106,0.4)";
                        shadowHover = "0 4px 12px rgba(240,59,106,0.5)";
                      }

                      return (
                        <div 
                          key={`${b.id}_${idx}`}
                          onClick={() => setSelectedBookingDetails(b)}
                          style={{
                            position: "absolute",
                            left: `${layout.leftPercent}%`,
                            width: `${layout.widthPercent}%`,
                            top: "50%",
                            transform: "translateY(-50%)",
                            height: "32px",
                            background: grad,
                            border: borderCol,
                            borderRadius: "6px",
                            color: "#ffffff",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            padding: "0 0.5rem",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            zIndex: 2,
                            transition: "transform 0.15s ease, box-shadow 0.15s ease"
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = "translateY(-50%) scale(1.02)";
                            e.currentTarget.style.boxShadow = shadowHover;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = "translateY(-50%)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
                          }}
                          title={`${b.guest_name || "Guest"} · In: ${b.check_in_date} · Out: ${b.check_out_date}`}
                        >
                          {b.is_transferred && <span style={{ marginRight: "0.2rem" }}>🔄</span>}
                          {b.guest_name || "Reserved"}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Booking Details Modal Popup */}
      {selectedBookingDetails && (() => {
        const prop = properties.find(p => p.id === selectedBookingDetails.property_id);
        const style = statusColors[selectedBookingDetails.status] || statusColors.confirmed;
        return (
          <div className="modal-overlay" onClick={() => setSelectedBookingDetails(null)} style={{ zIndex: 1000 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
              <div className="modal-header">
                <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>🛎️ Booking Details</h2>
                <button className="close-btn" onClick={() => setSelectedBookingDetails(null)}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-glass)", borderRadius: 10, padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Guest Name
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                    {selectedBookingDetails.guest_name || "Guest — Not Provided"}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ background: "rgba(45,212,172,0.06)", border: "1px solid rgba(45,212,172,0.25)", borderRadius: 10, padding: "0.6rem 0.75rem" }}>
                    <div style={{ fontSize: "0.65rem", color: "#2dd4af", fontWeight: 700, textTransform: "uppercase" }}>{t('Check-in')}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                      {formatDateGB(selectedBookingDetails.check_in_date)}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                      {selectedBookingDetails.check_in_time || "15:00"}
                    </div>
                  </div>

                  <div style={{ background: "rgba(240,59,106,0.06)", border: "1px solid rgba(240,59,106,0.25)", borderRadius: 10, padding: "0.6rem 0.75rem" }}>
                    <div style={{ fontSize: "0.65rem", color: "#f43f5e", fontWeight: 700, textTransform: "uppercase" }}>{t('Check-out')}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                      {formatDateGB(selectedBookingDetails.check_out_date)}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                      {selectedBookingDetails.check_out_time || "11:00"}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>{t('Property')}</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                    🏠 {prop ? prop.name : "Unknown Property"}
                  </div>
                  {prop && (
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", opacity: 0.7, marginTop: "0.1rem" }}>
                      {prop.col_bedrooms ? `${prop.col_bedrooms} Bed` : ""}{prop.col_baths ? ` · ${prop.col_baths} Bath` : ""}{prop.col_building_name ? ` · ${prop.col_building_name}` : ""}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", borderTop: "1px solid var(--border-glass)", paddingTop: "0.75rem" }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Status</span>
                    <div style={{ marginTop: "0.2rem" }}>
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
                        {selectedBookingDetails.status ? selectedBookingDetails.status.replace("_", " ") : ""}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Check-in Type</span>
                    <div style={{ marginTop: "0.25rem", fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: 600 }}>
                      {prop?.col_checkin_type === "Meet & Greet" ? "🤝 Meet & Greet" : "🔑 Self Check-in"}
                    </div>
                  </div>
                </div>

                {selectedBookingDetails.notes && (
                  <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "0.75rem" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.25rem" }}>Notes</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontStyle: "italic", background: "rgba(255,255,255,0.01)", border: "1px dashed var(--border-glass)", borderRadius: 8, padding: "0.5rem 0.75rem" }}>
                      📝 {selectedBookingDetails.notes}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-glass)" }}>
                <button onClick={() => setSelectedBookingDetails(null)} className="btn btn-outline" style={{ padding: "0.45rem 1.25rem", fontSize: "0.85rem", width: "auto" }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
