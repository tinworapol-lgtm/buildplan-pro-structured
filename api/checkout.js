const { sendJson, getBearerToken, readJsonBody, getSupabaseUser, envGuardPayload } = require('./_shared');

const subscriptionPackages = {
  Free: {
    label: 'Free',
    prices: { monthly: '', yearly: '' },
  },
  199: {
    label: 'BuildPlan Pro 199',
    prices: {
      monthly: () => process.env.STRIPE_PRICE_199_MONTHLY || '',
      yearly: () => process.env.STRIPE_PRICE_199_YEARLY || '',
    },
  },
  599: {
    label: 'BuildPlan Pro 599',
    prices: {
      monthly: () => process.env.STRIPE_PRICE_599_MONTHLY || '',
      yearly: () => process.env.STRIPE_PRICE_599_YEARLY || '',
    },
  },
};

function getPriceEnvName(packageCode, billingCycle) {
  return 'STRIPE_PRICE_' + packageCode + '_' + billingCycle.toUpperCase();
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { message: 'Method not allowed' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return sendJson(response, 501, envGuardPayload('Stripe Billing', ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_199_MONTHLY', 'STRIPE_PRICE_199_YEARLY', 'STRIPE_PRICE_599_MONTHLY', 'STRIPE_PRICE_599_YEARLY', 'STRIPE_WEBHOOK_SECRET'], 'Set Stripe secret, package prices, and webhook secret in Vercel, then redeploy production.'));
  }

  const session = await getSupabaseUser(getBearerToken(request));
  if (!session.ok) return sendJson(response, session.status, session.payload);

  const body = await readJsonBody(request);
  const packageCode = subscriptionPackages[body.packageCode] ? String(body.packageCode) : '199';
  const billingCycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  if (packageCode === 'Free') {
    return sendJson(response, 200, {
      mode: 'free-package',
      packageCode,
      billingCycle,
      checkoutUrl: '',
      message: 'Free package does not require Stripe checkout.',
    });
  }
  const price = subscriptionPackages[packageCode].prices[billingCycle]();
  if (!price) return sendJson(response, 400, envGuardPayload('Stripe Billing', [getPriceEnvName(packageCode, billingCycle)], 'Set the selected Stripe package price env var in Vercel, then redeploy production.'));

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
  form.set('metadata[plan]', packageCode);
  form.set('metadata[package_code]', packageCode);
  form.set('metadata[billing_cycle]', billingCycle);

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

  return sendJson(response, 200, { checkoutUrl: payload.url, packageCode, billingCycle });
};
