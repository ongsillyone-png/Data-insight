document.addEventListener('DOMContentLoaded', () => {
    let editor;
    let chartInstance;
    let rawData = null;          // { columns, rows } — ข้อมูลดิบจาก SQL
    let visualConfig = {};       // การตั้งค่า X/Y/Agg/ChartType

    // ── Monaco Editor ─────────────────────────────────────────────────────
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
    require(['vs/editor/editor.main'], () => {
        editor = monaco.editor.create(document.getElementById('sql-editor'), {
            value: 'SELECT *\nFROM ovst\nWHERE vstdate = CURDATE()\nLIMIT 100;',
            language: 'sql',
            theme: 'vs',
            minimap: { enabled: false },
            fontSize: 13,
            automaticLayout: true,
            scrollBeyondLastLine: false
        });
    });

    // ── Elements ───────────────────────────────────────────────────────────
    const btnRun    = document.getElementById('btn-run');
    const btnSave   = document.getElementById('btn-save');
    const alertBox  = document.getElementById('alert-box');
    const runStats  = document.getElementById('run-stats');
    const selX      = document.getElementById('sel-x');
    const selY      = document.getElementById('sel-y');
    const selYAgg   = document.getElementById('sel-y-agg');
    const selChart  = document.getElementById('chart-type');
    const colChips  = document.getElementById('col-chips');
    const configPanel = document.getElementById('visual-config-panel');
    const previewLabel = document.getElementById('preview-label');

    // ── Helper: Insert text into Monaco Editor at cursor ─────────────────
    function insertTextAtCursor(text) {
        if (!editor) return;
        const selection = editor.getSelection();
        const id = { major: 1, minor: 1 };
        const op = { identifier: id, range: selection, text: text, forceMoveMarkers: true };
        editor.executeEdits('insert-var', [op]);
        editor.focus();
    }

    // Bind Quick Variable Toolbar
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
        else if (type === 'select') snippet = `code = {{${name}:select|เลือกรายการ}}`;
        else if (type === 'in') snippet = `code IN ({{${name}:in|เลือกหลายรายการ}})`;
        else if (type === 'text') snippet = `name LIKE {{${name}}}`;
        
        insertTextAtCursor(snippet);
        if (wizModal) wizModal.hide();
    });

    // ── Run SQL ────────────────────────────────────────────────────────────
    btnRun.addEventListener('click', async () => {
        if (!editor) return;
        const sql = editor.getValue().trim();
        if (!sql) return;

        showAlert(null);
        showState('loading');
        btnRun.disabled = true;
        btnRun.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Running...';

        try {
            const res    = await fetch('/api/reports/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql_query: sql })
            });
            const result = await res.json();

            if (!res.ok) throw new Error(result.error || 'Execution failed');

            rawData = { columns: result.columns, rows: result.rows };

            // Stats
            runStats.textContent = `${result.rows.length.toLocaleString()} แถว · ${result.columns.length} คอลัมน์`;
            previewLabel.textContent = `${result.rows.length.toLocaleString()} แถว`;

            // Populate Visual Config panel
            buildConfigPanel(result.columns, result.rows);
            configPanel.style.display = 'block';

            // Auto-suggest chart type
            if (result.recommendedChart) {
                selChart.value = result.recommendedChart;
            }

            // Auto-render
            applyVisualConfig();
            btnSave.disabled = false;

        } catch (err) {
            showAlert(err.message, 'danger');
            showState('empty');
        } finally {
            btnRun.disabled = false;
            btnRun.innerHTML = '<i class="bi bi-play-fill"></i> Run SQL';
        }
    });

    // ── Build Config Panel ─────────────────────────────────────────────────
    function buildConfigPanel(columns, rows) {
        // Detect types from first row
        const typeMap = {};
        if (rows.length > 0) {
            columns.forEach(c => {
                const v = rows[0][c];
                if (v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v))) {
                    typeMap[c] = 'date';
                } else if (typeof v === 'number') {
                    typeMap[c] = 'num';
                } else {
                    typeMap[c] = 'str';
                }
            });
        }

        // Column chips
        colChips.innerHTML = columns.map(c => {
            const t = typeMap[c] || 'str';
            const icon = t === 'num' ? '🔢' : t === 'date' ? '📅' : '🔤';
            return `<span class="col-chip type-${t}" title="${t}">${icon} ${c}</span>`;
        }).join('');

        // Populate dropdowns
        const opts = `<option value="">— ไม่เลือก —</option>` +
            columns.map(c => `<option value="${c}">${c}</option>`).join('');
        selX.innerHTML = opts;
        selY.innerHTML = opts;

        // Auto-pick: first string/date col → X, first num col → Y
        const strCols  = columns.filter(c => typeMap[c] !== 'num');
        const numCols  = columns.filter(c => typeMap[c] === 'num');
        if (strCols.length > 0) selX.value = strCols[0];
        if (numCols.length > 0) {
            selY.value    = numCols[0];
            selYAgg.value = 'SUM';
        } else if (strCols.length > 1) {
            selY.value    = strCols[1] || strCols[0];
            selYAgg.value = 'COUNT';
        }
    }

    // ── Listen for config changes → re-render ─────────────────────────────
    [selX, selY, selYAgg, selChart].forEach(el => {
        el.addEventListener('change', () => { if (rawData) applyVisualConfig(); });
    });

    // ── Apply Visual Config → compute & render ─────────────────────────────
    function applyVisualConfig() {
        if (!rawData) return;

        const xField  = selX.value;
        const yField  = selY.value;
        const agg     = selYAgg.value;
        const type    = selChart.value;

        visualConfig = { x: xField, y: yField, agg, chart_type: type };

        // If no X/Y → show raw table
        if (!xField && !yField) {
            showState('table');
            renderRawTable(rawData.columns, rawData.rows);
            return;
        }

        // ── Compute aggregated data (ข้อมูลที่แสดงในตาราง) ──────────────
        const { labels, values, yLabel } = aggregateData(rawData.rows, xField, yField, agg);

        if (type === 'table') {
            showState('table');
            renderAggTable(xField || 'X', yLabel, labels, values);
        } else {
            showState('chart');
            // setTimeout(0) = run AFTER browser has finished the current paint cycle
            setTimeout(() => renderChart(type, xField || 'Row', yLabel, labels, values), 0);
        }
    }

    // ── Aggregation Engine (client-side) ───────────────────────────────────
    function aggregateData(rows, xField, yField, agg) {
        // If no aggregation (NONE) — just map X→Y directly
        if (agg === 'NONE' || !agg) {
            const labels = rows.map(r => String(r[xField] ?? ''));
            const values = rows.map(r => r[yField] ?? 0);
            return { labels, values, yLabel: yField || 'Value' };
        }

        // If only X field (COUNT rows per group)
        if (!yField && agg === 'COUNT') {
            const grouped = {};
            rows.forEach(r => {
                const k = String(r[xField] ?? '(blank)');
                grouped[k] = (grouped[k] || 0) + 1;
            });
            return {
                labels: Object.keys(grouped),
                values: Object.values(grouped),
                yLabel: `COUNT(*)`
            };
        }

        // Group by X, aggregate Y
        const groups = {};
        rows.forEach(r => {
            const key = xField ? String(r[xField] ?? '(blank)') : '(all)';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r[yField] ?? 0);
        });

        const labels = Object.keys(groups);
        const values = labels.map(k => {
            const vals = groups[k].map(v => parseFloat(v) || 0);
            switch (agg) {
                case 'COUNT':          return vals.length;
                case 'COUNT_DISTINCT': return new Set(groups[k]).size;
                case 'SUM':            return vals.reduce((a, b) => a + b, 0);
                case 'AVG':            return vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
                case 'MAX':            return Math.max(...vals);
                case 'MIN':            return Math.min(...vals);
                default:               return vals[vals.length - 1];
            }
        });

        const aggLabel = agg === 'COUNT_DISTINCT' ? `COUNT DISTINCT(${yField})` : `${agg}(${yField || '*'})`;
        return { labels, values, yLabel: aggLabel };
    }

    // ── Chart Renderer ─────────────────────────────────────────────────────
    function renderChart(type, xLabel, yLabel, labels, values) {
        const container = document.getElementById('chart-preview');
        if (!container || typeof echarts === 'undefined') return;

        // Dispose old instance
        if (chartInstance) { chartInstance.dispose(); chartInstance = null; }

        // Determine dimensions explicitly (fallback if container still 0)
        const w = container.offsetWidth  || container.parentElement?.offsetWidth  || 600;
        const h = container.offsetHeight || 320;
        chartInstance = echarts.init(container, null, { width: w, height: h });

        const rounded = values.map(v => {
            const n = parseFloat(v);
            return isNaN(n) ? 0 : Math.round(n * 100) / 100;
        });

        if (type === 'pie') {
            chartInstance.setOption({
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                legend: { type: 'scroll', bottom: 0 },
                series: [{
                    type: 'pie',
                    radius: ['35%', '68%'],
                    data: labels.map((l, i) => ({ name: String(l ?? ''), value: rounded[i] })),
                    label: { formatter: '{b}\n{d}%' }
                }]
            });
        } else if (type === 'hbar') {
            chartInstance.setOption({
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
                yAxis: {
                    type: 'category',
                    data: labels.map(l => String(l ?? '')),
                    inverse: true
                },
                xAxis: { type: 'value', name: yLabel },
                series: [{
                    data: rounded,
                    type: 'bar',
                    barMaxWidth: 35,
                    itemStyle: { color: '#0d6efd', borderRadius: [0, 4, 4, 0] },
                    label: { show: true, position: 'right' }
                }]
            });
        } else {
            chartInstance.setOption({
                tooltip: {
                    trigger: 'axis',
                    formatter: params => {
                        if (!params || !params[0]) return '';
                        const val = params[0].value;
                        return `${params[0].name}<br/>${yLabel}: <b>${typeof val === 'number' ? val.toLocaleString() : val}</b>`;
                    }
                },
                grid: { left: '3%', right: '4%', bottom: '14%', containLabel: true },
                xAxis: {
                    type: 'category',
                    name: xLabel,
                    data: labels.map(l => String(l ?? '')),
                    axisLabel: { rotate: labels.length > 8 ? 35 : 0, overflow: 'truncate', width: 80 }
                },
                yAxis: { type: 'value', name: yLabel },
                series: [{
                    data: rounded,
                    type: type,
                    smooth: type === 'line',
                    areaStyle: type === 'line' ? { opacity: 0.08 } : undefined,
                    barMaxWidth: 55,
                    label: {
                        show: rounded.length <= 15,
                        position: 'top',
                        formatter: params => (params && typeof params.value === 'number' ? params.value.toLocaleString() : '')
                    }
                }]
            });
        }

        // Resize observer for window changes
        try {
            new ResizeObserver(() => chartInstance?.resize()).observe(container);
        } catch (e) {}
        setTimeout(() => chartInstance?.resize(), 50);
    }



    // ── Table Renderer (aggregated) ────────────────────────────────────────
    function renderAggTable(xLabel, yLabel, labels, values) {
        document.getElementById('result-thead').innerHTML =
            `<th>${xLabel}</th><th>${yLabel}</th>`;
        document.getElementById('result-tbody').innerHTML =
            labels.map((l, i) =>
                `<tr><td>${l}</td><td>${(typeof values[i] === 'number' ? values[i].toLocaleString() : values[i])}</td></tr>`
            ).join('');
    }

    // ── Raw Table Renderer ─────────────────────────────────────────────────
    function renderRawTable(columns, rows) {
        document.getElementById('result-thead').innerHTML =
            columns.map(c => `<th>${c}</th>`).join('');
        document.getElementById('result-tbody').innerHTML =
            rows.map(row =>
                `<tr>${columns.map(c => `<td>${row[c] ?? ''}</td>`).join('')}</tr>`
            ).join('');
    }

    // ── State helper ───────────────────────────────────────────────────────
    function showState(state) {
        document.getElementById('empty-state').classList.toggle('d-none',   state !== 'empty');
        document.getElementById('loading-state').classList.toggle('d-none', state !== 'loading');
        document.getElementById('chart-container').classList.toggle('d-none', state !== 'chart');
        document.getElementById('table-preview').classList.toggle('d-none',  state !== 'table');
    }

    function showAlert(msg, type = 'danger') {
        if (!msg) { alertBox.classList.add('d-none'); return; }
        alertBox.className = `alert alert-${type}`;
        alertBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>${msg}`;
        alertBox.classList.remove('d-none');
    }

    // ── Save Report ────────────────────────────────────────────────────────
    btnSave.addEventListener('click', async () => {
        if (!rawData || !editor) return;

        const name = prompt('ชื่อ Report:', 'รายงาน ' + new Date().toLocaleDateString('th-TH'));
        if (!name || !name.trim()) return;

        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="spinner-border spinner-border-sm"></span> บันทึก...';

        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: '',
                    sql_query:    editor.getValue(),
                    chart_type:   selChart.value || 'table',
                    chart_config: {},
                    visual_config: visualConfig    // ← เก็บ config BI ด้วย
                })
            });

            const result = await res.json();
            if (res.ok) {
                showAlert('บันทึกเรียบร้อย! กำลังไปหน้า View...', 'success');
                setTimeout(() => window.location.href = `/reports/${result.id}/view`, 800);
            } else {
                showAlert(result.error || 'บันทึกไม่สำเร็จ');
                btnSave.disabled = false;
                btnSave.innerHTML = '<i class="bi bi-save"></i> Save Report';
            }
        } catch (err) {
            showAlert(err.message);
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="bi bi-save"></i> Save Report';
        }
    });
});
