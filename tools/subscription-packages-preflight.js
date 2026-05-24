const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

function read(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) {
    throw new Error('Missing file: ' + relativePath);
  }
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function fail(label, detail) {
  console.error('Subscription packages preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const envExample = read('.env.example');
const checkout = read('api/checkout.js');
const readiness = read('api/system/readiness.js');
const webhook = read('api/webhooks/stripe.js');
const schema = read('supabase/schema.sql');
const contract = JSON.parse(read('contracts/subscription-api.contract.json'));
const config = read('assets/js/config/app-config.js');
const quality = read('tools/quality-gate.js');

const requiredEnv = [
  'STRIPE_PRICE_199_MONTHLY',
  'STRIPE_PRICE_199_YEARLY',
  'STRIPE_PRICE_599_MONTHLY',
  'STRIPE_PRICE_599_YEARLY',
];

for (const name of requiredEnv) {
  if (!envExample.includes(name)) fail('.env.example missing package price env', name);
  if (!readiness.includes(name)) fail('readiness missing package price env', name);
  if (!checkout.includes(name)) fail('checkout missing package price env', name);
}

for (const marker of [
  'packageCode',
  'billingCycle',
  'subscriptionPackages',
  "Free",
  "199",
  "599",
]) {
  if (!checkout.includes(marker)) fail('checkout missing marker', marker);
}

if (!checkout.includes("mode', 'subscription'")) fail('checkout must create Stripe subscription mode');
if (!checkout.includes('free-package')) fail('checkout must handle Free package without Stripe');
if (!webhook.includes('metadata?.package_code')) fail('webhook must persist package_code metadata');
if (!webhook.includes('billing_cycle')) fail('webhook must persist billing_cycle');
if (!schema.includes('billing_cycle')) fail('Supabase schema missing billing_cycle');
if (!schema.includes('package_code')) fail('Supabase schema missing package_code compatibility marker');

if (!Array.isArray(contract.packages) || !contract.packages.includes('Free') || !contract.packages.includes('199') || !contract.packages.includes('599')) {
  fail('subscription contract missing package list', JSON.stringify(contract.packages));
}
if (!Array.isArray(contract.billingCycles) || !contract.billingCycles.includes('monthly') || !contract.billingCycles.includes('yearly')) {
  fail('subscription contract missing billing cycle list', JSON.stringify(contract.billingCycles));
}

for (const marker of [
  "packages: ['Free', '199', '599']",
  "billingCycles: ['monthly', 'yearly']",
]) {
  if (!config.includes(marker)) fail('app config missing package subscription marker', marker);
}

if (!quality.includes('subscription-packages-preflight.js')) fail('quality gate missing subscription package preflight');

console.log('PASS subscription-packages-preflight');
