// index.ts (final working version)

// Supabase Edge Function — Web Push sender (RFC8291 / aes128gcm)

// Supports VAPID keys: JWK, PKCS8 (base64/base64url), PEM

// Debug: set WEB_PUSH_DEBUG=true in secrets to enable console logs

const DEBUG = Deno.env.get('WEB_PUSH_DEBUG') === 'true';
function debug(...args: unknown[]) {
  if (DEBUG) console.debug('[push]', ...args);
}
// Utilities

const textEncoder = new TextEncoder();

function base64UrlToBase64(s: string): string {
  if (!s || typeof s !== 'string') throw new Error('Invalid base64url input');
  // convert base64url -> base64
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad !== 0) throw new Error("Invalid base64url string");
  return s;
}

function base64ToUint8Array(b64: string) {
  if (!b64 || typeof b64 !== 'string') throw new Error('Invalid base64 input');
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
  if (!input || typeof input !== 'string') throw new Error('Empty private key input');
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
  if (!rawKey || rawKey.length !== 32) throw new Error("Expected 32-byte raw private key");

  const stablePrefix = new Uint8Array([
    0x30, 0x81, 0x87,
    0x02, 0x01, 0x00,
    0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x6d,
    0x30, 0x6b,
    0x02, 0x01, 0x01,
    0x04, 0x20,
  ]);

  const out = new Uint8Array(stablePrefix.length + 32);
  out.set(stablePrefix, 0);
  out.set(rawKey, stablePrefix.length);
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

  try {
    const alg = { name: "ECDSA", namedCurve: "P-256" } as EcKeyImportParams;
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyDer.buffer as ArrayBuffer,
      alg,
      false, // not extractable
      ["sign"]
    );
    return cryptoKey;
  } catch (err) {
    throw new Error(`Failed to import VAPID private key as pkcs8: ${(err as Error).message}`);
  }
}

// Convert DER signature (ASN.1 SEQUENCE of r and s) -> raw 64-byte R||S
function derSigToRaw(der: Uint8Array): Uint8Array {
  let idx = 0;
  if (der[idx++] !== 0x30) throw new Error("Invalid DER signature (no SEQUENCE)");
  let seqLen = der[idx++];
  if (seqLen & 0x80) { // long-form len
    const numBytes = seqLen & 0x7f;
    seqLen = 0;
    for (let i = 0; i < numBytes; i++) seqLen = (seqLen << 8) + der[idx++];
  }
  if (der[idx++] !== 0x02) throw new Error("Invalid DER signature (no INTEGER r)");
  let rLen = der[idx++];
  if (der[idx] === 0x00 && rLen > 0) { idx++; rLen--; }
  const r = der.slice(idx, idx + rLen); idx += rLen;
  if (der[idx++] !== 0x02) throw new Error("Invalid DER signature (no INTEGER s)");
  let sLen = der[idx++];
  if (der[idx] === 0x00 && sLen > 0) { idx++; sLen--; }
  const s = der.slice(idx, idx + sLen);
  const rPadded = new Uint8Array(32); rPadded.set(r, 32 - r.length);
  const sPadded = new Uint8Array(32); sPadded.set(s, 32 - s.length);
  const raw = new Uint8Array(64);
  raw.set(rPadded, 0);
  raw.set(sPadded, 32);
  return raw;
}

// Sign data with ECDSA P-256 and return base64url signature (raw R||S)
async function signVapid(cryptoKey: CryptoKey, data: string | Uint8Array) {
  const payload = typeof data === "string" ? textEncoder.encode(data) : data;
  const derSig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cryptoKey, payload.buffer as ArrayBuffer));
  const raw = derSigToRaw(derSig);
  return uint8ArrayToBase64Url(raw);
}

// Build VAPID Authorization header (returns { authorization, publicKey })
export async function buildVapidAuth(envPrivateName = "WEB_PUSH_PRIVATE_KEY", envPublicName = "VITE_WEB_PUSH_PUBLIC_KEY") {
  const aud = "https://fcm.googleapis.com";
  const sub = Deno.env.get("VITE_ADMIN_EMAIL") ? `mailto:${Deno.env.get("VITE_ADMIN_EMAIL")}` : undefined;
  const cryptoKey = await importVapidPrivateKeyFromEnv(envPrivateName);
  const header = { alg: "ES256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 12 * 60 * 60; // 12 hours
  const body: any = { aud, iat, exp };
  if (sub) body.sub = sub;
  const b64Header = uint8ArrayToBase64Url(textEncoder.encode(JSON.stringify(header)));
  const b64Payload = uint8ArrayToBase64Url(textEncoder.encode(JSON.stringify(body)));
  const signingInput = `${b64Header}.${b64Payload}`;
  const signature = await signVapid(cryptoKey, signingInput);
  const authHeader = `WebPush ${signingInput}.${signature}`;
  const publicKey = Deno.env.get(envPublicName) ?? '';
  return { authorization: authHeader, publicKey };
}

// --- importSubscriptionPublicKey ---
async function importSubscriptionPublicKey(base64UrlKey: string): Promise<CryptoKey> {
  if (!base64UrlKey || typeof base64UrlKey !== 'string') throw new Error('Missing subscription public key (p256dh)');
  const b64 = base64UrlToBase64(base64UrlKey);
  const rawBytes = base64ToUint8Array(b64);
  const rawBuffer = rawBytes.buffer;
  return await crypto.subtle.importKey(
    'raw',
    rawBuffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}
// --- END importSubscriptionPublicKey ---

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
    enc.encode('auth\0'),
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
  if (!subscription?.keys?.p256dh || !subscription?.keys?.auth) throw new Error('Subscription missing keys (p256dh/auth)');
  const userPublic = await importSubscriptionPublicKey(subscription.keys.p256dh);
  const userPublicRawFull = new Uint8Array(await crypto.subtle.exportKey('raw', userPublic));
  const userPublicRaw = userPublicRawFull[0] === 0x04 ? userPublicRawFull.slice(1) : userPublicRawFull;
  debug('userPublicRaw length', userPublicRaw.length);
  const authSecret = base64ToUint8Array(base64UrlToBase64(subscription.keys.auth));
  const senderKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const senderPublicRawFull = new Uint8Array(await crypto.subtle.exportKey('raw', senderKeyPair.publicKey));
  const senderPublicNoPrefix = senderPublicRawFull[0] === 0x04 ? senderPublicRawFull.slice(1) : senderPublicRawFull;
  const sharedSecretBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: userPublic }, senderKeyPair.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedSecretBits);
  const hmacKey = await crypto.subtle.importKey('raw', authSecret.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prkRaw = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, sharedSecret.buffer as ArrayBuffer));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const infoCEK = createInfo('aes128gcm', senderPublicNoPrefix, userPublicRaw);
  const infoNonce = createInfo('nonce', senderPublicNoPrefix, userPublicRaw);
  const prkKey = await crypto.subtle.importKey('raw', prkRaw.buffer, 'HKDF', false, ['deriveBits']);
  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt.buffer, info: infoCEK.buffer }, prkKey, 128);
  const cek = new Uint8Array(cekBits);
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt.buffer, info: infoNonce.buffer }, prkKey, 96);
  const nonce = new Uint8Array(nonceBits);
  const payloadBytes = textEncoder.encode(payload);
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
  if (!endpoint || typeof endpoint !== 'string') throw new Error('Invalid push endpoint');
  const cryptoKeyHeaderParts: string[] = [];
  cryptoKeyHeaderParts.push(`dh=${uint8ArrayToBase64Url(senderPublicNoPrefix)}`);
  if (publicKeyHeaderValue) cryptoKeyHeaderParts.push(`p256ecdsa=${publicKeyHeaderValue}`);
  const cryptoKeyHeader = cryptoKeyHeaderParts.join('; ');
  const headers: Record<string, string> = {
    TTL: '2419200',
    'Content-Encoding': 'aes128gcm',
    Encryption: `salt=${uint8ArrayToBase64Url(salt)}`,
    'Crypto-Key': cryptoKeyHeader,
    Authorization: authorizationHeaderValue,
    'Content-Type': 'application/octet-stream',
  };
  debug('Sending push to', endpoint, 'headers (masked)', { Authorization: authorizationHeaderValue ? '[REDACTED]' : '', CryptoKey: cryptoKeyHeader });
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

async function sendPush(subscription: DbPushSubscription, payload: string, vapidConfig: { publicKey?: string; privateKeyPkcs8?: string; subject?: string; authorization?: string }) {
  if (!subscription || !subscription.endpoint || !subscription.subscription) throw new Error('Invalid subscription object');
  if (!subscription.subscription.keys?.p256dh || !subscription.subscription.keys?.auth) throw new Error('Subscription missing keys');
  const { salt, senderPublicNoPrefix, cipherBytes } = await encryptForWebPush(payload, subscription.subscription);
  const vapid = vapidConfig.authorization ? { authorization: vapidConfig.authorization, publicKey: vapidConfig.publicKey ?? '' } : await buildVapidAuth('WEB_PUSH_PRIVATE_KEY', 'VITE_WEB_PUSH_PUBLIC_KEY');
  await sendWebPushRequest(subscription.endpoint, salt, senderPublicNoPrefix, cipherBytes, vapid.authorization, vapid.publicKey ?? '');
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve: (handler: (request: Request) => Promise<Response>) => Promise<void>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DbPushSubscription {
  subscription: any;
  endpoint: string;
}

Deno.serve(async (req: Request) => {
  console.log("send-push-notification invoked — NO AUTH REQUIRED");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const alert = body?.alert;
    if (!alert?.title || !alert?.description) {
      return new Response(JSON.stringify({ error: "Missing title/description" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Sending push for:", alert.title);

    const { createClient } = await import("npm:@supabase/supabase-js@2.45.0");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("subscription, endpoint");

    if (!subs || subs.length === 0) {
      console.log("No subscriptions");
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapid = await buildVapidAuth();
    const payload = JSON.stringify({
      title: alert.title,
      body: alert.description,
      icon: "/Logo.png",
      badge: "/Logo.png",
      data: { url: `${Deno.env.get("VITE_APP_URL") || ""}/incidents/${alert.id}` },
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await sendPush(sub, payload, vapid);
        sent++;
      } catch (e: any) {
        console.error("Failed for one sub:", e.message);
        if (e.message.includes("410") || e.message.includes("404")) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    console.log(`Successfully sent to ${sent}/${subs.length} devices`);
    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("FATAL ERROR:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});