// index.ts
// Supabase Edge Function — Web Push sender (RFC8291 / aes128gcm)
// Supports VAPID keys: JWK, PKCS8 (base64/base64url), PEM
// Debug: set WEB_PUSH_DEBUG=true in secrets to enable console logs

const DEBUG = Deno.env.get('WEB_PUSH_DEBUG') === 'true';
function debug(...args: unknown[]) { if (DEBUG) console.debug('[push]', ...args); }

// Utilities
const base64UrlToUint8Array = (b64url: string) => {
  // Convert base64url to base64
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  // Pad
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  const raw = atob(padded);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
};

const uint8ArrayToBase64Url = (arr: Uint8Array) => {
  let str = '';
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

function concatUint8Arrays(...arrays: Uint8Array[]) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

// Helpers for VAPID key import
function isPem(str: string) {
  return /-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(str);
}

const leftPad = (b: Uint8Array, length: number) => {
  if (b.length > length) {
    // unexpected, but trim from left
    return b.slice(b.length - length);
  }
  const out = new Uint8Array(length);
  out.set(b, length - b.length);
  return out;
};

const trimLeadingZeros = (b: Uint8Array) => {
  let i = 0;
  while (i < b.length - 1 && b[i] === 0) i++;
  return b.slice(i);
};

// Wrap a 32-byte raw private key (d) into a minimal PKCS#8 DER for P-256
// This template embeds the raw private scalar into a PKCS#8 structure.
// Works for 32-byte private keys for curve prime256v1 (aka P-256).
const wrapRawPrivateKeyToPkcs8 = (raw32: Uint8Array) => {
  // PKCS#8 DER prefix for EC private key on P-256 (ASN.1 DER)
  // This template was generated for P-256 with empty public key. We'll construct:
  // pkcs8 = SEQ { int(0), SEQ { oid ecPublicKey, oid prime256v1 }, OCTETSTRING( ECPrivateKey{ version, privateKeyOctet, [0] oid, [1] publicKey } ) }
  // Minimal bytes template:
  const pkcs8TemplatePrefix = [
    0x30, 0x81, 0x87,             // SEQ, length 0x81 0x87 (135) -> we'll adjust if needed
    0x02, 0x01, 0x00,             // version = 0
    0x30, 0x13,                   // seq OID algorithm
    0x06, 0x07, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01, // OID 1.2.840.10045.2.1 (ecPublicKey)
    0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07, // OID 1.2.840.10045.3.1.7 (prime256v1)
    0x04, 0x6B,                   // OCTET STRING length 0x6B (107) -> contains ECPrivateKey
    0x30, 0x69,                   // SEQ length 0x69 (105)
    0x02, 0x01, 0x01,             // version 1
    0x04, 0x20,                   // OCTET STRING length 32 (private key)
    // [32 bytes private key go here]
    // following: [0] parameters (OID prime256v1)
    0xA0, 0x0A,
    0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07,
    // [1] publicKey BIT STRING (we'll include empty public key or skip; template includes empty)
    0xA1, 0x1B,
    0x03, 0x19, 0x00,
    // 25 bytes of public key placeholder (set to zeros; not required for private operations)
    // We'll append 25 zeros to match length
  ];

  // Build buffer
  const out = new Uint8Array(pkcs8TemplatePrefix.length + 32 + 25);
  out.set(Uint8Array.from(pkcs8TemplatePrefix.slice(0, 26))); // up to 0x04 0x20
  // place private key
  out.set(raw32, 26);
  // rest after private key
  const rest = Uint8Array.from(pkcs8TemplatePrefix.slice(26));
  out.set(rest, 26 + 32);
  // the final 25 bytes (public key placeholder) are already zero-initialized
  return out.buffer;
};

// Helper: convert DER encoded ECDSA signature to raw 64-byte R||S
const derToRs = (der: Uint8Array): Uint8Array => {
  // Basic ASN.1 DER parse for sequence of two integers
  // DER format: 0x30 LEN 0x02 rlen r... 0x02 slen s...
  if (der[0] !== 0x30) throw new Error('Invalid DER signature (no SEQUENCE)');
  let idx = 2;
  if (der[1] & 0x80) {
    // long-form length
    const lenBytes = der[1] & 0x7f;
    idx = 2 + lenBytes;
  }
  // read first integer
  if (der[idx] !== 0x02) throw new Error('Invalid DER signature (no INT r)');
  let rLen = der[idx + 1];
  let rStart = idx + 2;
  const r = der.slice(rStart, rStart + rLen);
  idx = rStart + rLen;
  if (der[idx] !== 0x02) throw new Error('Invalid DER signature (no INT s)');
  let sLen = der[idx + 1];
  let sStart = idx + 2;
  const s = der.slice(sStart, sStart + sLen);
  // integers may be padded with a leading 0x00 to indicate positive sign. Trim leading zeros.
  const rTrim = trimLeadingZeros(r);
  const sTrim = trimLeadingZeros(s);
  // Each must be padded to 32 bytes
  const rPadded = leftPad(rTrim, 32);
  const sPadded = leftPad(sTrim, 32);
  const out = new Uint8Array(64);
  out.set(rPadded, 0);
  out.set(sPadded, 32);
  return out;
};

// importVapidPrivateKey: accept base64url/base64 private key string and return a CryptoKey for ECDSA P-256 sign
export async function importVapidPrivateKey(vapidPrivateKeyStr: string): Promise<CryptoKey> {
  // Normalize: remove whitespace
  const s = vapidPrivateKeyStr.trim();
  // Try base64url decode
  let raw: Uint8Array | null = null;
  try {
    raw = base64UrlToUint8Array(s);
  } catch (e) {
    // fallback: if it's hex or something else, throw
    console.error('[push] importVapidPrivateKey: base64url decode failed:', e);
    throw new Error('VAPID private key decoding failed');
  }

  // If decoded length is 32, we assume it's the raw d scalar; wrap into PKCS#8
  if (raw.length === 32) {
    console.info('[push] importVapidPrivateKey: detected 32-byte raw key, wrapping to PKCS#8 DER.');
    const pkcs8 = wrapRawPrivateKeyToPkcs8(raw);
    try {
      const key = await crypto.subtle.importKey(
        'pkcs8',
        pkcs8,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
      console.info('[push] importVapidPrivateKey: imported wrapped pkcs8 key successfully');
      return key;
    } catch (err) {
      console.warn('[push] importVapidPrivateKey: pkcs8 import failed, rethrowing:', err);
      throw err;
    }
  }
  // If decoded length > 32, maybe it's pkcs8 DER already; try pkcs8 import
  if (raw.length > 32) {
    try {
      const key = await crypto.subtle.importKey('pkcs8', raw.buffer, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
      console.info('[push] importVapidPrivateKey: imported pkcs8 key successfully');
      return key;
    } catch (err) {
      console.warn('[push] importVapidPrivateKey: pkcs8 import failed, trying JWK fallback:', err);
      // try JWK: not much we can do without x/y; fallthrough to error
    }
  }
  throw new Error('Unable to import VAPID private key: unsupported format');
}

// signVapid: sign the JWT signing input (header.payload) with the imported private key and return base64url signature
export async function signVapid(privateKey: CryptoKey, signingInput: string): Promise<string> {
  // Strictly ensure signingInput is bytes
  if (typeof signingInput !== 'string') {
    throw new TypeError('signingInput must be a string');
  }
  const inputBytes = new TextEncoder().encode(signingInput);
  // Log for debugging (minimal)
  console.info('[push] signVapid: Signing input length:', inputBytes.length);
  // Ensure algorithm param
  const alg = { name: 'ECDSA', hash: 'SHA-256' } as any;
  // Validate privateKey shape quickly
  try {
    // Some environments allow inspecting algorithm/usages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kAny: any = privateKey;
    console.info('[push] signVapid: Private key details (type, algorithm, usages):', kAny.type, kAny.algorithm, kAny.usages);
  } catch (e) {
    // ignore if introspection not permitted
  }
  let sigBuf: ArrayBuffer;
  try {
    sigBuf = await crypto.subtle.sign(alg, privateKey, inputBytes);
  } catch (err) {
    console.error('[push] signVapid: SubtleCrypto.sign failed:', err);
    // Helpful hint for debugging. Re-throw with context.
    throw new Error(
      `SubtleCrypto.sign failed: ${(err as Error).message || String(err)}`
    );
  }
  // The returned signature from subtle.sign for ECDSA is ASN.1 DER encoded (r and s).
  // For JOSE VAPID we need raw R||S 64-byte signature, then base64url encode.
  const der = new Uint8Array(sigBuf);
  // Convert DER ECDSA signature to raw R||S
  const rs = derToRs(der);
  return uint8ArrayToBase64Url(rs);
}

// My existing `utf8ToUint8Array` (not provided by user, but needed)
function utf8ToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// --- NEW: importSubscriptionPublicKey function (my existing one) ---
async function importSubscriptionPublicKey(base64UrlKey: string): Promise<CryptoKey> {
  const raw = base64UrlToUint8Array(base64UrlKey);
  return await crypto.subtle.importKey(
    'raw',
    raw.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable if you need to export; set false if not needed
    []
  );
}
// --- END NEW: importSubscriptionPublicKey function ---


async function derivePublicKeyBase64Url(privateKey: CryptoKey): Promise<string> {
  try {
    const jwk = await crypto.subtle.exportKey('jwk', privateKey);
    if (typeof jwk === 'object' && 'x' in jwk && 'y' in jwk) {
      const x = (jwk as any).x as string;
      const y = (jwk as any).y as string;
      const xb = base64UrlToUint8Array(x);
      const yb = base64UrlToUint8Array(y);
      const publicRaw = concatUint8Arrays(Uint8Array.from([0x04]), xb, yb); // 65 bytes
      return uint8ArrayToBase64Url(publicRaw);
    }
  } catch (err) {
    console.info('[push] derivePublicKeyBase64Url: exportKey jwk failed or missing x/y:', (err as Error).message);
  }
  throw new Error('Could not derive public key from private key in this runtime; provide VAPID_PUBLIC_KEY in env.');
}

// Build VAPID Authorization & Crypto-Key headers
export async function buildVapidAuth(
  {
    vapidPrivateKeyString,
    vapidPublicKeyString, // optional base64url public key (uncompressed, leading 0x04, base64url)
    audience, // push service origin (e.g., 'https://fcm.googleapis.com')
    subject,  // contact (mailto: or URL)
    expirationSeconds = 12 * 60 * 60 // default 12 hours
  }: {
    vapidPrivateKeyString: string,
    vapidPublicKeyString?: string,
    audience: string,
    subject: string,
    expirationSeconds?: number
  }
): Promise<{ Authorization: string; 'Crypto-Key': string }> {
  if (!vapidPrivateKeyString) throw new Error('VAPID private key string required');
  
  // Import private key (handles PEM/DER/32-byte raw)
  const privateKey = await importVapidPrivateKey(vapidPrivateKeyString);
  console.info('[push] Private key imported successfully.');
  
  // Get base64url public key: prefer provided vapidPublicKeyString else derive/export
  let publicKeyBase64Url = vapidPublicKeyString;
  if (!publicKeyBase64Url) {
    try {
      publicKeyBase64Url = await derivePublicKeyBase64Url(privateKey);
      console.info('[push] Derived public key from private key.');
    } catch (err) {
      throw new Error('VAPID public key missing and could not be derived: ' + (err as Error).message);
    }
  }
  
  // Build JWT header and payload
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expirationSeconds;
  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: exp,
    sub: subject
  };
  
  const encodedHeader = uint8ArrayToBase64Url(utf8ToUint8Array(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64Url(utf8ToUint8Array(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  console.info('[push] Signing input length:', signingInput.length);
  
  // Sign and get base64url-encoded raw r||s signature
  const signatureBase64Url = await signVapid(privateKey, signingInput);
  
  // Build JWT compact form: header.payload.signature
  const jwt = `${signingInput}.${signatureBase64Url}`;
  
  // Build headers required by Web Push
  const authorizationHeader = `WebPush ${jwt}`;
  const cryptoKeyHeader = `p256ecdsa=${publicKeyBase64Url}`;
  
  // Non-secret logs
  console.info('[push] VAPID public key (first 20 chars):', publicKeyBase64Url.slice(0, 20));
  console.info('[push] JWT length:', jwt.length);
  
  return {
    Authorization: authorizationHeader,
    'Crypto-Key': cryptoKeyHeader
  };
}


function createInfo(type: string, clientPublic: Uint8Array, serverPublic: Uint8Array) {
  function lenPrefix(u8: Uint8Array) {
    const lp = new Uint8Array(2);
    lp[0] = (u8.length >> 8) & 0xff;
    lp[1] = u8.length & 0xff;
    return concatUint8Arrays(lp, u8);
  }
  const enc = new TextEncoder();
  const info = concatUint8Arrays(
    enc.encode(`Content-Encoding: ${type}\0`),
    enc.encode('P-256\0'),
    enc.encode('auth\0'), // Added 'auth' info for HKDF
    lenPrefix(clientPublic),
    lenPrefix(serverPublic)
  );
  return info;
}

function createPaddingAndRecord(payloadBytes: Uint8Array) {
  const padLen = new Uint8Array(2); padLen[0] = 0; padLen[1] = 0;
  return concatUint8Arrays(padLen, payloadBytes);
}

async function encryptForWebPush(payload: string, subscription: any) {
  const userPublic = await importSubscriptionPublicKey(subscription.keys.p256dh);
  const userPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', userPublic));
  debug('userPublicRaw length', userPublicRaw.length);

  const userPublicNoPrefix = userPublicRaw[0] === 0x04 ? userPublicRaw.slice(1) : userPublicRaw;

  const authSecret = base64UrlToUint8Array(subscription.keys.auth); // Use base64UrlToUint8Array directly

  const senderKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const senderPublicRawFull = new Uint8Array(await crypto.subtle.exportKey('raw', senderKeyPair.publicKey));
  const senderPublicNoPrefix = senderPublicRawFull[0] === 0x04 ? senderPublicRawFull.slice(1) : senderPublicRawFull;

  const sharedSecretBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: userPublic }, senderKeyPair.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Fix for TS2769: Pass Uint8Array directly instead of its buffer
  const hmacKey = await crypto.subtle.importKey('raw', authSecret.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prkRaw = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, sharedSecret.buffer as ArrayBuffer)); // Fix: Pass Uint8Array directly

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const infoCEK = createInfo('aes128gcm', senderPublicNoPrefix, userPublicNoPrefix);
  const infoNonce = createInfo('nonce', senderPublicNoPrefix, userPublicNoPrefix);

  const prkKey = await crypto.subtle.importKey('raw', prkRaw.buffer, 'HKDF', false, ['deriveBits']);
  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt.buffer, info: infoCEK.buffer }, prkKey, 128);
  const cek = new Uint8Array(cekBits);
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt.buffer, info: infoNonce.buffer }, prkKey, 96);
  const nonce = new Uint8Array(nonceBits);

  const payloadBytes = utf8ToUint8Array(payload); // Use new helper
  const record = createPaddingAndRecord(payloadBytes);

  const aesKey = await crypto.subtle.importKey('raw', cek.buffer, { name: 'AES-GCM' }, false, ['encrypt']);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, record);
  const cipherBytes = new Uint8Array(cipherBuffer);

  return {
    salt,
    senderPublicNoPrefix,
    cipherBytes,
  };
}

async function sendWebPushRequest(endpoint: string, salt: Uint8Array, senderPublicNoPrefix: Uint8Array, cipherBytes: Uint8Array, vapidJwt: string, vapidPublicKeyB64u: string) {
  const cryptoKeyHeaderParts: string[] = [];
  cryptoKeyHeaderParts.push(`dh=${uint8ArrayToBase64Url(senderPublicNoPrefix)}`); // Use new helper
  cryptoKeyHeaderParts.push(`p256ecdsa=${vapidPublicKeyB64u}`); // Use the provided public key directly
  // Changed the delimiter from ';' to '; ' for broader compatibility
  const cryptoKeyHeader = cryptoKeyHeaderParts.join('; ');

  const headers: Record<string,string> = {
    TTL: '2419200',
    'Content-Encoding': 'aes128gcm',
    Encryption: `salt=${uint8ArrayToBase64Url(salt)}`, // Use new helper
    'Crypto-Key': cryptoKeyHeader,
    Authorization: `WebPush ${vapidJwt}`,
    'Content-Type': 'application/octet-stream',
  };

  debug('Sending push to', endpoint, 'headers', headers);

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: cipherBytes.buffer as ArrayBuffer, // Explicitly cast to ArrayBuffer
  });

  const ok = resp.ok;
  const status = resp.status;
  const text = await resp.text().catch(() => '');
  debug('Push response', status, text);
  if (!ok) throw new Error(`Push send failed: ${status} ${text}`);
  return { status, text };
}

// New helper function to orchestrate encryption and sending
async function sendPush(subscription: DbPushSubscription, payload: string, vapidConfig: { publicKey: string; privateKeyPkcs8: string; subject: string }) {
  const { salt, senderPublicNoPrefix, cipherBytes } = await encryptForWebPush(payload, subscription.subscription);

  const aud = new URL(subscription.endpoint).origin;
  const { Authorization, 'Crypto-Key': CryptoKeyHeader } = await buildVapidAuth({
    vapidPrivateKeyString: vapidConfig.privateKeyPkcs8,
    vapidPublicKeyString: vapidConfig.publicKey,
    audience: aud,
    subject: vapidConfig.subject,
  });

  // Extract JWT and public key from the headers
  const vapidJwt = Authorization.replace('WebPush ', '');
  const vapidPublicKeyB64u = CryptoKeyHeader.replace('p256ecdsa=', '');
  
  await sendWebPushRequest(subscription.endpoint, salt, senderPublicNoPrefix, cipherBytes, vapidJwt, vapidPublicKeyB64u);
}


// Explicitly declare Deno global for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Define Json type locally for the Edge Function
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define a local interface for the subscription object from the database
interface DbPushSubscription {
  subscription: Json; // This will be the JSONB object containing keys
  endpoint: string; // This will be the top-level endpoint column
}

// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

serve(async (req: Request) => {
  console.log('Edge Function: send-push-notification invoked. Using self-contained Web Crypto implementation.');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.error(`Edge Function Error: Method Not Allowed - Received ${req.method} request, expected POST.`);
    return new Response(JSON.stringify({ error: { message: 'Method Not Allowed: Only POST requests are supported.' } }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // --- NEW: Internal Secret Validation ---
  const internalSecret = Deno.env.get('WEB_PUSH_INTERNAL_SECRET');
  const receivedSecret = req.headers.get('X-Internal-Secret');

  if (!internalSecret || receivedSecret !== internalSecret) {
    console.error('Edge Function Error: Forbidden - Invalid or missing internal secret.');
    return new Response(JSON.stringify({ error: { message: 'Forbidden: Invalid or missing internal secret.' } }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // --- END NEW: Internal Secret Validation ---

  try {
    console.log('Edge Function: Initializing Supabase client.');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    console.log('Edge Function: Supabase client initialized.');

    console.log('Edge Function: Parsing request body.');
    const { alert } = await req.json();
    if (!alert || !alert.title || !alert.title.trim() || !alert.description || !alert.description.trim()) {
      console.error('Edge Function Error: Bad Request - Missing or empty alert title or description.');
      return new Response(JSON.stringify({ error: { message: 'Bad Request: Missing or empty alert title or description.' } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Edge Function: Alert data received:', alert.title);

    console.log('Edge Function: Retrieving VAPID keys from environment.');
    const vapidPublicKey = Deno.env.get('WEB_PUSH_PUBLIC_KEY')!;
    const vapidPrivateKeyBase64Url = Deno.env.get('WEB_PUSH_PRIVATE_KEY')!;
    debug('VAPID Public Key (first 20 chars):', vapidPublicKey.substring(0, 20) + '...');
    debug('VAPID Private Key (first 20 chars):', vapidPrivateKeyBase64Url.substring(0, 20) + '...');

    if (!vapidPublicKey || !vapidPrivateKeyBase64Url) {
      console.error('Edge Function Error: VAPID keys are not configured. Ensure WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY are set as secrets.');
      return new Response(JSON.stringify({ error: { message: 'Server Error: VAPID keys are not configured.' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Edge Function: VAPID keys retrieved.');

    console.log('Edge Function: Fetching push subscriptions from database.');
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription, endpoint');

    if (fetchError) {
      console.error('Edge Function Error: Failed to fetch subscriptions:', fetchError);
      return new Response(JSON.stringify({ error: { message: 'Failed to fetch subscriptions.' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`Edge Function: Found ${subscriptions.length} subscriptions.`);

    const notificationPayload = JSON.stringify({
      title: alert.title,
      body: alert.description,
      icon: '/Logo.png',
      badge: '/Logo.png',
      sound: 'default',
      data: {
        url: `${Deno.env.get('VITE_APP_URL')}/incidents/${alert.id}`,
        incidentId: alert.id,
      },
    });
    console.log('Edge Function: Notification payload prepared.');

    const vapidConfig = {
      publicKey: vapidPublicKey,
      privateKeyPkcs8: vapidPrivateKeyBase64Url,
      subject: 'mailto:wpwscannerfeed@gmail.com',
    };

    const sendPromises = subscriptions.map(async (sub: DbPushSubscription) => {
      try {
        await sendPush(sub, notificationPayload, vapidConfig); // Call the new sendPush function
      } catch (sendError: any) {
        console.error('Edge Function Error: Error sending notification to subscription:', sub.endpoint, sendError);
        // Check for InvalidCharacterError or other decoding issues
        if (sendError instanceof DOMException && sendError.name === 'InvalidCharacterError') {
          console.error('Edge Function: Malformed subscription data detected, deleting from DB:', sub.endpoint);
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        } else if (sendError.message.includes('410') || sendError.message.includes('404')) {
          console.log('Edge Function: Subscription expired or not found, deleting from DB:', sub.endpoint);
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
      }
    });

    console.log('Edge Function: Waiting for all notification send promises to settle.');
    await Promise.allSettled(sendPromises);
    console.log('Edge Function: All notification send promises settled.');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Edge Function FATAL Error: Unexpected error in send-push-notification Edge Function:', error);
    return new Response(JSON.stringify({ error: { message: error.message } }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

export {};