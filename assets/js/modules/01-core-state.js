// Core state, undo/redo, alert helpers, and shared UI primitives.
// BuildPlan Pro - core state, alerts, storage, print, and shared date helpers
// Split from assets/js/app.js without behavior changes.

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
        let todayPopoverSide = 'right';

        let costSettings = { factorF: 1.0000, vat: 1.0700 };

        let currentPage = 'gantt';
        let pageSwitchTimer = null;
        let sCurveFrequency = 'weekly';
        let sCurveFillVisible = true;
        let sCurveSmoothMode = false;
        let showInstallmentLines = true;
        let taskNameColumnWidth = 250;
        let durationTaskNameColumnWidth = 214;
        let actualTaskNameColumnWidth = 320;
        let installmentSettings = { count: 0, durationDays: 30 };
        let durationPlanSettings = {};
        let actualSettings = { frequency: 'weekly' };
        let actualEntries = {};
        let actualCurveZoom = 1;

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
