// @ts-nocheck
import crypto from 'crypto';
import { generateSecret, verify, generateURI } from 'otplib';

// Retrieve the encryption key from env. It must be 32 bytes (64 hex characters or 256 bits).
const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || 'default-fallback-key-must-be-changed-in-prod-environments';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Encrypts a string (e.g. MFA TOTP secret) using AES-256-GCM.
 * Output format: iv_hex:auth_tag_hex:encrypted_hex
 */
export function encryptSecret(secret: string): string {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted string using AES-256-GCM.
 */
export function decryptSecret(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a new TOTP secret and returns the QR code provisioning URL.
 */
export function generateMfaSecret(email: string, issuer: string = 'Holiday Homes SaaS'): { secret: string; otpauthUrl: string } {
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    secret,
    label: email,
    issuer,
  });
  return { secret, otpauthUrl };
}

/**
 * Verifies a 6-digit TOTP code against the decrypted user secret.
 */
export async function verifyMfaCode(code: string, encryptedSecret: string): Promise<boolean> {
  try {
    const secret = decryptSecret(encryptedSecret);
    const result = await verify({ token: code, secret });
    return result.valid;
  } catch (error) {
    console.error('MFA Verify Error:', error);
    return false;
  }
}
