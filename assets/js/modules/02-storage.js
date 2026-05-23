// Project import/export, autosave, persistence, and project data mapping.
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
        
        const APP_CONFIG = window.BuildPlanConfig || {};
        const APP_STORAGE_KEY = APP_CONFIG.storage?.autosaveKey || 'buildplan_pro_autosave_v2';
        let autosaveTimer = null;

        function collectProjectData() {
            normalizeTaskModel();
            const projectData = {
                version: APP_CONFIG.dataSchemaVersion || '2.0',
                savedAt: new Date().toISOString(),
                app: APP_CONFIG.productName || 'BuildPlan Pro',
                appVersion: APP_CONFIG.version || window.BuildPlan?.version || '',
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
                    durationTaskNameColumnWidth,
                    actualTaskNameColumnWidth
                },
                installmentSettings: { ...installmentSettings },
                durationPlanSettings: { ...durationPlanSettings },
                actualSettings: { ...actualSettings },
                actualEntries: JSON.parse(JSON.stringify(actualEntries || {})),
                costSettings: { ...costSettings },
                tasks
            };
            return window.BuildPlanSchema?.prepareForSave?.(projectData) || projectData;
        }

        function applyProjectData(projectData) {
            projectData = window.BuildPlanSchema?.migrateProjectData?.(projectData) || projectData;
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
                actualTaskNameColumnWidth = clampActualTaskNameColumnWidth(projectData.prefs.actualTaskNameColumnWidth || actualTaskNameColumnWidth);
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
