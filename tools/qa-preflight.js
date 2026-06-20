const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const indexPath = path.join(projectDir, 'index.html');
const manifestPath = path.join(projectDir, 'release-manifest.json');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'qa-preflight-phase-11.json');

function fail(message, detail) {
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function unique(values) {
  return [...new Set(values)];
}

function getAttrValues(html, attrName) {
  const values = [];
  const pattern = new RegExp(attrName + '="([^"]*)"', 'g');
  let match;
  while ((match = pattern.exec(html))) values.push(match[1]);
  return values;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const html = readText(indexPath);
const manifest = JSON.parse(readText(manifestPath));
const jsFiles = manifest.modules.js || [];
const cssFiles = manifest.modules.css || [];
const contractFiles = manifest.modules.contracts || [];

const loadedScripts = getAttrValues(html, 'src')
  .filter((src) => src.startsWith('assets/js/'))
  .map((src) => src.split('?')[0]);
for (const scriptPath of jsFiles) {
  if (!loadedScripts.includes(scriptPath)) fail('index.html does not load manifest JS file', scriptPath);
  if (!fs.existsSync(path.join(projectDir, scriptPath))) fail('Missing manifest JS file', scriptPath);
}

let previousIndex = -1;
for (const scriptPath of jsFiles) {
  const index = loadedScripts.indexOf(scriptPath);
  if (index <= previousIndex) fail('Manifest JS load order is not preserved', scriptPath);
  previousIndex = index;
}

for (const cssPath of cssFiles) {
  if (!fs.existsSync(path.join(projectDir, cssPath))) fail('Missing manifest CSS file', cssPath);
}

for (const contractPath of contractFiles) {
  JSON.parse(readText(path.join(projectDir, contractPath)));
}

const allJs = jsFiles.map((file) => readText(path.join(projectDir, file))).join('\n');
const cleanJs = stripComments(allJs);

const htmlIds = getAttrValues(html, 'id');
const duplicateIds = unique(htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index));
if (duplicateIds.length) fail('Duplicate HTML ids found', duplicateIds);

const referencedIds = unique([...cleanJs.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map((match) => match[1]));
const dynamicJsIds = unique([
  ...[...cleanJs.matchAll(/id=["']([^"']+)["']/g)].map((match) => match[1]),
  ...[...cleanJs.matchAll(/\.id\s*=\s*["']([^"']+)["']/g)].map((match) => match[1]),
]);
const availableIds = new Set([...htmlIds, ...dynamicJsIds]);
const intentionallyRemovedIds = new Set([
  's-curve-fill-toggle',
  's-curve-mode-toggle',
  's-curve-chart',
  's-curve-date-range',
]);

const missingIds = referencedIds.filter((id) => !availableIds.has(id) && !intentionallyRemovedIds.has(id));
if (missingIds.length) fail('JS references missing HTML ids', missingIds);

const inlineHandlers = [
  ...getAttrValues(html, 'onclick'),
  ...getAttrValues(html, 'onchange'),
  ...getAttrValues(html, 'oninput'),
];
const ignoredCalls = new Set([
  'alert',
  'confirm',
  'parseFloat',
  'parseInt',
  'Number',
  'String',
  'Boolean',
  'Date',
]);
const inlineCalls = unique(inlineHandlers.flatMap((handler) => {
  return [...handler.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[2]);
}).filter((name) => !ignoredCalls.has(name)));

const missingInlineGlobals = inlineCalls.filter((name) => {
  return !new RegExp('function\\s+' + name + '\\s*\\(').test(cleanJs)
    && !new RegExp('(?:const|let|var)\\s+' + name + '\\s*=').test(cleanJs)
    && !new RegExp('global\\.' + name + '\\s*=').test(cleanJs)
    && !new RegExp('window\\.' + name + '\\s*=').test(cleanJs);
});
if (missingInlineGlobals.length) fail('Inline handlers reference missing global functions', missingInlineGlobals);

const requiredRuntimeMarkers = [
  'BuildPlanConfig',
  'BuildPlanLicense',
  'BuildPlanSchema',
  'BuildPlanAuth',
  'BuildPlanCloud',
  'BuildPlanSaaS',
  'BuildPlanAccountCloud',
  'BuildPlanAppShell',
  "BuildPlan.register('storage'",
  "BuildPlan.register('schema'",
  "BuildPlan.register('license'",
  "BuildPlan.register('auth'",
  "BuildPlan.register('cloud'",
  "BuildPlan.register('saas'",
  "BuildPlan.register('accountCloud'",
  "BuildPlan.register('appShell'",
  'BuildPlanSchema?.prepareForSave',
  'BuildPlanSchema?.migrateProjectData',
];
for (const marker of requiredRuntimeMarkers) {
  if (!allJs.includes(marker)) fail('Missing runtime marker', marker);
}

const report = {
  ok: true,
  checkedAt: new Date().toISOString(),
  files: {
    js: jsFiles.length,
    css: cssFiles.length,
    contracts: contractFiles.length,
  },
  html: {
    ids: htmlIds.length,
    dynamicIds: dynamicJsIds.length,
    referencedIds: referencedIds.length,
    inlineHandlers: inlineHandlers.length,
    inlineCalls: inlineCalls.length,
  },
  runtimeMarkers: requiredRuntimeMarkers.length,
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('qa preflight ok');
console.log('js files:', report.files.js);
console.log('css files:', report.files.css);
console.log('contracts:', report.files.contracts);
console.log('html ids:', report.html.ids);
console.log('dynamic ids:', report.html.dynamicIds);
console.log('inline handlers:', report.html.inlineHandlers);
console.log('report:', path.relative(projectDir, reportPath));
