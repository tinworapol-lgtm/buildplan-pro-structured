const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'phase-regression-preflight-phase-57.json');

function read(rel) {
  return fs.readFileSync(path.join(projectDir, rel), 'utf8');
}

const checks = [];
function check(id, ok, detail = '') {
  checks.push({ id, ok: !!ok, detail });
}

const html = read('index.html');
const css = read('assets/css/buildplan.css');
const durationJs = read('assets/js/modules/04-duration-installments.js');
const dashboardJs = read('assets/js/modules/06-actual-dashboard.js');
const storageJs = read('assets/js/modules/02-storage.js');
const appShellJs = read('assets/js/services/app-shell.js');
const apiJs = read('assets/js/modules/09-public-api.js');

const newPlanIndex = html.indexOf('id="btn-navbar-new-plan"');
const dashboardIndex = html.indexOf('id="btn-page-dashboard"');
const ganttIndex = html.indexOf('id="btn-page-gantt"');
check('dashboard-button-after-new-plan', newPlanIndex >= 0 && dashboardIndex > newPlanIndex && dashboardIndex < ganttIndex, 'navbar order');
check('dashboard-button-orange', html.includes('dashboard-nav-orange') && css.includes('.dashboard-nav-orange'), 'orange dashboard shortcut');
check('dashboard-date-picker', html.includes('id="dashboard-date-input"') && dashboardJs.includes('getDashboardSelectedDateKey'), 'dashboard selected date');
check('dashboard-day-status', dashboardJs.includes('dayDelta') && dashboardJs.includes('เร็วกว่าแผน') && dashboardJs.includes('ช้ากว่าแผน'), 'day-based schedule status');
check('dashboard-value-delta', dashboardJs.includes('มูลค่าส่วนต่าง') && dashboardJs.includes('valueDelta'), 'earned minus paid value');
check('paid-value-by-report-date', durationJs.includes('getCumulativePaidValueAtDate') && apiJs.includes('getCumulativePaidValueAtDate'), 'paid value as-of selected date');
check('actual-complete-selected-date-editable', dashboardJs.includes('isCompleteBeforeSelectedDate') && dashboardJs.includes('completeRecord.dateKey < dateKey'), 'selected complete date remains editable');
check('project-start-welcome-alert', appShellJs.includes('ยินดีต้อนรับเข้าสู่ BuildPlan Pro') && appShellJs.includes('timer: 1500'), 'workspace welcome SweetAlert');
check('file-open-sweetalert', storageJs.includes('เปิดไฟล์โครงการแล้ว') && storageJs.includes('timer: 1000'), 'file load SweetAlert');
check('installment-payment-table', durationJs.includes('เบิกจ่ายสะสม') && durationJs.includes('มูลค่างวดงานสะสม'), 'installment payment columns');

const failed = checks.filter(item => !item.ok);
const report = {
  ok: failed.length === 0,
  checkedAt: new Date().toISOString(),
  checks,
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

for (const item of checks) {
  console.log(item.ok ? 'PASS' : 'FAIL', item.id);
}
console.log('report:', path.relative(projectDir, reportPath));

if (failed.length) process.exitCode = 1;
