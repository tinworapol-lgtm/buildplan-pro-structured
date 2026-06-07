const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'support-payments-preflight-phase-40.json');

function readText(relativePath) {
  return fs.readFileSync(path.join(projectDir, relativePath), 'utf8').replace(/^\uFEFF/, '');
}

const schema = readText('supabase/schema.sql');
const shared = readText('api/_shared.js');
const supportApi = readText('api/support.js');
const webhook = readText('api/webhooks/stripe.js');
const config = readText('assets/js/config/app-config.js');
const mockApp = readText('assets/js/services/ct-saas-mock-app.js');
const html = readText('index.html');
const readiness = readText('api/system/readiness.js');

const checks = [];
function check(id, ok, detail = '') {
  checks.push({ id, ok: !!ok, detail });
  if (!ok) throw new Error(id + (detail ? ': ' + detail : ''));
}

check('support-table-schema', schema.includes('create table if not exists public.support_payments'));
check('support-table-rls', schema.includes('alter table public.support_payments enable row level security'));
check('support-select-own-policy', schema.includes('support_payments_select_own'));
check('profile-supporter-fields', schema.includes('supporter_level') && schema.includes('supporter_total'));
check('support-tier-helper', shared.includes('SUPPORT_TIERS') && shared.includes('normalizeSupportAmount'));
check('support-checkout-api', supportApi.includes('mode') && supportApi.includes('payment') && supportApi.includes('coffee_support'));
check('support-checkout-env-guard', supportApi.includes('Coffee Support Payments') && supportApi.includes('STRIPE_SECRET_KEY'));
check('support-status-api', supportApi.includes('support_payments') && supportApi.includes('supporterLevel'));
check('stripe-webhook-support', webhook.includes("event.type === 'checkout.session.completed'") && webhook.includes('coffee_support'));
check('support-config-endpoints', config.includes("checkout: '/api/support'") && config.includes("status: '/api/support'"));
check('support-frontend-fetch', mockApp.includes('/api/support') && mockApp.includes('payload.checkoutUrl'));
check('support-cache-bust', html.includes('ct-saas-mock-app.js?v=phase41'));
check('support-status-ui', html.includes('data-ct-support-status') && mockApp.includes('refreshSupportStatus') && mockApp.includes('handleSupportReturn'));
check('support-readiness-group', readiness.includes('supportPayments') && readiness.includes('Coffee Support Payments') === false);

const report = {
  ok: checks.every((item) => item.ok),
  checkedAt: new Date().toISOString(),
  checks,
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
for (const item of checks) console.log(item.ok ? 'PASS' : 'FAIL', item.id);
console.log('report:', path.relative(projectDir, reportPath));
