"""
Patches settings/page.tsx to add Role Management UI.
Run from project root: python -X utf8 scripts/patch_settings.py
"""

FILE = r"src/app/dashboard/settings/page.tsx"

with open(FILE, "r", encoding="utf-8") as f:
    src = f.read()

# ─── 1. Add Edit + Plus icons ────────────────────────────────────────────────
OLD_ICONS = "  Eye, Edit3, Trash2, ToggleLeft, ToggleRight,"
NEW_ICONS = "  Eye, Edit, Edit3, Trash2, ToggleLeft, ToggleRight,"
assert OLD_ICONS in src, "FAIL: icon line"
src = src.replace(OLD_ICONS, NEW_ICONS, 1)

OLD_SEARCH = "  Search\n} from 'lucide-react';"
NEW_SEARCH = "  Search, Plus\n} from 'lucide-react';"
assert OLD_SEARCH in src, "FAIL: Search line"
src = src.replace(OLD_SEARCH, NEW_SEARCH, 1)
print("OK: icon imports")

# ─── 2. Add role state vars ──────────────────────────────────────────────────
OLD_STATE = "  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);\n\n  // User Invitation states"
NEW_STATE = (
    "  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);\n"
    "  // Role editor modal\n"
    "  const [roleModalOpen, setRoleModalOpen] = useState(false);\n"
    "  const [editingRole, setEditingRole] = useState<RoleData | null>(null);\n"
    "  const [roleFormName, setRoleFormName] = useState('');\n"
    "  const [roleFormDesc, setRoleFormDesc] = useState('');\n"
    "  const [roleFormPerms, setRoleFormPerms] = useState<string[]>([]);\n"
    "  const [roleSaving, setRoleSaving] = useState(false);\n"
    "  const [roleError, setRoleError] = useState<string | null>(null);\n"
    "  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);\n"
    "\n  // User Invitation states"
)
assert OLD_STATE in src, "FAIL: state anchor"
src = src.replace(OLD_STATE, NEW_STATE, 1)
print("OK: state vars")

# ─── 3. Add role handlers before MFA ─────────────────────────────────────────
MFA_ANCHOR = "  const startMfaSetup = async () => {"
HANDLERS = r"""  // --- Role Management Handlers ---
  const ALL_PERMISSIONS = [
    { group: 'Properties',     perms: ['properties.list','properties.view','properties.create','properties.edit','properties.view_financial'] },
    { group: 'Bookings',       perms: ['bookings.list','bookings.view','bookings.create','bookings.edit','bookings.cancel','bookings.sync'] },
    { group: 'Tasks',          perms: ['tasks.list','tasks.view','tasks.create','tasks.edit','tasks.complete'] },
    { group: 'Maintenance',    perms: ['maintenance.list','maintenance.view','maintenance.create','maintenance.approve_quote'] },
    { group: 'Accounting',     perms: ['accounting.view_dashboard','accounting.manage_ledger','accounting.view_bank','accounting.create_invoice','accounting.payments','accounting.statements'] },
    { group: 'Reports',        perms: ['reports.view_dashboard','reports.view_financial','reports.export'] },
    { group: 'Communications', perms: ['whatsapp.chat','whatsapp.send','email.send'] },
    { group: 'Documents',      perms: ['documents.list','documents.view','documents.upload','documents.sign'] },
    { group: 'Owner Portal',   perms: ['owner_portal.view_properties','owner_portal.view_statements','owner_portal.view_documents','owner_portal.approve_quotes','owner_portal.sign_documents'] },
    { group: 'Vendor Portal',  perms: ['vendor_portal.view_work_orders','vendor_portal.submit_quotes','vendor_portal.update_status','vendor_portal.submit_invoices'] },
    { group: 'Settings',       perms: ['settings.manage_roles','settings.manage_team','settings.manage_org'] },
  ];
  const openCreateRole = () => { setEditingRole(null); setRoleFormName(''); setRoleFormDesc(''); setRoleFormPerms([]); setRoleError(null); setRoleModalOpen(true); };
  const openEditRole = (role: RoleData, e: React.MouseEvent) => { e.stopPropagation(); setEditingRole(role); setRoleFormName(role.name); setRoleFormDesc(role.description || ''); setRoleFormPerms(Array.isArray(role.permissions) ? [...role.permissions] : []); setRoleError(null); setRoleModalOpen(true); };
  const togglePermission = (perm: string) => { setRoleFormPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]); };
  const handleSaveRole = async () => {
    if (!roleFormName.trim()) { setRoleError('Role name is required'); return; }
    setRoleSaving(true); setRoleError(null);
    try {
      const method = editingRole ? 'PUT' : 'POST';
      const body = editingRole
        ? { id: editingRole.id, name: roleFormName, description: roleFormDesc, permissions: roleFormPerms }
        : { name: roleFormName, description: roleFormDesc, permissions: roleFormPerms };
      const res = await fetch('/api/settings/roles', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setRoleError(data.error || 'Failed to save role'); return; }
      setRoleModalOpen(false); fetchRoles();
    } catch { setRoleError('Failed to save role'); }
    finally { setRoleSaving(false); }
  };
  const handleDeleteRole = async (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this role? This cannot be undone.')) return;
    setDeletingRoleId(roleId);
    try {
      const res = await fetch('/api/settings/roles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: roleId }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to delete role'); return; }
      fetchRoles();
    } catch { setError('Failed to delete role'); }
    finally { setDeletingRoleId(null); }
  };

  const startMfaSetup = async () => {"""

assert MFA_ANCHOR in src, "FAIL: MFA anchor"
src = src.replace(MFA_ANCHOR, HANDLERS, 1)
print("OK: role handlers")

# ─── 4. Patch Section 2 header to add Create Role button ─────────────────────
OLD_S2 = (
    "          {/* Section 2: Roles & Permissions */}\n"
    "          <div>\n"
    "            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>\n"
    "              <div>\n"
    "                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Roles & Permissions</h3>\n"
    "                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>\n"
    "                  {roles.length} role{roles.length !== 1 ? 's' : ''} configured for this workspace\n"
    "                </p>\n"
    "              </div>\n"
    "            </div>\n"
)
NEW_S2 = (
    "          {/* Section 2: Roles & Permissions */}\n"
    "          <div>\n"
    "            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>\n"
    "              <div>\n"
    "                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Roles &amp; Permissions</h3>\n"
    "                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>\n"
    "                  {roles.length} role{roles.length !== 1 ? 's' : ''} configured for this workspace\n"
    "                </p>\n"
    "              </div>\n"
    "              {roleSlug === 'org_admin' && (\n"
    "                <button onClick={openCreateRole} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>\n"
    "                  <Plus size={16} /> Create Role\n"
    "                </button>\n"
    "              )}\n"
    "            </div>\n"
)
assert OLD_S2 in src, "FAIL: Section2 header"
src = src.replace(OLD_S2, NEW_S2, 1)
print("OK: section2 header")

# ─── 5. Replace role cards + add edit/delete + modal ─────────────────────────
# Anchor from after the loading spinner to the section closing div
OLD_CARDS_ANCHOR_START = "            {rolesLoading ? ("
OLD_CARDS_ANCHOR_END = "          </div>\n\n        </div>\n      )}"

# Find the roles loading section (second rolesLoading occurrence is in the roles section)
# Actually there's only one rolesLoading block in the JSX
idx_start = src.find(OLD_CARDS_ANCHOR_START)
assert idx_start != -1, "FAIL: rolesLoading start"

idx_end = src.find(OLD_CARDS_ANCHOR_END, idx_start)
assert idx_end != -1, "FAIL: roles section end"

old_block = src[idx_start:idx_end + len(OLD_CARDS_ANCHOR_END)]

new_block = r"""            {rolesLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid rgba(var(--accent-primary-rgb), 0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '13px' }}>Loading roles...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {roles.map(role => {
                  const RoleIcon = getRoleIcon(role.slug);
                  const roleColor = getRoleColor(role.slug);
                  const isExpanded = expandedRoleId === role.id;
                  const permissions = Array.isArray(role.permissions) ? role.permissions : [];
                  const isWildcard = permissions.includes('*');
                  return (
                    <div key={role.id} className="card" style={{ cursor: 'pointer', transition: 'all 0.2s ease', border: isExpanded ? `1px solid ${roleColor}40` : undefined }} onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${roleColor}15`, border: `1px solid ${roleColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleColor }}>
                            <RoleIcon size={20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{role.name}</h4>
                              {role.isSystemRole && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(var(--accent-primary-rgb), 0.1)', border: '1px solid rgba(var(--accent-primary-rgb), 0.2)', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>System</span>}
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{role.description || role.slug}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ textAlign: 'right' }}>
                            {(() => { const c = members.filter(m => m.role.id === role.id && !!m.joinedAt).length; return (<><p style={{ fontSize: '18px', fontWeight: 700, color: roleColor }}>{c}</p><p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Member{c !== 1 ? 's' : ''}</p></>); })()}
                          </div>
                          {roleSlug === 'org_admin' && (
                            <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                              <button onClick={e => openEditRole(role, e)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Edit size={13} /> Edit
                              </button>
                              {role.slug !== 'org_admin' && (
                                <button onClick={e => handleDeleteRole(role.id, e)} disabled={deletingRoleId === role.id} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Trash2 size={13} /> {deletingRoleId === role.id ? '...' : 'Delete'}
                                </button>
                              )}
                            </div>
                          )}
                          <ChevronRight size={18} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
                            {isWildcard ? 'Full Access \u2014 All Permissions' : `Granted Permissions (${permissions.length})`}
                          </p>
                          {isWildcard ? (
                            <span style={{ fontSize: '13px', padding: '6px 16px', borderRadius: '8px', background: 'rgba(var(--accent-primary-rgb),0.12)', border: '1px solid rgba(var(--accent-primary-rgb),0.3)', color: 'var(--accent-primary)', fontWeight: 700 }}>\u2605 Wildcard \u2014 Full Access</span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {permissions.map((perm: string, i: number) => (
                                <span key={i} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{perm}</span>
                              ))}
                              {permissions.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No permissions assigned</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* --- Role Editor Modal --- */}
          {roleModalOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setRoleModalOpen(false)}>
              <div style={{ background: 'var(--surface-elevated)', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{editingRole ? 'Edit Role' : 'Create Custom Role'}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{editingRole ? 'Edit name, description or permissions' : 'Define a new role with custom permissions'}</p>
                  </div>
                  <button onClick={() => setRoleModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={22} /></button>
                </div>
                <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                  {roleError && <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px' }}>{roleError}</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role Name *</label>
                      <input value={roleFormName} onChange={e => setRoleFormName(e.target.value)} placeholder="e.g. Senior Manager" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                      <input value={roleFormDesc} onChange={e => setRoleFormDesc(e.target.value)} placeholder="Brief description" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  {editingRole?.slug === 'org_admin' ? (
                    <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(var(--accent-primary-rgb),0.06)', border: '1px solid rgba(var(--accent-primary-rgb),0.15)', fontSize: '13px', color: 'var(--accent-primary)' }}>
                      \u2605 Org Admin always has wildcard (full) access \u2014 permissions cannot be restricted
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Permissions ({roleFormPerms.length} selected)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => setRoleFormPerms(ALL_PERMISSIONS.flatMap(g => g.perms))} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(var(--accent-primary-rgb),0.1)', border: '1px solid rgba(var(--accent-primary-rgb),0.2)', color: 'var(--accent-primary)', cursor: 'pointer' }}>Select All</button>
                          <button onClick={() => setRoleFormPerms([])} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', cursor: 'pointer' }}>Clear</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {ALL_PERMISSIONS.map(({ group, perms }) => (
                          <div key={group}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{group}</p>
                              <button onClick={() => { const a = perms.every(p => roleFormPerms.includes(p)); setRoleFormPerms(prev => a ? prev.filter(p => !perms.includes(p)) : [...new Set([...prev, ...perms])]); }} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                {perms.every(p => roleFormPerms.includes(p)) ? 'Deselect all' : 'Select all'}
                              </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {perms.map(perm => {
                                const active = roleFormPerms.includes(perm);
                                const label = perm.split('.').slice(-1)[0].split('_').join(' ');
                                return (
                                  <button key={perm} onClick={() => togglePermission(perm)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: active ? 600 : 400, cursor: 'pointer', background: active ? 'rgba(var(--accent-primary-rgb),0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'rgba(var(--accent-primary-rgb),0.4)' : 'rgba(255,255,255,0.07)'}`, color: active ? 'var(--accent-primary)' : 'var(--text-muted)', transition: 'all 0.15s ease' }}>
                                    {active ? '\u2713 ' : ''}{label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={() => setRoleModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button onClick={handleSaveRole} disabled={roleSaving} style={{ padding: '10px 28px', borderRadius: '10px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: roleSaving ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: roleSaving ? 0.7 : 1 }}>
                    {roleSaving ? 'Saving...' : editingRole ? 'Save Changes' : 'Create Role'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}"""

src = src[:idx_start] + new_block + src[idx_end + len(OLD_CARDS_ANCHOR_END):]
print("OK: role cards + modal")

with open(FILE, "w", encoding="utf-8") as f:
    f.write(src)

print("\nAll patches applied successfully!")
