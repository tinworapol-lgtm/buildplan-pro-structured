// BuildPlan Pro - installments and work-duration planning
// Split from assets/js/app.js without behavior changes.

        function normalizeInstallmentSettings(raw = {}) {
            const count = Math.min(60, Math.max(0, parseInt(raw?.count, 10) || 0));
            const durationDays = Math.min(3650, Math.max(1, parseInt(raw?.durationDays, 10) || 30));
            const rawDurations = Array.isArray(raw?.durations) ? raw.durations : [];
            const durations = Array.from({ length: count }, (_, index) => Math.min(3650, Math.max(1, parseInt(rawDurations[index], 10) || durationDays)));
            const defaultPercent = count ? parseFloat((100 / count).toFixed(2)) : 0;
            const rawPercents = Array.isArray(raw?.percents) ? raw.percents : [];
            const percents = Array.from({ length: count }, (_, index) => {
                const fallback = index === count - 1 ? parseFloat((100 - (defaultPercent * (count - 1))).toFixed(2)) : defaultPercent;
                return clampNumber(rawPercents[index] ?? fallback, 0, 100);
            });
            const payments = {};
            Object.entries(raw?.payments || {}).forEach(([key, value]) => {
                const no = parseInt(key, 10);
                if (no >= 1 && no <= count && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
                    payments[String(no)] = String(value);
                }
            });
            return { count, durationDays, durations, percents, payments };
        }

        function getInstallmentProjectTotal() {
            const summaryTotal = parseFloat(computeCostSummaryData?.().projectTotal) || 0;
            const headerValue = parseFloat(String(document.getElementById('project-value')?.value || '').replace(/,/g, '')) || 0;
            return summaryTotal || headerValue || 0;
        }

        function getBalancedInstallmentPercents(count) {
            if (!count) return [];
            const base = parseFloat((100 / count).toFixed(2));
            return Array.from({ length: count }, (_, index) => index === count - 1 ? parseFloat((100 - (base * (count - 1))).toFixed(2)) : base);
        }

        function getTaskDateObject(task) {
            if (!task) return null;
            if (task.startDateObj instanceof Date && !isNaN(task.startDateObj.getTime())) {
                const d = new Date(task.startDateObj);
                d.setHours(0, 0, 0, 0);
                return d;
            }
            if (task.start) {
                const d = new Date(String(task.start).length === 10 ? task.start + 'T00:00:00' : task.start);
                if (!isNaN(d.getTime())) {
                    d.setHours(0, 0, 0, 0);
                    return d;
                }
            }
            return null;
        }

        function getActualProjectStartDate() {
            const dates = (tasks || []).map(getTaskDateObject).filter(Boolean);
            if (!dates.length) {
                const fallback = new Date();
                fallback.setHours(0, 0, 0, 0);
                return fallback;
            }
            const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            minDate.setHours(0, 0, 0, 0);
            return minDate;
        }

        function getInstallmentSchedule() {
            const settings = normalizeInstallmentSettings(installmentSettings);
            if (!settings.count || !settings.durationDays) return [];
            const start = getActualProjectStartDate();
            const projectTotal = getInstallmentProjectTotal();
            let offsetDays = 0;
            let cumulativePercent = 0;
            let cumulativeValue = 0;
            let cumulativePaidValue = 0;
            return Array.from({ length: settings.count }, (_, idx) => {
                const no = idx + 1;
                const durationDays = settings.durations?.[idx] || settings.durationDays;
                const percent = clampNumber(settings.percents?.[idx] ?? 0, 0, 100);
                offsetDays += durationDays;
                cumulativePercent += percent;
                const dueDate = new Date(start);
                dueDate.setDate(dueDate.getDate() + offsetDays - 1);
                dueDate.setHours(0, 0, 0, 0);
                const installmentValue = projectTotal * (percent / 100);
                cumulativeValue += installmentValue;
                const paymentDateKey = settings.payments?.[String(no)] || '';
                const paidValue = paymentDateKey ? installmentValue : 0;
                cumulativePaidValue += paidValue;
                return {
                    no,
                    label: `งวดที่ ${no}`,
                    offsetDays,
                    durationDays,
                    percent,
                    cumulativePercent,
                    installmentValue,
                    cumulativeValue,
                    paymentDateKey,
                    paidValue,
                    cumulativePaidValue,
                    dateObj: dueDate,
                    date: safeFormatDate(dueDate)
                };
            });
        }

        function renderInstallmentPanel() {
            const countInput = document.getElementById('installment-count-input');
            const durationInput = document.getElementById('installment-duration-input');
            const preview = document.getElementById('installment-preview');
            if (!preview) return;

            const settings = normalizeInstallmentSettings(installmentSettings);
            if (countInput && document.activeElement !== countInput) countInput.value = settings.count || 3;
            if (durationInput && document.activeElement !== durationInput) durationInput.value = settings.durationDays || 30;

            const schedule = getInstallmentSchedule();
            if (!schedule.length) {
                preview.innerHTML = `
                    <div class="flex items-center gap-2 text-sm text-slate-500">
                        <i class="fa-regular fa-calendar-plus text-amber-500"></i>
                        ยังไม่ได้สร้างกำหนดส่งงวดงาน
                    </div>`;
                return;
            }

            const totalInstallmentDays = schedule.reduce((sum, item) => sum + item.durationDays, 0);
            const totalInstallmentPercent = schedule.reduce((sum, item) => sum + item.percent, 0);
            const planDays = parseInt(document.getElementById('header-duration-input')?.value, 10) || 0;
            const dayWarning = planDays && totalInstallmentDays !== planDays
                ? `<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">คำเตือน: ผลรวมวันงวดงาน ${totalInstallmentDays} วัน ไม่เท่ากับระยะเวลาแผนงาน ${planDays} วัน</div>`
                : `<div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">ผลรวมวันงวดงาน ${totalInstallmentDays} วัน</div>`;
            const percentWarning = Math.abs(totalInstallmentPercent - 100) > 0.01
                ? `<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">คำเตือน: ผลรวม % งวดงาน ${totalInstallmentPercent.toFixed(2)}% ต้องเท่ากับ 100%</div>`
                : `<div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">ผลรวม % งวดงาน 100%</div>`;

            preview.innerHTML = `
                <div class="flex flex-col gap-3">
                    <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2">
                        <div class="text-sm font-bold text-slate-700">วันเริ่มต้นโครงการ: <span class="text-narit-blue">${formatDateDisplay(getActualProjectStartDate())}</span></div>
                        <div class="flex flex-col sm:flex-row gap-2">${dayWarning}${percentWarning}</div>
                    </div>
                    <div class="overflow-auto custom-scrollbar border border-slate-200 rounded-xl bg-white">
                        <table class="w-full min-w-[1360px] text-[12px] installment-schedule-table">
                            <thead class="bg-slate-50 text-slate-800">
                                <tr>
                                    <th class="border border-slate-200 px-2 py-2 text-center">งวดงานที่</th>
                                    <th class="border border-slate-200 px-2 py-2 text-center">จำนวนวัน</th>
                                    <th class="border border-slate-200 px-2 py-2 text-center">จำนวนวันสะสม</th>
                                    <th class="border border-slate-200 px-2 py-2 text-center">วันที่ครบกำหนด</th>
                                    <th class="border border-slate-200 px-2 py-2 text-center">% งวดงาน</th>
                                    <th class="border border-slate-200 px-2 py-2 text-center">%งวดงานสะสม</th>
                                    <th class="border border-slate-200 px-2 py-2 text-right">มูลค่างวดงาน (บาท)</th>
                                    <th class="border border-slate-200 px-2 py-2 text-right">มูลค่างวดงานสะสม (บาท)</th>
                                    <th class="border border-slate-200 px-2 py-2 text-center">เบิกจ่ายแล้ว</th>
                                    <th class="border border-slate-200 px-2 py-2 text-center">ผลการเบิกจ่าย</th>
                                    <th class="border border-slate-200 px-2 py-2 text-right">เบิกจ่ายสะสม</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${schedule.map(item => `
                                    <tr class="hover:bg-blue-50/40">
                                        <td class="border border-slate-200 px-2 py-2 text-center font-black text-amber-700">${item.no}</td>
                                        <td class="border border-slate-200 px-2 py-2 text-center">
                                            <input type="number" min="1" max="3650" step="1" value="${item.durationDays}" onchange="updateInstallmentDuration(${item.no}, this.value)" class="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right font-black text-slate-800">
                                        </td>
                                        <td class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">${item.offsetDays}</td>
                                        <td class="border border-slate-200 px-2 py-2 text-center font-bold text-narit-blue">${formatDateDisplay(item.dateObj)}</td>
                                        <td class="border border-slate-200 px-2 py-2 text-center">
                                            <input type="number" min="0" max="100" step="0.01" value="${item.percent}" onchange="updateInstallmentPercent(${item.no}, this.value)" class="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right font-black text-amber-700">
                                        </td>
                                        <td class="border border-slate-200 px-2 py-2 text-center font-black ${Math.abs(item.cumulativePercent - 100) <= 0.01 ? 'text-emerald-700' : item.cumulativePercent > 100 ? 'text-red-700' : 'text-slate-700'}">${item.cumulativePercent.toFixed(2)}%</td>
                                        <td class="border border-slate-200 px-2 py-2 text-right font-bold text-slate-800">${formatMoneyDisplay(item.installmentValue)}</td>
                                        <td class="border border-slate-200 px-2 py-2 text-right font-black text-narit-blue">${formatMoneyDisplay(item.cumulativeValue)}</td>
                                        <td class="border border-slate-200 px-2 py-2 text-center">
                                            <input type="date" value="${item.paymentDateKey}" onchange="updateInstallmentPaymentDate(${item.no}, this.value)" class="installment-payment-date rounded-lg border border-slate-300 px-2 py-1 text-center font-bold">
                                        </td>
                                        <td class="border border-slate-200 px-2 py-2 text-center">
                                            ${item.paymentDateKey ? `<span class="installment-payment-status paid">เบิกจ่ายแล้ว</span><div class="installment-payment-value">${formatMoneyDisplay(item.paidValue)} บาท</div>` : '<span class="installment-payment-status unpaid">ยังไม่เบิกจ่าย</span>'}
                                        </td>
                                        <td class="border border-slate-200 px-2 py-2 text-right font-black text-emerald-700">${formatMoneyDisplay(item.cumulativePaidValue)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
        }

        function createInstallmentSchedule() {
            const count = parseInt(document.getElementById('installment-count-input')?.value, 10) || 0;
            const durationDays = parseInt(document.getElementById('installment-duration-input')?.value, 10) || 0;
            if (count < 1 || durationDays < 1) {
                showAppAlert({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาระบุจำนวนงวดงานและระยะเวลาแต่ละงวดให้ถูกต้อง' });
                return;
            }
            showProcessingAlert('กำลังสร้างงวดงาน', 'ระบบกำลังคำนวณวันส่งงวดงาน');
            setTimeout(() => {
                installmentSettings = normalizeInstallmentSettings({
                    count,
                    durationDays,
                    durations: Array.from({ length: count }, () => durationDays),
                    percents: getBalancedInstallmentPercents(count),
                    payments: {}
                });
                calculateDates(false);
                renderInstallmentPanel();
                scheduleAutoSave();
                finishProcessingAlert({ title: 'สร้างงวดงานแล้ว', text: `สร้างกำหนดส่ง ${installmentSettings.count} งวดเรียบร้อย` });
            }, 120);
        }

        function updateInstallmentDuration(no, value) {
            const settings = normalizeInstallmentSettings(installmentSettings);
            if (!settings.count) return;
            const index = Math.max(0, parseInt(no, 10) - 1);
            if (index >= settings.count) return;
            settings.durations[index] = Math.min(3650, Math.max(1, parseInt(value, 10) || settings.durationDays));
            installmentSettings = normalizeInstallmentSettings(settings);
            calculateDates(false);
            renderInstallmentPanel();
            renderDurationPlanTable();
            renderUI();
            scheduleAutoSave();
        }

        function updateInstallmentPercent(no, value) {
            const settings = normalizeInstallmentSettings(installmentSettings);
            if (!settings.count) return;
            const index = Math.max(0, parseInt(no, 10) - 1);
            if (index >= settings.count) return;
            settings.percents[index] = clampNumber(value, 0, 100);
            installmentSettings = normalizeInstallmentSettings(settings);
            renderInstallmentPanel();
            renderDurationPlanTable();
            renderDashboard();
            scheduleAutoSave();
        }

        function updateInstallmentPaymentDate(no, value) {
            const settings = normalizeInstallmentSettings(installmentSettings);
            if (!settings.count) return;
            const key = String(parseInt(no, 10));
            if (!settings.payments) settings.payments = {};
            if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) settings.payments[key] = String(value);
            else delete settings.payments[key];
            installmentSettings = normalizeInstallmentSettings(settings);
            renderInstallmentPanel();
            renderDashboard();
            scheduleAutoSave();
        }

        function getCumulativePaidValueAtDate(dateKey = safeFormatDate(new Date())) {
            const targetKey = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey)) ? String(dateKey) : safeFormatDate(new Date());
            const schedule = getInstallmentSchedule();
            return schedule
                .filter(item => item.paymentDateKey && item.paymentDateKey <= targetKey)
                .reduce((sum, item) => sum + (parseFloat(item.paidValue) || 0), 0);
        }

        function getLatestCumulativePaidValue() {
            const schedule = getInstallmentSchedule();
            const paidRows = schedule.filter(item => item.paymentDateKey).sort((a, b) => String(a.paymentDateKey).localeCompare(String(b.paymentDateKey)) || a.no - b.no);
            return paidRows.length ? paidRows[paidRows.length - 1].cumulativePaidValue : 0;
        }

        function clearInstallmentSchedule() {
            installmentSettings = { ...installmentSettings, count: 0 };
            calculateDates(false);
            renderInstallmentPanel();
            scheduleAutoSave();
        }

        function toggleInstallmentLines() {
            showInstallmentLines = document.getElementById('show-installment-lines')?.checked !== false;
            renderUI();
            scheduleAutoSave();
        }

        function normalizeDurationPlanSettings(raw = {}) {
            const normalized = {};
            Object.entries(raw || {}).forEach(([taskId, value]) => {
                const allocations = {};
                Object.entries(value?.allocations || {}).forEach(([key, pct]) => {
                    const cleanPct = clampNumber(pct, 0, 100);
                    if (cleanPct > 0) allocations[key] = cleanPct;
                });
                normalized[taskId] = {
                    allocations,
                    startMode: value?.startMode || 'recommended'
                };
            });
            return normalized;
        }

        function normalizeActualSettings(raw = {}) {
            return {
                frequency: raw.frequency === 'daily' ? 'daily' : 'weekly'
            };
        }

        function normalizeActualEntries(raw = {}) {
            const normalized = {};
            Object.entries(raw || {}).forEach(([dateKey, values]) => {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
                const entry = {};
                Object.entries(values || {}).forEach(([taskId, pct]) => {
                    const cleanPct = clampNumber(pct, 0, 100);
                    if (cleanPct > 0) entry[String(taskId)] = cleanPct;
                });
                normalized[dateKey] = entry;
            });
            return normalized;
        }

        function getActualSelectedDateKey() {
            const input = document.getElementById('actual-entry-date');
            if (input?.value) return input.value;
            return safeFormatDate(new Date());
        }

        function getActualSnapshotForDate(dateKey) {
            const key = dateKey || getActualSelectedDateKey();
            if (!actualEntries[key]) actualEntries[key] = {};
            return actualEntries[key];
        }

        function getWorkTasksForActual() {
            return (tasks || []).filter(task => !task.isGroup && !task.isMilestone);
        }

        function getTaskPlannedPercentAtDate(task, targetDate) {
            if (!task?.startDateObj || !task?.endDateObj) return 0;
            const start = new Date(task.startDateObj);
            const end = new Date(task.endDateObj);
            const target = new Date(targetDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            target.setHours(0, 0, 0, 0);
            if (target < start) return 0;
            if (target >= end) return 100;
            const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
            const elapsedDays = Math.max(0, Math.round((target - start) / 86400000) + 1);
            return clampNumber((elapsedDays / totalDays) * 100, 0, 100);
        }

        function getTaskActualPercentAtDate(taskId, targetDateKey) {
            const keys = Object.keys(actualEntries || {}).filter(key => key <= targetDateKey).sort();
            for (let i = keys.length - 1; i >= 0; i--) {
                const value = actualEntries[keys[i]]?.[String(taskId)];
                if (value !== undefined) return clampNumber(value, 0, 100);
            }
            return 0;
        }

        function getWeightedProgressFromTaskPercents(percentGetter, targetDate) {
            const workTasks = getWorkTasksForActual();
            const valueMap = getTaskFinalValueMap();
            let totalWeight = 0;
            let weighted = 0;
            workTasks.forEach(task => {
                const valueWeight = valueMap.get(task.id);
                const weight = valueWeight && valueWeight > 0 ? valueWeight : 1;
                totalWeight += weight;
                weighted += weight * clampNumber(percentGetter(task, targetDate), 0, 100);
            });
            return totalWeight > 0 ? weighted / totalWeight : 0;
        }

        function getActualProgressAtDate(dateKey) {
            return getWeightedProgressFromTaskPercents(task => getTaskActualPercentAtDate(task.id, dateKey), dateKey);
        }

        function getPlannedProgressPercentAtDate(dateObj) {
            const totalValue = computeCostSummaryData().projectTotal || getSCurveData().totalValue;
            return getPlannedProgressAtDate(dateObj, totalValue);
        }

        function findPlannedDateForProgress(progressPercent) {
            const sData = getSCurveData();
            const totalValue = Math.max(1, parseFloat(sData.totalValue) || parseFloat(computeCostSummaryData().projectTotal) || 1);
            const targetPct = clampNumber(progressPercent, 0, 100);
            const point = (sData.points || []).find(item => ((item.cumulative / totalValue) * 100) >= targetPct);
            return point?.date || null;
        }

        function computeActualVariance(dateKey) {
            const targetDate = new Date(dateKey + 'T00:00:00');
            const planned = getPlannedProgressPercentAtDate(targetDate);
            const actual = getActualProgressAtDate(dateKey);
            const variance = actual - planned;
            const plannedEquivalentDate = findPlannedDateForProgress(actual);
            const dayDelta = plannedEquivalentDate ? Math.round((plannedEquivalentDate - targetDate) / 86400000) : 0;
            return { planned, actual, variance, dayDelta };
        }

        function getDurationPlanEntry(taskId) {
            const key = String(taskId);
            if (!durationPlanSettings[key]) {
                durationPlanSettings[key] = { allocations: {}, startMode: 'recommended' };
            }
            if (!durationPlanSettings[key].allocations) durationPlanSettings[key].allocations = {};
            if (!durationPlanSettings[key].startMode) durationPlanSettings[key].startMode = 'recommended';
            if (typeof durationPlanSettings[key].customStart !== 'string') durationPlanSettings[key].customStart = '';
            return durationPlanSettings[key];
        }

        function getInstallmentPeriods() {
            const settings = normalizeInstallmentSettings(installmentSettings);
            if (!settings.count || !settings.durationDays) return [];
            const projectStart = getActualProjectStartDate();
            let offsetDays = 0;
            return Array.from({ length: settings.count }, (_, index) => {
                const durationDays = settings.durations?.[index] || settings.durationDays;
                const start = new Date(projectStart);
                start.setDate(start.getDate() + offsetDays);
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setDate(end.getDate() + durationDays - 1);
                end.setHours(0, 0, 0, 0);
                offsetDays += durationDays;
                return { no: index + 1, label: `งวดที่ ${index + 1}`, start, end, durationDays };
            });
        }

        function isTaskDurationPlanEditable(task) {
            return !!task && !task.isGroup && !task.isMilestone;
        }

        function getDurationPlanTotal(taskId) {
            const entry = getDurationPlanEntry(taskId);
            return Object.values(entry.allocations || {}).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
        }

        function getDurationPlanSuggestion(task) {
            const periods = getInstallmentPeriods();
            const duration = Math.max(1, parseInt(task?.duration, 10) || 1);
            if (!task || !periods.length) {
                return { valid: false, message: 'ยังไม่ได้สร้างงวดงาน', options: [] };
            }
            if (!isTaskDurationPlanEditable(task)) {
                return { valid: false, message: 'หัวข้อหลักคำนวณจากงานย่อย', options: [] };
            }

            const entry = getDurationPlanEntry(task.id);
            const activeIndexes = periods
                .map((period, index) => ({ period, index, pct: parseFloat(entry.allocations?.[period.no]) || 0 }))
                .filter(item => item.pct > 0);
            const total = getDurationPlanTotal(task.id);
            if (!activeIndexes.length) return { valid: false, message: 'ใส่ % ในงวดงานก่อน', options: [] };
            if (Math.abs(total - 100) > 0.01) return { valid: false, message: `ผลรวมต้องเป็น 100% ตอนนี้ ${total.toFixed(2)}%`, options: [] };

            const first = activeIndexes[0].period;
            const last = activeIndexes[activeIndexes.length - 1].period;
            let windowStart = new Date(first.start);
            let windowEnd = new Date(last.end);

            if (task.preds && task.preds.length && task.startDateObj instanceof Date && !isNaN(task.startDateObj.getTime()) && task.startDateObj > windowStart) {
                windowStart = new Date(task.startDateObj);
            }

            const latestStart = new Date(windowEnd);
            latestStart.setDate(latestStart.getDate() - duration + 1);
            const windowDays = Math.round((windowEnd - windowStart) / 86400000) + 1;
            if (windowDays < duration) {
                return {
                    valid: true,
                    warning: 'ช่วงงวดสั้นกว่าจำนวนวันของงาน',
                    options: [{ mode: 'recommended', label: `เริ่ม ${formatDateDisplay(windowStart)} (งานยาวเกินช่วง)`, date: windowStart }],
                    startDate: windowStart,
                    endDate: new Date(windowStart.getTime() + (duration - 1) * 86400000)
                };
            }

            const early = new Date(windowStart);
            const late = new Date(latestStart);
            const middle = new Date(windowStart);
            middle.setDate(middle.getDate() + Math.floor((latestStart - windowStart) / 86400000 / 2));

            const weightedCenter = activeIndexes.reduce((sum, item) => {
                const center = item.period.start.getTime() + ((item.period.end - item.period.start) / 2);
                return sum + center * item.pct;
            }, 0) / 100;
            const recommended = new Date(weightedCenter - ((duration - 1) / 2) * 86400000);
            recommended.setHours(0, 0, 0, 0);
            const clampedRecommended = clampDate(recommended, early, late);

            const rawOptions = [
                { mode: 'recommended', label: `แนะนำ: ${formatDateDisplay(clampedRecommended)}`, date: clampedRecommended },
                { mode: 'early', label: `ต้นช่วง: ${formatDateDisplay(early)}`, date: early },
                { mode: 'middle', label: `กลางช่วง: ${formatDateDisplay(middle)}`, date: middle },
                { mode: 'late', label: `ท้ายช่วง: ${formatDateDisplay(late)}`, date: late }
            ];
            const seenDates = new Set();
            const options = rawOptions.filter(option => {
                const key = safeFormatDate(option.date) + ':' + option.mode;
                if (seenDates.has(key)) return false;
                seenDates.add(key);
                return true;
            });
            const customStart = parseDurationPlanDate(entry.customStart);
            const mode = customStart ? 'custom' : (entry.startMode || 'recommended');
            const selected = customStart ? { mode: 'custom', label: 'Custom: ' + formatDateDisplay(customStart), date: clampDate(customStart, early, late) } : (options.find(option => option.mode === mode) || options[0]);
            const endDate = new Date(selected.date);
            endDate.setDate(endDate.getDate() + duration - 1);
            return { valid: true, options, startDate: selected.date, endDate, windowStart, windowEnd, latestStart: late };
        }

        function clampDate(date, min, max) {
            if (date < min) return new Date(min);
            if (date > max) return new Date(max);
            return new Date(date);
        }

        function parseDurationPlanDate(value) {
            if (!value) return null;
            const date = new Date(String(value) + 'T00:00:00');
            if (!(date instanceof Date) || isNaN(date.getTime())) return null;
            date.setHours(0, 0, 0, 0);
            return date;
        }

        function formatDurationPlanRange(suggestion) {
            if (!suggestion?.valid || !suggestion.windowStart || !suggestion.windowEnd) return suggestion?.message || '-';
            const rangeEnd = suggestion.latestStart || suggestion.windowEnd;
            return formatDateToThai(safeFormatDate(suggestion.windowStart)) + ' - ' + formatDateToThai(safeFormatDate(rangeEnd));
        }

        function updateDurationPlanDays(taskId, value) {
            const task = tasks.find(item => String(item.id) === String(taskId));
            if (!task || !isTaskDurationPlanEditable(task)) return;
            task.duration = Math.max(1, parseInt(value, 10) || 1);
            calculateDates(false);
            scheduleAutoSave();
        }

        function updateDurationPlanPercent(taskId, installmentNo, value) {
            const entry = getDurationPlanEntry(taskId);
            const pct = clampNumber(value, 0, 100);
            if (pct > 0) entry.allocations[String(installmentNo)] = pct;
            else delete entry.allocations[String(installmentNo)];
            renderDurationPlanTable();
            scheduleAutoSave();
        }

        function updateDurationPlanStartMode(taskId, mode) {
            const entry = getDurationPlanEntry(taskId);
            entry.startMode = mode || 'recommended';
            if (entry.startMode !== 'custom') entry.customStart = '';
            applyDurationPlanToTask(taskId, false);
            renderDurationPlanTable();
            scheduleAutoSave();
        }

        function updateDurationPlanCustomStart(taskId, value) {
            const entry = getDurationPlanEntry(taskId);
            entry.customStart = value || '';
            entry.startMode = entry.customStart ? 'custom' : 'recommended';
            applyDurationPlanToTask(taskId, false);
            renderDurationPlanTable();
            renderUI();
            scheduleAutoSave();
        }

        function applyDurationPlanToTask(taskId, showAlert = true) {
            const task = tasks.find(item => String(item.id) === String(taskId));
            if (!task || !isTaskDurationPlanEditable(task)) return false;
            const suggestion = getDurationPlanSuggestion(task);
            if (!suggestion.valid || !suggestion.startDate) {
                if (showAlert) showAppAlert({ icon: 'warning', title: 'ยังไม่สามารถคำนวณวันเริ่มได้', text: suggestion.message || '' });
                return false;
            }
            task.start = safeFormatDate(suggestion.startDate);
            calculateDates(false);
            return true;
        }


        function applyDurationPlanSingle(taskId) {
            const task = tasks.find(item => String(item.id) === String(taskId));
            if (!task || !isTaskDurationPlanEditable(task)) return;
            if (Math.abs(getDurationPlanTotal(task.id) - 100) > 0.01) {
                showAppAlert({ icon: 'warning', title: '&#3612;&#3621;&#3619;&#3623;&#3617; % &#3618;&#3633;&#3591;&#3652;&#3617;&#3656;&#3588;&#3619;&#3610;', text: '&#3585;&#3619;&#3640;&#3603;&#3634;&#3651;&#3626;&#3656; % &#3651;&#3627;&#3657;&#3619;&#3623;&#3617;&#3648;&#3607;&#3656;&#3634;&#3585;&#3633;&#3610; 100% &#3585;&#3656;&#3629;&#3609;&#3611;&#3619;&#3633;&#3610; Gantt Chart' });
                return;
            }
            if (applyDurationPlanToTask(task.id, true)) {
                renderUI();
                scheduleAutoSave();
                finishProcessingAlert({ icon: 'success', title: '&#3611;&#3619;&#3633;&#3610; Gantt Chart &#3649;&#3621;&#3657;&#3623;', text: '&#3611;&#3619;&#3633;&#3610;&#3648;&#3593;&#3614;&#3634;&#3632;&#3619;&#3634;&#3618;&#3585;&#3634;&#3619;&#3607;&#3637;&#3656;&#3648;&#3621;&#3639;&#3629;&#3585;' });
            }
        }

        function applyDurationPlanToAll() {
            showProcessingAlert('กำลังปรับแผนงาน', 'ระบบกำลังนำระยะเวลางานไปใช้กับ Gantt');
            setTimeout(() => {
                let applied = 0;
                tasks.forEach(task => {
                    if (isTaskDurationPlanEditable(task) && Math.abs(getDurationPlanTotal(task.id) - 100) <= 0.01) {
                        if (applyDurationPlanToTask(task.id, false)) applied++;
                    }
                });
                renderUI();
                finishProcessingAlert({
                    icon: applied ? 'success' : 'info',
                    title: applied ? 'ปรับแท่ง Gantt แล้ว' : 'ยังไม่มีรายการที่พร้อมปรับ',
                    text: applied ? `ปรับแล้ว ${applied} รายการ` : 'ต้องมีผลรวม % เท่ากับ 100% ก่อน'
                });
                scheduleAutoSave();
            }, 120);
        }

        function autoDistributeDurationPlan() {
            const periods = getInstallmentPeriods();
            if (!periods.length) {
                showAppAlert({ icon: 'warning', title: 'ยังไม่มีงวดงาน', text: 'กรุณาสร้างกำหนดส่งงวดงานในหน้ามูลค่าโครงการก่อน' });
                return;
            }
            showProcessingAlert('กำลังเฉลี่ย % งาน', 'ระบบกำลังวิเคราะห์ช่วงงานเทียบกับงวดงาน');
            setTimeout(() => {
                let distributed = 0;
                tasks.forEach(task => {
                    if (!isTaskDurationPlanEditable(task) || !task.startDateObj || !task.endDateObj) return;
                    const entry = getDurationPlanEntry(task.id);
                    entry.allocations = {};
                    const taskStart = new Date(task.startDateObj);
                    const taskEnd = new Date(task.endDateObj);
                    const durationDays = Math.max(1, Math.round((taskEnd - taskStart) / 86400000) + 1);
                    periods.forEach(period => {
                        const overlapStart = new Date(Math.max(taskStart.getTime(), period.start.getTime()));
                        const overlapEnd = new Date(Math.min(taskEnd.getTime(), period.end.getTime()));
                        const overlapDays = Math.round((overlapEnd - overlapStart) / 86400000) + 1;
                        if (overlapDays > 0) entry.allocations[String(period.no)] = parseFloat(((overlapDays / durationDays) * 100).toFixed(2));
                    });
                    const total = getDurationPlanTotal(task.id);
                    const keys = Object.keys(entry.allocations);
                    if (keys.length && Math.abs(total - 100) > 0.01) {
                        const lastKey = keys[keys.length - 1];
                        entry.allocations[lastKey] = clampNumber((entry.allocations[lastKey] || 0) + (100 - total), 0, 100);
                    }
                    if (keys.length) distributed++;
                    entry.startMode = 'recommended';
                });
                renderDurationPlanTable();
                scheduleAutoSave();
                finishProcessingAlert({ title: 'เฉลี่ย % งานแล้ว', text: `วิเคราะห์และกระจายแล้ว ${distributed} รายการ` });
            }, 120);
        }

        function renderDurationPlanTable() {
            const table = document.getElementById('duration-plan-table');
            if (!table) return;
            const periods = getInstallmentPeriods();
            if (!periods.length) {
                table.innerHTML = `
                    <div class="px-6 py-10 text-center text-slate-500">
                        <div class="text-lg font-black text-slate-700">ยังไม่มีข้อมูลงวดงาน</div>
                        <div class="text-sm mt-2">ไปที่หน้ามูลค่าโครงการ แล้วสร้างกำหนดส่งงวดงานก่อน</div>
                    </div>`;
                setupDurationPlanTopScroll(0);
                return;
            }

            const tableWidth = Math.max(980, table.parentElement?.clientWidth || table.clientWidth || 1180);
            const compact = getDurationTableLayout(tableWidth, periods.length);
            const installmentHeaders = periods.map(period => `
                <div class="header-cell shrink-0 h-full text-amber-700 flex items-center justify-center" style="width:${compact.period}px">
                    <div class="leading-tight">
                        <div>${period.label}</div>
                        <div class="text-[8px] font-normal text-slate-500">${formatDateToThai(safeFormatDate(period.end))}</div>
                    </div>
                </div>`).join('');

            const rows = tasks.filter(task => !task.isMilestone).map(task => renderDurationPlanRow(task, periods, compact)).join('');
            const minTableWidth = compact.no + compact.name + compact.days + compact.total + compact.start + compact.customStart + compact.action + (compact.period * periods.length);
            table.innerHTML = `
                <div class="duration-plan-title duration-plan-title-with-actions"><span>&#3605;&#3634;&#3619;&#3634;&#3591;&#3649;&#3610;&#3656;&#3591; % &#3591;&#3623;&#3604;&#3591;&#3634;&#3609;</span><div class="duration-plan-title-actions"><button type="button" onclick="autoDistributeDurationPlan()" class="duration-plan-action-btn duration-plan-action-secondary"><i class="fa-solid fa-scale-balanced"></i> &#3648;&#3593;&#3621;&#3637;&#3656;&#3618; % &#3605;&#3634;&#3617;&#3594;&#3656;&#3623;&#3591;&#3648;&#3623;&#3621;&#3634;&#3648;&#3604;&#3636;&#3617;</button></div></div>
                <div class="duration-plan-inner" style="min-width:${minTableWidth}px">
                <div class="flex w-full bg-slate-50 border-b border-slate-300 sticky top-0 z-10 items-center" style="height:50px;">
                    <div class="header-cell shrink-0 h-full text-black font-bold flex items-center justify-center" style="width:${compact.no}px">ที่</div>
                    <div class="header-cell shrink-0 px-2 h-full text-black font-bold flex items-center justify-center text-[12px] relative" style="width:${compact.name}px">
                        <span>รายการปฏิบัติงาน</span>
                        <span id="duration-name-resizer" class="duration-name-resizer" title="ลากเพื่อปรับความกว้างคอลัมน์"></span>
                    </div>
                    <div class="header-cell shrink-0 h-full text-black font-bold flex items-center justify-center" style="width:${compact.days}px">วัน</div>
                    ${installmentHeaders}
                    <div class="header-cell shrink-0 h-full text-black font-bold flex items-center justify-center" style="width:${compact.total}px">ผลรวม</div>
                    <div class="header-cell shrink-0 h-full text-black font-bold flex items-center justify-center text-[11px]" style="width:${compact.start}px">&#3649;&#3609;&#3632;&#3609;&#3635;&#3594;&#3656;&#3623;&#3591;&#3648;&#3619;&#3636;&#3656;&#3617;</div>
                    <div class="header-cell shrink-0 h-full text-black font-bold flex items-center justify-center text-[11px]" style="width:${compact.customStart}px">&#3648;&#3621;&#3639;&#3629;&#3585;&#3623;&#3633;&#3609;&#3648;&#3619;&#3636;&#3656;&#3617;</div>
                    <div class="header-cell shrink-0 h-full text-black font-bold flex items-center justify-center text-[11px]" style="width:${compact.action}px">&#3611;&#3619;&#3633;&#3610; Gantt Chart</div>
                </div>
                <div>${rows || '<div class="px-6 py-8 text-center text-slate-400 text-sm">ยังไม่มีรายการปฏิบัติงาน</div>'}</div>
                </div>`;
            setupDurationNameColumnResizer();
            setupDurationPlanTopScroll(minTableWidth);
        }

        function selectDurationPlanRow(taskId) {
            const table = document.getElementById('duration-plan-table');
            if (!table) return;
            table.querySelectorAll('.duration-plan-row.is-selected').forEach(row => row.classList.remove('is-selected'));
            const row = table.querySelector(`[data-duration-task-id="${taskId}"]`);
            if (row) row.classList.add('is-selected');
        }

        function setupDurationPlanSelectionClearListener() {
            if (document.body.dataset.durationSelectionClearBound === '1') return;
            document.body.dataset.durationSelectionClearBound = '1';
            document.addEventListener('click', (event) => {
                if (currentPage !== 'duration') return;
                const target = event.target;
                if (target?.closest?.('.duration-plan-row, #duration-plan-top-scroll, #duration-page .no-print, #top-ribbon, #workflow-guideline, input, select, textarea, button')) return;
                document.querySelectorAll('#duration-plan-table .duration-plan-row.is-selected').forEach(row => row.classList.remove('is-selected'));
            });
        }

        function setupDurationPlanTopScroll(width = 0) {
            const topScroll = document.getElementById('duration-plan-top-scroll');
            const spacer = document.getElementById('duration-plan-top-spacer');
            const bottomScroll = document.getElementById('duration-plan-scroll-wrap');
            if (!topScroll || !spacer || !bottomScroll) return;

            const scrollWidth = Math.max(width, bottomScroll.scrollWidth || 0);
            topScroll.style.display = scrollWidth > bottomScroll.clientWidth ? 'block' : 'none';
            spacer.style.width = scrollWidth + 'px';

            if (topScroll.dataset.bound === '1') return;
            topScroll.dataset.bound = '1';
            let syncing = false;
            topScroll.addEventListener('scroll', () => {
                if (syncing) return;
                syncing = true;
                bottomScroll.scrollLeft = topScroll.scrollLeft;
                syncing = false;
            });
            bottomScroll.addEventListener('scroll', () => {
                if (syncing) return;
                syncing = true;
                topScroll.scrollLeft = bottomScroll.scrollLeft;
                syncing = false;
            });
        }

        function clampDurationTaskNameColumnWidth(value) {
            return Math.min(520, Math.max(130, parseInt(value, 10) || 214));
        }

        function getDurationTableLayout(tableWidth, periodCount) {
            const no = 50;
            const days = 70;
            const total = 92;
            const start = 168;
            const customStart = 132;
            const action = 118;
            const count = Math.max(1, periodCount);
            const minPeriod = 72;
            const maxPeriod = 96;
            const fixedWidth = no + days + total + start + customStart + action;
            const name = clampDurationTaskNameColumnWidth(durationTaskNameColumnWidth);
            const available = Math.max(0, tableWidth - fixedWidth - name);
            const period = Math.min(maxPeriod, Math.max(minPeriod, Math.floor(available / count) || minPeriod));
            return { no, name, days, period, total, start, customStart, action };
        }

        function setupDurationNameColumnResizer() {
            const handle = document.getElementById('duration-name-resizer');
            const table = document.getElementById('duration-plan-table');
            if (!handle || !table || handle.dataset.bound === '1') return;
            handle.dataset.bound = '1';
            handle.addEventListener('mousedown', (event) => {
                event.preventDefault();
                const startX = event.clientX;
                const startWidth = durationTaskNameColumnWidth;
                document.body.classList.add('resizing-duration-name');

                function onMouseMove(moveEvent) {
                    durationTaskNameColumnWidth = clampDurationTaskNameColumnWidth(startWidth + (moveEvent.clientX - startX));
                    renderDurationPlanTable();
                }

                function onMouseUp() {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    document.body.classList.remove('resizing-duration-name');
                    scheduleAutoSave();
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }

        function renderDurationPlanRow(task, periods, compact) {
            const editable = isTaskDurationPlanEditable(task);
            const entry = getDurationPlanEntry(task.id);
            const total = editable ? getDurationPlanTotal(task.id) : 0;
            const totalOk = editable && Math.abs(total - 100) <= 0.01;
            const suggestion = editable ? getDurationPlanSuggestion(task) : { valid: false, message: 'หัวข้อหลัก' };
            const rowClass = task.isGroup ? 'bg-slate-100/80 font-bold text-slate-800' : 'bg-white hover:bg-blue-50/40 text-slate-700';
            const nameClass = task.isGroup ? 'font-bold text-slate-800' : 'text-slate-700';
            const pctCells = periods.map(period => {
                const value = entry.allocations?.[period.no] || '';
                const hasValue = parseFloat(value) > 0;
                return `
                    <div class="cell shrink-0 justify-center px-1 work-duration-percent-cell ${hasValue ? 'has-value' : ''}" style="width:${compact.period}px">
                        ${editable ? `<div class="flex items-center justify-center gap-1 min-w-0"><input type="number" min="0" max="100" step="0.01" value="${value}" onchange="updateDurationPlanPercent(${task.id}, ${period.no}, this.value)" class="work-duration-percent"><span class="work-duration-percent-sign">%</span></div>` : '<span class="text-xs text-slate-400">-</span>'}
                    </div>`;
            }).join('');
            const rangeHtml = editable && suggestion.valid
                ? `<span class="work-duration-range" title="${formatDurationPlanRange(suggestion)}">${formatDurationPlanRange(suggestion)}</span>`
                : `<span class="text-xs font-bold text-slate-400">${suggestion.message || '-'}</span>`;
            const customStartValue = entry.customStart || (suggestion.valid && suggestion.startDate ? safeFormatDate(suggestion.startDate) : '');
            const customStartHtml = editable && suggestion.valid
                ? `<input type="date" value="${customStartValue}" min="${suggestion.windowStart ? safeFormatDate(suggestion.windowStart) : ''}" max="${suggestion.latestStart ? safeFormatDate(suggestion.latestStart) : (suggestion.windowEnd ? safeFormatDate(suggestion.windowEnd) : '')}" onchange="updateDurationPlanCustomStart(${task.id}, this.value)" class="work-duration-date">`
                : '<span class="text-xs font-bold text-slate-400">-</span>';
            const actionHtml = editable
                ? `<button type="button" onclick="applyDurationPlanSingle(${task.id})" class="duration-plan-row-action" ${totalOk ? '' : 'title="ต้องใส่ % รวม 100% ก่อน"'}><i class="fa-solid fa-arrow-right-to-bracket"></i> Gantt</button>`
                : '<span class="text-xs font-bold text-slate-400">-</span>';
            return `
                <div class="flex w-full row-height border-b border-slate-100 duration-plan-row ${rowClass}" onclick="selectDurationPlanRow(${task.id})" onfocusin="selectDurationPlanRow(${task.id})" data-duration-task-id="${task.id}">
                    <div class="cell shrink-0 justify-center text-[11px] font-bold" style="width:${compact.no}px">${task.wbs || ''}</div>
                    <div class="cell shrink-0 px-2 text-[12px] leading-tight overflow-hidden ${nameClass}" style="width:${compact.name}px" title="${escapeTooltipHtml(task.name)}">${escapeTooltipHtml(task.name)}</div>
                    <div class="cell shrink-0 justify-center px-1" style="width:${compact.days}px">
                        ${editable ? `<input type="number" min="1" step="1" value="${parseInt(task.duration, 10) || 1}" onchange="updateDurationPlanDays(${task.id}, this.value)" class="work-duration-input"><span class="text-[11px] font-bold text-slate-400 ml-1">วัน</span>` : `<span class="text-xs font-bold text-slate-500">${parseInt(task.duration, 10) || 0} วัน</span>`}
                    </div>
                    ${pctCells}
                    <div class="cell shrink-0 justify-center px-2" style="width:${compact.total}px">
                        <span class="text-[12px] font-black whitespace-nowrap ${totalOk ? 'text-emerald-700' : 'text-red-600'}">${editable ? total.toFixed(2) + '%' : '-'}</span>
                    </div>
                    <div class="cell shrink-0 justify-center px-1" style="width:${compact.start}px">${rangeHtml}</div>
                    <div class="cell shrink-0 justify-center px-1" style="width:${compact.customStart}px">${customStartHtml}</div>
                    <div class="cell shrink-0 justify-center px-1" style="width:${compact.action}px">${actionHtml}</div>
                </div>`;
        }

        function normalizeTaskModel() {
            tasks = (tasks || []).map(task => ({
                ...task,
                duration: parseInt(task.duration, 10) || 1,
                cost: parseFloat(String(task.cost ?? 0).replace(/,/g, '')) || 0,
                progress: clampNumber(task.progress ?? 0, 0, 100)
            }));
        }

        function getTaskProgressForDisplay(task, index) {
            if (!task) return 0;
            if (task.isGroup) return Math.round(getGroupProgressAtIndex(index));
            return Math.round(clampNumber(task.progress, 0, 100));
        }

        function getGroupProgressAtIndex(index) {
            const children = [];
            for (let i = index + 1; i < tasks.length; i++) {
                if (tasks[i].isGroup) break;
                if (!tasks[i].isMilestone) children.push(tasks[i]);
            }
            if (!children.length) return clampNumber(tasks[index]?.progress, 0, 100);
            const totalCost = children.reduce((sum, task) => sum + (parseFloat(task.cost) || 0), 0);
            if (totalCost > 0) {
                return children.reduce((sum, task) => sum + ((parseFloat(task.cost) || 0) * clampNumber(task.progress, 0, 100)), 0) / totalCost;
            }
            return children.reduce((sum, task) => sum + clampNumber(task.progress, 0, 100), 0) / children.length;
        }

        function moveTaskUp(index) {
            if (index > 0) {
                let temp = tasks[index];
                tasks[index] = tasks[index - 1];
                tasks[index - 1] = temp;
                calculateDates();
            }
        }

        function moveTaskDown(index) {
            if (index < tasks.length - 1) {
                let temp = tasks[index];
                tasks[index] = tasks[index + 1];
                tasks[index + 1] = temp;
                calculateDates();
            }
        }

        function insertTaskRow(index) {
            let parentStart = safeFormatDate(new Date());
            if (index > 0) {
                let prevT = tasks[index - 1];
                if (prevT.endDateObj && !isNaN(prevT.endDateObj.getTime())) {
                    let d = new Date(prevT.endDateObj);
                    d.setDate(d.getDate() + 1);
                    parentStart = safeFormatDate(d);
                } else if (prevT.start) {
                    parentStart = prevT.start;
                }
            } else if (tasks.length > 0 && tasks[0].start) {
                parentStart = tasks[0].start;
            }

            tasks.splice(index, 0, {
                id: Date.now(),
                name: "รายการใหม่...",
                duration: 5,
                start: parentStart,
                isGroup: false,
                isMilestone: false,
                predecessors: "",
                cost: 0,
                progress: 0
            });
            calculateDates();
        }

        function getDateOffsetPx(targetDate) {
            let startDiffMs = targetDate - projectStartDate;
            let days = startDiffMs / (1000 * 60 * 60 * 24);

            if (currentScale === 'daily') return days * colWidth;
            if (currentScale === 'weekly') return (days / 7) * colWidth;
            if (currentScale === 'monthly') {
                const monthPosition = (date) => {
                    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                    const dayFraction = (date.getDate() - 1 + (date.getHours() / 24) + (date.getMinutes() / 1440)) / daysInMonth;
                    return (date.getFullYear() * 12) + date.getMonth() + dayFraction;
                };
                return (monthPosition(targetDate) - monthPosition(projectStartDate)) * colWidth;
            }
            if (currentScale === 'yearly') {
                const yearPosition = (date) => {
                    const isLeap = new Date(date.getFullYear(), 1, 29).getMonth() === 1;
                    const daysInYear = isLeap ? 366 : 365;
                    const startOfYear = new Date(date.getFullYear(), 0, 1);
                    const dayOfYear = (date - startOfYear) / (1000 * 60 * 60 * 24);
                    return date.getFullYear() + (dayOfYear / daysInYear);
                };
                return (yearPosition(targetDate) - yearPosition(projectStartDate)) * colWidth;
            }
            return 0;
        }

        function getDateFromOffsetPx(px) {
            let d = new Date(projectStartDate);
            if (currentScale === 'daily') {
                d.setTime(d.getTime() + (px / colWidth) * 24 * 60 * 60 * 1000);
            } else if (currentScale === 'weekly') {
                d.setTime(d.getTime() + (px / colWidth) * 7 * 24 * 60 * 60 * 1000);
            } else if (currentScale === 'monthly') {
                let monthsOffset = px / colWidth;
                let fullMonths = Math.floor(monthsOffset);
                let fraction = monthsOffset - fullMonths;
                d.setMonth(d.getMonth() + fullMonths);
                let daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                d.setTime(d.getTime() + fraction * daysInMonth * 24 * 60 * 60 * 1000);
            } else if (currentScale === 'yearly') {
                let yearsOffset = px / colWidth;
                let fullYears = Math.floor(yearsOffset);
                let fraction = yearsOffset - fullYears;
                d.setFullYear(d.getFullYear() + fullYears);
                let isLeap = new Date(d.getFullYear(), 1, 29).getMonth() === 1;
                let daysInYear = isLeap ? 366 : 365;
                d.setTime(d.getTime() + fraction * daysInYear * 24 * 60 * 60 * 1000);
            }
            d.setHours(0, 0, 0, 0); 
            return d;
        }

        function parsePredecessors(predString) {
            if (!predString) return [];
            return predString.split(',').map(s => {
                let match = s.trim().match(/^([0-9.]+)\s*(FS|SS|FF|SF)?\s*([+-]\s*\d+)?$/i);
                if (match) {
                    const lagDays = parseInt(String(match[3] || '0').replace(/\s+/g, ''), 10) || 0;
                    return { wbs: match[1], type: (match[2] || 'FS').toUpperCase(), lagDays };
                }
                return null;
            }).filter(x => x);
        }

        function offsetDateByDays(date, days) {
            const next = new Date(date);
            next.setDate(next.getDate() + (parseInt(days, 10) || 0));
            return next;
        }

        function ensureUniqueTaskIds() {
            const seen = new Set();
            let changed = false;
            (tasks || []).forEach((task, index) => {
                const key = String(task.id || '');
                if (!key || seen.has(key)) {
                    task.id = Date.now() + index + Math.floor(Math.random() * 1000);
                    changed = true;
                }
                seen.add(String(task.id));
            });
            return changed;
        }

        function calculateDates(saveHistory = true) {
            ensureUniqueTaskIds();
            let minDate = new Date("2100-01-01");
            let maxDate = new Date("1900-01-01");

            let mainCounter = 0;
            let subCounter = 0;

            const colorPalette = [
                { main: '#002D62', sub: '#3b82f6' },
                { main: '#065f46', sub: '#10b981' },
                { main: '#9a3412', sub: '#f97316' },
                { main: '#4c1d95', sub: '#8b5cf6' },
                { main: '#831843', sub: '#f43f5e' },
                { main: '#1e3a8a', sub: '#6366f1' },
                { main: '#14532d', sub: '#22c55e' } 
            ];

            tasks.forEach(t => {
                t.isCritical = false;
                t.predecessorsStr = t.predecessors || "";
                t.preds = parsePredecessors(t.predecessorsStr);
                t.duration = parseInt(t.duration) || 1;
                t.cost = parseFloat(t.cost) || 0;
                t.cost = parseFloat(String(t.cost ?? 0).toString().replace(/,/g, '')) || 0;
                t.progress = clampNumber(t.progress ?? 0, 0, 100);

                if (t.isMilestone) {
                    t.wbs = "⭐";
                    t.colorTheme = colorPalette[Math.max(0, mainCounter - 1) % colorPalette.length];
                    t.duration = 1;
                } 
                else if (t.isGroup) {
                    mainCounter++;
                    subCounter = 0;
                    t.wbs = mainCounter.toString();
                    t.colorTheme = colorPalette[(mainCounter - 1) % colorPalette.length];
                } else {
                    if (mainCounter === 0) {
                        subCounter++;
                        t.wbs = "0." + subCounter;
                        t.colorTheme = colorPalette[0];
                    } else {
                        subCounter++;
                        t.wbs = mainCounter + "." + subCounter;
                        t.colorTheme = colorPalette[(mainCounter - 1) % colorPalette.length];
                    }
                }

                let dStr = t.start;
                if (dStr && dStr.length === 10) dStr += "T00:00:00"; 
                t.manualStartObj = dStr ? new Date(dStr) : new Date();
                t.manualStartObj.setHours(0, 0, 0, 0); 
                t.startDateObj = new Date(t.manualStartObj);
                t.endDateObj = new Date(t.startDateObj);
                if(!t.isMilestone) t.endDateObj.setDate(t.startDateObj.getDate() + t.duration - 1);
            });

            const calculationFloor = tasks.reduce((min, task) => {
                const candidate = task.manualStartObj instanceof Date ? task.manualStartObj : new Date(task.start || '');
                return !isNaN(candidate.getTime()) && candidate < min ? new Date(candidate) : min;
            }, new Date("2100-01-01"));
            if (isNaN(calculationFloor.getTime()) || calculationFloor.getFullYear() >= 2100) {
                calculationFloor.setTime(new Date("1900-01-01").getTime());
            }

            let changed = true;
            let loopCount = 0;
            const MAX_LOOPS = tasks.length * 2;

            while (changed && loopCount < MAX_LOOPS) {
                changed = false;
                loopCount++;

                for (let i = 0; i < tasks.length; i++) {
                    let t = tasks[i];

                    if (t.isGroup) {
                        let gStart = new Date("2100-01-01");
                        let gEnd = new Date("1900-01-01");
                        let hasChildren = false;

                        for (let j = i + 1; j < tasks.length; j++) {
                            if (tasks[j].isGroup) break;
                            hasChildren = true;
                            if (tasks[j].startDateObj < gStart) gStart = new Date(tasks[j].startDateObj);
                            if (tasks[j].endDateObj > gEnd) gEnd = new Date(tasks[j].endDateObj);
                        }

                        if (hasChildren) {
                            if (t.startDateObj.getTime() !== gStart.getTime() || t.endDateObj.getTime() !== gEnd.getTime()) {
                                t.startDateObj = new Date(gStart);
                                t.endDateObj = new Date(gEnd);
                                t.duration = Math.ceil(Math.abs(gEnd - gStart) / (1000 * 60 * 60 * 24)) + 1;
                                t.start = safeFormatDate(gStart);
                                changed = true;
                            }
                        }
                    } else {
                        if (t.preds.length > 0) {
                            let candidateStart = new Date(calculationFloor);
                            let foundValid = false;

                            t.preds.forEach(pReq => {
                                let pTask = tasks.find(pt => pt.wbs === pReq.wbs);
                                if (pTask) {
                                    foundValid = true;
                                    let cStart = new Date();
                                    
                                    if (pReq.type === 'FS') {
                                        cStart = new Date(pTask.endDateObj);
                                        cStart.setDate(cStart.getDate() + 1);
                                    } else if (pReq.type === 'SS') {
                                        cStart = new Date(pTask.startDateObj);
                                    } else if (pReq.type === 'FF') {
                                        cStart = new Date(pTask.endDateObj);
                                        cStart.setDate(cStart.getDate() - t.duration + 1);
                                    } else if (pReq.type === 'SF') {
                                        cStart = new Date(pTask.startDateObj);
                                        cStart.setDate(cStart.getDate() - t.duration);
                                    }
                                    cStart = offsetDateByDays(cStart, pReq.lagDays);

                                    if (cStart > candidateStart) {
                                        candidateStart = cStart;
                                    }
                                }
                            });

                            if (foundValid) {
                                let newStart = new Date(candidateStart);
                                let newEnd = new Date(newStart);
                                if (!t.isMilestone) newEnd.setDate(newStart.getDate() + t.duration - 1);

                                if (t.startDateObj.getTime() !== newStart.getTime() || t.endDateObj.getTime() !== newEnd.getTime()) {
                                    t.startDateObj = newStart;
                                    t.endDateObj = newEnd;
                                    t.start = safeFormatDate(newStart);
                                    changed = true;
                                }
                            }
                        }
                    }
                }
            }

            tasks.forEach(t => {
                if (t.startDateObj < minDate) minDate = new Date(t.startDateObj);
                if (t.endDateObj > maxDate) maxDate = new Date(t.endDateObj);
            });

            getInstallmentSchedule().forEach(item => {
                if (item.dateObj < minDate) minDate = new Date(item.dateObj);
                if (item.dateObj > maxDate) maxDate = new Date(item.dateObj);
            });

            let projectMaxEnd = new Date("1900-01-01");
            tasks.forEach(t => {
                if (!t.isGroup && !t.isMilestone && t.endDateObj > projectMaxEnd) {
                    projectMaxEnd = t.endDateObj;
                }
            });

            let criticalQueue = [];
            tasks.forEach(t => {
                if (!t.isGroup && !t.isMilestone && t.endDateObj.getTime() === projectMaxEnd.getTime()) {
                    t.isCritical = true;
                    criticalQueue.push(t);
                }
            });

            let sanityLimit = 0;
            while(criticalQueue.length > 0 && sanityLimit < 1000) {
                sanityLimit++;
                let curr = criticalQueue.shift();

                if (curr.preds && curr.preds.length > 0) {
                    curr.preds.forEach(pReq => {
                        let pTask = tasks.find(pt => pt.wbs === pReq.wbs);
                        if (pTask && !pTask.isCritical && !pTask.isGroup) {
                            let isTight = false;
                            const lagMs = (parseInt(pReq.lagDays, 10) || 0) * 86400000;
                            if (pReq.type === 'FS' && pTask.endDateObj.getTime() + 86400000 + lagMs === curr.startDateObj.getTime()) isTight = true;
                            if (pReq.type === 'SS' && pTask.startDateObj.getTime() + lagMs === curr.startDateObj.getTime()) isTight = true;
                            if (pReq.type === 'FF' && pTask.endDateObj.getTime() + lagMs === curr.endDateObj.getTime()) isTight = true;
                            if (pReq.type === 'SF' && pTask.startDateObj.getTime() + 86400000 + lagMs === curr.endDateObj.getTime()) isTight = true;

                            if (isTight) {
                                pTask.isCritical = true;
                                criticalQueue.push(pTask);
                            }
                        }
                    });
                } else {
                    let potentialPreds = tasks.filter(t => 
                        !t.isGroup && !t.isMilestone && !t.isCritical && 
                        t.endDateObj <= curr.startDateObj && 
                        (curr.startDateObj - t.endDateObj) / (1000 * 60 * 60 * 24) <= 3
                    );

                    if (potentialPreds.length > 0) {
                        let maxEnd = new Date("1900-01-01");
                        potentialPreds.forEach(t => { if (t.endDateObj > maxEnd) maxEnd = t.endDateObj; });
                        potentialPreds.forEach(t => {
                            if (t.endDateObj.getTime() === maxEnd.getTime()) {
                                t.isCritical = true;
                                criticalQueue.push(t);
                            }
                        });
                    }
                }
            }

            let totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
            let safeTotalDays = isNaN(totalDays) ? 0 : totalDays;
            
            document.getElementById('summary-start').innerText = formatDateDisplay(minDate);
            document.getElementById('summary-end').innerText = formatDateDisplay(maxDate);
            document.getElementById('header-duration-input').value = safeTotalDays;

            let preferredScale = userScalePreference;
            if (preferredScale === 'auto') {
                if (safeTotalDays > 730) preferredScale = 'yearly';
                else if (safeTotalDays > 200) preferredScale = 'monthly';
                else if (safeTotalDays > 45) preferredScale = 'weekly';
                else preferredScale = 'daily';
            }
            if (preferredScale === 'yearly') {
                currentScale = 'yearly'; colWidth = 160;
            } else if (preferredScale === 'monthly') {
                currentScale = 'monthly'; colWidth = 120;
            } else if (preferredScale === 'weekly') {
                currentScale = 'weekly'; colWidth = 60;
            } else {
                currentScale = 'daily'; colWidth = 25;
            }
            projectStartDate = new Date(minDate);
            projectStartDate.setDate(projectStartDate.getDate() - 7);
            projectEndDate = new Date(maxDate);
            projectEndDate.setDate(projectEndDate.getDate() + 7);
            projectStartDate.setHours(0, 0, 0, 0);
            projectEndDate.setHours(23, 59, 59, 999); 
            
            renderUI();
            
            if (saveHistory) {
                saveState();
            }
        }

setupDurationPlanSelectionClearListener();
