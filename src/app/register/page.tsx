'use client';

import React from 'react';
import Link from 'next/link';

export default function RegisterPage() {
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
          border: 1px solid rgba(240, 59, 106, 0.25);
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
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
        .info-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .info-title {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }
        .info-description {
          font-size: 13.5px;
          color: #9ca3af;
          line-height: 1.6;
          margin-bottom: 0;
        }
        .warning-section {
          background: rgba(240, 59, 106, 0.06);
          border: 1px solid rgba(240, 59, 106, 0.2);
          border-radius: 14px;
          padding: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        .warning-title {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #F03B6A;
          margin-bottom: 8px;
          text-shadow: 0 0 10px rgba(240, 59, 106, 0.15);
        }
        .warning-description {
          font-size: 13.5px;
          color: #e5e7eb;
          line-height: 1.5;
          margin-bottom: 0;
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
          text-decoration: none;
        }
        .omni-btn-primary:hover {
          background: #ff527f;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(240, 59, 106, 0.5);
        }
        .omni-btn-primary:active {
          transform: translateY(0);
        }
      ` }} />

      <div className="omni-login-card">
        <h1 className="omni-login-logo">OMNI<span>Better</span></h1>
        <p className="omni-login-subtitle">Premium Property Management System</p>

        <div className="info-section">
          <h2 className="info-title">About Our Organization</h2>
          <p className="info-description">
            OMNIBetter is an elite, tech-driven holiday homes and short-term rental management platform. 
            We specialize in automating luxury villa and apartment operations across major tourism hubs. 
            By integrating advanced AI-based scheduling, direct channel synchronizations, trust account ledgering, 
            and digital contract execution, we maximize rental yields for property owners while maintaining pristine operational compliance.
          </p>
        </div>

        <div className="warning-section">
          <h3 className="warning-title">Restricted Platform Registration</h3>
          <p className="warning-description">
            Public workspace registrations are currently disabled. Only platform Super Administrators 
            are authorized to register and provision new holiday homes organizations on OMNIBetter.
          </p>
        </div>

        <Link href="/login" className="omni-btn-primary">
          Return to Login
        </Link>
      </div>
    </div>
  );
}
