// Helper functions for Web Push key normalization and import

// Helper function to convert URL-safe base64 to Uint8Array
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper function to normalize EC public key for Web Crypto API
export function normalizeEcPublicKey(rawKeyBytes: Uint8Array): Uint8Array {
  // P-256 uncompressed public keys are 65 bytes: 0x04 || X (32 bytes) || Y (32 bytes)
  // Some Web Push libraries (like web-push-libs) might provide p256dh as 64 bytes (X || Y)
  // The Web Crypto API's 'raw' format for ECDH/ECDSA P-256 expects the 65-byte uncompressed format.
  if (rawKeyBytes.length === 64) {
    const normalized = new Uint8Array(65);
    normalized[0] = 0x04; // Uncompressed point indicator
    normalized.set(rawKeyBytes, 1);
    return normalized;
  }
  return rawKeyBytes;
}

// Imports an EC public key, normalizing it if necessary
export async function importECPublicKey(rawKey: string | Uint8Array): Promise<CryptoKey> {
  const keyBytes = typeof rawKey === 'string' ? urlBase64ToUint8Array(rawKey) : rawKey;
  const normalizedKeyBytes = normalizeEcPublicKey(keyBytes);

  return crypto.subtle.importKey(
    'raw',
    normalizedKeyBytes.buffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  );
}

// Imports an EC private key from PKCS8 base64 format
export async function importECPrivateKeyFromPKCS8Base64(b64pkcs8: string, usages: KeyUsage[] = ['deriveBits']): Promise<CryptoKey> {
  const pkDer = urlBase64ToUint8Array(b64pkcs8);
  return crypto.subtle.importKey(
    'pkcs8',
    pkDer.buffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    usages
  );
}