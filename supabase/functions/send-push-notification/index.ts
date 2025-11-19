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

// Helper function to convert URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
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

// Helper function for Web Push encryption (using Deno's Web Crypto)
async function encryptWebPushPayload(
  payload: string,
  userPublicKey: string,
  userAuthSecret: string
): Promise<{ cipherText: ArrayBuffer; salt: Uint8Array; rs: Uint8Array; localPublicKey: Uint8Array }> {
  const textEncoder = new TextEncoder();
  const payloadBytes = textEncoder.encode(payload);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]); // Record Size (4096 bytes)

  const authSecret = urlBase64ToUint8Array(userAuthSecret);
  const publicKey = urlBase64ToUint8Array(userPublicKey);

  const localKeyPair = await crypto.subtle.generateKeyPair(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: await crypto.subtle.importKey('raw', publicKey, { name: 'ECDH', namedCurve: 'P-256' }, true, []) },
    localKeyPair.privateKey,
    256
  );

  const keyInfo = new Uint8Array(textEncoder.encode('WebPush: info\0'));
  const keyInfoWithAuth = new Uint8Array(keyInfo.length + authSecret.length);
  keyInfoWithAuth.set(keyInfo);
  keyInfoWithAuth.set(authSecret, keyInfo.length);

  const prk = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: salt, info: keyInfoWithAuth },
    prk,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );

  const nonceInfo = new Uint8Array(textEncoder.encode('WebPush: nonce\0'));
  const nonceInfoWithAuth = new Uint8Array(nonceInfo.length + authSecret.length);
  nonceInfoWithAuth.set(nonceInfo);
  nonceInfoWithAuth.set(authSecret, nonceInfo.length);

  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt, info: nonceInfoWithAuth },
    prk,
    96
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonce) },
    key,
    payloadBytes
  );

  return {
    cipherText: encrypted,
    salt: salt,
    rs: rs,
    localPublicKey: new Uint8Array(await crypto.subtle.exportKey('raw', localKeyPair.publicKey)),
  };
}

// Helper function for VAPID signing (using Deno's Web Crypto)
async function signVAPID(
  audience: string,
  subject: string,
  privateKeyJwk: string, // Expecting JWK string for private key
  publicKeyBase64Url: string, // Expecting base64url for public key
  expiration: number
): Promise<{ Authorization: string; 'Crypto-Key': string }> {
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audience,
    exp: now + expiration,
    sub: subject,
  };

  const textEncoder = new TextEncoder();
  const encodedHeader = urlBase64ToUint8Array(btoa(JSON.stringify(header)).replace(/=/g, ''));
  const encodedClaims = urlBase64ToUint8Array(btoa(JSON.stringify(claims)).replace(/=/g, ''));

  const dataToSign = new Uint8Array(encodedHeader.length + 1 + encodedClaims.length);
  dataToSign.set(encodedHeader);
  dataToSign.set(textEncoder.encode('.'), encodedHeader.length);
  dataToSign.set(encodedClaims, encodedHeader.length + 1);

  const importedPrivateKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(atob(privateKeyJwk)), // Decode base64 JWK string
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    importedPrivateKey,
    dataToSign
  );

  const signatureBase64Url = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '');
  const jwt = `${btoa(JSON.stringify(header)).replace(/=/g, '')}.${btoa(JSON.stringify(claims)).replace(/=/g, '')}.${signatureBase64Url}`;

  return {
    Authorization: `WebPush ${jwt}`,
    'Crypto-Key': `p256dh=${publicKeyBase64Url}`,
  };
}

Deno.serve(async (req: Request) => {
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
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.45.0');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { alert } = await req.json();
    if (!alert || !alert.title || !alert.title.trim() || !alert.description || !alert.description.trim()) {
      return new Response(JSON.stringify({ error: { message: 'Bad Request: Missing or empty alert title or description.' } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vapidPublicKey = Deno.env.get('WEB_PUSH_PUBLIC_KEY')!;
    const vapidPrivateKeyJwk = Deno.env.get('WEB_PUSH_PRIVATE_KEY')!; // Expecting JWK string for private key

    if (!vapidPublicKey || !vapidPrivateKeyJwk) {
      console.error('Edge Function Error: VAPID keys are not configured. Ensure WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY are set as secrets.');
      return new Response(JSON.stringify({ error: { message: 'Server Error: VAPID keys are not configured.' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription, endpoint');

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return new Response(JSON.stringify({ error: { message: 'Failed to fetch subscriptions.' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const sendPromises = subscriptions.map(async (sub: DbPushSubscription) => {
      try {
        const subscriptionKeys = (sub.subscription as any).keys;
        if (!subscriptionKeys || !subscriptionKeys.p256dh || !subscriptionKeys.auth) {
          console.warn('Skipping subscription due to missing keys:', sub.endpoint);
          return;
        }

        const vapidHeaders = await signVAPID(
          sub.endpoint,
          'mailto:wpwscannerfeed@gmail.com',
          vapidPrivateKeyJwk,
          vapidPublicKey,
          12 * 60 * 60
        );

        const { cipherText, salt, rs, localPublicKey } = await encryptWebPushPayload(
          notificationPayload,
          subscriptionKeys.p256dh,
          subscriptionKeys.auth,
        );

        const headers = new Headers({
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aesgcm',
          'Authorization': vapidHeaders.Authorization,
          'Crypto-Key': `p256dh=${vapidPublicKey};dh=${btoa(String.fromCharCode(...localPublicKey)).replace(/=/g, '')}`,
          'TTL': '2419200',
        });

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: headers,
          body: new Uint8Array([...salt, ...rs, ...new Uint8Array(cipherText)]),
        });

        if (!response.ok) {
          console.error(`Failed to send notification to ${sub.endpoint}: ${response.status} ${response.statusText}`);
          if (response.status === 410 || response.status === 404) {
            console.log('Subscription expired or not found, deleting from DB:', sub.endpoint);
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
        } else {
          console.log('Notification sent to:', sub.endpoint);
        }
      } catch (sendError: any) {
        console.error('Error sending notification to subscription:', sub.endpoint, sendError);
      }
    });

    await Promise.allSettled(sendPromises);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Unexpected error in send-push-notification Edge Function:', error);
    return new Response(JSON.stringify({ error: { message: error.message } }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});