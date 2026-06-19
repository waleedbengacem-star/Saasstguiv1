'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { refreshSession } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, string> = { email, password };
      if (mfaRequired) {
        payload.mfaCode = mfaCode;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Check if MFA code verification is required
      if (data.mfaRequired) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      // Success: Refresh session context
      await refreshSession();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
      // If verification failed, reset code
      if (mfaRequired) {
        setMfaCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="omni-login-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        .omni-login-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          width: 100vw;
          padding: 24px;
          background-color: #000000;
          background-image: 
            radial-gradient(at 10% 10%, rgba(240, 59, 106, 0.08) 0px, transparent 50%),
            radial-gradient(at 90% 90%, rgba(240, 59, 106, 0.03) 0px, transparent 50%);
          font-family: 'Inter', sans-serif;
          color: #ffffff;
        }
        .omni-login-card {
          background: rgba(12, 12, 14, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(240, 59, 106, 0.2);
          border-radius: 20px;
          width: 100%;
          max-width: 440px;
          padding: 48px 40px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(240, 59, 106, 0.05);
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .omni-login-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -50%;
          width: 200%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #F03B6A, transparent);
          animation: omni-border-glow-flow 4s linear infinite;
        }
        @keyframes omni-border-glow-flow {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(50%); }
        }
        .omni-login-card:hover {
          border-color: rgba(240, 59, 106, 0.4);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(240, 59, 106, 0.15);
        }
        .omni-login-logo {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 32px;
          color: #ffffff;
          text-align: center;
          margin-bottom: 8px;
          letter-spacing: -0.04em;
          text-transform: uppercase;
        }
        .omni-login-logo span {
          color: #F03B6A;
          font-weight: 400;
          margin-left: 2px;
          text-shadow: 0 0 20px rgba(240, 59, 106, 0.4);
        }
        .omni-login-subtitle {
          color: #9ca3af;
          text-align: center;
          font-size: 14px;
          margin-bottom: 36px;
          font-weight: 400;
        }
        .omni-form-group {
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .omni-form-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9ca3af;
          transition: color 0.2s ease;
        }
        .omni-form-group:focus-within .omni-form-label {
          color: #F03B6A;
        }
        .omni-form-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 14px 18px;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          transition: all 0.2s ease;
          outline: none;
        }
        .omni-form-input:focus {
          border-color: #F03B6A;
          box-shadow: 0 0 0 3px rgba(240, 59, 106, 0.15);
          background: rgba(0, 0, 0, 0.8);
        }
        .omni-form-input::placeholder {
          color: #4b5563;
        }
        .omni-btn-primary {
          width: 100%;
          background: #F03B6A;
          border: none;
          border-radius: 12px;
          padding: 15px 24px;
          color: #ffffff;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(240, 59, 106, 0.3);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        .omni-btn-primary:hover {
          background: #ff527f;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(240, 59, 106, 0.5);
        }
        .omni-btn-primary:active {
          transform: translateY(0);
        }
        .omni-btn-primary:disabled {
          background: #374151;
          color: #9ca3af;
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }
        .omni-auth-link {
          color: #F03B6A;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .omni-auth-link:hover {
          color: #ff527f;
          text-shadow: 0 0 10px rgba(240, 59, 106, 0.3);
        }
      ` }} />

      <div className="omni-login-card">
        <h1 className="omni-login-logo">OMNI<span>Better</span></h1>
        <p className="omni-login-subtitle">
          {mfaRequired ? 'Multi-Factor Authentication Required' : 'Log in to your property dashboard'}
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!mfaRequired ? (
            <>
              <div className="omni-form-group">
                <label className="omni-form-label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  className="omni-form-input"
                  type="email"
                  placeholder="ahmed@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="omni-form-group">
                <label className="omni-form-label" htmlFor="password">Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="password"
                    className="omni-form-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: '60px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '4px',
                      transition: 'color 0.2s ease',
                      userSelect: 'none'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F03B6A'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="omni-form-group">
              <label className="omni-form-label" htmlFor="mfaCode">Enter 6-Digit Authenticator Code</label>
              <input
                id="mfaCode"
                className="omni-form-input"
                type="text"
                maxLength={6}
                pattern="\d{6}"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
              />
              <span style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px', display: 'block', textAlign: 'center' }}>
                Open your Google Authenticator or similar MFA app to get the code.
              </span>
            </div>
          )}

          <button className="omni-btn-primary" type="submit" disabled={loading}>
            {loading ? 'Authenticating...' : mfaRequired ? 'Verify Code' : 'Sign In'}
          </button>
        </form>

        {!mfaRequired ? (
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#9ca3af' }}>
            Need a new workspace?{' '}
            <Link href="/register" className="omni-auth-link">
              Register here
            </Link>
          </p>
        ) : (
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
            <button
              onClick={() => {
                setMfaRequired(false);
                setError(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#F03B6A',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontWeight: '500'
              }}
            >
              ← Back to credentials login
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
