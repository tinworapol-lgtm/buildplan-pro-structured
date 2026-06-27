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

        function getTaskActualStartRecord(taskId, targetDateKey = null) {
            const keys = Object.keys(actualEntries || {})
                .filter(key => (!targetDateKey || key <= targetDateKey) && clampNumber(actualEntries[key]?.[String(taskId)], 0, 100) > 0)
                .sort();
            if (!keys.length) return null;
            const dateKey = keys[0];
            return { dateKey, date: new Date(dateKey + 'T00:00:00'), percent: clampNumber(actualEntries[dateKey][String(taskId)], 0, 100) };
        }

        function getTaskActualDateRangeRecord(taskId, targetDateKey = null) {
            const startRecord = getTaskActualStartRecord(taskId, targetDateKey);
            if (!startRecord) return null;
            const completeRecord = getTaskCompletionRecord(taskId, targetDateKey);
            const keys = Object.keys(actualEntries || {})
                .filter(key => (!targetDateKey || key <= targetDateKey) && actualEntries[key]?.[String(taskId)] !== undefined)
                .sort();
            const latestKey = keys.length ? keys[keys.length - 1] : startRecord.dateKey;
            const endDateKey = completeRecord?.dateKey || latestKey;
            return {
                startDateKey: startRecord.dateKey,
                startDate: startRecord.date,
                endDateKey,
                endDate: new Date(endDateKey + 'T00:00:00'),
                percent: completeRecord ? 100 : clampNumber(actualEntries[endDateKey]?.[String(taskId)], 0, 100),
                completeRecord
            };
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
                const header = `\n                    <div class="actual-table-shell">\n                        <div id="actual-task-name-resizer" hidden aria-hidden="true"></div>`;
                const rows = getWorkTasksForActual().map(task => {
                    const plannedPct = getTaskPlannedPercentAtDate(task, selectedDate);
                    const value = getEffectiveActualPercentForTask(task.id, dateKey);
                    const completeRecord = getTaskCompletionRecord(task.id, dateKey);
                    const startRecord = getTaskActualStartRecord(task.id, dateKey);
                    const isCompleteBeforeSelectedDate = !!completeRecord && completeRecord.dateKey < dateKey;
                    const complete = !!completeRecord;
                    const actualControl = isCompleteBeforeSelectedDate ? `
                                <div class="actual-locked-value">${value.toFixed(2)}%</div>` : `
                                <input type="number" min="0" max="100" step="0.01" value="${value || ''}" onchange="updateActualTaskProgress(${task.id}, this.value)" class="actual-input">`;
                    const startDateText = startRecord ? formatDateDisplay(startRecord.date) : '-';
                    const completeDateText = completeRecord ? formatDateDisplay(completeRecord.date) : '-';
                    return `
                        <div class="actual-row ${complete ? 'actual-complete-row' : ''}">
                            <div class="actual-cell actual-wbs">${escapeTooltipHtml(task.wbs || '')}</div>
                            <div class="actual-cell actual-task-name-col">${escapeTooltipHtml(task.name || '')}</div>
                            <div class="actual-cell actual-planned">${plannedPct.toFixed(2)}%</div>
                            <div class="actual-cell actual-input-col ${complete ? 'actual-complete-cell' : ''}">
${actualControl}
                            </div>
                            <div class="actual-cell actual-start-date ${startRecord ? 'actual-date-active' : ''}">${startDateText}</div>
                            <div class="actual-cell actual-complete-date ${completeRecord ? 'actual-date-complete' : ''}">${completeDateText}</div>
                        </div>`;
                }).join('');
                const tableHeader = `
                        <div class="actual-row actual-header">
                            <div class="actual-cell actual-wbs">WBS</div>
                            <div class="actual-cell actual-task-name-col actual-task-name-header">รายการงาน</div>
                            <div class="actual-cell actual-planned">Plan %</div>
                            <div class="actual-cell actual-input-col">Actual %</div>
                            <div class="actual-cell actual-start-date">วันที่เริ่มงาน</div>
                            <div class="actual-cell actual-complete-date">วันที่ Complete</div>
                        </div>`;
                table.innerHTML = rows ? header + tableHeader + rows + '</div>' : `<div class="px-6 py-8 text-center text-slate-400 text-sm">ยังไม่มีรายการงานสำหรับบันทึก Actual</div>`;
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
            const statusCard = document.getElementById('actual-status-kpi-card');
            if (plannedEl) plannedEl.textContent = metrics.planned.toFixed(2) + '%';
            if (actualEl) actualEl.textContent = metrics.actual.toFixed(2) + '%';
            if (varianceEl) {
                varianceEl.textContent = (metrics.variance >= 0 ? '+' : '') + metrics.variance.toFixed(2) + '%';
                varianceEl.className = 'kpi-value';
            }
            if (daysEl) {
                const absDays = Math.abs(metrics.dayDelta);
                daysEl.textContent = metrics.dayDelta > 0 ? `เร็วกว่า ${absDays} วัน` : metrics.dayDelta < 0 ? `ช้ากว่า ${absDays} วัน` : 'ตรงตามแผน';
                daysEl.className = 'kpi-value';
            }
            if (statusCard) {
                statusCard.classList.toggle('dashboard-kpi-status', metrics.dayDelta >= 0);
                statusCard.classList.toggle('dashboard-kpi-danger', metrics.dayDelta < 0);
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
                <div class="w-full overflow-auto custom-scrollbar actual-curve-scroll">
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

        const workflowGuidelinePositionKey = 'buildplan.workflowGuideline.position';

        function getWorkflowGuidelineRoute() {
            return document.body?.dataset?.appRoute || (location.hash || '#home').replace('#', '') || 'home';
        }

        function getWorkflowGuidelineWidth(panel) {
            if (!panel) return 58;
            if (panel.classList.contains('workflow-guideline-collapsed')) return 58;
            return Math.min(318, Math.max(58, window.innerWidth - 16));
        }

        function applyWorkflowGuidelinePosition(left, top, persist = true) {
            const panel = document.getElementById('workflow-guideline');
            if (!panel) return;
            const margin = 8;
            const width = getWorkflowGuidelineWidth(panel);
            const height = Math.min(panel.offsetHeight || 58, window.innerHeight - (margin * 2));
            const maxLeft = Math.max(margin, window.innerWidth - width - margin);
            const maxTop = Math.max(margin, window.innerHeight - height - margin);
            const nextLeft = Math.min(Math.max(margin, left), maxLeft);
            const nextTop = Math.min(Math.max(margin, top), maxTop);

            panel.style.left = nextLeft + 'px';
            panel.style.top = nextTop + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.classList.toggle('workflow-guideline-side-right', nextLeft + (width / 2) > window.innerWidth / 2);

            if (persist) {
                try {
                    localStorage.setItem(workflowGuidelinePositionKey, JSON.stringify({ left: nextLeft, top: nextTop }));
                } catch (_error) {}
            }
        }

        function restoreWorkflowGuidelinePosition() {
            const panel = document.getElementById('workflow-guideline');
            if (!panel) return;
            let position = null;
            try {
                position = JSON.parse(localStorage.getItem(workflowGuidelinePositionKey) || 'null');
            } catch (_error) {}
            const fallbackLeft = parseFloat(panel.style.left) || 10;
            const fallbackTop = parseFloat(panel.style.top) || 146;
            applyWorkflowGuidelinePosition(
                Number.isFinite(position?.left) ? position.left : fallbackLeft,
                Number.isFinite(position?.top) ? position.top : fallbackTop,
                false
            );
        }

        function setupWorkflowGuidelineDrag() {
            const panel = document.getElementById('workflow-guideline');
            const handle = document.getElementById('workflow-guideline-toggle');
            if (!panel || !handle || panel.dataset.dragBound === '1') return;
            panel.dataset.dragBound = '1';

            handle.addEventListener('click', (event) => {
                if (panel.dataset.suppressToggle === '1') {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    delete panel.dataset.suppressToggle;
                }
            }, true);

            handle.addEventListener('pointerdown', (event) => {
                if (event.button !== undefined && event.button !== 0) return;
                panel.dataset.pointerDragActive = '1';
                const rect = panel.getBoundingClientRect();
                const startX = event.clientX;
                const startY = event.clientY;
                let moved = false;

                const onPointerMove = (moveEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    if (!moved && Math.hypot(dx, dy) < 4) return;
                    moved = true;
                    panel.classList.add('is-dragging');
                    applyWorkflowGuidelinePosition(rect.left + dx, rect.top + dy, false);
                };

                const onPointerUp = () => {
                    handle.releasePointerCapture?.(event.pointerId);
                    handle.removeEventListener('pointermove', onPointerMove);
                    handle.removeEventListener('pointerup', onPointerUp);
                    handle.removeEventListener('pointercancel', onPointerUp);
                    window.removeEventListener('pointerup', onPointerUp);
                    window.removeEventListener('pointercancel', onPointerUp);
                    delete panel.dataset.pointerDragActive;
                    panel.classList.remove('is-dragging');
                    if (moved) {
                        panel.dataset.suppressToggle = '1';
                        const nextRect = panel.getBoundingClientRect();
                        applyWorkflowGuidelinePosition(nextRect.left, nextRect.top, true);
                    }
                };

                handle.setPointerCapture?.(event.pointerId);
                handle.addEventListener('pointermove', onPointerMove);
                handle.addEventListener('pointerup', onPointerUp);
                handle.addEventListener('pointercancel', onPointerUp);
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerUp);
            });

            handle.addEventListener('mousedown', (event) => {
                if (event.button !== 0 || panel.dataset.pointerDragActive === '1') return;
                const rect = panel.getBoundingClientRect();
                const startX = event.clientX;
                const startY = event.clientY;
                let moved = false;

                const onMouseMove = (moveEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    if (!moved && Math.hypot(dx, dy) < 4) return;
                    moved = true;
                    panel.classList.add('is-dragging');
                    applyWorkflowGuidelinePosition(rect.left + dx, rect.top + dy, false);
                };

                const onMouseUp = () => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                    panel.classList.remove('is-dragging');
                    if (moved) {
                        panel.dataset.suppressToggle = '1';
                        const nextRect = panel.getBoundingClientRect();
                        applyWorkflowGuidelinePosition(nextRect.left, nextRect.top, true);
                    }
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        }

        function syncWorkflowGuidelineForRoute(route = getWorkflowGuidelineRoute()) {
            setupWorkflowGuidelineDrag();
            if (route === 'workspace') {
                restoreWorkflowGuidelinePosition();
                updateWorkflowGuidelineState();
            }
        }

        function hasWorkflowStepData(step) {
            if (step === 1) {
                return (tasks || []).some(task => !task.isMilestone && (task.name || task.start || task.duration));
            }
            if (step === 2) {
                const projectValue = parseFloat(String(document.getElementById('project-value')?.value || '').replace(/,/g, '')) || 0;
                return projectValue > 0 || (tasks || []).some(task => (parseFloat(task.cost) || 0) > 0);
            }
            if (step === 3) {
                const hasInstallments = (parseInt(installmentSettings?.count, 10) || 0) > 0;
                const hasDurationAllocations = Object.values(durationPlanSettings || {}).some(entry => {
                    return Object.values(entry?.allocations || {}).some(value => (parseFloat(value) || 0) > 0);
                });
                return hasInstallments || hasDurationAllocations;
            }
            if (step === 4) {
                return Object.values(actualEntries || {}).some(snapshot => {
                    return Object.values(snapshot || {}).some(value => (parseFloat(value) || 0) > 0);
                });
            }
            if (step === 5) {
                return hasWorkflowStepData(4) || (dashboardPhotos || []).length > 0;
            }
            return false;
        }

        function updateWorkflowGuidelineState() {
            document.querySelectorAll('.workflow-step').forEach(stepEl => {
                const step = parseInt(stepEl.dataset.guideStep, 10);
                const pageMap = { 1: 'gantt', 2: 'cost', 3: 'duration', 4: 'actual', 5: 'dashboard' };
                stepEl.classList.toggle('is-complete', hasWorkflowStepData(step));
                stepEl.classList.toggle('is-active', pageMap[step] === currentPage);
            });
        }

        function toggleWorkflowGuideline(forceOpen = null) {
            const panel = document.getElementById('workflow-guideline');
            const toggle = document.getElementById('workflow-guideline-toggle');
            if (!panel) return;
            setupWorkflowGuidelineDrag();
            const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : panel.classList.contains('workflow-guideline-collapsed');
            panel.classList.toggle('workflow-guideline-collapsed', !shouldOpen);
            if (toggle) toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            requestAnimationFrame(() => {
                const rect = panel.getBoundingClientRect();
                applyWorkflowGuidelinePosition(rect.left, rect.top, true);
                if (shouldOpen) updateWorkflowGuidelineState();
            });
        }

        function openGuidelineStep(page) {
            if (typeof switchPage === 'function') switchPage(page);
            toggleWorkflowGuideline(true);
            updateWorkflowGuidelineState();
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
            } else if (nextPage === 'actual') {
                renderActualProgressPage();
            } else if (nextPage === 'duration') {
                renderInstallmentPanel();
                renderDurationPlanTable();
            } else if (nextPage === 'dashboard') {
                renderDashboard();
            } else {
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
            updateWorkflowGuidelineState();
            syncWorkflowGuidelineForRoute('workspace');
        }

        window.addEventListener('buildplan:app-route', (event) => {
            syncWorkflowGuidelineForRoute(event.detail?.route);
        });
        window.addEventListener('resize', () => restoreWorkflowGuidelinePosition());
        document.addEventListener('DOMContentLoaded', () => syncWorkflowGuidelineForRoute());

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


        function normalizeDashboardPhotos(items = []) {
            return (Array.isArray(items) ? items : []).filter(Boolean).map((item, index) => ({
                id: item.id || ('dashboard-photo-' + Date.now() + '-' + index),
                name: item.name || 'site-photo',
                dataUrl: item.dataUrl || '',
                date: item.date || safeFormatDate(new Date()),
                zone: item.zone || '',
                caption: item.caption || '',
                status: item.status || 'In progress',
                include: item.include !== false
            })).filter(item => item.dataUrl);
        }

        function dashboardPhotoDateValue(photo) {
            return photo?.date || getDashboardSelectedDateKey();
        }

        function getDashboardFieldValue(ids, fallback = '-') {
            for (const id of ids) {
                const value = document.getElementById(id)?.value;
                if (value !== undefined && String(value).trim() !== '') return value;
            }
            return fallback;
        }

        function escapeDashboardReportHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
        }

        function handleDashboardPhotoInput(event) {
            const files = Array.from(event?.target?.files || []).filter(file => file.type?.startsWith('image/')).slice(0, 12);
            if (!files.length) return;
            let pending = files.length;
            const finish = () => {
                pending -= 1;
                if (pending > 0) return;
                dashboardPhotos = normalizeDashboardPhotos(dashboardPhotos);
                renderDashboardPhotos();
                renderExecutivePrintReport();
                scheduleAutoSave();
            };
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = () => {
                    dashboardPhotos.push({
                        id: 'dashboard-photo-' + Date.now() + '-' + Math.random().toString(16).slice(2),
                        name: file.name || 'site-photo',
                        dataUrl: String(reader.result || ''),
                        date: getDashboardSelectedDateKey(),
                        zone: '',
                        caption: '',
                        status: 'In progress',
                        include: true
                    });
                    finish();
                };
                reader.onerror = finish;
                reader.readAsDataURL(file);
            });
            if (event?.target) event.target.value = '';
        }

        function updateDashboardPhoto(photoId, field, value) {
            const photo = (dashboardPhotos || []).find(item => item.id === photoId);
            if (!photo) return;
            if (field === 'include') photo.include = !!value;
            else photo[field] = value;
            renderDashboardPhotos();
            renderExecutivePrintReport();
            scheduleAutoSave();
        }

        function removeDashboardPhoto(photoId) {
            dashboardPhotos = (dashboardPhotos || []).filter(item => item.id !== photoId);
            renderDashboardPhotos();
            renderExecutivePrintReport();
            scheduleAutoSave();
        }

        function renderDashboardPhotos() {
            const list = document.getElementById('dashboard-photo-list');
            if (!list) return;
            dashboardPhotos = normalizeDashboardPhotos(dashboardPhotos);
            if (!dashboardPhotos.length) {
                list.innerHTML = '<div class="dashboard-photo-empty">No report photos yet. Add site photos to include them in the executive print report.</div>';
                return;
            }
            list.innerHTML = dashboardPhotos.map(photo => {
                const id = escapeDashboardReportHtml(photo.id);
                const checked = photo.include !== false ? 'checked' : '';
                return '<article class="dashboard-photo-card">' +
                    '<img src="' + photo.dataUrl + '" alt="' + escapeDashboardReportHtml(photo.name) + '">' +
                    '<div class="dashboard-photo-fields">' +
                        '<div class="dashboard-photo-row">' +
                            '<label><span>Date</span><input type="date" value="' + escapeDashboardReportHtml(dashboardPhotoDateValue(photo)) + '" onchange="updateDashboardPhoto(\'' + id + '\', \'date\', this.value)"></label>' +
                            '<label><span>Status</span><input type="text" value="' + escapeDashboardReportHtml(photo.status) + '" onchange="updateDashboardPhoto(\'' + id + '\', \'status\', this.value)" placeholder="Structure work level 2"></label>' +
                        '</div>' +
                        '<label><span>Zone / Area</span><input type="text" value="' + escapeDashboardReportHtml(photo.zone) + '" onchange="updateDashboardPhoto(\'' + id + '\', \'zone\', this.value)" placeholder="Building A, Level 3"></label>' +
                        '<label><span>Caption</span><textarea rows="2" onchange="updateDashboardPhoto(\'' + id + '\', \'caption\', this.value)" placeholder="Progress, issues, or key notes">' + escapeDashboardReportHtml(photo.caption) + '</textarea></label>' +
                        '<div class="dashboard-photo-actions">' +
                            '<label class="dashboard-photo-include"><input type="checkbox" ' + checked + ' onchange="updateDashboardPhoto(\'' + id + '\', \'include\', this.checked)"> Include in report</label>' +
                            '<button type="button" onclick="removeDashboardPhoto(\'' + id + '\')"><i class="fa-solid fa-trash-can"></i> Remove</button>' +
                        '</div>' +
                    '</div>' +
                '</article>';
            }).join('');
        }

        function getDashboardSelectedDateKey() {
            const input = document.getElementById('dashboard-date-input');
            if (input?.value) return input.value;
            const todayKey = safeFormatDate(new Date());
            if (input) input.value = todayKey;
            return todayKey;
        }

        function metricsStatusText(dayDelta, overdueCount = 0) {
            const absDays = Math.abs(parseInt(dayDelta, 10) || 0);
            if (dayDelta > 0 && !overdueCount) return absDays ? `เร็วกว่าแผน ${absDays} วัน` : 'ตามแผน';
            if (dayDelta < 0 || overdueCount) return absDays ? `ช้ากว่าแผน ${absDays} วัน` : 'ช้ากว่าแผน';
            return 'ตามแผน';
        }

        function getDashboardInstallmentSummary(dateKey = getDashboardSelectedDateKey()) {
            const empty = {
                current: 0,
                total: 0,
                paid: 0,
                label: '- / -',
                status: '&#3618;&#3633;&#3591;&#3652;&#3617;&#3656;&#3652;&#3604;&#3657;&#3626;&#3619;&#3657;&#3634;&#3591;&#3591;&#3623;&#3604;&#3591;&#3634;&#3609;',
                isLate: false
            };
            const schedule = typeof getInstallmentSchedule === 'function' ? getInstallmentSchedule() : [];
            if (!schedule.length) return empty;
            const targetKey = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey)) ? String(dateKey) : safeFormatDate(new Date());
            const currentItem = schedule.find(item => safeFormatDate(item.dateObj) >= targetKey) || schedule[schedule.length - 1];
            const paidItems = schedule.filter(item => item.paymentDateKey && item.paymentDateKey <= targetKey);
            const currentNo = currentItem?.no || schedule.length;
            const isLate = paidItems.length < currentNo;
            return {
                current: currentNo,
                total: schedule.length,
                paid: paidItems.length,
                isLate,
                label: paidItems.length + ' / ' + schedule.length,
                status: isLate ? '&#3621;&#3656;&#3634;&#3594;&#3657;&#3634;: &#3588;&#3623;&#3619;&#3648;&#3610;&#3636;&#3585;&#3606;&#3638;&#3591;&#3591;&#3623;&#3604;&#3607;&#3637;&#3656; ' + currentNo : '&#3611;&#3633;&#3592;&#3592;&#3640;&#3610;&#3633;&#3609;&#3605;&#3657;&#3629;&#3591;&#3648;&#3610;&#3636;&#3585;&#3606;&#3638;&#3591;&#3591;&#3623;&#3604;&#3607;&#3637;&#3656; ' + currentNo
            };
        }

        function computeProjectMetrics(dateKey = getDashboardSelectedDateKey()) {
            const workTasks = tasks.filter(task => !task.isGroup && !task.isMilestone);
            const milestones = tasks.filter(task => task.isMilestone);
            const costMap = getTaskFinalValueMap();
            const projectTotal = Array.from(costMap.values()).reduce((sum, value) => sum + value, 0);
            const targetDate = new Date(dateKey + 'T00:00:00');
            targetDate.setHours(0, 0, 0, 0);
            const actualValue = workTasks.reduce((sum, task) => sum + ((costMap.get(task.id) || 0) * getTaskActualPercentAtDate(task.id, dateKey) / 100), 0);
            const averageProgress = workTasks.length ? workTasks.reduce((sum, task) => sum + getTaskActualPercentAtDate(task.id, dateKey), 0) / workTasks.length : 0;
            const actualProgress = projectTotal > 0 ? (actualValue / projectTotal) * 100 : averageProgress;
            const plannedProgress = getPlannedProgressAtDate(targetDate, projectTotal || getSCurveData().totalValue);
            const overdue = workTasks.filter(task => task.endDateObj && task.endDateObj < targetDate && getTaskActualPercentAtDate(task.id, dateKey) < 100);
            const inProgress = workTasks.filter(task => task.startDateObj && task.endDateObj && task.startDateObj <= targetDate && task.endDateObj >= targetDate && getTaskActualPercentAtDate(task.id, dateKey) < 100);
            const complete = workTasks.filter(task => getTaskActualPercentAtDate(task.id, dateKey) >= 100);
            const upcoming = workTasks.filter(task => task.startDateObj && task.startDateObj >= targetDate && getTaskActualPercentAtDate(task.id, dateKey) < 100).sort((a, b) => a.startDateObj - b.startDateObj).slice(0, 6);
            const critical = workTasks.filter(task => task.isCritical).sort((a, b) => a.startDateObj - b.startDateObj);
            const variance = actualProgress - plannedProgress;
            const actualVariance = computeActualVariance(dateKey);
            const dayDelta = actualVariance.dayDelta || 0;
            const paidValue = typeof getCumulativePaidValueAtDate === 'function' ? getCumulativePaidValueAtDate(dateKey) : (typeof getLatestCumulativePaidValue === 'function' ? getLatestCumulativePaidValue() : 0);
            const valueDelta = actualValue - paidValue;
            const installmentSummary = getDashboardInstallmentSummary(dateKey);
            const status = metricsStatusText(dayDelta, overdue.length);
            return { dateKey, workTasks, milestones, projectTotal, actualValue, paidValue, valueDelta, installmentSummary, actualProgress, plannedProgress, variance, dayDelta, status, overdue, inProgress, complete, upcoming, critical };
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
                const startRecord = typeof getTaskActualStartRecord === 'function' ? getTaskActualStartRecord(task.id) : null;
                const completeRecord = getTaskCompletionRecord(task.id);
                const actualStartLine = startRecord ? `เริ่มจริง ${formatDateDisplay(startRecord.date)}` : `เริ่มแผน ${formatDateDisplay(task.startDateObj)}`;
                const dateLine = completeRecord
                    ? `${actualStartLine} | Complete ${formatDateDisplay(completeRecord.date)}`
                    : `${actualStartLine} | แผนจบ ${formatDateDisplay(task.endDateObj)}`;
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


        function renderExecutiveReportTasks(taskList, emptyText) {
            const items = (taskList || []).slice(0, 3);
            if (!items.length) return '<div class="exec-empty">' + escapeDashboardReportHtml(emptyText) + '</div>';
            return items.map(task => {
                const startRecord = getTaskActualStartRecord(task.id);
                const completeRecord = getTaskCompletionRecord(task.id);
                const progress = getTaskProgressForDisplay(task, tasks.indexOf(task));
                const dateLine = completeRecord
                    ? 'Actual start ' + formatDateDisplay(startRecord?.date || task.startDateObj) + ' | Complete ' + formatDateDisplay(completeRecord.date)
                    : (startRecord ? 'Actual start ' + formatDateDisplay(startRecord.date) : 'Plan start ' + formatDateDisplay(task.startDateObj)) + ' | Plan finish ' + formatDateDisplay(task.endDateObj);
                return '<div class="exec-task ' + (progress >= 100 ? 'is-complete' : '') + '">' +
                    '<div><strong>' + escapeDashboardReportHtml(task.wbs || '-') + ' ' + escapeDashboardReportHtml(task.name || '-') + '</strong><span>' + escapeDashboardReportHtml(dateLine) + '</span></div>' +
                    '<b>' + progress + '%</b>' +
                '</div>';
            }).join('');
        }

        function renderExecutivePrintReport(metrics = computeProjectMetrics()) {
            const report = document.getElementById('executive-print-report');
            if (!report) return;
            const reportDate = new Date(metrics.dateKey + 'T00:00:00');
            const projectName = getDashboardFieldValue(['proj-name', 'project-name'], 'Construction Project');
            const includedPhotos = normalizeDashboardPhotos(dashboardPhotos).filter(photo => photo.include !== false).slice(0, 3);
            const photoMarkup = includedPhotos.length ? includedPhotos.map((photo, index) => {
                const date = new Date(dashboardPhotoDateValue(photo) + 'T00:00:00');
                return '<figure class="exec-photo-card">' +
                    '<img src="' + photo.dataUrl + '" alt="' + escapeDashboardReportHtml(photo.name) + '">' +
                    '<figcaption><strong>' + (index + 1) + '. ' + escapeDashboardReportHtml(photo.status || 'Site progress') + '</strong>' +
                    '<span>' + formatDateDisplay(date) + (photo.zone ? ' | ' + escapeDashboardReportHtml(photo.zone) : '') + '</span>' +
                    '<p>' + escapeDashboardReportHtml(photo.caption || 'No caption') + '</p></figcaption>' +
                '</figure>';
            }).join('') : '<div class="exec-photo-empty">No site photos selected for this report.</div>';
            report.innerHTML = '<div class="exec-report-page">' +
                '<header class="exec-report-header"><div><div class="exec-report-brand">BuildPlan Pro</div><h1>Executive Progress Report</h1><p>' + escapeDashboardReportHtml(projectName) + '</p></div>' +
                '<div class="exec-report-meta"><span>Report Date</span><b>' + formatDateDisplay(reportDate) + '</b><small>Contract: ' + escapeDashboardReportHtml(getDashboardFieldValue(['proj-contract-no', 'contract-no'])) + '</small></div></header>' +
                '<section class="exec-project-strip">' +
                    '<div><span>Owner</span><b>' + escapeDashboardReportHtml(getDashboardFieldValue(['proj-owner', 'project-owner'])) + '</b></div>' +
                    '<div><span>Contractor</span><b>' + escapeDashboardReportHtml(getDashboardFieldValue(['proj-contractor', 'contractor'])) + '</b></div>' +
                    '<div><span>Supervisor</span><b>' + escapeDashboardReportHtml(getDashboardFieldValue(['proj-supervisor', 'supervisor'])) + '</b></div>' +
                    '<div><span>Project Value</span><b>' + formatMoneyDisplay(metrics.projectTotal) + '</b></div>' +
                '</section>' +
                '<section class="exec-kpi-grid">' +
                    '<div><span>Plan Progress</span><b class="blue">' + metrics.plannedProgress.toFixed(2) + '%</b></div>' +
                    '<div><span>Actual Progress</span><b class="green">' + metrics.actualProgress.toFixed(2) + '%</b></div>' +
                    '<div><span>Variance</span><b class="' + (metrics.variance >= 0 ? 'green' : 'red') + '">' + (metrics.variance >= 0 ? '+' : '') + metrics.variance.toFixed(2) + '%</b></div>' +
                    '<div><span>Status</span><b class="' + (metrics.dayDelta < 0 || metrics.overdue.length ? 'red' : 'green') + '">' + escapeDashboardReportHtml(metrics.status) + '</b></div>' +
                    '<div><span>Earned Value</span><b>' + formatMoneyDisplay(metrics.actualValue) + '</b></div>' +
                    '<div><span>Paid Value</span><b>' + formatMoneyDisplay(metrics.paidValue) + '</b></div>' +
                    '<div><span>Value Delta</span><b class="' + (metrics.valueDelta >= 0 ? 'blue' : 'red') + '">' + formatMoneyDisplay(metrics.valueDelta) + '</b></div>' +
                '</section>' +
                '<section class="exec-report-grid">' +
                    '<div class="exec-panel exec-span-2"><h2>Planned vs Actual</h2>' + renderDashboardBar('Planned cumulative', metrics.plannedProgress, 'bg-red-500') + renderDashboardBar('Actual progress', metrics.actualProgress, 'bg-emerald-500') + '</div>' +
                    '<div class="exec-panel"><h2>Risk Watchlist</h2>' + renderExecutiveReportTasks(metrics.overdue, 'No overdue work') + '</div>' +
                    '<div class="exec-panel"><h2>Critical Path</h2>' + renderExecutiveReportTasks(metrics.critical, 'No critical path') + '</div>' +
                    '<div class="exec-panel"><h2>Upcoming Work</h2>' + renderExecutiveReportTasks(metrics.upcoming, 'No upcoming work') + '</div>' +
                '</section>' +
                (includedPhotos.length ? '<section class="exec-photo-section"><div class="exec-section-title"><h2>Site Progress Photos</h2><span>' + includedPhotos.length + ' selected</span></div><div class="exec-photo-grid">' + photoMarkup + '</div></section>' : '') +
            '</div>';
        }

        function printExecutiveDashboardReport() {
            const paperSize = document.getElementById('print-paper-size')?.value || 'A3';
            let styleEl = document.getElementById('executive-dashboard-print-style');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'executive-dashboard-print-style';
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = '@media print { @page { size: ' + paperSize + ' landscape; margin: 5mm; } }';
            renderExecutivePrintReport();
            const report = document.getElementById('executive-print-report');
            let standaloneReport = document.getElementById('executive-print-standalone');
            if (!standaloneReport) {
                standaloneReport = document.createElement('section');
                standaloneReport.id = 'executive-print-standalone';
                standaloneReport.setAttribute('aria-hidden', 'true');
                document.body.appendChild(standaloneReport);
            }
            standaloneReport.innerHTML = report?.innerHTML || '<div class="exec-report-page"><div class="exec-empty">No dashboard report data</div></div>';
            const dashboardPage = document.getElementById('dashboard-page');
            const dashboardWasHidden = dashboardPage?.classList.contains('page-hidden');
            if (dashboardPage) dashboardPage.classList.remove('page-hidden');
            document.body.classList.add('executive-dashboard-print');
            if (report) report.setAttribute('aria-hidden', 'false');
            standaloneReport.setAttribute('aria-hidden', 'false');
            const cleanup = () => {
                document.body.classList.remove('executive-dashboard-print');
                if (dashboardPage && dashboardWasHidden) dashboardPage.classList.add('page-hidden');
                if (report) report.setAttribute('aria-hidden', 'true');
                standaloneReport.setAttribute('aria-hidden', 'true');
                standaloneReport.innerHTML = '';
                window.removeEventListener('afterprint', cleanup);
            };
            window.addEventListener('afterprint', cleanup);
            setTimeout(() => window.print(), 120);
        }

        function renderDashboard() {
            const kpis = document.getElementById('dashboard-kpis');
            if (!kpis) return;
            const metrics = computeProjectMetrics();
            const healthChip = document.getElementById('dashboard-health-chip');
            const varianceText = metrics.variance.toFixed(2) + '%';
            let healthClass = 'health-good';
            let healthText = metrics.status;
            if (metrics.overdue.length || metrics.dayDelta < -3) {
                healthClass = 'health-risk';
            } else if (metrics.dayDelta < 0) {
                healthClass = 'health-watch';
            }
            if (healthChip) {
                healthChip.className = 'health-chip ' + healthClass;
                healthChip.innerHTML = `<i class="fa-solid fa-circle-check"></i>${healthText}`;
            }
            const isLate = metrics.overdue.length > 0 || metrics.dayDelta < 0;
            const statusCardClass = isLate ? 'dashboard-kpi-danger' : 'dashboard-kpi-status';
            const statusIcon = isLate ? 'fa-triangle-exclamation' : 'fa-flag';
            const valueDeltaCardClass = metrics.valueDelta < 0 ? 'dashboard-kpi-danger' : 'dashboard-kpi-green';
            kpis.className = 'dashboard-kpi-grid';
            kpis.innerHTML = `
                <div class="kpi-card dashboard-kpi-card dashboard-kpi-blue"><div class="dashboard-kpi-icon"><i class="fa-solid fa-bullseye"></i></div><div><div class="kpi-label">Plan Progress</div><div class="kpi-value">${metrics.plannedProgress.toFixed(2)}%</div><div class="text-xs text-slate-500 mt-2">ความคืบหน้าตามแผนสะสม</div></div></div>
                <div class="kpi-card dashboard-kpi-card dashboard-kpi-green"><div class="dashboard-kpi-icon"><i class="fa-solid fa-chart-simple"></i></div><div><div class="kpi-label">Actual Progress</div><div class="kpi-value">${metrics.actualProgress.toFixed(2)}%</div><div class="text-xs text-slate-500 mt-2">ผลงานจริงจาก Actual Tracking</div></div></div>
                <div class="kpi-card dashboard-kpi-card dashboard-kpi-teal"><div class="dashboard-kpi-icon"><i class="fa-solid fa-scale-balanced"></i></div><div><div class="kpi-label">Variance</div><div class="kpi-value">${metrics.variance >= 0 ? '+' : ''}${metrics.variance.toFixed(2)}%</div><div class="text-xs text-slate-500 mt-2">Actual - Plan</div></div></div>
                <div class="kpi-card dashboard-kpi-card dashboard-kpi-status-summary ${statusCardClass}"><div class="dashboard-kpi-icon"><i class="fa-solid ${statusIcon}"></i></div><div><div class="kpi-label">สรุปสถานะโครงการ</div><div class="kpi-value">${metrics.status}</div><div class="text-xs text-slate-500 mt-2">สถานะ ณ ${formatDateDisplay(new Date(metrics.dateKey + 'T00:00:00'))}</div></div></div>
                <div class="kpi-card dashboard-kpi-card dashboard-kpi-blue"><div class="dashboard-kpi-icon"><i class="fa-solid fa-sack-dollar"></i></div><div><div class="kpi-label">มูลค่างานที่ทำได้</div><div class="kpi-value">${formatMoneyDisplay(metrics.actualValue)}</div><div class="text-xs text-slate-500 mt-2">มูลค่าโครงการ x %Actual</div></div></div>
                <div class="kpi-card dashboard-kpi-card dashboard-kpi-green"><div class="dashboard-kpi-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div><div><div class="kpi-label">มูลค่างานที่เบิก</div><div class="kpi-value">${formatMoneyDisplay(metrics.paidValue)}</div><div class="text-xs text-slate-500 mt-2">จากเบิกจ่ายสะสมตามวันที่รายงาน</div></div></div>
                <div class="kpi-card dashboard-kpi-card ${valueDeltaCardClass}"><div class="dashboard-kpi-icon"><i class="fa-solid fa-calculator"></i></div><div><div class="kpi-label">มูลค่าส่วนต่าง</div><div class="kpi-value">${formatMoneyDisplay(metrics.valueDelta)}</div><div class="text-xs text-slate-500 mt-2">มูลค่างานที่ทำได้ - มูลค่างานที่เบิก</div></div></div>
                <div class="kpi-card dashboard-kpi-card ${metrics.installmentSummary.isLate ? 'dashboard-kpi-danger' : 'dashboard-kpi-teal'}"><div class="dashboard-kpi-icon"><i class="fa-solid ${metrics.installmentSummary.isLate ? 'fa-triangle-exclamation' : 'fa-calendar-check'}"></i></div><div><div class="kpi-label">&#3612;&#3621;&#3585;&#3634;&#3619;&#3648;&#3610;&#3636;&#3585;&#3591;&#3623;&#3604;&#3591;&#3634;&#3609;</div><div class="kpi-value">${metrics.installmentSummary.label}</div><div class="text-xs text-slate-500 mt-2">${metrics.installmentSummary.status}</div></div></div>
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
            updateWorkflowGuidelineState();
        }
