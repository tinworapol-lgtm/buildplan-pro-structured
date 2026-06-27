// Signature controls, display toggles, date helpers, and report printing.
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
            const sigSection = document.getElementById('signature-section');
            const icon = document.getElementById('sig-toggle-icon');
            const text = document.getElementById('sig-toggle-text');
            const isCurrentlyVisible = sigSection ? getComputedStyle(sigSection).display !== 'none' : isSignatureVisible;
            isSignatureVisible = !isCurrentlyVisible;
            
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
        function printAppPageReport(pageName, paperSize) {
            const pageIdMap = { actual: 'actual-page', cost: 'cost-page', duration: 'duration-page' };
            const pageId = pageIdMap[pageName];
            const targetPage = pageId ? document.getElementById(pageId) : null;
            if (!targetPage) return false;
            let styleEl = document.getElementById('app-page-print-style');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'app-page-print-style';
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = '@media print { @page { size: ' + paperSize + ' landscape; margin: 8mm; } }';
            const wasHidden = targetPage.classList.contains('page-hidden');
            targetPage.classList.remove('page-hidden');
            document.body.classList.add('app-page-report-print', 'print-' + pageName + '-report');
            const cleanup = () => {
                document.body.classList.remove('app-page-report-print', 'print-' + pageName + '-report');
                if (wasHidden) targetPage.classList.add('page-hidden');
                window.removeEventListener('afterprint', cleanup);
            };
            window.addEventListener('afterprint', cleanup);
            setTimeout(() => window.print(), 120);
            return true;
        }

        function printReport() {
            if (currentPage === 'dashboard' && typeof printExecutiveDashboardReport === 'function') {
                printExecutiveDashboardReport();
                return;
            }
            const paperSize = document.getElementById('print-paper-size').value;
            if (['actual', 'cost', 'duration'].includes(currentPage) && printAppPageReport(currentPage, paperSize)) {
                return;
            }
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
                    #today-line-layer, #today-line-layer *, .today-progress-popover, .today-progress-popover * {
                        visibility: visible !important;
                        opacity: 1 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #today-line-layer {
                        display: block !important;
                        position: absolute !important;
                        z-index: 2147483000 !important;
                        overflow: visible !important;
                    }
                    #today-line-layer .today-line-display-zone {
                        display: block !important;
                        overflow: visible !important;
                    }
                    #today-line-layer .today-progress-popover, .today-progress-popover {
                        display: block !important;
                        z-index: 2147483002 !important;
                    }
                }
            `;
            
            // หน่วงเวลาเล็กน้อยเพื่อให้ CSS อัปเดตโครงสร้างตารางก่อนสั่งปริ้นท์
            document.body.classList.add('gantt-report-print');
            const cleanupPrintClass = () => {
                document.body.classList.remove('gantt-report-print');
                window.removeEventListener('afterprint', cleanupPrintClass);
            };
            window.addEventListener('afterprint', cleanupPrintClass);
            setTimeout(() => {
                window.print();
            }, 150);
        }

        function updateGanttStyleToggleButton() {
            ganttBarStyleMode = 'classic';
        }

        function toggleGanttBarStyle() {
            ganttBarStyleMode = 'classic';
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
