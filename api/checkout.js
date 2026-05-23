const { sendJson, getBearerToken, readJsonBody, getSupabaseUser, envGuardPayload } = require('./_shared');

const prices = {
  monthly: () => process.env.STRIPE_PRICE_MONTHLY || '',
  yearly: () => process.env.STRIPE_PRICE_YEARLY || '',
};

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { message: 'Method not allowed' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return sendJson(response, 501, envGuardPayload('Stripe Billing', ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_YEARLY', 'STRIPE_WEBHOOK_SECRET'], 'Set Stripe secret, monthly/yearly prices, and webhook secret in Vercel, then redeploy production.'));
  }

  const session = await getSupabaseUser(getBearerToken(request));
  if (!session.ok) return sendJson(response, session.status, session.payload);

  const body = await readJsonBody(request);
  const plan = body.plan === 'yearly' ? 'yearly' : 'monthly';
  const price = prices[plan]();
  if (!price) return sendJson(response, 400, envGuardPayload('Stripe Billing', [plan === 'yearly' ? 'STRIPE_PRICE_YEARLY' : 'STRIPE_PRICE_MONTHLY'], 'Set the selected Stripe price env var in Vercel, then redeploy production.'));

  const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:4177').replace(/\/$/, '');
  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('line_items[0][price]', price);
  form.set('line_items[0][quantity]', '1');
  form.set('success_url', baseUrl + '/?checkout=success');
  form.set('cancel_url', baseUrl + '/?checkout=cancelled');
  form.set('client_reference_id', session.user.id);
  form.set('customer_email', session.user.email || '');
  form.set('metadata[user_id]', session.user.id);
  form.set('metadata[plan]', plan);

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  const payload = await stripeResponse.json().catch(() => ({}));
  if (!stripeResponse.ok) {
    return sendJson(response, stripeResponse.status, { message: payload.error?.message || 'Stripe checkout failed' });
  }

  return sendJson(response, 200, { checkoutUrl: payload.url, plan });
};
