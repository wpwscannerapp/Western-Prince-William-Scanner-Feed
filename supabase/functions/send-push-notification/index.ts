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

// Helper function for Web Push encryption (simplified for Deno's Web Crypto)
async function encryptWebPushPayload(
  payload: string,
  userPublicKey: string,
  userAuthSecret: string
): Promise<{ cipherText: ArrayBuffer; salt: Uint8Array; rs: Uint8Array }> {
  const textEncoder = new TextEncoder();
  const payloadBytes = textEncoder.encode(payload);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const rs = crypto.getRandomValues(new Uint8Array(16)); // Record Size (16 bytes for 4096)

  const authSecret = urlBase64ToUint8Array(userAuthSecret);
  const publicKey = urlBase64ToUint8Array(userPublicKey);

  const keyPair = await crypto.subtle.generateKeyPair(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: await crypto.subtle.importKey('raw', publicKey, { name: 'ECDH', namedCurve: 'P-256' }, true, []) },
    keyPair.privateKey,
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
    rs: new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey)),
  };
}

// Helper function for VAPID signing (simplified for Deno's Web Crypto)
async function signVAPID(
  audience: string,
  subject: string,
  privateKey: string,
  publicKey: string,
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
    JSON.parse(atob(privateKey)), // Decode base64 private key
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    importedPrivateKey,
    dataToSign
  );

  const jwt = `${btoa(JSON.stringify(header)).replace(/=/g, '')}.${btoa(JSON.stringify(claims)).replace(/=/g, '')}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '')}`;

  return {
    Authorization: `WebPush ${jwt}`,
    'Crypto-Key': `p256dh=${publicKey}`,
  };
}

Deno.serve(async (req: Request) => {
  // Debug log to trigger redeployment
  console.log('Edge Function: send-push-notification invoked. Using self-contained implementation.');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Explicitly reject non-POST requests
  if (req.method !== 'POST') {
    console.error(`Edge Function Error: Method Not Allowed - Received ${req.method} request, expected POST.`);
    return new Response(JSON.stringify({ error: { message: 'Method Not Allowed: Only POST requests are supported.' } }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL')!,
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Use service role key directly
    );

    const { alert } = await req.json();
    if (!alert || !alert.title || !alert.description) {
      return new Response(JSON.stringify({ error: { message: 'Bad Request: Missing alert title or description.' } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Retrieve VAPID keys from environment variables
    const vapidPublicKey = Deno.env.get('WEB_PUSH_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('WEB_PUSH_PRIVATE_KEY')!; // Ensure this is the base64url encoded JWK private key

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('Edge Function Error: VAPID keys are not configured.');
      return new Response(JSON.stringify({ error: { message: 'Server Error: VAPID keys are not configured.' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all push subscriptions, including the top-level endpoint
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
      icon: '/Logo.png', // Path to your app icon
      badge: '/Logo.png', // Path to your app badge icon
      sound: 'default', // Added to play default notification sound
      data: {
        url: `${Deno.env.get('VITE_APP_URL')}/incidents/${alert.id}`, // Link to incident detail page
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

        // Generate VAPID JWT
        const vapidHeaders = await signVAPID(
          sub.endpoint,
          'mailto:wpwscannerfeed@gmail.com', // VAPID contact email
          vapidPrivateKey,
          vapidPublicKey,
          12 * 60 * 60 // 12 hours expiration
        );

        // Encrypt the payload
        const { cipherText, salt, rs } = await encryptWebPushPayload(
          notificationPayload,
          subscriptionKeys.p256dh,
          subscriptionKeys.auth,
        );

        const headers = new Headers({
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aesgcm',
          'Authorization': vapidHeaders.Authorization,
          'Crypto-Key': vapidHeaders['Crypto-Key'],
          'TTL': '2419200', // 4 weeks
        });

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: headers,
          body: new Uint8Array([...salt, ...rs, ...new Uint8Array(cipherText)]),
        });

        if (!response.ok) {
          console.error(`Failed to send notification to ${sub.endpoint}: ${response.status} ${response.statusText}`);
          // Handle specific errors, e.g., delete expired subscriptions
          if (response.status === 410 || response.status === 404) { // GONE or NOT_FOUND
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

    await Promise.allSettled(sendPromises); // Use allSettled to ensure all promises run

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