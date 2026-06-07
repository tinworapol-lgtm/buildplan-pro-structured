const {
  sendJson,
  getBearerToken,
  getSupabaseUser,
  hasSupabaseEnv,
  supabaseRest,
  SUPPORT_TIERS,
  getSupportTierForAmount,
} = require('../_shared');

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

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { message: 'Method not allowed' });

  if (!hasSupabaseEnv()) {
    return sendJson(response, 200, emptyStatus(false));
  }

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
};
