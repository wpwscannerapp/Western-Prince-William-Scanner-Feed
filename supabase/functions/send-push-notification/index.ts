// index.ts
// Supabase Edge Function — Web Push sender (RFC8291 / aes128gcm)
// Supports VAPID keys: JWK, PKCS8 (base64/base64url), PEM
// Debug: set WEB_PUSH_DEBUG=true in secrets to enable console logs

const DEBUG = Deno.env.get('WEB_PUSH_DEBUG') === 'true';
function debug(...args: unknown[]) { if (DEBUG) console.debug('[push]', ...args); }

// Utilities
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function base64UrlToBase64(s: string): string {
  // convert base64url -> base64
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad !== 0) throw new Error("Invalid base64url string");
  return s;
}

function base64ToUint8Array(b64: string) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64Url(bytes: Uint8Array) {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  const b64 = btoa(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatUint8Arrays(...arrays: Uint8Array[]) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

// Parse PEM, base64url, base64, or raw 32-byte key and return Uint8Array
function parsePrivateKeyInput(input: string): Uint8Array {
  input = input.trim();

  // PEM
  const pemMatch = input.match(/-----BEGIN [A-Z ]+-----([^-]+)-----END [A-Z ]+-----/s);
  if (pemMatch) {
    const b64 = pemMatch[1].replace(/\s+/g, "");
    return base64ToUint8Array(b64);
  }

  // base64url ?
  const maybeBase64Url = /^[A-Za-z0-9_-]+$/.test(input);
  if (maybeBase64Url) {
    // Try base64url -> base64 decode
    try {
      const b64 = base64UrlToBase64(input);
      const bytes = base64ToUint8Array(b64);
      // If raw 32 bytes, return raw. Otherwise assume it's PKCS8 DER
      if (bytes.length === 32) return bytes;
      return bytes;
    } catch {
      // fallthrough
    }
  }

  // Plain base64 with padding
  const maybeBase64 = /^[A-Za-z0-9+/=]+$/.test(input);
  if (maybeBase64) {
    const bytes = base64ToUint8Array(input);
    if (bytes.length === 32) return bytes;
    return bytes;
  }

  throw new Error("Unrecognized private key format");
}

// Wrap raw 32-byte private key into PKCS#8 DER for EC P-256
function wrapRawPrivateKeyToPkcs8(rawKey: Uint8Array): Uint8Array {
  if (rawKey.length !== 32) throw new Error("Expected 32-byte raw private key");

  const pkcs8Prefix = new Uint8Array([
    0x30, 0x81, 0x87,                         // SEQUENCE, length 0x87 (135) -> we'll adjust if needed
    0x02, 0x01, 0x00,                         // INTEGER 0
    0x30, 0x13,                               // SEQUENCE OID len 19
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID 1.2.840.10045.2.1 (ecPublicKey)
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID 1.2.840.10045.3.1.7 (prime256v1)
    0x04, 0x6d,                               // OCTET STRING len 0x6d (109) -> inner ECPrivateKey sequence
    0x30, 0x6b,                               // SEQUENCE len 0x6b (107)
    0x02, 0x01, 0x01,                         // INTEGER 1
    0x04, 0x20,                               // OCTET STRING len 0x20 (32) -> private key
  ]);

  const out = new Uint8Array(pkcs8Prefix.length + 32);
  out.set(pkcs8Prefix, 0);
  out.set(rawKey, pkcs8Prefix.length);
  return out;
}

// Import VAPID private key into Web Crypto as 'pkcs8' (ECDSA P-256)
async function importVapidPrivateKeyFromEnv(envName = "WEB_PUSH_PRIVATE_KEY"): Promise<CryptoKey> {
  const rawInput = Deno.env.get(envName);
  if (!rawInput) throw new Error(`${envName} not set`);

  const parsed = parsePrivateKeyInput(rawInput);
  let keyDer: Uint8Array;

  if (parsed.length === 32) {
    // raw private key -> wrap into PKCS#8
    keyDer = wrapRawPrivateKeyToPkcs8(parsed);
  } else {
    // assume parsed is PKCS#8 DER already
    keyDer = parsed;
  }

  // Import as pkcs8
  try {
    const alg = { name: "ECDSA", namedCurve: "P-256" } as EcdsaImportParams;
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyDer.buffer,
      alg,
      false, // not extractable
      ["sign"]
    );
    return cryptoKey;
  } catch (err) {
    // If pkcs8 import fails, rethrow with helpful message
    throw new Error(`Failed to import VAPID private key as pkcs8: ${(err as Error).message}`);
  }
}

// Convert DER signature (ASN.1 SEQUENCE of r and s) -> raw 64-byte R||S
function derSigToRaw(der: Uint8Array): Uint8Array {
  // Minimal DER parser to extract INTEGER r and s
  let idx = 0;
  if (der[idx++] !== 0x30) throw new Error("Invalid DER signature (no SEQUENCE)");
  const _seqLen = der[idx++]; // assume short-form length
  if (der[idx++] !== 0x02) throw new Error("Invalid DER signature (no INTEGER r)");
  let rLen = der[idx++];
  if (der[idx] === 0x00 && rLen > 0) {
    // leading zero present
    idx++;
    rLen--;
  }
  const r = der.slice(idx, idx + rLen);
  idx += rLen;
  if (der[idx++] !== 0x02) throw new Error("Invalid DER signature (no INTEGER s)");
  let sLen = der[idx++];
  if (der[idx] === 0x00 && sLen > 0) {
    idx++;
    sLen--;
  }
  const s = der.slice(idx, idx + sLen);

  // Left-pad to 32 bytes each
  const rPadded = new Uint8Array(32);
  rPadded.set(r, 32 - r.length);
  const sPadded = new Uint8Array(32);
  sPadded.set(s, 32 - s.length);

  const raw = new Uint8Array(64);
  raw.set(rPadded, 0);
  raw.set(sPadded, 32);
  return raw;
}

// Sign data with ECDSA P-256 and return base64url signature (raw R||S)
async function signVapid(cryptoKey: CryptoKey, data: string | Uint8Array) {
  const payload = typeof data === "string" ? textEncoder.encode(data) : data;
  const derSig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cryptoKey, payload));
  const raw = derSigToRaw(derSig);
  return uint8ArrayToBase64Url(raw);
}

// Build VAPID Authorization header (returns { authorization, publicKey })
export async function buildVapidAuth(envPrivateName = "WEB_PUSH_PRIVATE_KEY", envPublicName = "VITE_WEB_PUSH_PUBLIC_KEY") {
  // Get aud = origin of push service (e.g., https://fcm.googleapis.com)
  const aud = "https://fcm.googleapis.com"; // for FCM; for other endpoints use their origin
  const sub = Deno.env.get("VITE_ADMIN_EMAIL") ? `mailto:${Deno.env.get("VITE_ADMIN_EMAIL")}` : undefined;

  const cryptoKey = await importVapidPrivateKeyFromEnv(envPrivateName);

  // prepare JWT header.payload
  const header = { alg: "ES256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 12 * 60 * 60; // 12 hours
  const body: any = { aud, iat, exp };
  if (sub) body.sub = sub;

  const b64Header = uint8ArrayToBase64Url(textEncoder.encode(JSON.stringify(header)));
  const b64Payload = uint8ArrayToBase64Url(textEncoder.encode(JSON.stringify(body)));
  const signingInput = `${b64Header}.${b64Payload}`;

  const signature = await signVapid(cryptoKey, signingInput);

  // Authorization header value
  const authHeader = `WebPush ${signingInput}.${signature}`;
  const publicKey = Deno.env.get(envPublicName) ?? "";

  return { authorization: authHeader, publicKey: publicKey };
}

// --- NEW: importSubscriptionPublicKey function (my existing one) ---
async function importSubscriptionPublicKey(base64UrlKey: string): Promise<CryptoKey> {
  const raw = base64UrlToBase64(base64UrlKey); // Use base64UrlToBase64 to convert
  const rawBytes = base64ToUint8Array(raw);
  return await crypto.subtle.importKey(
    'raw',
    rawBytes.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable if you need to export; set false if not needed
    []
  );
}
// --- END NEW: importSubscriptionPublicKey function ---


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

  const authSecret = base64ToUint8Array(base64UrlToBase64(subscription.keys.auth)); // Use new base64UrlToBase64 and base64ToUint8Array

  const senderKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const senderPublicRawFull = new Uint8Array(await crypto.subtle.exportKey('raw', senderKeyPair.publicKey));
  const senderPublicNoPrefix = senderPublicRawFull[0] === 0x04 ? senderPublicRawFull.slice(1) : senderPublicRawFull;

  const sharedSecretBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: userPublic }, senderKeyPair.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedSecretBits);

  const hmacKey = await crypto.subtle.importKey('raw', authSecret.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prkRaw = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, sharedSecret.buffer as ArrayBuffer));

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const infoCEK = createInfo('aes128gcm', senderPublicNoPrefix, userPublicNoPrefix);
  const infoNonce = createInfo('nonce', senderPublicNoPrefix, userPublicNoPrefix);

  const prkKey = await crypto.subtle.importKey('raw', prkRaw.buffer, 'HKDF', false, ['deriveBits']);
  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt.buffer, info: infoCEK.buffer }, prkKey, 128);
  const cek = new Uint8Array(cekBits);
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt.buffer, info: infoNonce.buffer }, prkKey, 96);
  const nonce = new Uint8Array(nonceBits);

  const payloadBytes = textEncoder.encode(payload); // Use new textEncoder
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

async function sendWebPushRequest(endpoint: string, salt: Uint8Array, senderPublicNoPrefix: Uint8Array, cipherBytes: Uint8Array, authorizationHeaderValue: string, publicKeyHeaderValue: string) {
  const cryptoKeyHeaderParts: string[] = [];
  cryptoKeyHeaderParts.push(`dh=${uint8ArrayToBase64Url(senderPublicNoPrefix)}`);
  cryptoKeyHeaderParts.push(`p256ecdsa=${publicKeyHeaderValue}`);
  const cryptoKeyHeader = cryptoKeyHeaderParts.join('; ');

  const headers: Record<string,string> = {
    TTL: '2419200',
    'Content-Encoding': 'aes128gcm',
    Encryption: `salt=${uint8ArrayToBase64Url(salt)}`,
    'Crypto-Key': cryptoKeyHeader,
    Authorization: authorizationHeaderValue,
    'Content-Type': 'application/octet-stream',
  };

  debug('Sending push to', endpoint, 'headers', headers);

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: cipherBytes.buffer as ArrayBuffer,
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
  const { authorization, publicKey } = await buildVapidAuth("WEB_PUSH_PRIVATE_KEY", "VITE_WEB_PUSH_PUBLIC_KEY"); // Call the new buildVapidAuth

  await sendWebPushRequest(subscription.endpoint, salt, senderPublicNoPrefix, cipherBytes, authorization, publicKey);
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
    const vapidPublicKey = Deno.env.get('VITE_WEB_PUSH_PUBLIC_KEY'); // Removed '!'
    const vapidPrivateKeyBase64Url = Deno.env.get('WEB_PUSH_PRIVATE_KEY'); // Removed '!'

    if (!vapidPublicKey || !vapidPrivateKeyBase64Url) {
      console.error('Edge Function Error: VAPID keys are not configured. Ensure VITE_WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY are set as secrets.');
      return new Response(JSON.stringify({ error: { message: 'Server Error: VAPID keys are not configured.' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Now that we've checked, it's safe to use substring
    debug('VAPID Public Key (first 20 chars):', vapidPublicKey.substring(0, 20) + '...');
    debug('VAPID Private Key (first 20 chars):', vapidPrivateKeyBase64Url.substring(0, 20) + '...');
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