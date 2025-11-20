// index.ts
// Supabase Edge Function — Web Push sender (RFC8291 / aes128gcm)
// Supports VAPID keys: JWK, PKCS8 (base64/base64url), PEM
// Debug: set WEB_PUSH_DEBUG=true in secrets to enable console logs

const DEBUG = Deno.env.get('WEB_PUSH_DEBUG') === 'true';
function debug(...args: unknown[]) { if (DEBUG) console.debug('[push]', ...args); }

// Utilities
function b64UrlToB64(input: string) {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return b64;
}
function b64ToUint8Array(b64: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function b64UrlToUint8Array(b64u: string) {
  return b64ToUint8Array(b64UrlToB64(b64u));
}
function uint8ArrayToB64(u8: Uint8Array) {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}
function uint8ArrayToB64Url(u8: Uint8Array) {
  return uint8ArrayToB64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function concatUint8Arrays(...arrays: Uint8Array[]) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

// importVapidPrivateKey.ts - Deno / Edge runtime compatible

function isPem(str: string) {
  return /-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(str);
}
function base64UrlToBase64(s: string) {
  // convert base64url to base64
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  // pad with '='
  while (s.length % 4) s += '=';
  return s;
}
function decodeBase64ToUint8Array(b64: string) {
  // atob available in Deno
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
/**
 * Tries to import a VAPID private key from several common formats:
 * - PKCS#8 PEM
 * - base64 (raw) or base64url (raw) representing 32-byte private key
 *
 * Returns a CryptoKey usable for ECDSA P-256 signing.
 */
async function importVapidPrivateKey(keyString: string): Promise<CryptoKey> {
  if (!keyString || typeof keyString !== 'string') {
    throw new Error('VAPID private key is not provided or not a string');
  }
  // Detect PEM
  if (isPem(keyString)) {
    // Strip PEM header/footer and decode
    const pemContents = keyString
      .replace(/-----BEGIN [A-Z ]+PRIVATE KEY-----/, '')
      .replace(/-----END [A-Z ]+PRIVATE KEY-----/, '')
      .replace(/\s+/g, '');
    const der = decodeBase64ToUint8Array(pemContents);
    // Try importing as pkcs8
    try {
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        der.buffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
      return cryptoKey;
    } catch (err) {
      throw new Error(
        `Failed to import VAPID key as PKCS#8 PEM: ${(err as Error).message}`
      );
    }
  }
  // Otherwise assume base64 / base64url raw
  // Normalize base64url -> base64
  let normalized = keyString.trim();
  // If it looks like base64url (contains - or _), convert
  if (normalized.includes('-') || normalized.includes('_')) {
    normalized = base64UrlToBase64(normalized);
  }
  // Try decode as base64
  let rawBytes: Uint8Array;
  try {
    rawBytes = decodeBase64ToUint8Array(normalized);
  } catch (err) {
    throw new Error(
      `VAPID key base64 decode failed: ${(err as Error).message}`
    );
  }
  // If it's 32 bytes, import as "raw" private key for ECDSA P-256
  if (rawBytes.byteLength === 32) {
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        rawBytes.buffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
      return key;
    } catch (err) {
      // Fallthrough to try pkcs8 if raw import fails
      const msg = (err as Error).message || String(err);
      throw new Error(
        `Failed to import VAPID raw key (32 bytes) as EC private key: ${msg}`
      );
    }
  }
  // If length looks like DER (e.g., > 32) try pkcs8 import
  if (rawBytes.byteLength > 32) {
    try {
      const key = await crypto.subtle.importKey(
        'pkcs8',
        rawBytes.buffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
      return key;
    } catch (err) {
      const msg = (err as Error).message || String(err);
      throw new Error(
        `Failed to import VAPID key as PKCS#8 DER: ${msg}`
      );
    }
  }
  throw new Error(
    `Unsupported VAPID key format or invalid size (${rawBytes.byteLength} bytes). Expected 32-byte raw key (base64/base64url) or PKCS#8 PEM/DER.`
  );
}


// Convert ECDSA-JWT signature (DER) to raw 64-byte R||S
function derToRawSignature(der: Uint8Array): Uint8Array {
  debug('derToRawSignature: Input DER signature (first 10 bytes):', der.slice(0, 10), 'Full DER (hex):', Array.from(der).map(b => b.toString(16).padStart(2, '0')).join(''));
  if (der[0] !== 0x30) throw new Error('Invalid DER signature: Does not start with 0x30');
  let idx = 2;
  if (der[idx] !== 0x02) throw new Error('Invalid DER format for R: Does not contain 0x02 at expected position');
  const rlen = der[idx + 1]; idx += 2;
  const r = der.slice(idx, idx + rlen); idx += rlen;
  if (der[idx] !== 0x02) throw new Error('Invalid DER format for S: Does not contain 0x02 at expected position');
  const slen = der[idx + 1]; idx += 2;
  const s = der.slice(idx, idx + slen);
  const rPad = new Uint8Array(32); rPad.set(r, 32 - r.length);
  const sPad = new Uint8Array(32); sPad.set(s, 32 - s.length);
  return concatUint8Arrays(rPad, sPad);
}

// Build VAPID JWT (ES256) and return Authorization header value
async function buildVapidAuth(privateKeyInput: unknown, subject: string, aud: string) {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud, exp: now + 12 * 60 * 60, sub: subject };

  const encodedHeader = uint8ArrayToB64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToB64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  debug('Signing input:', signingInput);

  const signKey = await importVapidPrivateKey(privateKeyInput as string); // Cast to string for the new function
  debug('Private key imported successfully.');

  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signKey, new TextEncoder().encode(signingInput)));
  debug('Signature generated. Length:', signature.length, 'First bytes:', signature.slice(0, 10), 'Full (hex):', Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join(''));

  let rawSig: Uint8Array;
  if (signature.length === 64) {
    debug('Signature is 64 bytes, assuming raw R||S format.');
    rawSig = signature; // Use directly if it's already raw R||S
  } else {
    debug('Signature is not 64 bytes, attempting DER parsing.');
    rawSig = derToRawSignature(signature); // Otherwise, try to parse as DER
  }
  
  debug('Raw signature converted.');
  const encodedSig = uint8ArrayToB64Url(rawSig);
  const jwt = `${signingInput}.${encodedSig}`;

  return jwt; // Only return the JWT
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

  const authSecret = parseAuthSecret(subscription.keys.auth);

  const senderKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const senderPublicRawFull = new Uint8Array(await crypto.subtle.exportKey('raw', senderKeyPair.publicKey));
  const senderPublicNoPrefix = senderPublicRawFull[0] === 0x04 ? senderPublicRawFull.slice(1) : senderPublicRawFull;

  const sharedSecretBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: userPublic }, senderKeyPair.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Fix for TS2769: Pass Uint8Array directly instead of its buffer
  const hmacKey = await crypto.subtle.importKey('raw', authSecret.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prkRaw = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, sharedSecret)); // Fix: Pass Uint8Array directly

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const infoCEK = createInfo('aes128gcm', senderPublicNoPrefix, userPublicNoPrefix);
  const infoNonce = createInfo('nonce', senderPublicNoPrefix, userPublicNoPrefix);

  const prkKey = await crypto.subtle.importKey('raw', prkRaw.buffer, 'HKDF', false, ['deriveBits']);
  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt.buffer, info: infoCEK.buffer }, prkKey, 128);
  const cek = new Uint8Array(cekBits);
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt.buffer, info: infoNonce.buffer }, prkKey, 96);
  const nonce = new Uint8Array(nonceBits);

  const payloadBytes = new TextEncoder().encode(payload);
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
  cryptoKeyHeaderParts.push(`dh=${uint8ArrayToB64Url(senderPublicNoPrefix)}`);
  cryptoKeyHeaderParts.push(`p256ecdsa=${vapidPublicKeyB64u}`); // Use the provided public key directly
  const cryptoKeyHeader = cryptoKeyHeaderParts.join(';');

  const headers: Record<string,string> = {
    TTL: '2419200',
    'Content-Encoding': 'aes128gcm',
    Encryption: `salt=${uint8ArrayToB64Url(salt)}`,
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
  const jwt = await buildVapidAuth(vapidConfig.privateKeyPkcs8, vapidConfig.subject, aud);
  
  // Use the public key from vapidConfig directly
  await sendWebPushRequest(subscription.endpoint, salt, senderPublicNoPrefix, cipherBytes, jwt, vapidConfig.publicKey);
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
        if (sendError.message.includes('410') || sendError.message.includes('404')) {
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