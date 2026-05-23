const crypto = require('crypto');
const { sendJson, readJsonBody, supabaseRest } = require('../_shared');

function verifyStripeSignature(payload, signatureHeader, secret) {
  if (!secret || !signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(',').map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index), part.slice(index + 1)];
  }));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(timestamp + '.' + payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { message: 'Method not allowed' });
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(response, 501, { configured: false, message: 'Stripe webhook is not configured' });
  }

  let rawBody = '';
  request.on('data', (chunk) => { rawBody += chunk; });
  request.on('end', async () => {
    if (!verifyStripeSignature(rawBody, request.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) {
      return sendJson(response, 400, { message: 'Invalid Stripe signature' });
    }
    const event = JSON.parse(rawBody);
    const subscription = event.data?.object;
    const userId = subscription?.metadata?.user_id || subscription?.client_reference_id;
    if (event.type?.startsWith('customer.subscription') && userId) {
      await supabaseRest('subscriptions?on_conflict=stripe_subscription_id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          user_id: userId,
          stripe_customer_id: subscription.customer || null,
          stripe_subscription_id: subscription.id,
          status: subscription.status || 'inactive',
          plan: subscription.metadata?.plan || null,
          current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }),
      });
    }
    return sendJson(response, 200, { received: true });
  });
};
