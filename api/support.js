const {
  sendJson,
  getBearerToken,
  readJsonBody,
  envGuardPayload,
  getSupabaseUser,
  hasSupabaseEnv,
  supabaseRest,
  SUPPORT_TIERS,
  normalizeSupportAmount,
  getSupportTierForAmount,
} = require('./_shared');

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 254);
}

function emptyStatus(configured) {
  return {
    configured,
    totalAmount: 0,
    tier: null,
    supporterLevel: null,
    payments: [],
    tiers: SUPPORT_TIERS,
  };
}

async function getOptionalUser(request) {
  const token = getBearerToken(request);
  if (!token) return null;
  const session = await getSupabaseUser(token);
  if (!session.ok) {
    const error = new Error(session.payload?.message || 'Invalid session');
    error.status = session.status;
    error.payload = session.payload;
    throw error;
  }
  return session.user;
}

async function handleStatus(request, response) {
  if (!hasSupabaseEnv()) return sendJson(response, 200, emptyStatus(false));

  const token = getBearerToken(request);
  if (!token) return sendJson(response, 200, emptyStatus(true));

  const session = await getSupabaseUser(token);
  if (!session.ok) return sendJson(response, session.status, session.payload);

  const rows = await supabaseRest(
    'support_payments?user_id=eq.' + encodeURIComponent(session.user.id) + '&status=eq.paid&select=id,amount,currency,tier,status,paid_at,created_at&order=paid_at.desc'
  );
  const payments = Array.isArray(rows) ? rows : [];
  const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const tier = totalAmount > 0 ? getSupportTierForAmount(totalAmount).tier : null;

  return sendJson(response, 200, {
    configured: true,
    totalAmount,
    tier,
    supporterLevel: tier,
    payments,
    tiers: SUPPORT_TIERS,
  });
}

async function handleCheckout(request, response) {
  if (!process.env.STRIPE_SECRET_KEY || !hasSupabaseEnv()) {
    return sendJson(response, 501, envGuardPayload(
      'Coffee Support Payments',
      ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
      'Set Stripe and Supabase env vars in Vercel, run supabase/schema.sql, then redeploy production.'
    ));
  }

  let user = null;
  try {
    user = await getOptionalUser(request);
  } catch (error) {
    return sendJson(response, error.status || 401, error.payload || { message: error.message });
  }

  const body = await readJsonBody(request);
  const amount = normalizeSupportAmount(body.amount);
  if (!amount) return sendJson(response, 400, { message: 'Unsupported support amount' });

  const tier = getSupportTierForAmount(amount);
  const email = cleanEmail(body.email || user?.email || '');
  const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:4177').replace(/\/$/, '');
  const createdAt = new Date().toISOString();
  const rows = await supabaseRest('support_payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      user_id: user?.id || null,
      email,
      amount,
      currency: 'THB',
      tier: tier.tier,
      provider: 'stripe',
      status: 'pending',
      metadata: {
        source: 'coffee-support-modal',
        userAgent: request.headers['user-agent'] || '',
      },
      created_at: createdAt,
      updated_at: createdAt,
    }),
  });
  const supportPayment = Array.isArray(rows) ? rows[0] : rows;

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('line_items[0][price_data][currency]', 'thb');
  form.set('line_items[0][price_data][unit_amount]', String(amount * 100));
  form.set('line_items[0][price_data][product_data][name]', `BuildPlan Pro ${tier.tier} Supporter`);
  form.set('line_items[0][quantity]', '1');
  form.set('success_url', baseUrl + '/?support=success&tier=' + encodeURIComponent(tier.tier));
  form.set('cancel_url', baseUrl + '/?support=cancelled');
  form.set('client_reference_id', supportPayment.id);
  if (email) form.set('customer_email', email);
  form.set('metadata[type]', 'coffee_support');
  form.set('metadata[support_payment_id]', supportPayment.id);
  form.set('metadata[user_id]', user?.id || '');
  form.set('metadata[email]', email);
  form.set('metadata[tier]', tier.tier);
  form.set('metadata[amount]', String(amount));

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
    await supabaseRest('support_payments?id=eq.' + encodeURIComponent(supportPayment.id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status: 'failed',
        metadata: {
          source: 'coffee-support-modal',
          stripeError: payload.error?.message || 'Stripe checkout failed',
        },
        updated_at: new Date().toISOString(),
      }),
    });
    return sendJson(response, stripeResponse.status, { message: payload.error?.message || 'Stripe checkout failed' });
  }

  await supabaseRest('support_payments?id=eq.' + encodeURIComponent(supportPayment.id), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      provider_payment_id: payload.id,
      checkout_url: payload.url || '',
      updated_at: new Date().toISOString(),
    }),
  });

  return sendJson(response, 200, {
    configured: true,
    provider: 'stripe',
    checkoutUrl: payload.url,
    supportPaymentId: supportPayment.id,
    amount,
    tier: tier.tier,
  });
}

module.exports = async function handler(request, response) {
  if (request.method === 'GET') return handleStatus(request, response);
  if (request.method === 'POST') return handleCheckout(request, response);
  return sendJson(response, 405, { message: 'Method not allowed' });
};
