// BuildPlan Pro application runtime
// Extracted from BuildPlan-Pro-Construction-Schedule-Actual-Prototype.html.
// Next phase: split this file by feature area: storage, gantt, actual, cost, duration, print.

let todayForMock = new Date();
        let ganttBarStyleMode = 'modern';
        function getOffsetDateStr(days) {
            let d = new Date(todayForMock);
            d.setDate(d.getDate() + days);
            let year = d.getFullYear();
            let month = String(d.getMonth() + 1).padStart(2, '0');
            let day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        let tasks = [
            { id: 1, name: "งานเตรียมการและวางแผน", duration: 15, start: getOffsetDateStr(-5), isGroup: true, isMilestone: false, predecessors: "" },
            { id: 2, name: "สำรวจพื้นที่และวางผัง", duration: 5, start: getOffsetDateStr(-5), isGroup: false, isMilestone: false, predecessors: "" },
            { id: 3, name: "ออกแบบและเสนออนุมัติแบบ", duration: 10, start: getOffsetDateStr(0), isGroup: false, isMilestone: false, predecessors: "1.1" },
            
            { id: 4, name: "งานรื้อถอนและปรับปรุงโครงสร้าง", duration: 30, start: getOffsetDateStr(10), isGroup: true, isMilestone: false, predecessors: "" },
            { id: 5, name: "รื้อถอนส่วนนิทรรศการเดิม", duration: 10, start: getOffsetDateStr(10), isGroup: false, isMilestone: false, predecessors: "1.2FS" },
            { id: 6, name: "งานโครงสร้างพื้นและผนังใหม่", duration: 20, start: getOffsetDateStr(20), isGroup: false, isMilestone: false, predecessors: "2.1" },

            { id: 7, name: "งานระบบไฟฟ้าและแสงสว่าง (นิทรรศการ)", duration: 45, start: getOffsetDateStr(40), isGroup: true, isMilestone: false, predecessors: "" },
            { id: 8, name: "เดินสายไฟเมนและท่อร้อยสาย", duration: 20, start: getOffsetDateStr(40), isGroup: false, isMilestone: false, predecessors: "2.2SS" },
            { id: 9, name: "ติดตั้งโคมไฟและระบบแสง (Lighting)", duration: 25, start: getOffsetDateStr(60), isGroup: false, isMilestone: false, predecessors: "3.1" },
            
            { id: 99, name: "กำหนดการส่งมอบงานงวดที่ 1", duration: 1, start: getOffsetDateStr(85), isGroup: false, isMilestone: true, predecessors: "3.2FF" }
        ];

        let projectStartDate = new Date();
        let projectEndDate = new Date();
        let userScalePreference = 'auto'; 
        let currentScale = 'weekly'; 
        let colWidth = 60; 
        
        let customTodayDate = new Date(); 
        customTodayDate.setHours(0, 0, 0, 0);

        let costSettings = { factorF: 1.0000, vat: 1.0700 };

        let currentPage = 'gantt';
        let pageSwitchTimer = null;
        let sCurveFrequency = 'weekly';
        let sCurveFillVisible = true;
        let sCurveSmoothMode = false;
        let showInstallmentLines = true;
        let taskNameColumnWidth = 250;
        let durationTaskNameColumnWidth = 214;
        let installmentSettings = { count: 0, durationDays: 30 };
        let durationPlanSettings = {};
        let actualSettings = { frequency: 'weekly' };
        let actualEntries = {};

        function updateSidebarOffset() {
            const ribbon = document.getElementById('top-ribbon');
            if (ribbon) document.documentElement.style.setProperty('--top-ribbon-height', ribbon.offsetHeight + 'px');
        }

        function showAppAlert({ icon = 'success', title = '', text = '', timer = 1000 } = {}) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon,
                    title,
                    text,
                    timer,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            } else if (text || title) {
                alert([title, text].filter(Boolean).join('\n'));
            }
        }

        function showProcessingAlert(title = 'กำลังประมวลผล', text = 'โปรดรอสักครู่') {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title,
                    text,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    didOpen: () => Swal.showLoading()
                });
            }
        }

        function finishProcessingAlert({ icon = 'success', title = 'ดำเนินการเสร็จแล้ว', text = '' } = {}) {
            showAppAlert({ icon, title, text, timer: 1000 });
        }

        // --- ระบบ Undo / Redo ---
        let historyStack = [];
        let currentHistoryIndex = -1;
        const MAX_HISTORY = 10;

        function saveState() {
            if (currentHistoryIndex < historyStack.length - 1) {
                historyStack = historyStack.slice(0, currentHistoryIndex + 1);
            }
            normalizeTaskModel();
            const tasksCopy = JSON.parse(JSON.stringify(tasks));
            historyStack.push(tasksCopy);
            
            if (historyStack.length > MAX_HISTORY + 1) {
                historyStack.shift();
            } else {
                currentHistoryIndex++;
            }
            updateUndoRedoButtons();
        }

        function undoAction() {
            if (currentHistoryIndex > 0) {
                currentHistoryIndex--;
                tasks = JSON.parse(JSON.stringify(historyStack[currentHistoryIndex]));
                calculateDates(false); 
                updateUndoRedoButtons();
            }
        }

        function redoAction() {
            if (currentHistoryIndex < historyStack.length - 1) {
                currentHistoryIndex++;
                tasks = JSON.parse(JSON.stringify(historyStack[currentHistoryIndex]));
                calculateDates(false); 
                updateUndoRedoButtons();
            }
        }

        function updateUndoRedoButtons() {
            const btnUndo = document.getElementById('btn-undo');
            const btnRedo = document.getElementById('btn-redo');
            
            if (currentHistoryIndex > 0) {
                btnUndo.disabled = false;
                btnUndo.classList.remove('opacity-40', 'cursor-not-allowed');
                btnUndo.classList.add('hover:bg-white/20');
            } else {
                btnUndo.disabled = true;
                btnUndo.classList.add('opacity-40', 'cursor-not-allowed');
                btnUndo.classList.remove('hover:bg-white/20');
            }
            
            if (currentHistoryIndex < historyStack.length - 1) {
                btnRedo.disabled = false;
                btnRedo.classList.remove('opacity-40', 'cursor-not-allowed');
                btnRedo.classList.add('hover:bg-white/20');
            } else {
                btnRedo.disabled = true;
                btnRedo.classList.add('opacity-40', 'cursor-not-allowed');
                btnRedo.classList.remove('hover:bg-white/20');
            }
        }

        // --- ระบบบันทึกและเปิดไฟล์ ---
        async function saveProjectToFile() {
            const projectData = collectProjectData();

            const jsonString = JSON.stringify(projectData, null, 2);
            const dateStr = safeFormatDate(new Date()).replace(/-/g, '');
            const defaultFilename = `BuildPlan_Pro_${dateStr}.json`;

            try {
                if (window.showSaveFilePicker) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: defaultFilename,
                        types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(jsonString);
                    await writable.close();
                    alert("บันทึกไฟล์สำเร็จแล้ว!");
                    return; 
                }
            } catch (error) {
                if (error.name === 'AbortError') return;
                console.warn('Fallback to standard download...', error);
            }

            try {
                const blob = new Blob([jsonString], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = defaultFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setTimeout(() => alert("ดาวน์โหลดไฟล์บันทึกสำเร็จแล้ว!"), 500);
            } catch (err) {
                alert("เกิดข้อผิดพลาดในการบันทึกไฟล์: " + err.message);
            }
        }

        function handleFileLoad(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const contents = e.target.result;
                    const parsedData = JSON.parse(contents);

                    if (parsedData && parsedData.tasks) {
                        applyProjectData(parsedData);
                        event.target.value = '';
                        alert("เปิดไฟล์โครงการสำเร็จ!");
                    } else {
                        alert("รูปแบบไฟล์ไม่ถูกต้อง ไม่มีข้อมูลแผนงาน");
                    }
                } catch (err) {
                    alert("เกิดข้อผิดพลาดในการอ่านไฟล์ JSON");
                }
            };
            reader.readAsText(file);
        }
        
        const APP_STORAGE_KEY = 'buildplan_pro_autosave_v2';
        let autosaveTimer = null;

        function collectProjectData() {
            normalizeTaskModel();
            return {
                version: '2.0',
                savedAt: new Date().toISOString(),
                app: 'BuildPlan Pro',
                info: {
                    name: document.getElementById('proj-name')?.value || '',
                    owner: document.getElementById('proj-owner')?.value || '',
                    location: document.getElementById('proj-location')?.value || '',
                    contractor: document.getElementById('proj-contractor')?.value || '',
                    contractNo: document.getElementById('proj-contract-no')?.value || '',
                    value: document.getElementById('project-value')?.value || '',
                    supervisor: document.getElementById('proj-supervisor')?.value || ''
                },
                prefs: {
                    userScalePreference,
                    ganttBarStyleMode,
                    sCurveFrequency,
                    sCurveFillVisible,
                    sCurveSmoothMode,
                    isSignatureVisible,
                    showInstallmentLines,
                    taskNameColumnWidth,
                    durationTaskNameColumnWidth
                },
                installmentSettings: { ...installmentSettings },
                durationPlanSettings: { ...durationPlanSettings },
                actualSettings: { ...actualSettings },
                actualEntries: JSON.parse(JSON.stringify(actualEntries || {})),
                costSettings: { ...costSettings },
                tasks
            };
        }

        function applyProjectData(projectData) {
            tasks = (projectData.tasks || []).map(task => ({ ...task, cost: parseFloat(task.cost) || 0, progress: clampNumber(task.progress ?? 0, 0, 100) }));
            if (projectData.info) {
                document.getElementById('proj-name').value = projectData.info.name || '';
                document.getElementById('proj-owner').value = projectData.info.owner || '';
                document.getElementById('proj-location').value = projectData.info.location || '';
                document.getElementById('proj-contractor').value = projectData.info.contractor || '';
                document.getElementById('proj-contract-no').value = projectData.info.contractNo || '';
                document.getElementById('project-value').value = projectData.info.value || '';
                document.getElementById('proj-supervisor').value = projectData.info.supervisor || '';
            }
            costSettings.factorF = parseFloat(projectData.costSettings?.factorF) || 1.0000;
            costSettings.vat = parseFloat(projectData.costSettings?.vat) || 1.0700;
            installmentSettings = normalizeInstallmentSettings(projectData.installmentSettings);
            durationPlanSettings = normalizeDurationPlanSettings(projectData.durationPlanSettings || {});
            actualSettings = normalizeActualSettings(projectData.actualSettings || actualSettings);
            actualEntries = normalizeActualEntries(projectData.actualEntries || {});
            if (projectData.prefs) {
                userScalePreference = projectData.prefs.userScalePreference || userScalePreference;
                ganttBarStyleMode = projectData.prefs.ganttBarStyleMode || ganttBarStyleMode;
                sCurveFrequency = projectData.prefs.sCurveFrequency || sCurveFrequency;
                sCurveFillVisible = projectData.prefs.sCurveFillVisible !== undefined ? !!projectData.prefs.sCurveFillVisible : sCurveFillVisible;
                sCurveSmoothMode = projectData.prefs.sCurveSmoothMode !== undefined ? !!projectData.prefs.sCurveSmoothMode : sCurveSmoothMode;
                taskNameColumnWidth = clampTaskNameColumnWidth(projectData.prefs.taskNameColumnWidth || taskNameColumnWidth);
                durationTaskNameColumnWidth = clampDurationTaskNameColumnWidth(projectData.prefs.durationTaskNameColumnWidth || durationTaskNameColumnWidth);
                isSignatureVisible = projectData.prefs.isSignatureVisible !== undefined ? !!projectData.prefs.isSignatureVisible : isSignatureVisible;
                showInstallmentLines = projectData.prefs.showInstallmentLines !== undefined ? !!projectData.prefs.showInstallmentLines : showInstallmentLines;
            }
            const scaleSelector = document.getElementById('scale-selector');
            if (scaleSelector) scaleSelector.value = userScalePreference;
            const installmentToggle = document.getElementById('show-installment-lines');
            if (installmentToggle) installmentToggle.checked = showInstallmentLines;
            historyStack = [];
            currentHistoryIndex = -1;
            calculateDates(true);
            normalizeCostSettingsInputs();
            updateAutoSaveStatus();
        }

        function scheduleAutoSave() {
            clearTimeout(autosaveTimer);
            autosaveTimer = setTimeout(() => saveProjectToLocal(true), 450);
        }

        function saveProjectToLocal(silent = false) {
            try {
                localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(collectProjectData()));
                updateAutoSaveStatus();
                if (!silent) alert('บันทึก Autosave บนเครื่องนี้แล้ว');
            } catch (error) {
                console.warn('Autosave failed', error);
            }
        }

        function getAutoSavedProject() {
            try {
                const raw = localStorage.getItem(APP_STORAGE_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (error) {
                return null;
            }
        }

        function restoreAutoSavedProject() {
            const saved = getAutoSavedProject();
            if (!saved) {
                alert('ยังไม่มี Autosave บนเครื่องนี้');
                return;
            }
            const savedAt = saved.savedAt ? new Date(saved.savedAt).toLocaleString('th-TH') : '-';
            if (!confirm('กู้คืน Autosave ล่าสุด (' + savedAt + ') ? ข้อมูลบนหน้าจอปัจจุบันจะถูกแทนที่')) return;
            applyProjectData(saved);
        }

        function clearAutoSavedProject() {
            localStorage.removeItem(APP_STORAGE_KEY);
            updateAutoSaveStatus();
        }

        function updateAutoSaveStatus() {
            const box = document.getElementById('autosave-status');
            const text = document.getElementById('autosave-status-text');
            if (!box || !text) return;
            const saved = getAutoSavedProject();
            box.classList.remove('hidden');
            if (saved?.savedAt) {
                text.textContent = 'Autosaved ' + new Date(saved.savedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            } else {
                text.textContent = 'Autosave ready';
            }
        }

        function initializeAutoSave() {
            updateAutoSaveStatus();
            document.querySelectorAll('#project-info-header input, #signature-section input, #print-paper-size, #sig-count').forEach(el => {
                el.addEventListener('input', scheduleAutoSave);
                el.addEventListener('change', scheduleAutoSave);
            });
        }

        function updateSignatureCount() {
            const count = parseInt(document.getElementById('sig-count').value);
            const sig1 = document.getElementById('sig-1');
            const sig2 = document.getElementById('sig-2');
            const sig3 = document.getElementById('sig-3');

            sig1.classList.add('hidden'); sig1.classList.remove('flex');
            sig2.classList.add('hidden'); sig2.classList.remove('flex');
            sig3.classList.add('hidden'); sig3.classList.remove('flex');

            if (count === 1) {
                sig3.classList.remove('hidden'); sig3.classList.add('flex');
            } else if (count === 2) {
                sig2.classList.remove('hidden'); sig2.classList.add('flex');
                sig3.classList.remove('hidden'); sig3.classList.add('flex');
            } else if (count === 3) {
                sig1.classList.remove('hidden'); sig1.classList.add('flex');
                sig2.classList.remove('hidden'); sig2.classList.add('flex');
                sig3.classList.remove('hidden'); sig3.classList.add('flex');
            }
        }

        // ระบบปุ่ม ย่อ/ขยาย พื้นที่ลงนาม
        let isSignatureVisible = true;
        function toggleSignatureVisibility() {
            isSignatureVisible = !isSignatureVisible;
            const sigSection = document.getElementById('signature-section');
            const icon = document.getElementById('sig-toggle-icon');
            const text = document.getElementById('sig-toggle-text');
            
            if(isSignatureVisible) {
                if (currentPage !== 'cost') sigSection.style.display = 'flex';
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
                text.innerText = 'ซ่อน';
            } else {
                sigSection.style.display = 'none';
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
                text.innerText = 'แสดง';
            }
        }

        function togglePredColumn() {
            const dataPane = document.getElementById('data-pane');
            const isChecked = document.getElementById('show-pred').checked;
            if(isChecked) {
                dataPane.classList.remove('hide-pred');
            } else {
                dataPane.classList.add('hide-pred');
            }
            syncTaskNameColumnWidth();
        }

        function handleCurrencyInput(input) {
            let val = input.value.replace(/[^0-9.]/g, '');
            let parts = val.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            if (parts.length > 2) parts.pop();
            input.value = parts.join('.');
        }

        function handleCurrencyBlur(input) {
            let val = input.value.replace(/,/g, '');
            let parsed = parseFloat(val);
            if (!isNaN(parsed)) {
                input.value = parsed.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            } else {
                input.value = '';
            }
        }

        // --- ระบบพิมพ์เอกสาร (บังคับพอดีหน้ากระดาษอัจฉริยะแบบแม่นยำ) ---
        function printReport() {
            const paperSize = document.getElementById('print-paper-size').value;
            let styleId = 'dynamic-print-style';
            let styleEl = document.getElementById(styleId);
            
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }

            // คำนวณความกว้างรวมของตารางทั้งหมด (ฝั่งซ้าย + ฝั่งขวา)
            const dataPane = document.getElementById('data-pane');
            const ganttContent = document.getElementById('gantt-content');
            
            // ดึงความกว้างจริงของฝั่งซ้าย และ ฝั่งขวา มาประกอบกัน
            const dataWidth = getPrintableDataPaneWidth();
            const ganttWidth = parseFloat(ganttContent.style.width) || 1000;
            const totalWidth = dataWidth + ganttWidth + 4; // +4 px สำหรับเส้นขอบซ้าย/ขวาของรายงาน
            
            // ความกว้างพื้นที่การพิมพ์โดยประมาณ หักขอบแล้ว (A4 แนวนอน ~1040px, A3 แนวนอน ~1500px)
            const targetWidth = paperSize === 'A4' ? 1040 : 1500;
            
            // ย่อส่วนให้พอดีหน้ากระดาษ (Fit to Page) อัตโนมัติ โดยอิงจากความกว้างรวม
            let zoomLevel = targetWidth / totalWidth;
            if (zoomLevel > 1) zoomLevel = 1; // ป้องกันการขยายตารางใหญ่เกินความจำเป็นถ้าข้อมูลน้อย

            styleEl.innerHTML = `
                @media print { 
                    @page { size: ${paperSize} landscape !important; margin: 10mm !important; } 
                    body { 
                        zoom: ${zoomLevel} !important; 
                        /* รองรับเบราว์เซอร์อื่นๆ ที่ไม่ใช้ zoom */
                        -moz-transform: scale(${zoomLevel});
                        -moz-transform-origin: top left;
                    }
                    /* ล็อกความกว้างแบบเจาะจง pixel เพื่อปิดช่องว่างหลุดรอด */
                    #main-container {
                        width: ${totalWidth}px !important;
                        max-width: ${totalWidth}px !important;
                        min-width: ${totalWidth}px !important;
                        border: 2px solid #000 !important;
                        overflow: hidden !important; 
                    }
                    #project-info-header, #signature-section {
                        width: ${totalWidth}px !important;
                        max-width: ${totalWidth}px !important;
                        min-width: ${totalWidth}px !important;
                    }
                    #signature-section {
                        margin-top: 6px !important;
                        padding-top: 0 !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    #signature-container {
                        padding: 8px 20px 4px !important;
                        gap: 2.2rem !important;
                    }
                    #data-pane {
                        width: ${dataWidth}px !important;
                        max-width: ${dataWidth}px !important;
                        min-width: ${dataWidth}px !important;
                        border-right: 1px solid #000 !important; 
                    }
                    #gantt-pane {
                        width: ${ganttWidth}px !important;
                        max-width: ${ganttWidth}px !important;
                        min-width: ${ganttWidth}px !important;
                        overflow: hidden !important;
                        border: 1px solid #000 !important;
                        border-left: 0 !important;
                        box-shadow: inset -2px 0 0 #000 !important;
                        box-sizing: border-box !important;
                    }
                    #gantt-content, #timeline-header-wrapper {
                        width: ${ganttWidth}px !important;
                        border-right: 1px solid #000 !important;
                        box-sizing: border-box !important;
                    }
                }
            `;
            
            // หน่วงเวลาเล็กน้อยเพื่อให้ CSS อัปเดตโครงสร้างตารางก่อนสั่งปริ้นท์
            setTimeout(() => {
                window.print();
            }, 150);
        }

        function updateGanttStyleToggleButton() {
            const btn = document.getElementById('btn-toggle-gantt-style');
            if (!btn) return;
            if (ganttBarStyleMode === 'classic') {
                btn.textContent = 'Modern';
                btn.className = 'plan-mode-btn plan-mode-btn-active';
                btn.title = 'สลับเป็นรูปแบบ Modern';
            } else {
                btn.textContent = 'Classic';
                btn.className = 'plan-mode-btn';
                btn.title = 'สลับเป็นรูปแบบ Classic';
            }
        }

        function toggleGanttBarStyle() {
            ganttBarStyleMode = ganttBarStyleMode === 'classic' ? 'modern' : 'classic';
            updateGanttStyleToggleButton();
            renderUI();
        }

        function changeScale(val) {
            userScalePreference = val;
            calculateDates(false); 
        }

        function safeFormatDate(dateObj) {
            if (!dateObj || isNaN(dateObj.getTime())) return "";
            let year = dateObj.getFullYear();
            let month = String(dateObj.getMonth() + 1).padStart(2, '0');
            let day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function formatDateToThai(dateStr) {
            if(!dateStr) return "";
            let d = new Date(dateStr);
            if(isNaN(d.getTime())) return "";
            return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        }
        function formatDateDisplay(date) { 
            if(!date || isNaN(date.getTime())) return "";
            return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }); 
        }

        function clampNumber(value, min = 0, max = 100) {
            const num = parseFloat(String(value ?? '').replace(/,/g, ''));
            if (isNaN(num)) return min;
            return Math.min(max, Math.max(min, num));
        }


        function normalizeInstallmentSettings(raw = {}) {
            const count = Math.min(60, Math.max(0, parseInt(raw?.count, 10) || 0));
            const durationDays = Math.min(3650, Math.max(1, parseInt(raw?.durationDays, 10) || 30));
            return { count, durationDays };
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
            return Array.from({ length: settings.count }, (_, idx) => {
                const offsetDays = settings.durationDays * (idx + 1);
                const dueDate = new Date(start);
                dueDate.setDate(dueDate.getDate() + offsetDays - 1);
                dueDate.setHours(0, 0, 0, 0);
                return {
                    no: idx + 1,
                    label: `งวด ${idx + 1}`,
                    offsetDays,
                    durationDays: settings.durationDays,
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

            preview.innerHTML = `
                <div class="flex flex-col gap-3">
                    <div class="text-sm font-bold text-slate-700">
                        วันเริ่มต้นโครงการ: <span class="text-narit-blue">${formatDateDisplay(getActualProjectStartDate())}</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                        ${schedule.map(item => `
                            <div class="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
                                <div class="text-[11px] font-black text-amber-700">${item.label}</div>
                                <div class="text-sm font-bold text-slate-800 mt-0.5">${formatDateDisplay(item.dateObj)}</div>
                                <div class="text-[11px] text-slate-500 mt-0.5">เริ่ม + ${item.offsetDays} วัน</div>
                            </div>
                        `).join('')}
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
                installmentSettings = normalizeInstallmentSettings({ count, durationDays });
                calculateDates(false);
                renderInstallmentPanel();
                scheduleAutoSave();
                finishProcessingAlert({ title: 'สร้างงวดงานแล้ว', text: `สร้างกำหนดส่ง ${installmentSettings.count} งวดเรียบร้อย` });
            }, 120);
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
            return durationPlanSettings[key];
        }

        function getInstallmentPeriods() {
            const settings = normalizeInstallmentSettings(installmentSettings);
            if (!settings.count || !settings.durationDays) return [];
            const projectStart = getActualProjectStartDate();
            return Array.from({ length: settings.count }, (_, index) => {
                const start = new Date(projectStart);
                start.setDate(start.getDate() + (settings.durationDays * index));
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setDate(end.getDate() + settings.durationDays - 1);
                end.setHours(0, 0, 0, 0);
                return { no: index + 1, label: `งวดที่ ${index + 1}`, start, end };
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
            const mode = entry.startMode || 'recommended';
            const selected = options.find(option => option.mode === mode) || options[0];
            const endDate = new Date(selected.date);
            endDate.setDate(endDate.getDate() + duration - 1);
            return { valid: true, options, startDate: selected.date, endDate, windowStart, windowEnd };
        }

        function clampDate(date, min, max) {
            if (date < min) return new Date(min);
            if (date > max) return new Date(max);
            return new Date(date);
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
            applyDurationPlanToTask(taskId, false);
            renderDurationPlanTable();
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
            table.innerHTML = `
                <div class="flex w-full bg-slate-50 border-b border-slate-300 sticky top-0 z-10 items-center" style="height:50px;">
                    <div class="header-cell shrink-0 h-full text-black font-bold flex items-center justify-center" style="width:${compact.no}px">ที่</div>
                    <div class="header-cell shrink-0 px-2 h-full text-black font-bold flex items-center justify-center text-[12px] relative" style="width:${compact.name}px">
                        <span>รายการปฏิบัติงาน</span>
                        <span id="duration-name-resizer" class="duration-name-resizer" title="ลากเพื่อปรับความกว้างคอลัมน์"></span>
                    </div>
                    <div class="header-cell shrink-0 h-full text-black font-bold flex items-center justify-center" style="width:${compact.days}px">วัน</div>
                    ${installmentHeaders}
                    <div class="header-cell shrink-0 h-full text-black font-bold flex items-center justify-center" style="width:${compact.total}px">ผลรวม</div>
                    <div class="header-cell shrink-0 h-full text-black font-bold flex items-center justify-center text-[11px]" style="width:${compact.start}px">แนะนำวันเริ่ม</div>
                    <div class="header-cell shrink-0 h-full text-black font-bold flex items-center justify-center text-[11px]" style="width:${compact.range}px">ช่วงวันที่คำนวณ</div>
                </div>
                <div>${rows || '<div class="px-6 py-8 text-center text-slate-400 text-sm">ยังไม่มีรายการปฏิบัติงาน</div>'}</div>`;
            setupDurationNameColumnResizer();
        }

        function clampDurationTaskNameColumnWidth(value) {
            return Math.min(520, Math.max(130, parseInt(value, 10) || 214));
        }

        function getDurationTableLayout(tableWidth, periodCount) {
            const no = 50;
            const days = 70;
            const total = 84;
            const start = 150;
            const range = 142;
            const count = Math.max(1, periodCount);
            const minPeriod = 58;
            const maxPeriod = 92;
            const fixedWidth = no + days + total + start + range;
            const available = Math.max(260, tableWidth - fixedWidth);
            const maxName = Math.max(130, available - (minPeriod * count));
            let name = Math.min(maxName, clampDurationTaskNameColumnWidth(durationTaskNameColumnWidth));
            let period = Math.floor((available - name) / count);
            if (period > maxPeriod) {
                period = maxPeriod;
                name = available - (period * count);
            }
            if (period < minPeriod) {
                period = minPeriod;
                name = Math.max(80, available - (period * count));
            }
            durationTaskNameColumnWidth = clampDurationTaskNameColumnWidth(name);
            return { no, name, days, period, total, start, range };
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
                return `
                    <div class="cell shrink-0 justify-center px-1" style="width:${compact.period}px">
                        ${editable ? `<div class="flex items-center justify-center gap-1 min-w-0"><input type="number" min="0" max="100" step="0.01" value="${value}" onchange="updateDurationPlanPercent(${task.id}, ${period.no}, this.value)" class="work-duration-percent"><span class="text-[11px] font-bold text-slate-400">%</span></div>` : '<span class="text-xs text-slate-400">-</span>'}
                    </div>`;
            }).join('');
            const options = suggestion.options?.length ? suggestion.options.map(option => `
                <option value="${option.mode}" ${(entry.startMode || 'recommended') === option.mode ? 'selected' : ''}>${option.label}</option>
            `).join('') : '';
            const selectHtml = editable && suggestion.valid ? `
                <select class="work-duration-select" onchange="updateDurationPlanStartMode(${task.id}, this.value)">
                    ${options}
                </select>` : `<span class="text-xs font-bold text-slate-400">${suggestion.message || '-'}</span>`;
            const rangeHtml = suggestion.valid && suggestion.startDate
                ? `${formatDateDisplay(suggestion.startDate)} - ${formatDateDisplay(suggestion.endDate)}${suggestion.warning ? '<br><span class="text-[10px] text-amber-700">' + suggestion.warning + '</span>' : ''}`
                : '-';
            return `
                <div class="flex w-full row-height border-b border-slate-100 ${rowClass}">
                    <div class="cell shrink-0 justify-center text-[11px] font-bold" style="width:${compact.no}px">${task.wbs || ''}</div>
                    <div class="cell shrink-0 px-2 text-[12px] leading-tight overflow-hidden ${nameClass}" style="width:${compact.name}px" title="${escapeTooltipHtml(task.name)}">${escapeTooltipHtml(task.name)}</div>
                    <div class="cell shrink-0 justify-center px-1" style="width:${compact.days}px">
                        ${editable ? `<input type="number" min="1" step="1" value="${parseInt(task.duration, 10) || 1}" onchange="updateDurationPlanDays(${task.id}, this.value)" class="work-duration-input"><span class="text-[11px] font-bold text-slate-400 ml-1">วัน</span>` : `<span class="text-xs font-bold text-slate-500">${parseInt(task.duration, 10) || 0} วัน</span>`}
                    </div>
                    ${pctCells}
                    <div class="cell shrink-0 justify-center px-2" style="width:${compact.total}px">
                        <span class="text-[12px] font-black whitespace-nowrap ${totalOk ? 'text-emerald-700' : 'text-red-600'}">${editable ? total.toFixed(2) + '%' : '-'}</span>
                    </div>
                    <div class="cell shrink-0 justify-center px-1" style="width:${compact.start}px">${selectHtml}</div>
                    <div class="cell shrink-0 justify-center px-1 text-center text-[11px] font-bold text-slate-600 leading-tight" style="width:${compact.range}px">${rangeHtml}</div>
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
                let months = (targetDate.getFullYear() - projectStartDate.getFullYear()) * 12 + (targetDate.getMonth() - projectStartDate.getMonth());
                let daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
                let exactMonthOffset = months + (targetDate.getDate() - 1 + (targetDate.getHours() / 24) + (targetDate.getMinutes() / 1440)) / daysInMonth;
                return exactMonthOffset * colWidth;
            }
            if (currentScale === 'yearly') {
                let years = targetDate.getFullYear() - projectStartDate.getFullYear();
                let isLeap = new Date(targetDate.getFullYear(), 1, 29).getMonth() === 1;
                let daysInYear = isLeap ? 366 : 365;
                let startOfYear = new Date(targetDate.getFullYear(), 0, 1);
                let dayOfYear = (targetDate - startOfYear) / (1000 * 60 * 60 * 24); 
                let exactYearOffset = years + (dayOfYear / daysInYear);
                return exactYearOffset * colWidth;
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
                let match = s.trim().match(/^([0-9.]+)\s*(FS|SS|FF|SF)?$/i);
                if (match) {
                    return { wbs: match[1], type: (match[2] || 'FS').toUpperCase() };
                }
                return null;
            }).filter(x => x);
        }

        function calculateDates(saveHistory = true) {
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
                            let candidateStart = new Date(projectStartDate);
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
                            if (pReq.type === 'FS' && pTask.endDateObj.getTime() === curr.startDateObj.getTime() - 86400000) isTight = true;
                            if (pReq.type === 'SS' && pTask.startDateObj.getTime() === curr.startDateObj.getTime()) isTight = true;
                            if (pReq.type === 'FF' && pTask.endDateObj.getTime() === curr.endDateObj.getTime()) isTight = true;
                            if (pReq.type === 'SF' && pTask.startDateObj.getTime() === curr.endDateObj.getTime() + 86400000) isTight = true;

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

            // --- เพิ่มระยะขอบว่าง (Buffer) ด้านขวาเล็กน้อย เพื่อป้องกันข้อความ/ลูกศรของงานสุดท้ายตกขอบเวลาพิมพ์ ---
            if (preferredScale === 'yearly') {
                currentScale = 'yearly'; colWidth = 160;
                projectStartDate = new Date(minDate.getFullYear() - 1, 0, 1);
                projectEndDate = new Date(maxDate.getFullYear() + 1, 11, 31); // เผื่อ 1 ปี
            } else if (preferredScale === 'monthly') {
                currentScale = 'monthly'; colWidth = 120; 
                projectStartDate = new Date(minDate.getFullYear(), minDate.getMonth() - 1, 1);
                projectEndDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 0); // เผื่อ 1 เดือน
            } else if (preferredScale === 'weekly') {
                currentScale = 'weekly'; colWidth = 60;
                projectStartDate = new Date(minDate);
                projectStartDate.setDate(projectStartDate.getDate() - 3);
                projectEndDate = new Date(maxDate);
                projectEndDate.setDate(projectEndDate.getDate() + 3);
            } else {
                currentScale = 'daily'; colWidth = 25;
                projectStartDate = new Date(minDate);
                projectStartDate.setDate(projectStartDate.getDate() - 3);
                projectEndDate = new Date(maxDate);
                projectEndDate.setDate(projectEndDate.getDate() + 3);
            }
            projectStartDate.setHours(0, 0, 0, 0); 
            projectEndDate.setHours(23, 59, 59, 999); 
            
            renderUI();
            
            if (saveHistory) {
                saveState();
            }
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
                            <input type="number" min="0" max="100" step="1" value="${getTaskProgressForDisplay(task, index)}" onchange="updateData(${index}, 'progress', this.value)" class="w-full h-5 text-center text-[11px] font-black rounded border border-slate-200 bg-white ${isGroup ? 'text-slate-500 cursor-not-allowed' : 'text-emerald-700'}" ${isGroup ? 'readonly title="คำนวณจากงานย่อย"' : ''}>
                            <div class="progress-cell-track"><div class="progress-cell-fill" style="width:${getTaskProgressForDisplay(task, index)}%"></div></div>
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

                    ranges.forEach((r) => {
                        let rStartPx = leftPx + ((r.start - 1) / daysInMonth) * mWidth;
                        let rWidth = ((r.end - r.start + 1) / daysInMonth) * mWidth;
                        
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

        function renderGanttBars() {
            const container = document.getElementById('gantt-bars');
            const criticalLines = document.getElementById('critical-lines');
            const criticalSvg = document.getElementById('critical-svg');
            
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
                    bar.style.height = '22px';
                    bar.style.top = `${(index * 36) + 7}px`;
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
                    bar.style.top = `${(index * 36) + 9}px`;
                    
                    if (showCritical && task.isCritical) {
                        bar.classList.add("ring-2", "ring-red-500", "ring-offset-1");
                    }
                    if(showBarLabels && widthPx > 60) bar.innerText = task.name;
                }

                bar.style.left = `${leftPx}px`;
                bar.style.width = `${Math.max(widthPx, 4)}px`;
                const barProgress = getTaskProgressForDisplay(task, index);
                if (!task.isGroup) {
                    const baseBackground = bar.style.backgroundImage || 'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(0,0,0,0.1))';
                    bar.style.backgroundImage = `linear-gradient(90deg, rgba(22,163,74,0.95) 0% ${barProgress}%, rgba(255,255,255,0.10) ${barProgress}% 100%), ${baseBackground}`;
                }
                bar.title = `${task.name}\nระยะเวลา: ${task.duration} วัน\nProgress: ${barProgress}%\n(${formatDateDisplay(task.startDateObj)} - ${formatDateDisplay(task.endDateObj)})${task.isCritical ? '\n[สายงานวิกฤต]' : ''}`;

                container.appendChild(bar);
            });

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
                                startY = (idx1 * 36) + 18; 
                                endY = (idx2 * 36) + 18;
                                
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
                    let startY = (idx1 * 36) + 18; 
                    
                    let endX = getDateOffsetPx(t2.startDateObj);
                    let endY = (idx2 * 36) + 18;

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
                todayLine.className = "absolute top-0 z-40 cursor-ew-resize group no-print";
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

                const intersectionPoint = document.createElement('div');
                intersectionPoint.className = "absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-[0_0_0_2px_rgba(239,68,68,0.22)] pointer-events-none z-50";
                todayLine.appendChild(intersectionPoint);

                const intersectionLabel = document.createElement('div');
                intersectionLabel.className = "absolute left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap pointer-events-none z-50 leading-tight";
                todayLine.appendChild(intersectionLabel);

                function updateTodayIntersection(newLeft) {
                    customTodayDate = getDateFromOffsetPx(newLeft);
                    handleLabel.innerHTML = `<i class="fa-solid fa-arrows-left-right text-[8px]"></i> ${formatDateDisplay(customTodayDate)}`;
                    const point = getSCurvePointAtDate(customTodayDate, totalProjectValue);
                    const showSCurve = document.getElementById('show-scurve-overlay')?.checked;
                    if (point && showSCurve && totalProjectValue > 0) {
                        const progress = ((point.cumulative / totalProjectValue) * 100).toFixed(2);
                        intersectionPoint.style.display = 'block';
                        intersectionLabel.style.display = 'block';
                        intersectionPoint.style.top = `${point.y}px`;
                        const labelTop = Math.max(30, point.y - 34);
                        intersectionLabel.style.top = `${labelTop}px`;
                        intersectionLabel.innerHTML = `Progress: ${progress}%<br>มูลค่างาน: ${formatMoneyDisplay(point.cumulative)} บาท`;
                    } else {
                        intersectionPoint.style.display = 'none';
                        intersectionLabel.style.display = 'none';
                    }
                }

                updateTodayIntersection(visualLeftPx);

                todayLine.onmousedown = function(e) {
                    e.preventDefault(); 
                    let startX = e.clientX;
                    let startLeft = visualLeftPx; 

                    function onMouseMove(moveEvent) {
                        let dx = moveEvent.clientX - startX;
                        let newLeft = startLeft + dx;
                        newLeft = Math.max(0, Math.min(newLeft, totalWidthPx));
                        todayLine.style.left = `${newLeft - 8}px`;
                        updateTodayIntersection(newLeft);
                    }

                    function onMouseUp() {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    }

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                };

                container.appendChild(todayLine);
            }

            renderInstallmentLines(container);
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
            renderActualSummary(dateKey);
            renderActualCurveChart();
            scheduleAutoSave();
        }

        function saveActualSnapshot() {
            const dateKey = getActualSelectedDateKey();
            getActualSnapshotForDate(dateKey);
            renderActualProgressPage();
            scheduleAutoSave();
            finishProcessingAlert({ title: 'บันทึก Actual แล้ว', text: `บันทึกข้อมูล ณ ${formatDateDisplay(new Date(dateKey + 'T00:00:00'))}` });
        }

        function renderActualProgressPage() {
            const dateInput = document.getElementById('actual-entry-date');
            const frequencyInput = document.getElementById('actual-frequency');
            if (!dateInput) return;
            if (!dateInput.value) dateInput.value = safeFormatDate(new Date());
            if (frequencyInput && document.activeElement !== frequencyInput) frequencyInput.value = actualSettings.frequency || 'weekly';
            const dateKey = getActualSelectedDateKey();
            const selectedDate = new Date(dateKey + 'T00:00:00');
            const snapshot = getActualSnapshotForDate(dateKey);
            const table = document.getElementById('actual-progress-table');
            if (table) {
                const rows = getWorkTasksForActual().map(task => {
                    const plannedPct = getTaskPlannedPercentAtDate(task, selectedDate);
                    const value = snapshot[String(task.id)] ?? '';
                    return `
                        <div class="flex row-height border-b border-slate-100 hover:bg-emerald-50/40">
                            <div class="cell w-24 shrink-0 justify-center text-[11px] font-bold text-slate-500 bg-slate-50/80">${escapeTooltipHtml(task.wbs || '')}</div>
                            <div class="cell flex-1 min-w-[340px] px-4 text-[13px] font-bold text-slate-700">${escapeTooltipHtml(task.name || '')}</div>
                            <div class="cell w-28 shrink-0 justify-center text-[12px] font-black text-red-700">${plannedPct.toFixed(2)}%</div>
                            <div class="cell w-28 shrink-0 justify-center">
                                <input type="number" min="0" max="100" step="0.01" value="${value}" onchange="updateActualTaskProgress(${task.id}, this.value)" class="actual-input">
                            </div>
                        </div>`;
                }).join('');
                table.innerHTML = rows || `<div class="px-6 py-8 text-center text-slate-400 text-sm">ยังไม่มีรายการงานสำหรับบันทึก Actual</div>`;
            }
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
            return Object.keys(actualEntries || {}).sort().map(dateKey => {
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
            return tasksForList.map(task => `
                <div class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div class="min-w-0">
                        <div class="font-bold text-slate-800 truncate">${escapeTooltipHtml(task.wbs || '-')} ${escapeTooltipHtml(task.name || '-')}</div>
                        <div class="text-xs text-slate-500">${formatDateDisplay(task.startDateObj)} - ${formatDateDisplay(task.endDateObj)}</div>
                    </div>
                    <div class="text-xs font-black text-emerald-700 whitespace-nowrap">${getTaskProgressForDisplay(task, tasks.indexOf(task))}%</div>
                </div>
            `).join('');
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
            return String(text || '').includes('ครุภัณฑ์');
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

        function updateData(index, field, value) {
            if (field === 'progress') tasks[index][field] = clampNumber(value, 0, 100);
            else tasks[index][field] = value;
            calculateDates();
        }

        function addMainTask() {
            let lastStart = safeFormatDate(new Date());
            if(tasks.length > 0) {
                let lastT = tasks[tasks.length-1];
                lastStart = safeFormatDate(lastT.endDateObj || new Date(lastT.start));
            }
            
            tasks.push({
                id: Date.now(),
                name: "รายการใหม่...",
                duration: 1,
                start: lastStart,
                isGroup: true,
                isMilestone: false,
                predecessors: "",
                cost: 0,
                progress: 0
            });
            calculateDates();
            scrollToBottom();
        }

        function addSubTask(mainIndex) {
            let insertIndex = mainIndex + 1;
            while(insertIndex < tasks.length && !tasks[insertIndex].isGroup && !tasks[insertIndex].isMilestone) {
                insertIndex++;
            }

            let parentStart = tasks[mainIndex].start || safeFormatDate(new Date());
            if (insertIndex > mainIndex + 1) {
                 let prevChild = tasks[insertIndex - 1];
                 let d = new Date(prevChild.endDateObj);
                 d.setDate(d.getDate() + 1); 
                 parentStart = safeFormatDate(d);
            }

            tasks.splice(insertIndex, 0, {
                id: Date.now(),
                name: "งานย่อย...",
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

        function openMilestoneModal() {
            document.getElementById('milestone-input').value = "1";
            document.getElementById('milestone-modal').classList.remove('hidden');
            document.getElementById('milestone-modal').classList.add('flex');
            document.getElementById('milestone-input').focus();
        }

        function closeMilestoneModal() {
            document.getElementById('milestone-modal').classList.add('hidden');
            document.getElementById('milestone-modal').classList.remove('flex');
        }

        function confirmMilestone() {
            let num = document.getElementById('milestone-input').value;
            if(num.trim() === "") return; 
            
            let lastStart = safeFormatDate(new Date());
            if(tasks.length > 0) {
                let lastTask = tasks[tasks.length-1];
                if (lastTask.endDateObj && !isNaN(lastTask.endDateObj.getTime())) {
                    lastStart = safeFormatDate(lastTask.endDateObj);
                } else if (lastTask.start) {
                    lastStart = lastTask.start;
                }
            }
            
            tasks.push({
                id: Date.now(),
                name: "กำหนดการส่งมอบงานงวดที่ " + num,
                duration: 1,
                start: lastStart,
                isGroup: false,
                isMilestone: true,
                predecessors: "",
                cost: 0,
                progress: 0
            });
            calculateDates();
            closeMilestoneModal();
            scrollToBottom();
        }

        function deleteRow(index) {
            if(confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) {
                if (tasks[index].isGroup) {
                    let deleteCount = 1;
                    for (let i = index + 1; i < tasks.length; i++) {
                        if (!tasks[i].isGroup && !tasks[i].isMilestone) deleteCount++;
                        else break;
                    }
                    
                    if (deleteCount > 1) {
                        if(confirm(`หัวข้อนี้มีงานย่อยอยู่ ${deleteCount - 1} รายการ ต้องการลบงานย่อยทั้งหมดด้วยหรือไม่?\n\n(ตกลง = ลบทั้งหมด / ยกเลิก = ลบแค่หัวข้อใหญ่)`)) {
                            tasks.splice(index, deleteCount);
                        } else {
                            tasks.splice(index, 1);
                        }
                    } else {
                        tasks.splice(index, 1);
                    }
                } else {
                    tasks.splice(index, 1);
                }
                calculateDates();
            }
        }

        function scrollToBottom() {
            setTimeout(() => {
                const dataBody = document.getElementById('data-body');
                if(dataBody) dataBody.scrollTop = dataBody.scrollHeight;
            }, 100);
        }

        const dataBody = document.getElementById('data-body');
        const ganttBody = document.getElementById('gantt-body');
        const timelineHeaderWrap = document.getElementById('timeline-header-wrapper');
        let syncingScrollSource = null;

        function getMaxVerticalScroll(el) {
            return Math.max(0, (el?.scrollHeight || 0) - (el?.clientHeight || 0));
        }

        function getSharedMaxVerticalScroll() {
            return Math.min(getMaxVerticalScroll(dataBody), getMaxVerticalScroll(ganttBody));
        }

        function clampSharedScrollTop(value) {
            const maxScroll = getSharedMaxVerticalScroll();
            return Math.max(0, Math.min(value || 0, maxScroll));
        }

        function syncVerticalScroll(source) {
            if (!ganttBody || !dataBody) return;
            if (source === 'gantt') {
                const targetTop = clampSharedScrollTop(ganttBody.scrollTop);
                if (Math.abs(ganttBody.scrollTop - targetTop) > 0.5) ganttBody.scrollTop = targetTop;
                if (Math.abs(dataBody.scrollTop - targetTop) > 0.5) dataBody.scrollTop = targetTop;
            } else {
                const targetTop = clampSharedScrollTop(dataBody.scrollTop);
                if (Math.abs(dataBody.scrollTop - targetTop) > 0.5) dataBody.scrollTop = targetTop;
                if (Math.abs(ganttBody.scrollTop - targetTop) > 0.5) ganttBody.scrollTop = targetTop;
            }
        }

        if (ganttBody && dataBody && timelineHeaderWrap) {
            ganttBody.addEventListener('scroll', () => {
                timelineHeaderWrap.scrollLeft = ganttBody.scrollLeft;
                if (syncingScrollSource === 'data') return;
                syncingScrollSource = 'gantt';
                syncVerticalScroll('gantt');
                requestAnimationFrame(() => {
                    syncVerticalScroll('gantt');
                    syncingScrollSource = null;
                });
            }, { passive: true });

            dataBody.addEventListener('scroll', () => {
                if (syncingScrollSource === 'gantt') return;
                syncingScrollSource = 'data';
                syncVerticalScroll('data');
                requestAnimationFrame(() => {
                    syncVerticalScroll('data');
                    syncingScrollSource = null;
                });
            }, { passive: true });

            window.addEventListener('resize', () => {
                updateSidebarOffset();
                const clampedTop = clampSharedScrollTop(ganttBody.scrollTop);
                if (Math.abs(ganttBody.scrollTop - clampedTop) > 0.5) ganttBody.scrollTop = clampedTop;
                if (Math.abs(dataBody.scrollTop - clampedTop) > 0.5) dataBody.scrollTop = clampedTop;
            });
        }

        // Initialize App
        updateSidebarOffset();
        calculateDates(true);
        normalizeCostSettingsInputs();
        initializeAutoSave();
    
        switchPage('gantt');
