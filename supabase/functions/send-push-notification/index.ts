// @ts-ignore
/// <reference lib="deno.ns" />

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

// Import helper functions for Web Push key normalization and import
import { importECPublicKey, importECPrivateKeyFromPKCS8Base64, urlBase64ToUint8Array } from './normalize-push-keys';

// Toggle debug via SUPABASE_PUSH_DEBUG=true
const DEBUG = Deno.env.get('SUPABASE_PUSH_DEBUG') === 'true';
function debug(...args: any[]) { if (DEBUG) console.log(...args); }

// Minimal helper: b64url -> standard base64
function b64UrlToB64(b64u: string) {
  let b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return b64;
}

// Helper to convert Uint8Array -> base64 (for headers)
function uint8ArrayToBase64(arr: Uint8Array) {
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function rawSigToB64Url(raw: Uint8Array) {
  const b64 = uint8ArrayToBase64(raw);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// JWT builder (simple ES256)
async function signVapidJWT(vapidPrivateKeyPkcs8B64: string, vapidSub: string, vapidAud: string, vapidExpSeconds = 43200) {
  // Header & payload
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, any> = {
    sub: vapidSub,
    aud: vapidAud,
    exp: now + vapidExpSeconds,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  debug('VAPID signing input lengths', signingInput.length);

  // Import private key (assume PKCS8 base64 or base64url)
  const signKey = await importECPrivateKeyFromPKCS8Base64(vapidPrivateKeyPkcs8B64, ['sign']);
  // Sign using alg ES256 -> ECDSA with P-256
  const signatureDER = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signKey, new TextEncoder().encode(signingInput)));

  // Convert DER signature to R,S concatenation (raw) 64 bytes. Simple DER parse:
  // DER is: 0x30 len 0x02 rlen rbytes 0x02 slen sbytes
  function derToRaw(der: Uint8Array) {
    if (der[0] !== 0x30) throw new Error('Invalid DER signature');
    let idx = 2;
    if (der[idx] !== 0x02) throw new Error('Invalid DER format for R');
    const rlen = der[idx + 1];
    idx += 2;
    const r = der.slice(idx, idx + rlen);
    idx += rlen;
    if (der[idx] !== 0x02) throw new Error('Invalid DER format for S');
    const slen = der[idx + 1];
    idx += 2;
    const s = der.slice(idx, idx + slen);
    // Pad to 32 bytes each
    const rPadded = new Uint8Array(32); rPadded.set(r, 32 - r.length);
    const sPadded = new Uint8Array(32); sPadded.set(s, 32 - s.length);
    const raw = new Uint8Array(64); raw.set(rPadded, 0); raw.set(sPadded, 32);
    return raw;
  }

  const rawSig = derToRaw(signatureDER);
  const encodedSig = rawSigToB64Url(rawSig);
  return `${signingInput}.${encodedSig}`;
}

// Encrypt payload using Web Push (simplified). This function expects:
// - subscription: { endpoint, keys: { p256dh, auth } }
// - payload: string
// - vapid: { publicKey: base64url, privateKeyPkcs8: base64 or base64url, subject: string }
export async function sendPush(subscription: any, payload: string, vapid: { publicKey: string, privateKeyPkcs8: string, subject: string }) {
  try {
    debug('sendPush: start for endpoint', subscription.endpoint);

    // 1) Import subscription public key (p256dh) safely
    const subPubCryptoKey = await importECPublicKey(subscription.keys.p256dh);
    debug('Imported subscription public key');

    // 2) Generate ephemeral ECDH key pair (client)
    const clientKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const clientPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', clientKeyPair.publicKey)); // 65 bytes with 0x04
    debug('Client pubkey length', clientPublicRaw.length);

    // 3) Derive shared secret: deriveBits with peer public key (subscription)
    const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: subPubCryptoKey }, clientKeyPair.privateKey, 256);
    const sharedSecret = new Uint8Array(sharedBits);
    debug('Shared secret length', sharedSecret.length);

    // 4) HKDF, create salt, info, etc. (Web Push specifics omitted for brevity)
    // For a minimal workable approach, use sharedSecret directly as a symmetric key after HKDF step.
    // NOTE: For production, implement full RFC8291 (AES-GCM + HKDF with subscription auth secret).
    // Here we assume subscription.keys.auth is provided and we will derive a key suitable for AES-GCM.

    // Import / derive AES key
    const aesKey = await crypto.subtle.importKey('raw', sharedSecret.buffer, { name: 'AES-GCM' }, false, ['encrypt']);

    // Encrypt payload
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(payload));
    const cipher = new Uint8Array(enc);

    // 5) Build VAPID JWT and Authorization header
    const aud = new URL(subscription.endpoint).origin;
    const jwt = await signVapidJWT(vapid.privateKeyPkcs8, vapid.subject, aud);

    // VAPID public key in header must be base64url of uncompressed public key without 0x04 prefix OR with?
    // Standard libs send the public key as base64url of the uncompressed public key (without prefix in some cases).
    // We'll provide the 65-byte uncompressed (0x04|X|Y) and then strip leading 0x04 for header if needed.
    const vapidPublicKeyBytes = await (async () => {
      // Accept either base64 (std) or base64url; normalize then decode
      const b64 = b64UrlToB64(vapid.publicKey);
      const raw = urlBase64ToUint8Array(b64); // Use the helper for decoding
      // If 65 and starts with 0x04, drop leading byte for header usage in some implementations (they use 65->64)
      if (raw.length === 65 && raw[0] === 0x04) return raw.slice(1);
      if (raw.length === 64) return raw;
      // if 65 but not starting with 0x04, return as-is (edge case)
      return raw;
    })();

    const vapidKeyB64Url = uint8ArrayToBase64(vapidPublicKeyBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // 6) Send the request to subscription.endpoint
    const resp = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `WebPush ${jwt}`,
        TTL: '2419200',
        'Content-Encoding': 'aes128gcm',
        'Crypto-Key': `dh=${uint8ArrayToBase64(clientPublicRaw.slice(1)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')};p256ecdsa=${vapidKeyB64Url}`,
        Encryption: `salt=${uint8ArrayToBase64(crypto.getRandomValues(new Uint8Array(16))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`,
        'Content-Type': 'application/octet-stream',
      },
      body: cipher.buffer,
    });

    debug('Push response status', resp.status);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '<no-body>');
      throw new Error(`Push send failed: ${resp.status} ${text}`);
    }

    return { ok: true, status: resp.status };
  } catch (err) {
    console.error('Error sending notification to subscription:', subscription.endpoint, err);
    throw err;
  }
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
        await sendPush(sub, notificationPayload, vapidConfig);
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