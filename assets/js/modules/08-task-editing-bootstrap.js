// BuildPlan Pro - task editing, modal handlers, scroll sync, and application bootstrap
// Split from assets/js/app.js without behavior changes.

        function updateData(index, field, value) {
            if (field === 'progress') tasks[index][field] = clampNumber(value, 0, 100);
            else tasks[index][field] = value;
            calculateDates();
        }

        function normalizePredecessorLag(lagValue) {
            const clean = String(lagValue || '').trim().replace(/\s+/g, '');
            if (!clean || clean === '+' || clean === '-') return '';
            const lag = parseInt(clean, 10);
            if (!Number.isFinite(lag) || lag === 0) return '';
            return lag > 0 ? `+${lag}` : `${lag}`;
        }

        function updatePredecessorParts(index, wbsValue, linkType, lagValue = '') {
            const wbs = String(wbsValue || '').trim();
            const type = ['FS', 'FF', 'SS', 'SF'].includes(String(linkType || '').toUpperCase())
                ? String(linkType || '').toUpperCase()
                : 'FS';
            const lag = normalizePredecessorLag(lagValue);
            updateData(index, 'predecessors', wbs ? `${wbs}${type}${lag}` : '');
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
        window.BuildPlanLicense?.initializeLicenseGate?.();
        updateSidebarOffset();
        calculateDates(true);
        normalizeCostSettingsInputs();
        initializeAutoSave();
    
        switchPage('gantt');
