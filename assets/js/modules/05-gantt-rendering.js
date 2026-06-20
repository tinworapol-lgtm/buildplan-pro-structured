// BuildPlan Pro - Gantt table, timeline, dependency, and overlay rendering
// Split from assets/js/app.js without behavior changes.

        function applyPlanPageDefaultToggles() {
            const defaults = {
                'show-pred': true,
                'show-today-line': false,
                'show-installment-lines': false,
                'show-critical': false,
                'show-scurve-overlay': false,
                'show-bar-labels': false
            };
            Object.entries(defaults).forEach(([id, checked]) => {
                const el = document.getElementById(id);
                if (el) el.checked = checked;
            });
            showInstallmentLines = false;
            sCurveFillVisible = false;
            todayPopoverSide = 'right';
            customTodayDate = new Date();
            customTodayDate.setHours(0, 0, 0, 0);
        }

        function renderUI() {
            renderTable();
            renderTimeline();
            renderGanttBars();
            renderGanttSCurveOverlay();
            renderCostTable();
            renderInstallmentPanel();
            renderDurationPlanTable();
            renderDashboard();
            renderActualProgressPage();
            togglePredColumn();
            syncTaskNameColumnWidth();
            updateGanttStyleToggleButton();
            scheduleAutoSave();
        }

        function clampTaskNameColumnWidth(value) {
            return Math.min(560, Math.max(160, parseInt(value, 10) || 250));
        }

        function getDataPaneFixedWidth() {
            const showPred = document.getElementById('show-pred')?.checked !== false;
            const predWidth = showPred ? 80 : 0;
            return 64 + 48 + 56 + predWidth + 112 + 112 + 80 + 40 + 10 + 4;
        }

        function getPrintableDataPaneWidth() {
            const showPred = document.getElementById('show-pred')?.checked !== false;
            const predWidth = showPred ? 80 : 0;
            return 48 + taskNameColumnWidth + 56 + predWidth + 112 + 112 + 80 + 2;
        }

        function syncTaskNameColumnWidth() {
            taskNameColumnWidth = clampTaskNameColumnWidth(taskNameColumnWidth);
            document.documentElement.style.setProperty('--task-name-col-width', taskNameColumnWidth + 'px');
            const dataPane = document.getElementById('data-pane');
            if (dataPane) {
                dataPane.style.width = (getDataPaneFixedWidth() + taskNameColumnWidth) + 'px';
                dataPane.style.minWidth = dataPane.style.width;
                dataPane.style.maxWidth = dataPane.style.width;
            }
        }

        function setupTaskNameColumnResizer() {
            const handle = document.getElementById('task-name-resizer');
            if (!handle || handle.dataset.bound === '1') return;
            handle.dataset.bound = '1';
            handle.addEventListener('mousedown', (event) => {
                event.preventDefault();
                const startX = event.clientX;
                const startWidth = taskNameColumnWidth;
                document.body.classList.add('resizing-task-name');

                function onMouseMove(moveEvent) {
                    taskNameColumnWidth = clampTaskNameColumnWidth(startWidth + (moveEvent.clientX - startX));
                    syncTaskNameColumnWidth();
                }

                function onMouseUp() {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    document.body.classList.remove('resizing-task-name');
                    scheduleAutoSave();
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }

        function renderTable() {
            const tbody = document.getElementById('data-body');
            tbody.innerHTML = '';
            
            tasks.forEach((task, index) => {
                const row = document.createElement('div');
                let rowClasses = "flex row-height group/row border-b border-slate-100 ";
                
                if(task.isMilestone) rowClasses += "bg-amber-50/50 hover:bg-amber-50";
                else if(task.isGroup) rowClasses += "bg-slate-100/70 hover:bg-slate-200/50";
                else rowClasses += "bg-white hover:bg-blue-50/40";
                row.className = rowClasses;
                
                const isGroup = task.isGroup;
                const isMilestone = task.isMilestone;
                const hasPred = task.preds && task.preds.length > 0;
                const disableStart = isGroup || hasPred; 
                
                let fontStyle = "text-slate-700";
                if(isGroup) fontStyle = "font-bold text-slate-800";
                if(isMilestone) fontStyle = "font-bold text-amber-600";

                const leftPadding = isGroup || isMilestone ? "pl-3" : "pl-8";
                const safeTaskName = escapeTooltipHtml(task.name);
                const safePreds = escapeTooltipHtml(task.predecessorsStr || '');
                const safeStart = escapeTooltipHtml(task.start);

                row.innerHTML = `
                    <div class="cell w-16 shrink-0 justify-center bg-slate-50/80 no-print gap-1 border-r border-slate-200">
                        <button onclick="moveTaskUp(${index})" class="text-slate-400 hover:text-blue-500 transition-transform hover:-translate-y-0.5 disabled:opacity-20 disabled:hover:translate-y-0" ${index === 0 ? 'disabled' : ''} title="เลื่อนขึ้น">
                            <i class="fa-solid fa-arrow-up text-xs"></i>
                        </button>
                        <button onclick="moveTaskDown(${index})" class="text-slate-400 hover:text-blue-500 transition-transform hover:translate-y-0.5 disabled:opacity-20 disabled:hover:translate-y-0" ${index === tasks.length - 1 ? 'disabled' : ''} title="เลื่อนลง">
                            <i class="fa-solid fa-arrow-down text-xs"></i>
                        </button>
                        <div class="w-px h-3 bg-slate-300 mx-0.5"></div>
                        <button onclick="insertTaskRow(${index})" class="text-slate-400 hover:text-emerald-500 transition-transform hover:scale-110" title="แทรกรายการ">
                            <i class="fa-solid fa-plus text-xs"></i>
                        </button>
                    </div>

                    <div class="cell w-12 shrink-0 bg-slate-50/80 text-slate-500 justify-center text-[11px] border-r border-slate-200 font-bold ${isMilestone?'text-amber-500':''}">${escapeTooltipHtml(task.wbs)}</div>
                    
                    <div class="cell task-name-col relative group/name">
                        <span class="invisible whitespace-nowrap h-0 overflow-hidden block w-max pr-12 text-[13px] ${leftPadding} ${fontStyle}">${safeTaskName}</span>
                        <input type="text" value="${safeTaskName}" onchange="updateData(${index}, 'name', this.value)" class="absolute inset-0 w-full h-full bg-transparent border-transparent focus:bg-white rounded outline-none transition-all text-[13px] ${fontStyle} ${leftPadding} pr-8">
                        
                        ${isGroup ? `
                        <button onclick="addSubTask(${index})" class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/name:opacity-100 bg-blue-100/80 text-blue-600 hover:bg-blue-600 hover:text-white rounded w-6 h-6 flex items-center justify-center transition-all no-print shadow-sm transform hover:scale-105 z-10" title="เพิ่มหัวข้อย่อย">
                            <i class="fa-solid fa-plus text-[10px]"></i>
                        </button>
                        ` : ''}
                    </div>

                    <div class="cell w-14 shrink-0 justify-center">
                        <input type="number" value="${task.duration}" onchange="updateData(${index}, 'duration', this.value)" class="w-full h-full text-center px-2 font-medium ${isGroup||isMilestone ? 'text-slate-400 cursor-not-allowed bg-transparent font-bold' : 'text-slate-700'}" ${(isGroup||isMilestone) ? 'readonly' : ''}>
                    </div>

                    <div class="cell w-20 shrink-0 justify-center pred-col transition-all">
                        <input type="text" value="${safePreds}" onchange="updateData(${index}, 'predecessors', this.value)" class="w-full h-full text-center px-2 font-bold text-[11px] ${isGroup ? 'text-slate-400 bg-slate-50/50 cursor-not-allowed' : 'text-indigo-600 uppercase'}" ${isGroup ? 'readonly title="หัวข้อใหญ่ไม่สามารถระบุความสัมพันธ์ได้"' : 'placeholder="e.g. 1.1FS"'}>
                    </div>
                    
                    <div class="cell w-28 shrink-0 relative overflow-hidden group/date ${disableStart ? 'bg-slate-50' : ''}">
                        <span class="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-medium px-2 ${isGroup ? 'text-slate-500 font-bold' : (hasPred ? 'text-indigo-600' : 'text-slate-700')}">${formatDateToThai(task.start)}</span>
                        <input type="date" value="${safeStart}" onchange="updateData(${index}, 'start', this.value)" class="opacity-0 w-full h-full cursor-pointer absolute inset-0 z-10 text-xs text-center px-2 focus:opacity-100 bg-white" ${disableStart ? 'disabled title="ถูกคำนวณอัตโนมัติจากความสัมพันธ์"' : 'title="คลิกเพื่อเลือกวันที่"'} >
                    </div>
                    
                    <div class="cell w-28 shrink-0 justify-center bg-slate-50/50 px-2">
                        <span class="text-xs ${isGroup||isMilestone ? 'font-bold text-emerald-700' : 'text-emerald-600 font-medium'}">${formatDateToThai(safeFormatDate(task.endDateObj))}</span>
                    </div>

                    <div class="cell w-20 shrink-0 justify-center px-2 bg-white">
                        <div class="flex flex-col gap-1 w-full">
                            <div class="progress-readonly-value ${isGroup ? 'progress-group' : ''} ${getTaskProgressForDisplay(task, index) >= 100 ? 'progress-complete' : 'progress-incomplete'}" title="แก้ไขได้ในหน้า Actual Progress Tracking เท่านั้น">${getTaskProgressForDisplay(task, index)}%</div>
                        </div>
                    </div>

                    <div class="cell w-10 shrink-0 justify-center bg-slate-50/80 no-print">
                        <button onclick="deleteRow(${index})" class="text-slate-300 hover:text-red-500 hover:bg-red-50 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all" title="ลบรายการ">
                            <i class="fa-solid fa-trash-can text-[11px]"></i>
                        </button>
                    </div>
                `;
                tbody.appendChild(row);
            });
            
            const totalHeight = tasks.length * 36;
            document.getElementById('data-body').style.height = `${totalHeight}px`;
            syncTaskNameColumnWidth();
            setupTaskNameColumnResizer();
        }

        function renderTimeline() {
            const header = document.getElementById('timeline-header');
            const grid = document.getElementById('gantt-grid');
            const bgRows = document.getElementById('gantt-bg-rows');
            
            header.innerHTML = `
                <div id="header-top" class="absolute top-0 w-full flex border-b border-slate-200 bg-slate-100" style="height: 22px;"></div>
                <div id="header-bottom" class="absolute top-[22px] w-full flex bg-slate-50" style="height: 28px;"></div>
            `;
            const headerTop = document.getElementById('header-top');
            const headerBottom = document.getElementById('header-bottom');

            grid.innerHTML = '';
            bgRows.innerHTML = '';

            for(let i=0; i<tasks.length; i++) {
                let rLine = document.createElement('div');
                let bgClass = (i%2===0?'bg-white':'bg-slate-50/30');
                if(tasks[i].isMilestone) bgClass = 'bg-amber-50/30';
                else if(tasks[i].isGroup) bgClass = 'bg-slate-100/50';
                
                rLine.className = `absolute w-full border-b border-slate-100 ${bgClass}`;
                rLine.style.height = "36px";
                rLine.style.top = `${i*36}px`;
                bgRows.appendChild(rLine);
            }

            let totalRangeMs = projectEndDate - projectStartDate;
            let totalRangeDays = totalRangeMs / (1000 * 60 * 60 * 24);
            let totalWidthPx = 0;

            if (currentScale === 'daily') {
                totalWidthPx = Math.ceil(totalRangeDays) * colWidth;
                for (let i = 0; i < Math.ceil(totalRangeDays); i++) {
                    let dDate = new Date(projectStartDate);
                    dDate.setDate(dDate.getDate() + i);
                    let leftPx = i * colWidth;
                    
                    let bCell = document.createElement('div');
                    bCell.className = "absolute h-full flex flex-col justify-center items-center text-[10px] border-r border-slate-200 font-medium";
                    bCell.style.left = `${leftPx}px`;
                    bCell.style.width = `${colWidth}px`;
                    if(dDate.getDay() === 0 || dDate.getDay() === 6) bCell.classList.add('bg-slate-200/60', 'text-red-500', 'font-bold'); 
                    else bCell.classList.add('text-slate-600');
                    bCell.innerHTML = `<span>${dDate.getDate()}</span>`;
                    headerBottom.appendChild(bCell);
                    
                    let vLine = document.createElement('div');
                    vLine.className = "absolute h-full border-l border-slate-100 gantt-grid-line z-0";
                    vLine.style.left = `${leftPx}px`;
                    if(dDate.getDay() === 0 || dDate.getDay() === 6) vLine.classList.add('bg-slate-50');
                    grid.appendChild(vLine);
                }
            } 
            else if (currentScale === 'weekly') {
                let numWeeks = Math.ceil(totalRangeDays / 7);
                totalWidthPx = numWeeks * colWidth;
                for (let i = 0; i < numWeeks; i++) {
                    let wDate = new Date(projectStartDate);
                    wDate.setDate(wDate.getDate() + (i * 7));
                    let eDate = new Date(wDate);
                    eDate.setDate(eDate.getDate() + 6);
                    
                    let leftPx = i * colWidth;
                    let bCell = document.createElement('div');
                    bCell.className = "absolute h-full flex flex-col justify-center items-center text-[10px] border-r border-slate-200 font-semibold text-slate-600";
                    bCell.style.left = `${leftPx}px`;
                    bCell.style.width = `${colWidth}px`;
                    bCell.innerHTML = `<span>${wDate.getDate()} - ${eDate.getDate()}</span>`;
                    headerBottom.appendChild(bCell);
                    
                    let vLine = document.createElement('div');
                    vLine.className = "absolute h-full border-l border-slate-200 gantt-grid-line z-0";
                    vLine.style.left = `${leftPx}px`;
                    grid.appendChild(vLine);
                }
            }
            else if (currentScale === 'monthly') {
                let iterDate = new Date(projectStartDate.getFullYear(), projectStartDate.getMonth(), 1);
                let endM = new Date(projectEndDate.getFullYear(), projectEndDate.getMonth() + 1, 1);
                
                while(iterDate < endM) {
                    let leftPx = getDateOffsetPx(iterDate);
                    let nextM = new Date(iterDate.getFullYear(), iterDate.getMonth() + 1, 1);
                    let rightPx = getDateOffsetPx(nextM);
                    let mWidth = rightPx - leftPx;
                    
                    let daysInMonth = new Date(iterDate.getFullYear(), iterDate.getMonth() + 1, 0).getDate();
                    let ranges = [
                        { label: '1-7', start: 1, end: 7 },
                        { label: '8-14', start: 8, end: 14 },
                        { label: '15-21', start: 15, end: 21 },
                        { label: `22-${daysInMonth}`, start: 22, end: daysInMonth }
                    ];

                    const monthSlotWidth = mWidth / ranges.length;
                    ranges.forEach((r, rangeIndex) => {
                        let rStartPx = leftPx + (rangeIndex * monthSlotWidth);
                        let rWidth = monthSlotWidth;
                        
                        let bCell = document.createElement('div');
                        bCell.className = "absolute h-full flex items-center justify-center text-[10px] border-r border-slate-200 bg-white overflow-hidden text-slate-500 font-bold";
                        bCell.style.left = `${rStartPx}px`;
                        bCell.style.width = `${rWidth}px`;
                        
                        let span = document.createElement('span');
                        span.innerText = r.label;
                        span.style.transform = "rotate(-90deg)";
                        span.style.display = "inline-block";
                        span.style.whiteSpace = "nowrap";
                        bCell.appendChild(span);
                        headerBottom.appendChild(bCell);
                        
                        let vLine = document.createElement('div');
                        vLine.className = "absolute h-full border-l border-slate-100 gantt-grid-line z-0";
                        vLine.style.left = `${rStartPx}px`;
                        grid.appendChild(vLine);
                    });

                    let mLine = document.createElement('div');
                    mLine.className = "absolute h-full border-l border-slate-300 gantt-grid-line z-10 shadow-[-1px_0_2px_rgba(0,0,0,0.02)]";
                    mLine.style.left = `${leftPx}px`;
                    grid.appendChild(mLine);

                    iterDate = nextM;
                }
                totalWidthPx = getDateOffsetPx(projectEndDate);
            }
            else if (currentScale === 'yearly') {
                let startYear = projectStartDate.getFullYear();
                let endYear = projectEndDate.getFullYear();
                totalWidthPx = (endYear - startYear + 1) * colWidth;
                
                for (let i = 0; i <= (endYear - startYear); i++) {
                    let leftPx = i * colWidth;
                    
                    let quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
                    let qWidth = colWidth / 4;
                    quarters.forEach((q, idx) => {
                        let qLeft = leftPx + (idx * qWidth);
                        let bCell = document.createElement('div');
                        bCell.className = "absolute h-full flex items-center justify-center text-[10px] border-r border-slate-200 font-bold text-slate-500 bg-white";
                        bCell.style.left = `${qLeft}px`;
                        bCell.style.width = `${qWidth}px`;
                        bCell.innerText = q;
                        headerBottom.appendChild(bCell);
                        
                        if(idx > 0) {
                            let vLine = document.createElement('div');
                            vLine.className = "absolute h-full border-l border-slate-100 gantt-grid-line z-0";
                            vLine.style.left = `${qLeft}px`;
                            grid.appendChild(vLine);
                        }
                    });
                    
                    let yLine = document.createElement('div');
                    yLine.className = "absolute h-full border-l border-slate-300 gantt-grid-line z-10";
                    yLine.style.left = `${leftPx}px`;
                    grid.appendChild(yLine);
                }
            }

            if (currentScale !== 'yearly') {
                let iterM = new Date(projectStartDate.getFullYear(), projectStartDate.getMonth(), 1);
                let loopEnd = new Date(projectEndDate);
                
                while (iterM <= loopEnd) {
                    let leftPx = Math.max(0, getDateOffsetPx(iterM));
                    let nextM = new Date(iterM.getFullYear(), iterM.getMonth() + 1, 1);
                    let rightPx = Math.min(totalWidthPx, getDateOffsetPx(nextM));
                    let widthPx = rightPx - leftPx;
                    
                    if (widthPx > 0) {
                        let topCell = document.createElement('div');
                        topCell.className = "absolute h-full flex items-center justify-center text-[11px] font-bold text-narit-blue border-r border-slate-300 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.05)]";
                        topCell.style.left = `${leftPx}px`;
                        topCell.style.width = `${widthPx}px`;
                        topCell.innerText = iterM.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
                        headerTop.appendChild(topCell);
                    }
                    iterM = nextM;
                }
            } else {
                let startYear = projectStartDate.getFullYear();
                let endYear = projectEndDate.getFullYear();
                for (let i = 0; i <= (endYear - startYear); i++) {
                    let leftPx = i * colWidth;
                    let topCell = document.createElement('div');
                    topCell.className = "absolute h-full flex items-center justify-center text-[11px] font-bold text-narit-blue border-r border-slate-300";
                    topCell.style.left = `${leftPx}px`;
                    topCell.style.width = `${colWidth}px`;
                    topCell.innerText = (startYear + i + 543);
                    headerTop.appendChild(topCell);
                }
            }
            
            const exactWidthPx = Math.max(1, Math.round(totalWidthPx));
            const ganttBodyEl = document.getElementById('gantt-body');
            const timelineWrapperEl = document.getElementById('timeline-header-wrapper');
            const verticalScrollbarComp = Math.max(0, (ganttBodyEl?.offsetWidth || 0) - (ganttBodyEl?.clientWidth || 0));
            const headerWidthPx = exactWidthPx + verticalScrollbarComp;

            header.style.width = `${headerWidthPx}px`;
            headerTop.style.width = `${headerWidthPx}px`;
            headerBottom.style.width = `${headerWidthPx}px`;
            if (timelineWrapperEl) timelineWrapperEl.style.paddingRight = `${verticalScrollbarComp}px`;
            grid.style.width = `${exactWidthPx}px`;
            bgRows.style.width = `${exactWidthPx}px`;

            const endBoundaryLine = document.createElement('div');
            endBoundaryLine.className = "absolute h-full border-l border-slate-300 gantt-grid-line z-10";
            endBoundaryLine.style.left = `${exactWidthPx}px`;
            grid.appendChild(endBoundaryLine);

            const totalHeight = tasks.length * 36;
            const ganttContent = document.getElementById('gantt-content');
            ganttContent.style.width = `${exactWidthPx}px`;
            ganttContent.style.height = `${totalHeight}px`;
        }

        function buildSCurvePath(points) {
            if (!points || !points.length) return '';
            if (!sCurveSmoothMode || points.length < 3) {
                return points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
            }
            const d = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[Math.max(0, i - 1)];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[Math.min(points.length - 1, i + 2)];
                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;
                d.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`);
            }
            return d.join(' ');
        }

        function buildSCurveFillPath(points, baselineY) {
            if (!points || !points.length) return '';
            const line = buildSCurvePath(points);
            const last = points[points.length - 1];
            const first = points[0];
            return `${line} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
        }

        function getSCurveOverlayPathData(totalValueOverride = null) {
            const sData = getSCurveData();
            if (!sData.startDate || !sData.endDate || !sData.points.length) return null;
            const totalValue = Math.max(parseFloat(totalValueOverride ?? sData.totalValue) || 0, 0);
            if (totalValue <= 0) return null;

            const totalHeight = tasks.length * 36;
            const topY = 18;
            const bottomY = Math.max(topY + 1, totalHeight - 18);
            const usableHeight = Math.max(1, bottomY - topY);

            const plotPoints = sData.points.map((point, idx) => {
                const x = getDateOffsetPx(point.date);
                const y = bottomY - ((point.cumulative / totalValue) * usableHeight);
                return {
                    index: idx,
                    date: point.date,
                    cumulative: point.cumulative,
                    x,
                    y
                };
            });

            const pathData = buildSCurvePath(plotPoints);

            return {
                d: pathData,
                totalHeight,
                totalValue,
                topY,
                bottomY,
                usableHeight,
                points: plotPoints
            };
        }

        function getActualOverlayPathData(baseOverlayData = null) {
            const overlayData = baseOverlayData || getSCurveOverlayPathData(computeCostSummaryData().projectTotal);
            if (!overlayData || !overlayData.totalValue || !overlayData.points.length) return null;
            const series = getActualSeries();
            if (!series.length) return null;
            const plotPoints = series.map((point, idx) => {
                const x = getDateOffsetPx(point.date);
                const y = overlayData.bottomY - ((clampNumber(point.actual, 0, 100) / 100) * overlayData.usableHeight);
                return {
                    index: idx,
                    date: point.date,
                    actual: point.actual,
                    x,
                    y
                };
            }).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
            if (!plotPoints.length) return null;
            return {
                d: buildSCurvePath(plotPoints),
                points: plotPoints
            };
        }

        function getSCurvePointAtDate(targetDate, totalValueOverride = null) {
            const overlayData = getSCurveOverlayPathData(totalValueOverride);
            if (!overlayData || !overlayData.points.length || !targetDate) return null;

            const target = new Date(targetDate);
            target.setHours(0, 0, 0, 0);

            let nearest = overlayData.points[0];
            let minDiff = Math.abs(target - nearest.date);

            overlayData.points.forEach(point => {
                const diff = Math.abs(target - point.date);
                if (diff < minDiff) {
                    nearest = point;
                    minDiff = diff;
                }
            });

            return {
                x: nearest.x,
                y: nearest.y,
                cumulative: nearest.cumulative,
                totalValue: overlayData.totalValue,
                date: nearest.date
            };
        }

        function renderGanttSCurveOverlay() {
            const svg = document.getElementById('scurve-overlay-svg');
            const group = document.getElementById('scurve-overlay-group');
            const ganttContent = document.getElementById('gantt-content');
            const toggle = document.getElementById('show-scurve-overlay');
            if (!svg || !group || !ganttContent) return;

            group.innerHTML = '';

            const summaryData = computeCostSummaryData();
            const totalProjectValue = Math.max(parseFloat(summaryData?.projectTotal) || 0, 0);
            const overlayData = getSCurveOverlayPathData(totalProjectValue);
            const totalWidthPx = parseFloat(ganttContent.style.width || '0') || ganttContent.scrollWidth || 0;
            const totalHeight = Math.max(tasks.length * 36, document.getElementById('gantt-body')?.clientHeight || 0);

            svg.setAttribute('viewBox', `0 0 ${Math.max(totalWidthPx, 1)} ${Math.max(totalHeight, 1)}`);
            svg.style.width = `${Math.max(totalWidthPx, 1)}px`;
            svg.style.height = `${Math.max(totalHeight, 1)}px`;

            if (!toggle || !toggle.checked || !overlayData || !overlayData.points.length || overlayData.totalValue <= 0) return;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', overlayData.d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', '#2563eb');
            path.setAttribute('stroke-width', '2.5');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('opacity', '0.98');
            path.style.pointerEvents = 'none';
            group.appendChild(path);

            const pointEvery = Math.max(1, Math.round(overlayData.points.length / 12));

            overlayData.points.forEach((point, idx) => {
                if (!(idx % pointEvery === 0 || idx === overlayData.points.length - 1)) return;

                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', point.x.toFixed(2));
                circle.setAttribute('cy', point.y.toFixed(2));
                circle.setAttribute('r', '4.5');
                circle.setAttribute('fill', '#2563eb');
                circle.setAttribute('stroke', '#ffffff');
                circle.setAttribute('stroke-width', '1.5');
                circle.style.pointerEvents = 'auto';
                circle.style.cursor = 'pointer';
                circle.addEventListener('mouseenter', (event) => {
                    showChartTooltip(event, getProgressTooltipHtml(point.cumulative, overlayData.totalValue));
                });
                circle.addEventListener('mousemove', moveChartTooltip);
                circle.addEventListener('mouseleave', hideChartTooltip);
                group.appendChild(circle);
            });

            const actualOverlayData = getActualOverlayPathData(overlayData);
            if (actualOverlayData?.points.length) {
                const actualPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                actualPath.setAttribute('d', actualOverlayData.d);
                actualPath.setAttribute('fill', 'none');
                actualPath.setAttribute('stroke', '#dc2626');
                actualPath.setAttribute('stroke-width', '2.8');
                actualPath.setAttribute('stroke-linejoin', 'round');
                actualPath.setAttribute('stroke-linecap', 'round');
                actualPath.setAttribute('stroke-dasharray', '8 5');
                actualPath.setAttribute('opacity', '0.98');
                actualPath.style.pointerEvents = 'none';
                group.appendChild(actualPath);

                actualOverlayData.points.forEach(point => {
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', point.x.toFixed(2));
                    circle.setAttribute('cy', point.y.toFixed(2));
                    circle.setAttribute('r', '4.2');
                    circle.setAttribute('fill', '#dc2626');
                    circle.setAttribute('stroke', '#ffffff');
                    circle.setAttribute('stroke-width', '1.5');
                    circle.style.pointerEvents = 'auto';
                    circle.style.cursor = 'pointer';
                    circle.addEventListener('mouseenter', (event) => {
                        showChartTooltip(event, `Actual: ${point.actual.toFixed(2)}%<br>${formatDateDisplay(point.date)}`);
                    });
                    circle.addEventListener('mousemove', moveChartTooltip);
                    circle.addEventListener('mouseleave', hideChartTooltip);
                    group.appendChild(circle);
                });
            }
        }

        function getTodayScheduleStatus(variance) {
            if (variance >= 3) return 'Ahead';
            if (variance <= -3) return 'Delayed';
            return 'On Track';
        }

        function getTodayScheduleDayStatus(dateKey, actualProgress, variance = 0) {
            const plannedDate = findPlannedDateForProgress(actualProgress);
            const targetDate = new Date(dateKey + 'T00:00:00');
            if (plannedDate && !isNaN(targetDate.getTime())) {
                const dayDelta = Math.round((plannedDate - targetDate) / 86400000);
                if (dayDelta > 0) return 'เร็วกว่าแผน ' + dayDelta + ' วัน';
                if (dayDelta < 0) return 'ช้ากว่าแผน ' + Math.abs(dayDelta) + ' วัน';
            }
            const fallbackDays = Math.max(1, Math.round(Math.abs(variance)));
            if (variance > 0.01) return 'เร็วกว่าแผน ' + fallbackDays + ' วัน';
            if (variance < -0.01) return 'ช้ากว่าแผน ' + fallbackDays + ' วัน';
            return 'ตรงตามแผน';
        }

        function positionTodayProgressPopover(popover) {
            if (!popover || popover.dataset.userMoved === '1') return;
            const side = todayPopoverSide === 'left' ? 'left' : 'right';
            popover.classList.toggle('today-popover-left', side === 'left');
            popover.classList.toggle('today-popover-right', side !== 'left');
            if (side === 'left') {
                popover.style.left = '-' + ((popover.offsetWidth || 178) + 7) + 'px';
            } else {
                popover.style.left = '29px';
            }
        }

        function createTodayProgressPopover(todayLine, dateKey, planProgress, actualProgress, variance) {
            const popover = document.createElement('div');
            popover.className = 'today-progress-popover';
            const scheduleStatus = getTodayScheduleDayStatus(dateKey, actualProgress, variance);
            popover.innerHTML = `
                <div class="today-popover-card-head">
                    <span class="today-popover-head-icon"><i class="fa-solid fa-calendar-days"></i></span>
                    <span>Today Status <small>${formatDateDisplay(new Date(dateKey + 'T00:00:00'))}</small></span>
                </div>
                <div class="today-popover-card-body">
                    <div class="today-popover-metric">
                        <span class="today-popover-metric-icon today-icon-plan"><i class="fa-solid fa-bullseye"></i></span>
                        <span class="today-popover-label">Plan Progress</span>
                        <b class="today-popover-value today-value-blue">${planProgress.toFixed(2)}%</b>
                    </div>
                    <div class="today-popover-metric">
                        <span class="today-popover-metric-icon today-icon-actual"><i class="fa-solid fa-chart-column"></i></span>
                        <span class="today-popover-label">Actual Progress</span>
                        <b class="today-popover-value today-value-blue">${actualProgress.toFixed(2)}%</b>
                    </div>
                    <div class="today-popover-metric">
                        <span class="today-popover-metric-icon today-icon-variance"><i class="fa-solid fa-arrow-trend-up"></i></span>
                        <span class="today-popover-label">Variance</span>
                        <b class="today-popover-value ${variance >= 0 ? 'today-value-green' : 'today-value-red'}">${variance >= 0 ? '<i class="fa-solid fa-caret-up"></i> +' : '<i class="fa-solid fa-caret-down"></i> '}${variance.toFixed(2)}%</b>
                    </div>
                    <div class="today-popover-metric">
                        <span class="today-popover-metric-icon today-icon-status"><i class="fa-solid fa-shield-check"></i></span>
                        <span class="today-popover-label">Status</span>
                        <b class="today-status-pill ${variance >= -0.01 ? 'today-status-good' : 'today-status-risk'}"><i class="fa-solid fa-circle-check"></i> ${scheduleStatus}</b>
                    </div>
                </div>
            `;
            popover.style.top = '72px';
            let dragging = false;
            let moved = false;
            let startX = 0;
            let startY = 0;
            let startLeft = 0;
            let startTop = 0;
            popover.addEventListener('mousedown', (event) => {
                event.stopPropagation();
                dragging = true;
                moved = false;
                startX = event.clientX;
                startY = event.clientY;
                startLeft = parseFloat(popover.style.left) || 0;
                startTop = parseFloat(popover.style.top) || 0;
                document.body.classList.add('dragging-today-popover');
                function move(moveEvent) {
                    if (!dragging) return;
                    const dy = moveEvent.clientY - startY;
                    if (Math.abs(dy) > 3) moved = true;
                    popover.dataset.userMoved = '1';
                    popover.classList.remove('today-popover-left', 'today-popover-right');
                    popover.style.left = startLeft + 'px';
                    popover.style.top = Math.max(8, startTop + dy) + 'px';
                }
                function up() {
                    dragging = false;
                    document.removeEventListener('mousemove', move);
                    document.removeEventListener('mouseup', up);
                    document.body.classList.remove('dragging-today-popover');
                    if (!moved) {
                        todayPopoverSide = todayPopoverSide === 'left' ? 'right' : 'left';
                        popover.dataset.userMoved = '0';
                        positionTodayProgressPopover(popover);
                    }
                }
                document.addEventListener('mousemove', move);
                document.addEventListener('mouseup', up);
            });
            todayLine.appendChild(popover);
            positionTodayProgressPopover(popover);
            return popover;
        }

        function renderGanttBars() {
            const container = document.getElementById('gantt-bars');
            const criticalLines = document.getElementById('critical-lines');
            const criticalSvg = document.getElementById('critical-svg');
            const todayLayer = document.getElementById('today-line-layer');
            
            let dependencyLines = document.getElementById('dependency-lines');
            if (!dependencyLines && criticalSvg) {
                let defs = criticalSvg.querySelector('defs');
                if (defs && !document.getElementById('arrow-gray')) {
                    defs.insertAdjacentHTML('beforeend', `
                        <marker id="arrow-gray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                        </marker>`);
                }
                dependencyLines = document.createElementNS("http://www.w3.org/2000/svg", "g");
                dependencyLines.id = "dependency-lines";
                criticalSvg.insertBefore(dependencyLines, criticalLines);
            }

            container.innerHTML = '';
            criticalLines.innerHTML = '';
            if (dependencyLines) dependencyLines.innerHTML = '';
            
            const showCritical = document.getElementById('show-critical').checked;
            const showBarLabels = document.getElementById('show-bar-labels')?.checked !== false;

            tasks.forEach((task, index) => {
                let leftPx = getDateOffsetPx(task.startDateObj);
                
                if (task.isMilestone) {
                    const mStone = document.createElement('div');
                    mStone.className = "absolute z-30 flex flex-col items-center pointer-events-auto transition-transform hover:scale-110 cursor-pointer";
                    mStone.style.top = `${index * 36}px`;
                    mStone.style.left = `${leftPx}px`;
                    mStone.style.transform = "translateX(-50%)"; 
                    
                    mStone.innerHTML = `
                        <span class="absolute -top-1 text-[9px] font-bold text-red-600 bg-white/90 px-1 rounded shadow-sm border border-red-100 whitespace-nowrap">${formatDateDisplay(task.startDateObj)}</span>
                        <i class="fa-solid fa-star text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] text-lg mt-3"></i>
                    `;
                    container.appendChild(mStone);
                    return; 
                }

                let endBoundary = new Date(task.endDateObj);
                endBoundary.setDate(endBoundary.getDate() + 1); 
                let rightPx = getDateOffsetPx(endBoundary);
                let widthPx = rightPx - leftPx;

                const bar = document.createElement('div');
                const theme = task.colorTheme || { main: '#1e293b', sub: '#3b82f6' };
                const isClassic = ganttBarStyleMode === 'classic';
                
                if (isClassic && task.isGroup) {
                    bar.className = "gantt-bar group-bar";
                    bar.style.setProperty('--theme-color', '#000000');
                    bar.style.backgroundColor = '#000000';
                    bar.style.backgroundImage = 'none';
                    bar.style.border = '1px solid #000000';
                    bar.style.boxShadow = 'none';
                    bar.style.top = `${(index * 36) + 13}px`;
                } else if (isClassic) {
                    bar.className = "gantt-bar";
                    bar.style.backgroundColor = '#274472';
                    bar.style.backgroundImage = 'none';
                    bar.style.border = '1px solid #274472';
                    bar.style.borderRadius = '0';
                    bar.style.boxShadow = 'none';
                    bar.style.height = '13px';
                    bar.style.top = `${(index * 36) + 4}px`;
                    bar.style.lineHeight = '13px';
                    bar.style.textShadow = 'none';
                    bar.style.color = '#ffffff';
                    if (showCritical && task.isCritical) {
                        bar.style.border = '3px solid #dc2626';
                        bar.style.boxSizing = 'border-box';
                        bar.style.zIndex = '80';
                        bar.style.outline = '1px solid rgba(255,255,255,0.55)';
                        bar.style.outlineOffset = '-4px';
                    }
                    if (showBarLabels && widthPx > 60) bar.innerText = task.name;
                } else if (task.isGroup) {
                    bar.className = "gantt-bar group-bar";
                    bar.style.setProperty('--theme-color', theme.main);
                    bar.style.top = `${(index * 36) + 13}px`;
                } else {
                    bar.className = "gantt-bar";
                    bar.style.backgroundColor = theme.sub; 
                    bar.style.height = '13px';
                    bar.style.top = `${(index * 36) + 4}px`;
                    bar.style.lineHeight = '13px';
                    
                    if (showCritical && task.isCritical) {
                        bar.classList.add("ring-2", "ring-red-500", "ring-offset-1");
                    }
                    if(showBarLabels && widthPx > 60) bar.innerText = task.name;
                }

                bar.style.left = `${leftPx}px`;
                bar.style.width = `${Math.max(widthPx, 4)}px`;
                const barProgress = getTaskProgressForDisplay(task, index);
                bar.title = `${task.name}\nระยะเวลา: ${task.duration} วัน\nProgress: ${barProgress}%\n(${formatDateDisplay(task.startDateObj)} - ${formatDateDisplay(task.endDateObj)})${task.isCritical ? '\n[สายงานวิกฤต]' : ''}`;

                container.appendChild(bar);

                if (!task.isGroup) {
                    const actualRecord = typeof getTaskActualDateRangeRecord === 'function'
                        ? getTaskActualDateRangeRecord(task.id)
                        : (typeof getLatestActualRecordForTask === 'function' ? getLatestActualRecordForTask(task.id) : null);
                    if (actualRecord && actualRecord.percent > 0) {
                        const actualBar = document.createElement('div');
                        const actualStartDate = new Date(actualRecord.startDate || actualRecord.date || task.startDateObj);
                        let actualEndDate = new Date(actualRecord.endDate || actualRecord.date || actualStartDate);
                        actualEndDate.setDate(actualEndDate.getDate() + 1);
                        const actualLeftPx = Math.max(0, getDateOffsetPx(actualStartDate));
                        const actualRightPx = Math.max(actualLeftPx + 4, getDateOffsetPx(actualEndDate));
                        actualBar.className = 'actual-gantt-bar';
                        if (isClassic) actualBar.classList.add('actual-gantt-bar-classic');
                        actualBar.style.left = `${actualLeftPx}px`;
                        actualBar.style.top = `${(index * 36) + 17}px`;
                        actualBar.style.width = `${Math.max(actualRightPx - actualLeftPx, 4)}px`;
                        actualBar.title = `${actualRecord.percent.toFixed(2)}%\n${formatDateDisplay(actualStartDate)} - ${formatDateDisplay(actualEndDate)}`;
                        if (showBarLabels && actualRightPx - actualLeftPx > 34) actualBar.textContent = `${actualRecord.percent.toFixed(0)}%`;
                        container.appendChild(actualBar);
                    }
                }
            });

            const getPlannedBarAnchorY = (task, rowIndex) => {
                if (task?.isGroup) return (rowIndex * 36) + 19;
                if (task?.isMilestone) return (rowIndex * 36) + 10;
                return (rowIndex * 36) + 10.5;
            };

            if (dependencyLines) {
                tasks.forEach(curr => {
                    if (curr.preds && curr.preds.length > 0) {
                        curr.preds.forEach(pReq => {
                            let pTask = tasks.find(pt => pt.wbs === pReq.wbs);
                            if (pTask) {
                                let idx1 = tasks.indexOf(pTask);
                                let idx2 = tasks.indexOf(curr);

                                let pEndPx = getDateOffsetPx(new Date(pTask.endDateObj.getTime() + 86400000));
                                let pStartPx = getDateOffsetPx(pTask.startDateObj);
                                let cEndPx = getDateOffsetPx(new Date(curr.endDateObj.getTime() + 86400000));
                                let cStartPx = getDateOffsetPx(curr.startDateObj);

                                let startX, startY, endX, endY;
                                startY = getPlannedBarAnchorY(pTask, idx1);
                                endY = getPlannedBarAnchorY(curr, idx2);
                                
                                let reqType = pReq.type;
                                if (reqType === 'FS') { startX = pEndPx; endX = cStartPx; }
                                else if (reqType === 'SS') { startX = pStartPx; endX = cStartPx; }
                                else if (reqType === 'FF') { startX = pEndPx; endX = cEndPx; }
                                else if (reqType === 'SF') { startX = pStartPx; endX = cEndPx; }

                                let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                                let d = "";

                                if (reqType === 'FS') {
                                    let midX = startX + Math.max(8, (endX - startX) / 2);
                                    if (endX <= startX + 8) {
                                        midX = startX + 8;
                                        d = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${startY+18} L ${endX-8} ${startY+18} L ${endX-8} ${endY} L ${endX} ${endY}`;
                                    } else {
                                        d = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
                                    }
                                } else if (reqType === 'SS' || reqType === 'SF') {
                                    d = `M ${startX} ${startY} L ${startX-8} ${startY} L ${startX-8} ${endY} L ${endX} ${endY}`;
                                } else if (reqType === 'FF') {
                                    d = `M ${startX} ${startY} L ${startX+8} ${startY} L ${startX+8} ${endY} L ${endX} ${endY}`;
                                }

                                path.setAttribute("d", d);
                                path.setAttribute("fill", "none");
                                path.setAttribute("stroke", "#94a3b8"); 
                                path.setAttribute("stroke-width", "1.2");
                                path.setAttribute("stroke-dasharray", "3,2"); 
                                path.setAttribute("marker-end", "url(#arrow-gray)");
                                
                                dependencyLines.appendChild(path);
                            }
                        });
                    }
                });
            }

            if (showCritical) {
                let criticalTasks = tasks.filter(t => t.isCritical && !t.isGroup).sort((a,b) => a.startDateObj - b.startDateObj);
                
                for(let i=0; i < criticalTasks.length - 1; i++) {
                    let t1 = criticalTasks[i];
                    let t2 = criticalTasks[i+1];
                    
                    let idx1 = tasks.indexOf(t1);
                    let idx2 = tasks.indexOf(t2);

                    let startX = getDateOffsetPx(new Date(t1.endDateObj.getTime() + 86400000));
                    let startY = getPlannedBarAnchorY(t1, idx1);
                    
                    let endX = getDateOffsetPx(t2.startDateObj);
                    let endY = getPlannedBarAnchorY(t2, idx2);

                    let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    let midX = startX + Math.max(12, (endX - startX) / 2);
                    
                    if (endX <= startX + 12) {
                        midX = startX + 12;
                        path.setAttribute("d", `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${startY+18} L ${endX-12} ${startY+18} L ${endX-12} ${endY} L ${endX} ${endY}`);
                    } else {
                        path.setAttribute("d", `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`);
                    }
                    
                    path.setAttribute("fill", "none");
                    path.setAttribute("stroke", "#ef4444"); 
                    path.setAttribute("stroke-width", "2");
                    path.setAttribute("stroke-dasharray", "4,3"); 
                    path.setAttribute("marker-end", "url(#arrow)");
                    path.style.filter = "drop-shadow(0px 1px 1px rgba(239, 68, 68, 0.4))";
                    criticalLines.appendChild(path);
                }
            }

            const showTodayEl = document.getElementById('show-today-line');
            if (showTodayEl && showTodayEl.checked) {
                const totalWidthPx = parseFloat(document.getElementById('gantt-content').style.width) || 1000;
                const summaryData = computeCostSummaryData();
                const totalProjectValue = Math.max(parseFloat(summaryData?.projectTotal) || 0, 0);
                let leftPx = getDateOffsetPx(customTodayDate);
                
                let visualLeftPx = leftPx;
                if (visualLeftPx < 0) visualLeftPx = 0;
                if (visualLeftPx > totalWidthPx) visualLeftPx = totalWidthPx;

                const todayLine = document.createElement('div');
                todayLine.className = "today-line-display-zone absolute top-0 group no-print";
                todayLine.style.left = `${visualLeftPx - 8}px`; 
                todayLine.style.width = '16px'; 
                
                const contentHeight = tasks.length * 36;
                const bodyHeight = document.getElementById('gantt-body').clientHeight || 0;
                todayLine.style.height = `${Math.max(contentHeight, bodyHeight)}px`;

                const visualLine = document.createElement('div');
                visualLine.className = "w-[2px] h-full bg-blue-500 group-hover:bg-blue-600 transition-colors shadow-[0_0_6px_rgba(59,130,246,0.8)] absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none";
                todayLine.appendChild(visualLine);

                const handleLabel = document.createElement('div');
                handleLabel.className = "absolute top-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap select-none flex items-center gap-1 border border-blue-400 z-50";
                todayLine.appendChild(handleLabel);
                const todayDateKey = safeFormatDate(customTodayDate);
                const initialPlanProgress = getPlannedProgressPercentAtDate(customTodayDate);
                const initialActualProgress = typeof getActualProgressAtDate === 'function' ? getActualProgressAtDate(todayDateKey) : 0;
                let todayPopover = createTodayProgressPopover(todayLine, todayDateKey, initialPlanProgress, initialActualProgress, initialActualProgress - initialPlanProgress);

                function updateTodayIntersection(newLeft) {
                    const boundedLeft = Math.max(0, Math.min(newLeft, totalWidthPx));
                    customTodayDate = getDateFromOffsetPx(boundedLeft);
                    todayLine.style.left = `${boundedLeft - 8}px`;
                    handleLabel.innerHTML = `${formatDateDisplay(customTodayDate)}`;
                    const dateKey = safeFormatDate(customTodayDate);
                    const planProgress = getPlannedProgressPercentAtDate(customTodayDate);
                    const actualProgress = typeof getActualProgressAtDate === 'function' ? getActualProgressAtDate(dateKey) : 0;
                    const variance = actualProgress - planProgress;
                    if (todayPopover) {
                        const wasMoved = todayPopover.dataset.userMoved === '1';
                        const oldLeft = todayPopover.style.left;
                        const oldTop = todayPopover.style.top;
                        todayPopover.remove();
                        todayPopover = createTodayProgressPopover(todayLine, dateKey, planProgress, actualProgress, variance);
                        if (wasMoved) {
                            todayPopover.dataset.userMoved = '1';
                            todayPopover.style.left = oldLeft;
                            todayPopover.style.top = oldTop;
                        }
                    }
                    const ganttBody = document.getElementById('gantt-body');
                    if (todayPopover && ganttBody && todayPopover.dataset.userMoved !== '1') {
                        todayPopover.style.top = (ganttBody.scrollTop + 72) + 'px';
                    }
                }

                updateTodayIntersection(visualLeftPx);
                const ganttBodyForPopover = document.getElementById('gantt-body');
                if (ganttBodyForPopover) {
                    ganttBodyForPopover.addEventListener('scroll', () => {
                        if (todayPopover && todayPopover.dataset.userMoved !== '1') {
                            todayPopover.style.top = (ganttBodyForPopover.scrollTop + 72) + 'px';
                        }
                    }, { passive: true });
                }


                (todayLayer || container).appendChild(todayLine);
            }

            renderInstallmentLines(container);
        }

        function toggleTodayLine() {
            const todayToggle = document.getElementById('show-today-line');
            if (todayToggle && todayToggle.checked) {
                customTodayDate = new Date();
                customTodayDate.setHours(0, 0, 0, 0);
            }
            renderUI();
        }

        function resetBuildPlanWorkspace() {
            const proceed = typeof confirm === 'function'
                ? confirm('สร้างแผนงานใหม่และล้างข้อมูลทั้งหมดบนหน้าจอนี้?')
                : true;
            if (!proceed) return;
            const todayKey = safeFormatDate(new Date());
            tasks = [{
                id: Date.now(),
                name: 'รายการงานใหม่',
                duration: 1,
                start: todayKey,
                isGroup: false,
                isMilestone: false,
                predecessors: '',
                progress: 0,
                cost: 0
            }];
            actualEntries = {};
            durationPlanSettings = {};
            installmentSettings = { count: 0, durationDays: 30 };
            costSettings = { factorF: 1.0000, vat: 1.0700 };
            userScalePreference = 'auto';
            ganttBarStyleMode = 'classic';
            sCurveFrequency = 'weekly';
            sCurveFillVisible = true;
            sCurveSmoothMode = false;
            showInstallmentLines = false;
            ['proj-name', 'proj-owner', 'proj-location', 'proj-contractor', 'proj-contract-no', 'project-value', 'proj-supervisor'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const sCurveToggle = document.getElementById('show-scurve-overlay');
            if (sCurveToggle) sCurveToggle.checked = false;
            const todayToggle = document.getElementById('show-today-line');
            if (todayToggle) todayToggle.checked = false;
            applyPlanPageDefaultToggles();
            clearAutoSavedProject();
            window.BuildPlanCloud?.setCurrentProjectId?.('');
            historyStack = [];
            currentHistoryIndex = -1;
            calculateDates(false);
            renderUI();
            scheduleAutoSave();
            finishProcessingAlert({ title: 'สร้างแผนงานใหม่แล้ว', text: 'ล้างข้อมูลเดิมและพร้อมเริ่มกรอกแผนงานใหม่' });
        }


        function renderInstallmentLines(container) {
            if (!container || !showInstallmentLines) return;
            const toggle = document.getElementById('show-installment-lines');
            if (toggle && !toggle.checked) return;
            const schedule = getInstallmentSchedule();
            if (!schedule.length) return;

            const ganttContent = document.getElementById('gantt-content');
            const ganttBody = document.getElementById('gantt-body');
            const totalWidthPx = parseFloat(ganttContent?.style.width) || 1000;
            const contentHeight = (tasks || []).length * 36;
            const bodyHeight = ganttBody?.clientHeight || 0;
            const lineHeight = Math.max(contentHeight, bodyHeight);

            schedule.forEach((item, idx) => {
                let leftPx = getDateOffsetPx(item.dateObj);
                if (leftPx < 0) leftPx = 0;
                if (leftPx > totalWidthPx) leftPx = totalWidthPx;

                const marker = document.createElement('div');
                marker.className = 'absolute top-0 pointer-events-none';
                marker.style.left = `${leftPx}px`;
                marker.style.height = `${lineHeight}px`;
                marker.style.zIndex = '35';
                marker.title = `${item.label}: ${formatDateDisplay(item.dateObj)}`;

                const line = document.createElement('div');
                line.className = 'installment-line-bar';
                marker.appendChild(line);

                const label = document.createElement('div');
                label.className = 'installment-line-label absolute left-0 -translate-x-1/2 text-[10px] font-black px-2 py-0.5 rounded whitespace-nowrap select-none';
                label.style.top = '4px';
                label.textContent = item.label;
                marker.appendChild(label);

                const dateLabel = document.createElement('div');
                dateLabel.className = 'installment-line-date absolute left-0 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap select-none';
                dateLabel.style.top = '24px';
                dateLabel.textContent = formatDateDisplay(item.dateObj);
                marker.appendChild(dateLabel);

                container.appendChild(marker);
            });
        }
