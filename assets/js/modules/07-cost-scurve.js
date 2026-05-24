// BuildPlan Pro - cost table, cost summary, Thai baht text, and S-Curve chart
// Split from assets/js/app.js without behavior changes.

        function formatMoneyDisplay(value) {
            const num = parseFloat(value) || 0;
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function formatFactorDisplay(value) {
            const num = parseFloat(value) || 0;
            return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
        }

        function numberToThaiText(num) {
            num = Math.round((parseFloat(num) || 0) * 100) / 100;
            if (num === 0) return 'ศูนย์บาทถ้วน';
            const numberText = ['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'];
            const positionText = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

            function readNumber(n) {
                let s = String(parseInt(n, 10) || 0);
                if (s === '0') return '';
                let result = '';
                for (let i = 0; i < s.length; i++) {
                    const digit = parseInt(s[i], 10);
                    const pos = s.length - i - 1;
                    if (digit === 0) continue;
                    if (pos === 0) {
                        if (digit === 1 && s.length > 1) result += 'เอ็ด';
                        else result += numberText[digit];
                    } else if (pos === 1) {
                        if (digit === 1) result += 'สิบ';
                        else if (digit === 2) result += 'ยี่สิบ';
                        else result += numberText[digit] + 'สิบ';
                    } else {
                        result += numberText[digit] + positionText[pos];
                    }
                }
                return result;
            }

            function readMillions(n) {
                n = parseInt(n, 10) || 0;
                if (n === 0) return '';
                if (n < 1000000) return readNumber(n);
                const millions = Math.floor(n / 1000000);
                const rest = n % 1000000;
                return readMillions(millions) + 'ล้าน' + readNumber(rest);
            }

            const integerPart = Math.floor(num);
            const satang = Math.round((num - integerPart) * 100);
            let text = readMillions(integerPart) + 'บาท';
            if (satang === 0) text += 'ถ้วน';
            else text += readNumber(satang) + 'สตางค์';
            return text;
        }

        function computeCostSummaryData() {
            const groups = [];
            let currentGroup = null;

            tasks.forEach((task) => {
                if (task.isMilestone) return;

                if (task.isGroup) {
                    if (currentGroup) groups.push(currentGroup);
                    currentGroup = { name: task.name || '', wbs: task.wbs || '', total: 0 };
                    return;
                }

                if (!currentGroup) {
                    currentGroup = { name: 'งานทั่วไป', wbs: '', total: 0 };
                }

                const baseCost = parseFloat(task.cost) || 0;
                const rateInfo = getTaskRateInfo(task, currentGroup.name);
                currentGroup.total += (baseCost * rateInfo.rate);
            });

            if (currentGroup) groups.push(currentGroup);
            const projectTotal = groups.reduce((sum, g) => sum + (parseFloat(g.total) || 0), 0);
            return { groups, projectTotal };
        }

        function syncProjectHeaderValue(projectTotal) {
            const valueInput = document.getElementById('project-value');
            if (!valueInput) return;
            valueInput.value = formatMoneyDisplay(projectTotal);
        }

        function renderCostSummary(summaryData) {
            const summaryBody = document.getElementById('cost-summary-body');
            const summaryTotal = document.getElementById('cost-summary-total');
            const summaryThai = document.getElementById('cost-summary-thai');
            const summaryTitle = document.getElementById('cost-summary-title');
            if (!summaryBody || !summaryTotal || !summaryThai) return;
            const projectName = (document.getElementById('proj-name')?.value || '').trim();
            if (summaryTitle) summaryTitle.textContent = projectName ? `ตารางสรุปผลมูลค่าโครงการ ${projectName}` : 'ตารางสรุปผลมูลค่าโครงการ';

            if (!summaryData.groups.length) {
                summaryBody.innerHTML = `<div class="px-6 py-8 text-center text-slate-400 text-sm">ยังไม่มีข้อมูลรายการสำหรับสรุปผล</div>`;
            } else {
                summaryBody.innerHTML = summaryData.groups.map(group => `
                    <div class="flex row-height border-b border-slate-100 hover:bg-slate-50/80">
                        <div class="cell w-24 shrink-0 justify-center bg-slate-50/80 text-slate-500 text-[11px] font-bold">${group.wbs || '-'}</div>
                        <div class="cell flex-1 min-w-[360px] px-4 text-[13px] font-bold text-slate-800">${escapeTooltipHtml(group.name || '-')}</div>
                        <div class="cell w-64 shrink-0 justify-end px-4 text-[13px] font-bold text-emerald-700">${formatMoneyDisplay(group.total)}</div>
                    </div>
                `).join('') + `
                    <div class="flex row-height bg-emerald-50 border-t border-emerald-300 font-bold">
                        <div class="cell w-24 shrink-0 justify-center bg-emerald-100/70 text-emerald-700 text-[11px]">รวม</div>
                        <div class="cell flex-1 min-w-[360px] px-4 text-[13px] text-emerald-800">รวมมูลค่างานทั้งโครงการ</div>
                        <div class="cell w-64 shrink-0 justify-end px-4 text-[13px] text-emerald-800">${formatMoneyDisplay(summaryData.projectTotal)}</div>
                    </div>
                `;
            }

            summaryTotal.textContent = formatMoneyDisplay(summaryData.projectTotal);
            summaryThai.textContent = `(${numberToThaiText(summaryData.projectTotal)})`;
            syncProjectHeaderValue(summaryData.projectTotal);
        }
        function updateSCurveFillToggleButton() {
            const btn = document.getElementById('s-curve-fill-toggle');
            if (!btn) return;
            btn.textContent = sCurveFillVisible ? 'ปิดสีใต้เส้นกราฟ' : 'เปิดสีใต้เส้นกราฟ';
        }

        function updateSCurveModeToggleButton() {
            const btn = document.getElementById('s-curve-mode-toggle');
            if (!btn) return;
            btn.textContent = sCurveSmoothMode ? 'เส้นโค้งเนียน' : 'เส้นตรง';
            btn.className = sCurveSmoothMode
                ? 'px-3 py-2 rounded-lg text-sm font-bold border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-all'
                : 'px-3 py-2 rounded-lg text-sm font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all';
        }

        function toggleSCurveSmoothMode() {
            sCurveSmoothMode = !sCurveSmoothMode;
            updateSCurveModeToggleButton();
            const summaryData = computeCostSummaryData();
            renderSCurveChart(summaryData.projectTotal);
            renderGanttSCurveOverlay();
            scheduleAutoSave();
        }

        function toggleSCurveFill() {
            sCurveFillVisible = !sCurveFillVisible;
            updateSCurveFillToggleButton();
            const summaryData = computeCostSummaryData();
            renderSCurveChart(summaryData.projectTotal);
        }

        function formatChartDate(dateObj) {
            if (!dateObj || isNaN(dateObj.getTime())) return '-';
            return dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
        }

        function showChartTooltip(event, htmlText) {
            const tooltip = document.getElementById('chart-tooltip');
            if (!tooltip) return;
            tooltip.innerHTML = htmlText;
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.clientX}px`;
            tooltip.style.top = `${event.clientY}px`;
        }

        function moveChartTooltip(event) {
            const tooltip = document.getElementById('chart-tooltip');
            if (!tooltip || tooltip.style.display === 'none') return;
            tooltip.style.left = `${event.clientX}px`;
            tooltip.style.top = `${event.clientY}px`;
        }

        function hideChartTooltip() {
            const tooltip = document.getElementById('chart-tooltip');
            if (!tooltip) return;
            tooltip.style.display = 'none';
        }

        function escapeTooltipHtml(text) {
            return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        function getProgressTooltipHtml(cumulativeValue, totalValue) {
            const progress = totalValue > 0 ? ((cumulativeValue / totalValue) * 100) : 0;
            return `Progress: ${progress.toFixed(2)}%<br>มูลค่างาน: ${formatMoneyDisplay(cumulativeValue)} บาท`;
        }

        function getSCurveData() {
            const rangeTasks = tasks.filter(task => !task.isGroup && task.startDateObj && task.endDateObj && !isNaN(task.startDateObj.getTime()) && !isNaN(task.endDateObj.getTime()));
            if (!rangeTasks.length) {
                return { startDate: null, endDate: null, points: [], totalValue: 0, totalDays: 0 };
            }

            const startDate = new Date(Math.min(...rangeTasks.map(task => task.startDateObj.getTime())));
            const endDate = new Date(Math.max(...rangeTasks.map(task => task.endDateObj.getTime())));
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            const totalDays = Math.max(1, Math.round((endDate - startDate) / 86400000) + 1);
            const dailyValues = Array(totalDays).fill(0);

            let currentGroupName = '';
            tasks.forEach(task => {
                if (task.isGroup) {
                    currentGroupName = task.name || '';
                    return;
                }
                if (task.isMilestone || !task.startDateObj || !task.endDateObj) return;
                const baseCost = parseFloat(task.cost) || 0;
                const rateInfo = getTaskRateInfo(task, currentGroupName);
                const finalValue = baseCost * rateInfo.rate;
                const durationDays = Math.max(1, Math.round((task.endDateObj - task.startDateObj) / 86400000) + 1);
                const dailyShare = finalValue / durationDays;
                for (let d = 0; d < durationDays; d++) {
                    const workDate = new Date(task.startDateObj);
                    workDate.setDate(workDate.getDate() + d);
                    const idx = Math.round((workDate - startDate) / 86400000);
                    if (idx >= 0 && idx < dailyValues.length) dailyValues[idx] += dailyShare;
                }
            });

            let cumulative = 0;
            const points = dailyValues.map((dailyValue, idx) => {
                cumulative += dailyValue;
                const pointDate = new Date(startDate);
                pointDate.setDate(startDate.getDate() + idx);
                return { index: idx, date: pointDate, dailyValue, cumulative };
            });

            return { startDate, endDate, points, totalValue: cumulative, totalDays };
        }

        function getSCurveTickIndices(points) {
            const lastIndex = Math.max(0, points.length - 1);
            if (!points.length) return [];
            const out = [];
            for (let i = 0; i <= lastIndex; i += 7) out.push(i);
            if (out[out.length - 1] !== lastIndex) out.push(lastIndex);
            return Array.from(new Set(out));
        }

        function renderSCurveChart(projectTotalOverride = null) {
            const container = document.getElementById('s-curve-chart');
            const rangeEl = document.getElementById('s-curve-date-range');
            if (!container || !rangeEl) return;

            updateSCurveFillToggleButton();
            updateSCurveModeToggleButton();
            const sData = getSCurveData();
            const totalValue = projectTotalOverride !== null ? (parseFloat(projectTotalOverride) || 0) : (parseFloat(sData.totalValue) || 0);

            if (!sData.startDate || !sData.endDate || !sData.points.length) {
                rangeEl.textContent = '-';
                container.innerHTML = `<div class="h-[380px] flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-300 rounded-lg bg-slate-50">ยังไม่มีข้อมูลแผนงานเพียงพอสำหรับสร้างกราฟ S-Curve</div>`;
                return;
            }

            rangeEl.textContent = `${formatChartDate(sData.startDate)} ถึง ${formatChartDate(sData.endDate)}`;
            const tickIndices = getSCurveTickIndices(sData.points);
            const spacing = 90;
            const width = Math.max(1100, 160 + (tickIndices.length * spacing));
            const height = 400;
            const margin = { top: 24, right: 30, bottom: 72, left: 120 };
            const plotWidth = width - margin.left - margin.right;
            const plotHeight = height - margin.top - margin.bottom;
            const yMax = Math.max(totalValue, 1);
            const xMax = Math.max(sData.points.length - 1, 1);
            const xFor = i => margin.left + (i / xMax) * plotWidth;
            const yFor = v => margin.top + plotHeight - (v / yMax) * plotHeight;

            const yTicks = 5;
            const gridParts = [];
            const labelParts = [];
            for (let i = 0; i <= yTicks; i++) {
                const value = (yMax / yTicks) * i;
                const y = yFor(value);
                gridParts.push(`<line x1="${margin.left}" y1="${y}" x2="${margin.left + plotWidth}" y2="${y}" class="chart-grid-line"></line>`);
                labelParts.push(`<text x="${margin.left - 12}" y="${y + 4}" text-anchor="end" class="chart-axis-text">${formatMoneyDisplay(value)}</text>`);
            }

            tickIndices.forEach(idx => {
                const x = xFor(idx);
                gridParts.push(`<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + plotHeight}" class="chart-grid-line" stroke-dasharray="2 4"></line>`);
                labelParts.push(`<text x="${x}" y="${height - 30}" text-anchor="middle" class="chart-axis-text">${formatChartDate(sData.points[idx].date)}</text>`);
            });

            const chartPoints = sData.points.map(point => ({ x: xFor(point.index), y: yFor(point.cumulative) }));
            const pathData = buildSCurvePath(chartPoints);
            const fillPath = buildSCurveFillPath(chartPoints, margin.top + plotHeight);
            const pointEvery = Math.max(1, Math.round(sData.points.length / 16));
            const circles = sData.points
                .filter((_, idx) => idx % pointEvery === 0 || idx === sData.points.length - 1)
                .map(point => {
                    const tooltipText = getProgressTooltipHtml(point.cumulative, totalValue);
                    const escapedTooltip = escapeTooltipHtml(tooltipText);
                    return `<circle cx="${xFor(point.index).toFixed(2)}" cy="${yFor(point.cumulative).toFixed(2)}" r="4.5" class="chart-point-red pointer-events-auto cursor-pointer" onmouseenter="showChartTooltip(event, &quot;${escapedTooltip}&quot;)" onmousemove="moveChartTooltip(event)" onmouseleave="hideChartTooltip()"></circle>`;
                }).join('');

            container.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                    <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500">วันเริ่มสัญญา</div>
                        <div class="text-sm font-bold text-slate-800 mt-1">${formatChartDate(sData.startDate)}</div>
                    </div>
                    <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500">วันสิ้นสุดสัญญา</div>
                        <div class="text-sm font-bold text-slate-800 mt-1">${formatChartDate(sData.endDate)}</div>
                    </div>
                    <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                        <div class="text-[11px] font-bold uppercase tracking-wide text-red-600">มูลค่าสะสมทั้งโครงการ</div>
                        <div class="text-sm font-black text-red-700 mt-1">${formatMoneyDisplay(totalValue)} บาท</div>
                    </div>
                </div>
                <div class="w-full overflow-auto custom-scrollbar border border-slate-200 rounded-lg bg-white">
                    <svg viewBox="0 0 ${width} ${height}" class="w-full min-w-[900px] h-[400px]" role="img" aria-label="S-Curve cumulative cost chart">
                        <text x="${margin.left}" y="16" class="chart-title-text">S-Curve มูลค่างานสะสมตามแผน</text>
                        ${gridParts.join('')}
                        <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" class="chart-axis-line"></line>
                        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" class="chart-axis-line"></line>
                        <text x="18" y="${margin.top + (plotHeight / 2)}" transform="rotate(-90 18 ${margin.top + (plotHeight / 2)})" class="chart-axis-text">มูลค่างานสะสม (บาท)</text>
                        <text x="${margin.left + plotWidth / 2}" y="${height - 12}" text-anchor="middle" class="chart-axis-text">ระยะเวลาตามสัญญา</text>
                        ${labelParts.join('')}
                        ${sCurveFillVisible ? `<path d="${fillPath}" class="chart-fill-red"></path>` : ''}
                        <path d="${pathData}" class="chart-line-red"></path>
                        ${circles}
                    </svg>
                </div>
            `;
        }

        function refreshCostDerivedDisplays() {
            const summaryData = computeCostSummaryData();

            summaryData.groups.forEach((group, idx) => {
                const subtotalCell = document.querySelector(`[data-group-subtotal="${idx}"]`);
                if (subtotalCell) subtotalCell.textContent = formatMoneyDisplay(group.total);
            });
            renderCostSummary(summaryData);
            renderSCurveChart(summaryData.projectTotal);
        }

        function updateCostSettings(field, rawValue) {
            const cleaned = String(rawValue || '').replace(/,/g, '').replace(/[^0-9.]/g, '');
            costSettings[field] = parseFloat(cleaned) || 0;
            renderCostTable();
            scheduleAutoSave();
        }

        function normalizeCostSettingsInputs() {
            const factorInput = document.getElementById('factor-f-input');
            const vatInput = document.getElementById('vat-input');
            if (factorInput) factorInput.value = Number(costSettings.factorF || 0).toFixed(4);
            if (vatInput) vatInput.value = Number(costSettings.vat || 0).toFixed(4);
        }

        function updateTaskCost(index, rawValue) {
            const cleaned = String(rawValue || '').replace(/,/g, '').replace(/[^0-9.]/g, '');
            tasks[index].cost = parseFloat(cleaned) || 0;
        }

        function handleTaskCostInput(input, index) {
            updateTaskCost(index, input.value);
            const row = input.closest('.flex.row-height');
            if (!row) return;
            const finalCell = row.querySelector('[data-role="final-value"]');
            const rate = parseFloat(row.getAttribute('data-rate') || '0') || 0;
            if (finalCell) {
                finalCell.textContent = formatMoneyDisplay((parseFloat(tasks[index].cost) || 0) * rate);
            }
            refreshCostDerivedDisplays();
            renderDashboard();
            scheduleAutoSave();
        }

        function finalizeTaskCost(input, index) {
            updateTaskCost(index, input.value);
            input.value = formatMoneyDisplay(tasks[index].cost || 0);
            refreshCostDerivedDisplays();
            renderDashboard();
            scheduleAutoSave();
        }

        function isEquipmentKeyword(text) {
            return /ครุภัณฑ์|เครื่อง/.test(String(text || ''));
        }

        function getTaskRateInfo(task, groupName = '') {
            const useVat = isEquipmentKeyword(task.name) || isEquipmentKeyword(groupName);
            const rate = useVat ? (parseFloat(costSettings.vat) || 0) : (parseFloat(costSettings.factorF) || 0);
            return { rate, label: useVat ? 'Vat' : 'Factor F' };
        }

        function renderCostTable() {
            const tbody = document.getElementById('cost-table-body');
            if (!tbody) return;

            const rows = [];
            let groupCount = 0;
            let currentGroup = null;
            let currentGroupIndex = -1;

            const flushGroupSubtotal = () => {
                if (!currentGroup) return;
                rows.push(`
                    <div class="flex row-height bg-amber-50 border-b border-amber-200 font-bold">
                        <div class="cell w-24 shrink-0 justify-center bg-amber-100/70 text-amber-700 text-[11px]">รวม</div>
                        <div class="cell flex-1 min-w-[360px] px-4 text-[13px] text-amber-800">รวมมูลค่าหัวข้อ: ${escapeTooltipHtml(currentGroup.name)}</div>
                        <div class="cell w-56 shrink-0 justify-end px-4 text-amber-700">-</div>
                        <div class="cell w-40 shrink-0 justify-center text-amber-700">-</div>
                        <div class="cell w-64 shrink-0 justify-end px-4 text-amber-800 text-[13px]" data-group-subtotal="${currentGroupIndex}">${formatMoneyDisplay(currentGroup.total)}</div>
                    </div>
                `);
            };

            tasks.forEach((task, index) => {
                if (task.isMilestone) return;

                if (task.isGroup) {
                    flushGroupSubtotal();
                    currentGroup = { name: task.name || '', wbs: task.wbs || '', total: 0 };
                    currentGroupIndex += 1;
                    groupCount++;
                    rows.push(`
                        <div class="flex row-height bg-slate-200/80 border-b border-slate-300 font-bold">
                            <div class="cell w-24 shrink-0 justify-center bg-slate-300/70 text-slate-700 text-[11px]">${task.wbs || ''}</div>
                            <div class="cell flex-1 min-w-[360px] px-4 text-[13px] text-slate-800">${escapeTooltipHtml(task.name || '')}</div>
                            <div class="cell w-56 shrink-0 justify-end px-4 text-slate-500">-</div>
                            <div class="cell w-40 shrink-0 justify-center text-slate-500">-</div>
                            <div class="cell w-64 shrink-0 justify-end px-4 text-slate-500">-</div>
                        </div>
                    `);
                    return;
                }

                if (!currentGroup) {
                    currentGroup = { name: 'งานทั่วไป', wbs: '', total: 0 };
                    currentGroupIndex += 1;
                    groupCount++;
                    rows.push(`
                        <div class="flex row-height bg-slate-200/80 border-b border-slate-300 font-bold">
                            <div class="cell w-24 shrink-0 justify-center bg-slate-300/70 text-slate-700 text-[11px]"></div>
                            <div class="cell flex-1 min-w-[360px] px-4 text-[13px] text-slate-800">งานทั่วไป</div>
                            <div class="cell w-56 shrink-0 justify-end px-4 text-slate-500">-</div>
                            <div class="cell w-40 shrink-0 justify-center text-slate-500">-</div>
                            <div class="cell w-64 shrink-0 justify-end px-4 text-slate-500">-</div>
                        </div>
                    `);
                }

                const baseCost = parseFloat(task.cost) || 0;
                const rateInfo = getTaskRateInfo(task, currentGroup.name);
                const finalValue = baseCost * rateInfo.rate;
                currentGroup.total += finalValue;

                rows.push(`
                    <div class="flex row-height border-b border-slate-100 hover:bg-blue-50/40" data-rate="${rateInfo.rate}">
                        <div class="cell w-24 shrink-0 justify-center bg-slate-50/80 text-slate-500 text-[11px] font-bold">${task.wbs || ''}</div>
                        <div class="cell flex-1 min-w-[360px] px-4 text-[13px] text-slate-700 pl-8">${escapeTooltipHtml(task.name || '')}</div>
                        <div class="cell w-56 shrink-0 justify-end px-2">
                            <input type="text" value="${formatMoneyDisplay(baseCost)}" 
                                oninput="handleTaskCostInput(this, ${index})" 
                                onblur="finalizeTaskCost(this, ${index})" 
                                class="cost-input text-right text-slate-700 font-bold w-full bg-transparent outline-none px-2">
                        </div>
                        <div class="cell w-40 shrink-0 justify-center px-2 text-[12px] font-bold ${rateInfo.label === 'Vat' ? 'text-emerald-700' : 'text-narit-blue'}" title="${rateInfo.label}">${formatFactorDisplay(rateInfo.rate)}</div>
                        <div class="cell w-64 shrink-0 justify-end px-4 text-[13px] font-bold text-emerald-700" data-role="final-value">${formatMoneyDisplay(finalValue)}</div>
                    </div>
                `);
            });

            flushGroupSubtotal();

            tbody.innerHTML = rows.length ? rows.join('') : `
                <div class="px-6 py-10 text-center text-slate-400 text-sm">ยังไม่มีรายการสำหรับคำนวณมูลค่างาน</div>
            `;
            const summaryData = computeCostSummaryData();
            renderCostSummary(summaryData);
            renderSCurveChart(summaryData.projectTotal);
        }
