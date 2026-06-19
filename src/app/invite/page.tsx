'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface InviteInfo {
  valid: boolean;
  email?: string;
  orgName?: string;
  orgLogo?: string | null;
  roleName?: string;
  error?: string;
}

function InvitePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const [info,      setInfo]      = useState<InviteInfo | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!token) {
      setInfo({ valid: false, error: 'No invite token found in this link.' });
      setLoading(false);
      return;
    }
    fetch(`/api/invite/validate?token=${token}`)
      .then(r => r.json())
      .then(data => { setInfo(data); setLoading(false); })
      .catch(() => { setInfo({ valid: false, error: 'Could not validate invite.' }); setLoading(false); });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, firstName, lastName, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={{ color: '#a0aec0', textAlign: 'center', marginTop: 16 }}>Validating your invite…</p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired ────────────────────────────────────────────────────────
  if (!info?.valid) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ ...styles.heading, color: '#e53e3e' }}>Invalid Invite</h1>
            <p style={{ color: '#a0aec0', fontSize: 14, lineHeight: 1.6 }}>
              {info?.error ?? 'This invite link is invalid or has already been used.'}
            </p>
          </div>
          <p style={{ color: '#718096', fontSize: 13, textAlign: 'center' }}>
            Ask your administrator to send you a new invite.
          </p>
        </div>
      </div>
    );
  }

  // ── Valid invite form ────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {info.orgLogo ? (
            <img src={info.orgLogo} alt={info.orgName} style={{ height: 40, maxWidth: 160, objectFit: 'contain', marginBottom: 12 }} />
          ) : (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#667eea', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              {info.orgName}
            </div>
          )}
          <h1 style={styles.heading}>You're invited! 🎉</h1>
          <p style={{ color: '#718096', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Join <strong style={{ color: '#1a202c' }}>{info.orgName}</strong> as{' '}
            <span style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>
              {info.roleName}
            </span>
          </p>
        </div>

        {/* Email badge */}
        <div style={styles.emailBadge}>
          <span style={{ fontSize: 13, color: '#718096' }}>Signing in as</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a202c' }}>{info.email}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>First Name</label>
              <input style={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Last Name</label>
              <input style={styles.input} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" required />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              style={styles.eyeBtn}
            >{showPw ? '🙈' : '👁'}</button>
          </div>

          <div>
            <label style={styles.label}>Confirm Password</label>
            <input
              style={styles.input}
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              required
            />
          </div>

          {error && (
            <div style={styles.errorBox}>{error}</div>
          )}

          <button type="submit" style={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Setting up your account…' : 'Accept Invitation & Sign In →'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: '#a0aec0', textAlign: 'center', marginTop: 20 }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#667eea', textDecoration: 'none' }}>Sign in here</a>
        </p>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  heading: {
    margin: '0 0 8px',
    fontSize: 24,
    fontWeight: 700,
    color: '#1a202c',
    textAlign: 'center',
  },
  emailBadge: {
    background: '#f7f8ff',
    border: '1px solid #e8eaf6',
    borderRadius: 10,
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    color: '#1a202c',
    outline: 'none',
    background: '#fafafa',
    boxSizing: 'border-box',
  },
  row: {
    display: 'flex',
    gap: 12,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 0,
  },
  errorBox: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: '#c53030',
  },
  submitBtn: {
    background: 'linear-gradient(135deg,#667eea,#764ba2)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '14px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #e8eaf6',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
};

export default function InvitePageWrapper() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1a1a2e,#0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontSize: 16 }}>Loading…</div>
      </div>
    }>
      <InvitePage />
    </Suspense>
  );
}
