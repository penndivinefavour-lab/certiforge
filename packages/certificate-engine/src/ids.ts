// Certificate ID Generator for Open Studio
// Generates unique, collision-resistant certificate IDs

/**
 * Generate a cryptographically random certificate ID
 * Format: CF-XXXX-XXXX-XXXX (12 random chars)
 */
export function generateCertificateId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar-looking chars
  let id = 'CF-';
  
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(randomInt(chars.length));
  }
  id += '-';
  
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(randomInt(chars.length));
  }
  id += '-';
  
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(randomInt(chars.length));
  }
  
  return id;
}

/**
 * Generate a random integer between 0 and max (exclusive)
 * Uses crypto.getRandomValues for cryptographically secure randomness
 */
function randomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Generate a random UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) as number;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format certificate ID for display
 */
export function formatCertificateId(id: string): string {
  if (id.startsWith('CF-')) return id;
  
  // Convert UUID-like format to CF-XXXX-XXXX-XXXX
  const clean = id.replace(/-/g, '').slice(0, 12).toUpperCase();
  return `CF-${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
}

/**
 * Validate certificate ID format
 */
export function isValidCertificateId(id: string): boolean {
  return /^CF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id);
}

/**
 * Generate verification token
 */
export function generateVerificationToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create self-contained verification data for QR codes
 */
export function createVerificationPayload(
  certificateId: string,
  recipientName: string,
  issuedAt: Date,
  verificationToken: string
): string {
  const payload = {
    id: certificateId,
    name: recipientName,
    issuedAt: issuedAt.toISOString(),
    token: verificationToken,
    verified: true,
    platform: 'certiforge',
    version: '1.0',
  };
  
  return JSON.stringify(payload);
}
