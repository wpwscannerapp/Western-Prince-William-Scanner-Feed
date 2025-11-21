// test-vapid-key.ts
// Run with: deno run --allow-env test-vapid-key.ts

async function importVapidPrivateKey(keyString: string): Promise<CryptoKey> {
  console.log('Attempting to import key. String length:', keyString.length);

  const isPem = (str: string) => /-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(str);
  const base64UrlToBase64 = (s: string) => {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return s;
  };
  const decodeBase64ToUint8Array = (b64: string) => {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  if (isPem(keyString)) {
    console.log('Detected PEM format.');
    const pemContents = keyString
      .replace(/-----BEGIN [A-Z ]+PRIVATE KEY-----/, '')
      .replace(/-----END [A-Z ]+PRIVATE KEY-----/, '')
      .replace(/\s+/g, '');
    const der = decodeBase64ToUint8Array(pemContents);
    console('Decoded DER bytes length:', der.byteLength);
    try {
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        der.buffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
      console.log('SUCCESS: Imported PEM key as PKCS#8.');
      return cryptoKey;
    } catch (err) {
      console.error(`FAILED: Importing PEM key as PKCS#8: ${(err as Error).message}`);
      throw err;
    }
  }
  
  let normalized = keyString.trim();
  if (normalized.includes('-') || normalized.includes('_')) {
    normalized = base64UrlToBase64(normalized);
    console.log('Normalized base64url to base64.');
  }

  let rawBytes: Uint8Array;
  try {
    rawBytes = decodeBase64ToUint8Array(normalized);
    console.log('Decoded to raw bytes. Length:', rawBytes.byteLength);
  } catch (err) {
    console.error(`FAILED: Base64 decode failed: ${(err as Error).message}`);
    throw err;
  }

  if (rawBytes.byteLength === 32) {
    console.log('Attempting to import 32-byte raw key as ECDSA P-256 private key for signing.');
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        rawBytes.buffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
      console.log('SUCCESS: Imported 32-byte raw key.');
      return key;
    } catch (err) {
      console.error(`FAILED: Importing 32-byte raw key: ${(err as Error).message}`);
      throw err;
    }
  } else if (rawBytes.byteLength > 32) {
    console.log('Attempting to import >32-byte key as PKCS#8 DER.');
    try {
      const key = await crypto.subtle.importKey(
        'pkcs8',
        rawBytes.buffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
      console.log('SUCCESS: Imported PKCS#8 DER key.');
      return key;
    } catch (err) {
      console.error(`FAILED: Importing PKCS#8 DER key: ${(err as Error).message}`);
      throw err;
    }
  } else {
    console.error('Unsupported key size:', rawBytes.byteLength);
    throw new Error(
      `Unsupported VAPID key format or invalid size (${rawBytes.byteLength} bytes). Expected 32-byte raw key (base64/base64url) or PKCS#8 PEM/DER.`
    );
  }
}

// Main execution
const VAPID_PRIVATE_KEY = Deno.env.get('WEB_PUSH_PRIVATE_KEY');

if (!VAPID_PRIVATE_KEY) {
  console.error('Error: WEB_PUSH_PRIVATE_KEY environment variable is not set.');
  Deno.exit(1);
}

console.log('--- VAPID Private Key Import Test ---');
console.log('Key string length:', VAPID_PRIVATE_KEY.length);
console.log('Key starts with "-----BEGIN":', VAPID_PRIVATE_KEY.startsWith('-----BEGIN'));

try {
  await importVapidPrivateKey(VAPID_PRIVATE_KEY);
  console.log('--- Test Completed Successfully ---');
} catch (e) {
  console.error('--- Test Failed ---');
  console.error('Overall error:', (e as Error).message);
  Deno.exit(1);
}