document.addEventListener('DOMContentLoaded', () => {
    // ── Bootstrap from server-injected JSON ────────────────────────────────
    const meta       = window.REPORT_META;
    let currentType  = meta.chart_type || 'table';
    let currentData  = null;
    let chartInst    = null;
    let monacoEditor = null;
    let monacoReady  = false;

    // ── Chart-type switcher ─────────────────────────────────────────────────
    const switcherBtns = document.querySelectorAll('.chart-type-btn');

    function setActiveType(type) {
        currentType = type;
        switcherBtns.forEach(b => b.classList.toggle('active', b.dataset.type === type));
        const editSelect = document.getElementById('edit-chart-type');
        if (editSelect && editSelect.value !== type) {
            editSelect.value = type;
        }
    }
    setActiveType(currentType);

    document.getElementById('edit-chart-type')?.addEventListener('change', (e) => {
        setActiveType(e.target.value);
        renderCurrentView();
    });

    switcherBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveType(btn.dataset.type);
            renderCurrentView();
        });
    });

    function getSelectedYColumns() {
        const checkedBoxes = document.querySelectorAll('#y-multi-options input[type="checkbox"]:checked');
        return Array.from(checkedBoxes).map(cb => cb.value);
    }

    function updateYMultiLabel() {
        const selected = getSelectedYColumns();
        const labelEl = document.getElementById('y-multi-label');
        if (!labelEl) return;
        if (selected.length === 0) {
            labelEl.textContent = '— ไม่เลือก (ใช้อัตโนมัติ) —';
        } else if (selected.length === 1) {
            labelEl.textContent = selected[0];
        } else {
            labelEl.textContent = `เลือกแล้ว (${selected.length}): ${selected.join(', ')}`;
        }
    }

    // ── Multi-X helpers ──────────────────────────────────────────────────────
    function getSelectedXColumns() {
        const checkedBoxes = document.querySelectorAll('#x-multi-options input[type="checkbox"]:checked');
        return Array.from(checkedBoxes).map(cb => cb.value);
    }

    function updateXMultiLabel() {
        const selected = getSelectedXColumns();
        const labelEl = document.getElementById('x-multi-label');
        if (!labelEl) return;
        if (selected.length === 0) {
            labelEl.textContent = '— ไม่เลือก (ใช้อัตโนมัติ) —';
        } else if (selected.length === 1) {
            labelEl.textContent = selected[0];
        } else {
            labelEl.textContent = `(${selected.length}) ${selected.join(' + ')}`;
        }
    }

    /**
     * Normalise stored visual_config.x to always be an array
     */
    function normaliseSavedX(raw) {
        if (Array.isArray(raw)) return raw.filter(Boolean);
        if (typeof raw === 'string' && raw) return [raw];
        return [];
    }

    function renderCurrentView() {
        if (!currentData || !currentData.rows) {
            showState('loading');
            return;
        }

        if (currentData.rows.length === 0) {
            if (currentType === 'table') {
                showState('table');
                document.getElementById('table-head').innerHTML = (currentData.columns || []).map(c => `<th>${c}</th>`).join('');
                document.getElementById('table-body').innerHTML = `<tr><td colspan="${currentData.columns?.length || 1}" class="text-center text-muted py-4">ไม่มีข้อมูลในช่วงเวลาที่เลือก</td></tr>`;
            } else {
                showState('chart');
                if (chartInst) { chartInst.dispose(); chartInst = null; }
                const container = document.getElementById('main-chart');
                if (container) {
                    chartInst = echarts.init(container);
                    chartInst.setOption({ title: { text: 'ไม่มีข้อมูลในช่วงเวลาที่เลือก', left: 'center', top: 'center', textStyle: { color: '#888', fontSize: 15 } } });
                }
            }
            return;
        }

        const selectedX = getSelectedXColumns();
        const selectedY = getSelectedYColumns();

        const cols = currentData.columns || [];
        const strCols = cols.filter(c => typeof currentData.rows[0]?.[c] === 'string' || currentData.rows[0]?.[c] instanceof Date);
        const numCols = cols.filter(c => typeof currentData.rows[0]?.[c] === 'number');

        // ── Resolve X fields (multi-column support) ──────────────────────────
        const savedXArr = normaliseSavedX(meta.visual_config?.x);
        let xFields = selectedX.length > 0 ? selectedX
                    : savedXArr.length   > 0 ? savedXArr
                    : [strCols[0] || cols[0]];
        if (!xFields || xFields.length === 0) xFields = [cols[0]];
        // Filter out columns that don't exist in this query result
        xFields = xFields.filter(f => cols.includes(f));
        if (xFields.length === 0) xFields = [strCols[0] || cols[0]];

        // ── Resolve Y fields ─────────────────────────────────────────────────
        let yFields = selectedY;
        if (!yFields || yFields.length === 0) {
            const savedY = meta.visual_config?.y;
            if (Array.isArray(savedY) && savedY.length > 0) yFields = savedY;
            else if (typeof savedY === 'string' && savedY) yFields = [savedY];
            else if (numCols.length > 0) yFields = numCols;
            else yFields = [cols[cols.length - 1]];
        }
        yFields = yFields.filter(f => cols.includes(f));
        if (yFields.length === 0) yFields = [numCols[0] || cols[cols.length - 1]];

        meta.visual_config = { x: xFields, y: yFields, chart_type: currentType };

        // ── Concatenate multi-X fields into a single label string ─────────────
        const X_SEP = ' | ';
        const labels = currentData.rows.map(r =>
            xFields.map(f => String(r[f] ?? '')).join(X_SEP)
        );

        if (currentType === 'table') {
            showState('table');
            renderMultiYTable(xFields, yFields, currentData.rows);
        } else {
            showState('chart');
            requestAnimationFrame(() => renderMultiYChart(currentType, xFields, yFields, labels, currentData.rows));
        }
    }

    let userFilterValues = {};

    function renderFilterBar(detectedParams) {
        const card = document.getElementById('filter-bar-card');
        const container = document.getElementById('filter-controls-container');
        if (!card || !container) return;

        if (!detectedParams || detectedParams.length === 0) {
            card.classList.add('d-none');
            return;
        }

        card.classList.remove('d-none');
        container.innerHTML = '';

        detectedParams.forEach(p => {
            const wrapper = document.createElement('div');
            wrapper.className = 'd-flex align-items-center gap-1';

            const label = document.createElement('label');
            label.className = 'form-label mb-0 me-1 small text-secondary fw-bold';
            label.style.fontSize = '12px';
            label.textContent = getParamLabel(p);

            let input;
            if (p.type === 'date') {
                input = document.createElement('input');
                input.type = 'date';
                input.className = 'form-control form-control-sm param-input';
                input.style.width = '145px';
                
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const firstDayStr = `${year}-${month}-01`;
                const todayStr = `${year}-${month}-${String(now.getDate()).padStart(2, '0')}`;

                if (p.name.includes('start') || p.name.includes('begin')) {
                    input.value = userFilterValues[p.name] || firstDayStr;
                } else {
                    input.value = userFilterValues[p.name] || todayStr;
                }
            } else if (p.type === 'select') {
                input = document.createElement('select');
                input.className = 'form-select form-select-sm param-input';
                input.style.width = '150px';

                const defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.textContent = '-- ทั้งหมด (All) --';
                input.appendChild(defaultOpt);

                let optValues = [];
                if (p.options && p.options.length > 0) {
                    optValues = p.options;
                } else if (currentData && currentData.rows && currentData.rows.length > 0) {
                    const colKey = Object.keys(currentData.rows[0]).find(k => k.toLowerCase() === p.name.toLowerCase()) || p.name;
                    const uniques = new Set();
                    currentData.rows.forEach(r => {
                        const val = r[colKey];
                        if (val !== undefined && val !== null && String(val).trim() !== '') {
                            uniques.add(String(val).trim());
                        }
                    });
                    optValues = Array.from(uniques);
                }

                optValues.forEach(optVal => {
                    const opt = document.createElement('option');
                    opt.value = optVal;
                    opt.textContent = optVal;
                    if (userFilterValues[p.name] === optVal) opt.selected = true;
                    input.appendChild(opt);
                });
            } else if (p.type === 'in' || p.type === 'multiselect') {
                input = document.createElement('select');
                input.className = 'form-select form-select-sm param-input';
                input.style.width = '165px';
                input.multiple = true;
                input.size = 2;
                input.title = 'กด Ctrl หรือ Shift ค้างไว้เพื่อเลือกหลายรายการ';

                let optValues = [];
                if (p.options && p.options.length > 0) {
                    optValues = p.options;
                } else if (currentData && currentData.rows && currentData.rows.length > 0) {
                    const colKey = Object.keys(currentData.rows[0]).find(k => k.toLowerCase() === p.name.toLowerCase()) || p.name;
                    const uniques = new Set();
                    currentData.rows.forEach(r => {
                        const val = r[colKey];
                        if (val !== undefined && val !== null && String(val).trim() !== '') {
                            uniques.add(String(val).trim());
                        }
                    });
                    optValues = Array.from(uniques);
                }

                optValues.forEach(optVal => {
                    const opt = document.createElement('option');
                    opt.value = optVal;
                    opt.textContent = optVal;
                    const curVal = userFilterValues[p.name];
                    if (Array.isArray(curVal) ? curVal.includes(optVal) : curVal === optVal) {
                        opt.selected = true;
                    }
                    input.appendChild(opt);
                });
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control form-control-sm param-input';
                input.style.width = '140px';
                input.placeholder = 'คำค้นหา...';
                if (userFilterValues[p.name]) input.value = userFilterValues[p.name];
            }

            input.setAttribute('data-param-name', p.name);
            if (input.tagName === 'SELECT' && input.multiple) {
                userFilterValues[p.name] = Array.from(input.selectedOptions).map(o => o.value);
            } else {
                userFilterValues[p.name] = input.value;
            }

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            container.appendChild(wrapper);
        });
        updateExportLink();
    }

    function getParamLabel(p) {
        if (typeof p === 'object' && p.label) return p.label + ':';
        const name = typeof p === 'object' ? p.name : p;
        const n = String(name).toLowerCase();
        
        const dict = {
            'start_date': 'วันที่เริ่มต้น:',
            'begin_date': 'วันที่เริ่มต้น:',
            'end_date': 'ถึงวันที่:',
            'to_date': 'ถึงวันที่:',
            'date': 'วันที่:',
            'vstdate': 'วันที่รับบริการ:',
            'hn': 'HN คนไข้:',
            'patient_hn': 'HN คนไข้:',
            'an': 'AN ผู้ป่วยใน:',
            'vn': 'VN ผู้ป่วยนอก:',
            'cid': 'เลขบัตรประชาชน:',
            'patient_name': 'ชื่อ-นามสกุล คนไข้:',
            'doctor_code': 'รหัสแพทย์:',
            'doctor': 'แพทย์ผู้ตรวจ:',
            'clinic': 'คลินิก/แผนก:',
            'dept': 'แผนก:',
            'ward': 'หอผู้ป่วย (Ward):',
            'pttype': 'สิทธิการรักษา:',
            'icd10': 'รหัสโรค (ICD10):',
            'search_text': 'คำค้นหา:',
            'search': 'คำค้นหา:'
        };

        if (dict[n]) return dict[n];
        return String(name).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ':';
    }

    function updateExportLink() {
        const btn = document.getElementById('btn-export-csv');
        if (!btn) return;
        const paramsStr = encodeURIComponent(JSON.stringify(userFilterValues));
        btn.href = `/reports/${meta.id}/export?params=${paramsStr}`;
    }

    const btnExportCsv = document.getElementById('btn-export-csv');
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
            updateExportLink();
        });
    }

    document.getElementById('btn-apply-filters')?.addEventListener('click', () => {
        document.querySelectorAll('.param-input').forEach(inp => {
            const name = inp.getAttribute('data-param-name');
            if (name) {
                if (inp.tagName === 'SELECT' && inp.multiple) {
                    userFilterValues[name] = Array.from(inp.selectedOptions).map(o => o.value);
                } else {
                    userFilterValues[name] = inp.value;
                }
            }
        });
        updateExportLink();
        loadData();
    });

    // ── Load data ───────────────────────────────────────────────────────────
    async function loadData() {
        showState('loading');
        try {
            const paramsStr = encodeURIComponent(JSON.stringify(userFilterValues));
            const res  = await fetch(`/api/reports/${meta.id}/data?params=${paramsStr}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'โหลดข้อมูลไม่สำเร็จ');

            currentData = data;
            document.getElementById('stat-cols').textContent = data.columns.length;
            document.getElementById('stat-rows').textContent = data.rows.length.toLocaleString();

            if (data.detectedParams) {
                renderFilterBar(data.detectedParams);
            }

            populateConfigDropdowns(data.columns);
            renderCurrentView();
        } catch (err) {
            showState('error', err.message);
        }
    }

    function populateConfigDropdowns(columns) {
        const containerX = document.getElementById('x-multi-options');
        const containerY = document.getElementById('y-multi-options');
        if (!containerX || !containerY) return;

        const savedXArr = normaliseSavedX(meta.visual_config?.x);
        let savedY = meta.visual_config?.y;
        if (typeof savedY === 'string') savedY = [savedY];
        if (!Array.isArray(savedY)) savedY = [];

        // ── Populate X checkboxes ─────────────────────────────────────────────
        containerX.innerHTML = '';
        // Hint row
        const hintDiv = document.createElement('div');
        hintDiv.className = 'px-2 py-1 mb-1 border-bottom';
        hintDiv.innerHTML = `<small class="text-muted fst-italic">✨ เลือก 1 ค่า = แกน X เดี่ยว, เลือกหลายค่า = รวมป้ายแกน X ด้วย " | "</small>`;
        containerX.appendChild(hintDiv);

        columns.forEach((col, idx) => {
            const isChecked = savedXArr.includes(col);
            const div = document.createElement('div');
            div.className = 'form-check py-1 px-2 rounded';
            div.style.cursor = 'pointer';
            div.innerHTML = `
                <input class="form-check-input x-col-checkbox" type="checkbox" value="${col}" id="chk-x-${idx}" ${isChecked ? 'checked' : ''}>
                <label class="form-check-label w-100 text-truncate ms-1" for="chk-x-${idx}" style="cursor:pointer; font-size:12px;">${col}</label>
            `;
            containerX.appendChild(div);
        });

        updateXMultiLabel();

        containerX.querySelectorAll('.x-col-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                updateXMultiLabel();
                renderCurrentView();
            });
        });

        // ── Populate Y checkboxes ─────────────────────────────────────────────
        containerY.innerHTML = '';
        columns.forEach((col, idx) => {
            const isChecked = savedY.includes(col);
            const div = document.createElement('div');
            div.className = 'form-check py-1 px-2 hover-bg rounded';
            div.innerHTML = `
                <input class="form-check-input y-col-checkbox" type="checkbox" value="${col}" id="chk-y-${idx}" ${isChecked ? 'checked' : ''}>
                <label class="form-check-label w-100 text-truncate ms-1" for="chk-y-${idx}" style="cursor:pointer; font-size:12px;">${col}</label>
            `;
            containerY.appendChild(div);
        });

        updateYMultiLabel();

        containerY.querySelectorAll('.y-col-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                updateYMultiLabel();
                renderCurrentView();
            });
        });
    }

    document.getElementById('btn-apply-config')?.addEventListener('click', () => {
        if (!currentData || !currentData.rows) return;
        const x = getSelectedXColumns();
        const y = getSelectedYColumns();
        meta.visual_config = {
            x: x.length > 0 ? x : normaliseSavedX(meta.visual_config?.x),
            y,
            chart_type: currentType
        };
        renderCurrentView();
        showToast('💡 ปรับพรีวิวมุมมองกราฟเรียบร้อยแล้ว กด "บันทึก" เพื่อบันทึกลงระบบ');
    });

    function renderView(columns, rows) {
        renderCurrentView();
    }

    function renderMultiYTable(xFields, yFields, rows) {
        const xArr = Array.isArray(xFields) ? xFields : [xFields];
        // X column headers get a light-blue class to visually distinguish dimensions
        const xThs = xArr.map(x => `<th class="table-primary" style="white-space:nowrap">${x}</th>`).join('');
        const yThs = yFields.map(y => `<th>${y}</th>`).join('');
        const ths  = xThs + yThs;

        const trs = rows.map(r => {
            // Render each X dimension as its own cell
            const xTds = xArr.map(x => `<td class="fw-medium">${r[x] ?? ''}</td>`).join('');
            const yTds = yFields.map(y => {
                const v = r[y];
                return `<td>${typeof v === 'number' ? v.toLocaleString() : (v ?? '')}</td>`;
            }).join('');
            return `<tr>${xTds}${yTds}</tr>`;
        }).join('');

        document.getElementById('table-head').innerHTML = ths;
        document.getElementById('table-body').innerHTML = trs;
    }

    // ── Multi-Series Chart Rendering (supports multi-column X axis) ───────────
    function renderMultiYChart(type, xFields, yFields, labels, rows) {
        const container = document.getElementById('main-chart');
        if (!container) return;

        if (chartInst) { chartInst.dispose(); chartInst = null; }
        chartInst = echarts.init(container);
        new ResizeObserver(() => chartInst?.resize()).observe(container);

        if (!labels || labels.length === 0) {
            chartInst.setOption({ title: { text: 'ไม่มีข้อมูล', left: 'center', top: 'center' } });
            return;
        }

        if (type === 'kpi') {
            if (chartInst) { chartInst.dispose(); chartInst = null; }
            let primaryMetricName = yFields && yFields.length > 0 ? yFields[0] : 'จำนวนรวม (Total)';
            let mainValue = 0;
            if (yFields && yFields.length > 0 && rows.some(r => typeof r[yFields[0]] === 'number' || !isNaN(parseFloat(r[yFields[0]])))) {
                const field = yFields[0];
                mainValue = rows.reduce((sum, r) => sum + (parseFloat(r[field]) || 0), 0);
            } else {
                mainValue = rows.length;
                primaryMetricName = 'จำนวนแถวข้อมูลทั้งหมด (Total Records)';
            }
            const formattedVal = Number.isInteger(mainValue) ? mainValue.toLocaleString() : mainValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const rowCount = rows.length.toLocaleString();

            container.innerHTML = `
                <div class="d-flex flex-column justify-content-between h-100 p-4 rounded-3 text-white shadow-sm" style="background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%); min-height: 320px;">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="text-white-50 small fw-bold text-uppercase" style="letter-spacing: 0.5px; font-size: 14px;">
                            ${primaryMetricName}
                        </div>
                        <div class="rounded-circle bg-white bg-opacity-20 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                            <i class="bi bi-hash fs-3"></i>
                        </div>
                    </div>
                    <div class="my-auto py-4">
                        <div class="fw-bolder lh-1" style="font-size: clamp(2.5rem, 6vw, 4.5rem); text-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                            ${formattedVal}
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between text-white-50 border-top border-white border-opacity-25 pt-3" style="font-size: 13px;">
                        <span><i class="bi bi-layers me-1"></i>ประมวลผลจาก ${rowCount} รายการ</span>
                        <span class="badge bg-white bg-opacity-25 text-white fw-normal px-3 py-1" style="font-size: 12px;">KPI Card View</span>
                    </div>
                </div>
            `;
            return;
        }

        // labels array already has multi-X values concatenated (built in renderCurrentView)
        if (type === 'pie') {
            const firstY = yFields[0] || (currentData?.columns ? currentData.columns[currentData.columns.length - 1] : '');
            chartInst.setOption({
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                legend: { type: 'scroll', bottom: 0 },
                series: [{
                    type: 'pie',
                    radius: ['35%', '68%'],
                    data: labels.map((lbl, idx) => ({ name: lbl, value: parseFloat(rows[idx][firstY]) || 0 })),
                    label: { formatter: '{b}\n{c}' }
                }]
            });
        } else if (type === 'hbar') {
            const series = yFields.map(col => ({
                name: col,
                type: 'bar',
                data: rows.map(r => parseFloat(r[col]) || 0),
                barMaxWidth: 35
            }));
            chartInst.setOption({
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                legend: { bottom: 0, show: yFields.length > 1 },
                grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
                yAxis: { type: 'category', data: labels, inverse: true },
                xAxis: { type: 'value' },
                series
            });
        } else {
            const series = yFields.map(col => ({
                name: col,
                type: type,
                data: rows.map(r => parseFloat(r[col]) || 0),
                smooth: type === 'line',
                areaStyle: type === 'line' ? { opacity: 0.1 } : undefined,
                barMaxWidth: 55
            }));
            chartInst.setOption({
                tooltip: { trigger: 'axis' },
                legend: { bottom: 0, show: yFields.length > 1 },
                grid: { left: '3%', right: '4%', bottom: '14%', containLabel: true },
                xAxis: { type: 'category', data: labels, axisLabel: { rotate: labels.length > 12 ? 35 : 0, overflow: 'truncate', width: 80 } },
                yAxis: { type: 'value' },
                series
            });
        }
    }


    // ── State helper ────────────────────────────────────────────────────────
    function showState(state, msg = '') {
        document.getElementById('loading-state').classList.toggle('d-none', state !== 'loading');
        document.getElementById('error-state').classList.toggle('d-none',   state !== 'error');
        document.getElementById('chart-area').classList.toggle('d-none',    state !== 'chart');
        document.getElementById('table-area').classList.toggle('d-none',    state !== 'table');
        if (state === 'error') document.getElementById('error-state').innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>${msg}`;
    }

    // ── Edit name ───────────────────────────────────────────────────────────
    if (meta.can_edit) {
        const display    = document.getElementById('report-title-display');
        const input      = document.getElementById('edit-name-input');
        const btnToggle  = document.getElementById('btn-toggle-edit-name');
        const btnSaveName= document.getElementById('btn-save-name');

        btnToggle?.addEventListener('click', () => {
            const editing = !input.classList.contains('d-none');
            display.classList.toggle('d-none', !editing);
            input.classList.toggle('d-none', editing);
            btnSaveName.classList.toggle('d-none', editing);
            if (!editing) input.focus();
        });

        btnSaveName?.addEventListener('click', async () => {
            const newName = input.value.trim();
            if (!newName) return;
            try {
                const res = await fetch(`/api/reports/${meta.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName, sql_query: meta.sql_query, chart_type: currentType })
                });
                if (res.ok) {
                    meta.name = newName;
                    display.textContent = newName;
                    display.classList.remove('d-none');
                    input.classList.add('d-none');
                    btnSaveName.classList.add('d-none');
                } else {
                    const d = await res.json();
                    alert('Error: ' + d.error);
                }
            } catch (e) { alert(e.message); }
        });

        // ── SQL Panel ─────────────────────────────────────────────────────
        const sqlPanel    = document.getElementById('sql-panel');
        const btnOpenSql  = document.getElementById('btn-open-sql');
        const btnCloseSql = document.getElementById('btn-close-sql');
        const btnRunSql   = document.getElementById('btn-run-sql');
        const btnSaveSql  = document.getElementById('btn-save-sql');

        function insertTextAtCursor(text) {
            if (!monacoEditor) return;
            const selection = monacoEditor.getSelection();
            const id = { major: 1, minor: 1 };
            const op = { identifier: id, range: selection, text: text, forceMoveMarkers: true };
            monacoEditor.executeEdits('insert-var', [op]);
            monacoEditor.focus();
        }

        document.querySelectorAll('.btn-insert-var').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-code');
                if (code) insertTextAtCursor(code);
            });
        });

        // Variable Wizard Modal logic
        const btnOpenWiz = document.getElementById('btn-open-var-wizard');
        const btnWizInsert = document.getElementById('btn-wiz-insert');
        let wizModal = null;

        btnOpenWiz?.addEventListener('click', () => {
            const modalEl = document.getElementById('varWizardModal');
            if (modalEl) {
                wizModal = new bootstrap.Modal(modalEl);
                wizModal.show();
            }
        });

        btnWizInsert?.addEventListener('click', () => {
            const type = document.getElementById('wiz-type').value;
            const name = document.getElementById('wiz-name').value.trim() || 'my_var';
            let snippet = `{{${name}}}`;
            if (type === 'start_date' && name === 'start_date') snippet = `vstdate BETWEEN {{start_date}} AND {{end_date}}`;
            else if (type === 'date') snippet = `vstdate = {{${name}}}`;
            else if (type === 'select') snippet = `position_id = {{${name}:select|ตำแหน่ง}}`;
            else if (type === 'in') snippet = `position_id IN ({{${name}:in|เลือกหลายตำแหน่ง}})`;
            else if (type === 'text') snippet = `name LIKE {{${name}}}`;
            
            insertTextAtCursor(snippet);
            if (wizModal) wizModal.hide();
        });

        function openSqlPanel() {
            sqlPanel.classList.remove('d-none');
            if (!monacoReady) {
                require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
                require(['vs/editor/editor.main'], () => {
                    monacoEditor = monaco.editor.create(document.getElementById('sql-editor'), {
                        value: meta.sql_query,
                        language: 'sql',
                        theme: 'vs',
                        minimap: { enabled: false },
                        fontSize: 14,
                        automaticLayout: true
                    });
                    monacoReady = true;
                });
            }
            sqlPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        btnOpenSql?.addEventListener('click', openSqlPanel);
        btnCloseSql?.addEventListener('click', () => sqlPanel.classList.add('d-none'));

        // Auto-open SQL editor panel if URL query contains openSql=true or edit=true
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('openSql') === 'true' || urlParams.get('edit') === 'true') {
            setTimeout(openSqlPanel, 300);
        }

        // ── Run preview ──────────────────────────────────────────────────
        btnRunSql?.addEventListener('click', async () => {
            const sql = monacoEditor ? monacoEditor.getValue() : meta.sql_query;
            btnRunSql.disabled = true;
            btnRunSql.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            try {
                const res  = await fetch('/api/reports/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sql_query: sql, params: userFilterValues })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                currentData = { columns: data.columns, rows: data.rows };
                document.getElementById('stat-cols').textContent = data.columns.length;
                document.getElementById('stat-rows').textContent = data.rows.length.toLocaleString();

                if (data.detectedParams) {
                    renderFilterBar(data.detectedParams);
                }

                const selType = document.getElementById('edit-chart-type').value;
                setActiveType(selType);
                renderCurrentView();
            } catch (err) {
                showState('error', err.message);
            } finally {
                btnRunSql.disabled = false;
                btnRunSql.innerHTML = '<i class="bi bi-play-fill"></i> ทดสอบ';
            }
        });

        // ── Save SQL & Visual Config ─────────────────────────────────────
        btnSaveSql?.addEventListener('click', async () => {
            const sql       = monacoEditor ? monacoEditor.getValue() : meta.sql_query;
            const chartType = currentType;
            let x = getSelectedXColumns();
            if (!x || x.length === 0) x = normaliseSavedX(meta.visual_config?.x);
            let y = getSelectedYColumns();
            if (!y || y.length === 0) {
                const sy = meta.visual_config?.y;
                y = Array.isArray(sy) ? sy : (sy ? [sy] : []);
            }

            const visualConfig = { x, y, chart_type: chartType };

            btnSaveSql.disabled = true;
            btnSaveSql.innerHTML = '<span class="spinner-border spinner-border-sm"></span> บันทึก...';
            try {
                const res = await fetch(`/api/reports/${meta.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: meta.name,
                        sql_query: sql,
                        chart_type: chartType,
                        visual_config: visualConfig
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    meta.sql_query     = sql;
                    meta.chart_type    = chartType;
                    meta.visual_config = visualConfig;
                    setActiveType(chartType);
                    await loadData();
                    sqlPanel.classList.add('d-none');
                    showToast('✅ บันทึกคำสั่ง SQL และตั้งค่าแกนกราฟเรียบร้อยแล้ว');
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (e) { alert(e.message); }
            finally {
                btnSaveSql.disabled = false;
                btnSaveSql.innerHTML = '<i class="bi bi-save"></i> บันทึก';
            }
        });
    }

    // ── Toast helper ────────────────────────────────────────────────────────
    function showToast(msg) {
        const t = document.createElement('div');
        t.className = 'position-fixed bottom-0 end-0 m-3 alert alert-success shadow py-2 px-3';
        t.style.zIndex = 9999;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    // ── Init ────────────────────────────────────────────────────────────────
    loadData();
});
