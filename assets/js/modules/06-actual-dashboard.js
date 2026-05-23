// BuildPlan Pro - Actual progress and dashboard rendering
// Split from assets/js/app.js without behavior changes.

        function setActualFrequency(value) {
            actualSettings.frequency = value === 'daily' ? 'daily' : 'weekly';
            renderActualProgressPage();
            scheduleAutoSave();
        }

        function updateActualTaskProgress(taskId, value) {
            const dateKey = getActualSelectedDateKey();
            const snapshot = getActualSnapshotForDate(dateKey);
            const pct = clampNumber(value, 0, 100);
            if (pct > 0) snapshot[String(taskId)] = pct;
            else delete snapshot[String(taskId)];
            if (pct >= 100) pruneFutureActualEntriesForTask(taskId, dateKey);
            syncTaskProgressFromActual(dateKey, taskId);
            renderActualLatestSavedDate();
            renderActualSummary(dateKey);
            renderActualCurveChart();
            renderTable();
            renderGanttBars();
            renderGanttSCurveOverlay();
            renderDashboard();
            scheduleAutoSave();
        }

        function clampActualTaskNameColumnWidth(value) {
            return Math.min(760, Math.max(220, parseInt(value, 10) || 320));
        }

        function syncActualTaskNameColumnWidth() {
            actualTaskNameColumnWidth = clampActualTaskNameColumnWidth(actualTaskNameColumnWidth);
            document.documentElement.style.setProperty('--actual-task-name-col-width', actualTaskNameColumnWidth + 'px');
        }

        function setupActualTaskNameResizer() {
            const handle = document.getElementById('actual-task-name-resizer');
            if (!handle || handle.dataset.bound === '1') return;
            handle.dataset.bound = '1';
            handle.addEventListener('mousedown', (event) => {
                event.preventDefault();
                const startX = event.clientX;
                const startWidth = actualTaskNameColumnWidth;
                document.body.classList.add('resizing-actual-task-name');
                function onMouseMove(moveEvent) {
                    actualTaskNameColumnWidth = clampActualTaskNameColumnWidth(startWidth + (moveEvent.clientX - startX));
                    syncActualTaskNameColumnWidth();
                }
                function onMouseUp() {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    document.body.classList.remove('resizing-actual-task-name');
                    scheduleAutoSave();
                }
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }

        function getEffectiveActualPercentForTask(taskId, dateKey) {
            const current = actualEntries?.[dateKey]?.[String(taskId)];
            if (current !== undefined) return clampNumber(current, 0, 100);
            return getTaskActualPercentAtDate(taskId, dateKey);
        }

        function pruneFutureActualEntriesForTask(taskId, completeDateKey) {
            Object.keys(actualEntries || {}).forEach(key => {
                if (key <= completeDateKey) return;
                if (actualEntries[key]?.[String(taskId)] !== undefined) {
                    delete actualEntries[key][String(taskId)];
                    if (!Object.keys(actualEntries[key]).length) delete actualEntries[key];
                }
            });
        }

        function getLatestActualRecordForTask(taskId) {
            const completeRecord = getTaskCompletionRecord(taskId);
            if (completeRecord) return completeRecord;
            const keys = Object.keys(actualEntries || {}).filter(key => actualEntries[key]?.[String(taskId)] !== undefined).sort();
            if (!keys.length) return null;
            const dateKey = keys[keys.length - 1];
            return { dateKey, date: new Date(dateKey + 'T00:00:00'), percent: clampNumber(actualEntries[dateKey][String(taskId)], 0, 100) };
        }

        function getTaskCompletionRecord(taskId, targetDateKey = null) {
            const keys = Object.keys(actualEntries || {})
                .filter(key => (!targetDateKey || key <= targetDateKey) && clampNumber(actualEntries[key]?.[String(taskId)], 0, 100) >= 100)
                .sort();
            if (!keys.length) return null;
            const dateKey = keys[0];
            return { dateKey, date: new Date(dateKey + 'T00:00:00'), percent: 100 };
        }

        function syncTaskProgressFromActual(dateKey = getActualSelectedDateKey(), taskId = null) {
            (tasks || []).forEach(task => {
                if (task.isGroup || task.isMilestone) return;
                if (taskId !== null && String(task.id) !== String(taskId)) return;
                task.progress = getEffectiveActualPercentForTask(task.id, dateKey);
            });
        }

        function saveActualSnapshot() {
            const dateKey = getActualSelectedDateKey();
            getActualSnapshotForDate(dateKey);
            renderActualProgressPage();
            scheduleAutoSave();
            finishProcessingAlert({ title: 'บันทึก Actual แล้ว', text: `บันทึกข้อมูล ณ ${formatDateDisplay(new Date(dateKey + 'T00:00:00'))}` });
        }

        function hasExplicitActualEntry(dateKey) {
            return Object.values(actualEntries?.[dateKey] || {}).some(value => clampNumber(value, 0, 100) > 0);
        }

        function getLatestActualEntryDateKey() {
            const keys = Object.keys(actualEntries || {})
                .filter(key => hasExplicitActualEntry(key))
                .sort();
            return keys.length ? keys[keys.length - 1] : null;
        }

        function renderActualLatestSavedDate() {
            const latestSavedEl = document.getElementById('actual-latest-saved');
            if (!latestSavedEl) return;
            const latestKey = getLatestActualEntryDateKey();
            latestSavedEl.textContent = latestKey ? 'วันที่ล่าสุดที่มีการบันทึกข้อมูล: ' + formatDateDisplay(new Date(latestKey + 'T00:00:00')) : 'วันที่ล่าสุดที่มีการบันทึกข้อมูล: -';
        }

        function renderActualProgressPage() {
            const dateInput = document.getElementById('actual-entry-date');
            const frequencyInput = document.getElementById('actual-frequency');
            if (!dateInput) return;
            if (!dateInput.value) dateInput.value = safeFormatDate(new Date());
            if (frequencyInput && document.activeElement !== frequencyInput) frequencyInput.value = actualSettings.frequency || 'weekly';
            const dateKey = getActualSelectedDateKey();
            const selectedDate = new Date(dateKey + 'T00:00:00');
            const snapshot = actualEntries?.[dateKey] || {};
            renderActualLatestSavedDate();
            const table = document.getElementById('actual-progress-table');
            if (table) {
                syncActualTaskNameColumnWidth();
                const header = `\n                    <div class="actual-table-shell">\n                        <div id="actual-task-name-resizer" class="actual-task-name-resizer actual-task-name-resizer-overlay" title="ลากเพื่อปรับความกว้าง"></div>`;
                const rows = getWorkTasksForActual().map(task => {
                    const plannedPct = getTaskPlannedPercentAtDate(task, selectedDate);
                    const value = getEffectiveActualPercentForTask(task.id, dateKey);
                    const completeRecord = getTaskCompletionRecord(task.id, dateKey);
                    const complete = !!completeRecord;
                    const actualControl = complete ? `
                                <div class="actual-complete-badge">Complete วันที่ ${formatDateDisplay(completeRecord.date)}</div>` : `
                                <input type="number" min="0" max="100" step="0.01" value="${value || ''}" onchange="updateActualTaskProgress(${task.id}, this.value)" class="actual-input">`;
                    return `
                        <div class="actual-row ${complete ? 'actual-complete-row' : ''}">
                            <div class="actual-cell actual-wbs">${escapeTooltipHtml(task.wbs || '')}</div>
                            <div class="actual-cell actual-task-name-col">${escapeTooltipHtml(task.name || '')}</div>
                            <div class="actual-cell actual-planned">${plannedPct.toFixed(2)}%</div>
                            <div class="actual-cell actual-input-col ${complete ? 'actual-complete-cell' : ''}">
${actualControl}
                            </div>
                        </div>`;
                }).join('');
                table.innerHTML = rows ? header + rows + '</div>' : `<div class="px-6 py-8 text-center text-slate-400 text-sm">ยังไม่มีรายการงานสำหรับบันทึก Actual</div>`;
                setupActualTaskNameResizer();
            }
            syncTaskProgressFromActual(dateKey);
            renderActualSummary(dateKey);
            renderActualCurveChart();
        }

        function renderActualSummary(dateKey = getActualSelectedDateKey()) {
            const metrics = computeActualVariance(dateKey);
            const plannedEl = document.getElementById('actual-planned-kpi');
            const actualEl = document.getElementById('actual-current-kpi');
            const varianceEl = document.getElementById('actual-variance-kpi');
            const daysEl = document.getElementById('actual-days-kpi');
            if (plannedEl) plannedEl.textContent = metrics.planned.toFixed(2) + '%';
            if (actualEl) actualEl.textContent = metrics.actual.toFixed(2) + '%';
            if (varianceEl) {
                varianceEl.textContent = (metrics.variance >= 0 ? '+' : '') + metrics.variance.toFixed(2) + '%';
                varianceEl.className = `kpi-value ${metrics.variance >= 0 ? 'text-emerald-700' : 'text-red-700'}`;
            }
            if (daysEl) {
                const absDays = Math.abs(metrics.dayDelta);
                daysEl.textContent = metrics.dayDelta > 0 ? `เร็วกว่า ${absDays} วัน` : metrics.dayDelta < 0 ? `ช้ากว่า ${absDays} วัน` : 'ตรงตามแผน';
                daysEl.className = `kpi-value ${metrics.dayDelta >= 0 ? 'text-emerald-700' : 'text-red-700'}`;
            }
        }

        function getActualSeries() {
            return Object.keys(actualEntries || {})
                .filter(key => hasExplicitActualEntry(key))
                .sort()
                .map(dateKey => {
                    const date = new Date(dateKey + 'T00:00:00');
                    return {
                        dateKey,
                        date,
                        planned: getPlannedProgressPercentAtDate(date),
                        actual: getActualProgressAtDate(dateKey)
                    };
                });
        }

        function renderActualCurveChart() {
            const container = document.getElementById('actual-curve-chart');
            if (!container) return;
            const series = getActualSeries();
            const sData = getSCurveData();
            if (!series.length || !sData.points.length) {
                container.innerHTML = `<div class="h-[360px] flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-300 rounded-lg bg-slate-50">บันทึก Actual อย่างน้อย 1 วันที่เพื่อแสดงกราฟเปรียบเทียบ</div>`;
                return;
            }
            const width = 900;
            const height = 360;
            const margin = { top: 24, right: 24, bottom: 54, left: 64 };
            const plotWidth = width - margin.left - margin.right;
            const plotHeight = height - margin.top - margin.bottom;
            const minDate = new Date(Math.min(sData.startDate.getTime(), ...series.map(p => p.date.getTime())));
            const maxDate = new Date(Math.max(sData.endDate.getTime(), ...series.map(p => p.date.getTime())));
            const totalMs = Math.max(86400000, maxDate - minDate);
            const xForDate = date => margin.left + ((date - minDate) / totalMs) * plotWidth;
            const yForPct = pct => margin.top + plotHeight - (clampNumber(pct, 0, 100) / 100) * plotHeight;
            const totalValue = Math.max(1, parseFloat(sData.totalValue) || parseFloat(computeCostSummaryData().projectTotal) || 1);
            const plannedPoints = sData.points.map(point => ({
                x: xForDate(point.date),
                y: yForPct((point.cumulative / totalValue) * 100)
            }));
            const actualPoints = series.map(point => ({ x: xForDate(point.date), y: yForPct(point.actual) }));
            const pathFromPoints = points => points.map((point, idx) => `${idx ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
            const yGrid = [0, 25, 50, 75, 100].map(pct => {
                const y = yForPct(pct);
                return `<line x1="${margin.left}" y1="${y}" x2="${margin.left + plotWidth}" y2="${y}" class="chart-grid-line"></line><text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" class="chart-axis-text">${pct}%</text>`;
            }).join('');
            const circles = series.map(point => `<circle cx="${xForDate(point.date).toFixed(2)}" cy="${yForPct(point.actual).toFixed(2)}" r="4" class="chart-point-red" style="fill:#dc2626"></circle>`).join('');
            container.innerHTML = `
                <div class="w-full overflow-auto custom-scrollbar">
                    <svg viewBox="0 0 ${width} ${height}" class="w-full min-w-[720px] h-[360px]" role="img" aria-label="Planned and actual progress chart">
                        ${yGrid}
                        <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" class="chart-axis-line"></line>
                        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" class="chart-axis-line"></line>
                        <path d="${pathFromPoints(plannedPoints)}" class="chart-line-red"></path>
                        <path d="${pathFromPoints(actualPoints)}" class="chart-line-actual"></path>
                        ${circles}
                        <text x="${margin.left}" y="16" class="chart-title-text">Planned vs Actual Progress</text>
                        <text x="${margin.left + 10}" y="${height - 14}" class="chart-axis-text" style="fill:#2563eb">น้ำเงิน: Master Plan</text>
                        <text x="${margin.left + 170}" y="${height - 14}" class="chart-axis-text" style="fill:#dc2626">แดงประ: Actual</text>
                    </svg>
                </div>`;
        }

        function syncPageSpecificLayout() {
            const projectInfoHeader = document.getElementById('project-info-header');
            const signatureSection = document.getElementById('signature-section');
            const sigToggleWrapper = document.querySelector('.sig-toggle-wrapper');
            const isDocumentPage = currentPage === 'gantt';

            if (projectInfoHeader) projectInfoHeader.style.display = isDocumentPage ? '' : 'none';
            if (sigToggleWrapper) sigToggleWrapper.style.display = isDocumentPage ? '' : 'none';
            if (signatureSection) signatureSection.style.display = isDocumentPage && isSignatureVisible ? 'flex' : 'none';
        }

        function switchPage(page) {
            updateSidebarOffset();
            const pages = {
                gantt: document.getElementById('gantt-page'),
                dashboard: document.getElementById('dashboard-page'),
                actual: document.getElementById('actual-page'),
                cost: document.getElementById('cost-page'),
                duration: document.getElementById('duration-page')
            };
            const buttons = {
                gantt: document.getElementById('btn-page-gantt'),
                dashboard: document.getElementById('btn-page-dashboard'),
                actual: document.getElementById('btn-page-actual'),
                cost: document.getElementById('btn-page-cost'),
                duration: document.getElementById('btn-page-duration')
            };

            const nextPage = pages[page] ? page : 'gantt';
            currentPage = nextPage;

            Object.values(buttons).forEach(btn => btn?.classList.remove('page-tab-active'));
            buttons[nextPage]?.classList.add('page-tab-active');

            if (nextPage === 'cost') {
                normalizeCostSettingsInputs();
                renderCostTable();
                renderInstallmentPanel();
            } else if (nextPage === 'actual') {
                renderActualProgressPage();
            } else if (nextPage === 'duration') {
                renderDurationPlanTable();
            } else if (nextPage === 'dashboard') {
                renderDashboard();
            } else {
                applyPlanPageDefaultToggles();
                renderUI();
            }

            syncPageSpecificLayout();

            const pageElements = Object.values(pages).filter(Boolean);
            const targetPage = pages[nextPage];
            const hasVisibleOutgoingPage = pageElements.some(el => el !== targetPage && !el.classList.contains('page-hidden'));

            if (pageSwitchTimer) clearTimeout(pageSwitchTimer);
            pageElements.forEach(el => {
                if (el !== targetPage) el.classList.remove('page-active');
            });

            const showTargetPage = () => {
                pageElements.forEach(el => {
                    if (el !== targetPage) el.classList.add('page-hidden');
                });
                targetPage.classList.remove('page-hidden');
                targetPage.classList.remove('page-active');
                void targetPage.offsetWidth;
                requestAnimationFrame(() => targetPage.classList.add('page-active'));
                pageSwitchTimer = null;
            };

            if (hasVisibleOutgoingPage) {
                pageSwitchTimer = setTimeout(showTargetPage, 140);
            } else {
                showTargetPage();
            }
        }

        function getTaskFinalValueMap() {
            const map = new Map();
            let currentGroupName = '';
            tasks.forEach(task => {
                if (task.isGroup) {
                    currentGroupName = task.name || '';
                    return;
                }
                if (task.isMilestone) return;
                const baseCost = parseFloat(task.cost) || 0;
                const rateInfo = getTaskRateInfo(task, currentGroupName);
                map.set(task.id, baseCost * rateInfo.rate);
            });
            return map;
        }

        function getPlannedProgressAtDate(targetDate, totalValue) {
            const sData = getSCurveData();
            if (!sData.points.length || !totalValue) return 0;
            const target = new Date(targetDate || new Date());
            target.setHours(0, 0, 0, 0);
            let current = null;
            for (const point of sData.points) {
                if (point.date <= target) current = point;
                else break;
            }
            return current ? Math.min(100, Math.max(0, (current.cumulative / totalValue) * 100)) : 0;
        }

        function computeProjectMetrics() {
            const workTasks = tasks.filter(task => !task.isGroup && !task.isMilestone);
            const milestones = tasks.filter(task => task.isMilestone);
            const costMap = getTaskFinalValueMap();
            const projectTotal = Array.from(costMap.values()).reduce((sum, value) => sum + value, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const actualValue = workTasks.reduce((sum, task) => sum + ((costMap.get(task.id) || 0) * clampNumber(task.progress, 0, 100) / 100), 0);
            const averageProgress = workTasks.length ? workTasks.reduce((sum, task) => sum + clampNumber(task.progress, 0, 100), 0) / workTasks.length : 0;
            const actualProgress = projectTotal > 0 ? (actualValue / projectTotal) * 100 : averageProgress;
            const plannedProgress = getPlannedProgressAtDate(today, projectTotal || getSCurveData().totalValue);
            const overdue = workTasks.filter(task => task.endDateObj && task.endDateObj < today && clampNumber(task.progress, 0, 100) < 100);
            const inProgress = workTasks.filter(task => task.startDateObj && task.endDateObj && task.startDateObj <= today && task.endDateObj >= today && clampNumber(task.progress, 0, 100) < 100);
            const complete = workTasks.filter(task => clampNumber(task.progress, 0, 100) >= 100);
            const upcoming = workTasks.filter(task => task.startDateObj && task.startDateObj >= today && clampNumber(task.progress, 0, 100) < 100).sort((a, b) => a.startDateObj - b.startDateObj).slice(0, 6);
            const critical = workTasks.filter(task => task.isCritical).sort((a, b) => a.startDateObj - b.startDateObj);
            const variance = actualProgress - plannedProgress;
            return { workTasks, milestones, projectTotal, actualValue, actualProgress, plannedProgress, variance, overdue, inProgress, complete, upcoming, critical };
        }

        function renderDashboardBar(label, value, colorClass) {
            const pct = Math.min(100, Math.max(0, value || 0));
            return `
                <div>
                    <div class="flex items-center justify-between text-sm font-bold text-slate-700 mb-1">
                        <span>${label}</span><span>${pct.toFixed(2)}%</span>
                    </div>
                    <div class="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        <div class="h-full ${colorClass}" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        }

        function renderDashboardList(tasksForList, emptyText) {
            if (!tasksForList.length) return `<div class="text-slate-400 text-sm">${emptyText}</div>`;
            return tasksForList.map(task => {
                const completeRecord = getTaskCompletionRecord(task.id);
                const dateLine = completeRecord
                    ? `Complete วันที่ ${formatDateDisplay(completeRecord.date)}`
                    : `${formatDateDisplay(task.startDateObj)} - ${formatDateDisplay(task.endDateObj)}`;
                const progress = getTaskProgressForDisplay(task, tasks.indexOf(task));
                const completeClass = progress >= 100 ? 'dashboard-complete-item' : '';
                return `
                <div class="dashboard-task-item ${completeClass} flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div class="min-w-0">
                        <div class="font-bold text-slate-800 truncate">${escapeTooltipHtml(task.wbs || '-')} ${escapeTooltipHtml(task.name || '-')}</div>
                        <div class="text-xs ${completeRecord ? 'text-emerald-700 font-black' : 'text-slate-500'}">${dateLine}</div>
                    </div>
                    <div class="text-xs font-black text-emerald-700 whitespace-nowrap">${progress}%</div>
                </div>
            `;
            }).join('');
        }

        function renderDashboard() {
            const kpis = document.getElementById('dashboard-kpis');
            if (!kpis) return;
            const metrics = computeProjectMetrics();
            const healthChip = document.getElementById('dashboard-health-chip');
            const varianceText = metrics.variance.toFixed(2) + '%';
            let healthClass = 'health-good';
            let healthText = 'On Track';
            if (metrics.overdue.length || metrics.variance < -10) {
                healthClass = 'health-risk';
                healthText = 'Risk';
            } else if (metrics.variance < -3) {
                healthClass = 'health-watch';
                healthText = 'Watch';
            }
            if (healthChip) {
                healthChip.className = 'health-chip ' + healthClass;
                healthChip.innerHTML = `<i class="fa-solid fa-circle-check"></i>${healthText}`;
            }
            kpis.innerHTML = `
                <div class="kpi-card"><div class="kpi-label">งานทั้งหมด</div><div class="kpi-value">${metrics.workTasks.length}</div><div class="text-xs text-slate-500 mt-2">Milestone ${metrics.milestones.length} รายการ</div></div>
                <div class="kpi-card"><div class="kpi-label">เสร็จแล้ว</div><div class="kpi-value text-emerald-700">${metrics.complete.length}</div><div class="text-xs text-slate-500 mt-2">${metrics.actualProgress.toFixed(2)}% actual progress</div></div>
                <div class="kpi-card"><div class="kpi-label">งานล่าช้า</div><div class="kpi-value text-red-700">${metrics.overdue.length}</div><div class="text-xs text-slate-500 mt-2">ยังไม่ครบ 100% หลังวันสิ้นสุด</div></div>
                <div class="kpi-card"><div class="kpi-label">มูลค่าโครงการ</div><div class="kpi-value text-narit-blue">${formatMoneyDisplay(metrics.projectTotal)}</div><div class="text-xs text-slate-500 mt-2">บาท หลัง Factor F / Vat</div></div>
            `;
            const varianceEl = document.getElementById('dashboard-variance');
            if (varianceEl) varianceEl.textContent = 'Variance ' + varianceText;
            const bars = document.getElementById('dashboard-progress-bars');
            if (bars) {
                bars.innerHTML = renderDashboardBar('แผนสะสม', metrics.plannedProgress, 'bg-red-500') + renderDashboardBar('ผลงานจริง', metrics.actualProgress, 'bg-emerald-500');
            }
            const riskList = document.getElementById('dashboard-risk-list');
            if (riskList) riskList.innerHTML = renderDashboardList(metrics.overdue.slice(0, 6), 'ยังไม่มีงานล่าช้า');
            const criticalList = document.getElementById('dashboard-critical-list');
            if (criticalList) criticalList.innerHTML = renderDashboardList(metrics.critical.slice(0, 8), 'ยังไม่มี critical path');
            const upcomingList = document.getElementById('dashboard-upcoming-list');
            if (upcomingList) upcomingList.innerHTML = renderDashboardList(metrics.upcoming, 'ยังไม่มีงานถัดไป');
        }
