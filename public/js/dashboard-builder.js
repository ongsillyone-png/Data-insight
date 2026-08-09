document.addEventListener('DOMContentLoaded', () => {
    // 1. Data structures
    const charts = {};             // Keyed by uniqueWidgetId
    const reportDataCache = {};    // Keyed by reportId

    // ── Global Dashboard Filter Bar Logic ─────────────────────────────────
    const inputStartDate = document.getElementById('dash-start-date');
    const inputEndDate = document.getElementById('dash-end-date');
    const inputSearchText = document.getElementById('dash-search-text');
    const btnApplyDashFilters = document.getElementById('btn-apply-dash-filters');

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const firstDayStr = `${year}-${month}-01`;
    const todayStr = `${year}-${month}-${String(now.getDate()).padStart(2, '0')}`;

    if (inputStartDate && !inputStartDate.value) {
        inputStartDate.value = firstDayStr;
    }
    if (inputEndDate && !inputEndDate.value) {
        inputEndDate.value = todayStr;
    }

    function getGlobalDashFilters() {
        const sDate = document.getElementById('dash-start-date')?.value || firstDayStr;
        const eDate = document.getElementById('dash-end-date')?.value || todayStr;
        const posSelect = document.getElementById('dash-position-id');
        let selectedPos = [];
        if (posSelect) {
            selectedPos = Array.from(posSelect.selectedOptions).map(o => o.value);
        }
        const searchInput = document.getElementById('dash-search-text');
        const search = searchInput ? searchInput.value.trim() : '';

        const posValue = selectedPos.length > 0 ? (selectedPos.length === 1 ? selectedPos[0] : selectedPos) : search;

        return {
            start_date: sDate,
            begin_date: sDate,
            end_date: eDate,
            to_date: eDate,
            date: eDate,
            position_id: posValue,
            position: posValue,
            doctor_code: posValue,
            doctor: posValue,
            search_text: search,
            search: search
        };
    }

    function updateDashFilterOptions(data) {
        const posSelect = document.getElementById('dash-position-id');
        if (!posSelect || !data || !data.rows || data.rows.length === 0) return;

        const colKey = Object.keys(data.rows[0]).find(k => k.toLowerCase() === 'position_id' || k.toLowerCase() === 'position');
        if (!colKey) return;

        const currentlySelected = Array.from(posSelect.selectedOptions).map(o => o.value);
        const uniques = new Set();
        data.rows.forEach(r => {
            const v = r[colKey];
            if (v !== undefined && v !== null && String(v).trim() !== '') {
                uniques.add(String(v).trim());
            }
        });

        if (uniques.size > 0) {
            posSelect.innerHTML = '';
            Array.from(uniques).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                if (currentlySelected.includes(val)) opt.selected = true;
                posSelect.appendChild(opt);
            });
        }
    }

    // 2. Initialize GridStack
    let grid = GridStack.init({
        cellHeight: 90,
        acceptWidgets: true,
        dragIn: '.report-draggable',
        dragInOptions: { revert: 'invalid', scroll: false, appendTo: 'body', helper: 'clone' },
        margin: 10
    });

    function generateWidgetId() {
        return 'w_' + Math.random().toString(36).substr(2, 9);
    }

    // 3. Load existing layout if editing
    if (window.DASHBOARD_DATA && window.DASHBOARD_DATA.length > 0) {
        grid.load(window.DASHBOARD_DATA);
        const items = grid.getGridItems();
        items.forEach(el => {
            const node = el.gridstackNode;
            if (!node.widget_id) {
                node.widget_id = generateWidgetId();
            }
            renderWidgetContent(el, node);
        });
    }

    // 4. Handle Dropping new widgets from sidebar
    grid.on('added', function(e, items) {
        items.forEach(node => {
            if (!node.widget_id) {
                const el = node.el;
                const reportId = el.getAttribute('data-id') || node.id;
                const reportName = el.getAttribute('data-name') || node.name;
                const wId = generateWidgetId();

                grid.update(el, { id: reportId, name: reportName, widget_id: wId, w: 6, h: 4 });
                renderWidgetContent(el, node);
            }
        });
    });

    // Handle resizing to resize charts
    grid.on('resizestop', function(e, el) {
        const node = el.gridstackNode;
        if (node && node.widget_id && charts[node.widget_id]) {
            charts[node.widget_id].resize();
        }
    });

    // 5. Handle Clicking new widgets from sidebar
    document.querySelectorAll('.report-draggable').forEach(item => {
        item.addEventListener('click', () => {
            const reportId = item.getAttribute('data-id');
            const reportName = item.getAttribute('data-name');
            const wId = generateWidgetId();

            const el = grid.addWidget({
                w: 6,
                h: 4,
                id: reportId,
                name: reportName,
                widget_id: wId
            });

            const node = el.gridstackNode;
            renderWidgetContent(el, node);
        });
    });

    // 6. Widget Content Renderer
    function renderWidgetContent(el, node) {
        const reportId = node.id;
        const reportName = node.name || 'Report #' + reportId;
        const uniqueWidgetId = node.widget_id || generateWidgetId();
        node.widget_id = uniqueWidgetId;

        let contentEl = el.querySelector('.grid-stack-item-content');
        if (!contentEl) {
            contentEl = document.createElement('div');
            contentEl.className = 'grid-stack-item-content shadow-sm rounded border bg-white p-2 d-flex flex-column h-100';
            el.appendChild(contentEl);
        }

        const currentChartType = node.chart_type || 'bar';

        contentEl.innerHTML = `
            <div class="widget-header d-flex justify-content-between align-items-center border-bottom pb-1 mb-2">
                <h6 class="widget-title fw-bold text-truncate mb-0 me-2" style="font-size: 13px;" title="${reportName}">
                    <i class="bi bi-bar-chart-line text-primary me-1"></i>${reportName}
                </h6>
                <div class="d-flex align-items-center gap-1">
                    <select class="form-select form-select-sm widget-chart-type py-0 px-1" style="font-size: 11px; width: 95px; height: 24px; cursor: pointer;">
                        <option value="bar" ${currentChartType === 'bar' ? 'selected' : ''}>Bar (แนวตั้ง)</option>
                        <option value="hbar" ${currentChartType === 'hbar' ? 'selected' : ''}>H-Bar (แนวนอน)</option>
                        <option value="line" ${currentChartType === 'line' ? 'selected' : ''}>Line</option>
                        <option value="pie" ${currentChartType === 'pie' ? 'selected' : ''}>Pie</option>
                        <option value="table" ${currentChartType === 'table' ? 'selected' : ''}>Table</option>
                    </select>
                    <button type="button" class="btn btn-sm text-danger p-0 border-0 btn-remove-widget ms-1" style="line-height: 1; font-size: 16px; cursor: pointer;" title="ลบวิดเจ็ต">
                        <i class="bi bi-x-circle-fill"></i>
                    </button>
                </div>
            </div>
            <div class="widget-body flex-grow-1 position-relative" style="min-height: 0;">
                <div class="chart-container" id="chart-${uniqueWidgetId}" style="width:100%; height:100%; position:absolute; top:0; left:0;">
                    <div class="d-flex justify-content-center align-items-center h-100">
                        <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                    </div>
                </div>
            </div>
        `;

        // Bind remove button (with event stopPropagation so drag does not intercept)
        const btnRemove = contentEl.querySelector('.btn-remove-widget');
        if (btnRemove) {
            const removeHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                grid.removeWidget(el);
                if (charts[uniqueWidgetId]) {
                    charts[uniqueWidgetId].dispose();
                    delete charts[uniqueWidgetId];
                }
            };
            btnRemove.addEventListener('click', removeHandler);
            btnRemove.addEventListener('mousedown', (e) => e.stopPropagation());
        }

        // Bind chart type selector
        const selectChart = contentEl.querySelector('.widget-chart-type');
        if (selectChart) {
            selectChart.addEventListener('mousedown', (e) => e.stopPropagation());
            selectChart.addEventListener('change', (e) => {
                e.stopPropagation();
                const newType = e.target.value;
                node.chart_type = newType;
                if (reportDataCache[reportId]) {
                    renderDataInWidget(uniqueWidgetId, reportDataCache[reportId], newType);
                }
            });
        }

        // Fetch data & render
        loadWidgetData(reportId, uniqueWidgetId, currentChartType, node, contentEl);
    }

    // ── Global Dashboard Filter Apply Button Listener ──────────────────────

    btnApplyDashFilters?.addEventListener('click', () => {
        // Clear report cache to force fresh fetch for all widgets
        for (const key in reportDataCache) {
            delete reportDataCache[key];
        }

        // Re-load data for all active widgets in grid
        const items = grid.getGridItems();
        items.forEach(el => {
            const node = el.gridstackNode;
            if (node) {
                const reportId = el.getAttribute('data-id') || node.id;
                const uniqueWidgetId = node.widget_id;
                const currentChartType = node.chart_type || 'bar';
                const contentEl = el.querySelector('.grid-stack-item-content');
                if (reportId && uniqueWidgetId && contentEl) {
                    loadWidgetData(reportId, uniqueWidgetId, currentChartType, node, contentEl);
                }
            }
        });
    });

    // 7. Load Data for Widget
    async function loadWidgetData(reportId, uniqueWidgetId, preferredType, node, contentEl) {
        let data = reportDataCache[reportId];
        if (!data) {
            try {
                const globalFilters = getGlobalDashFilters();
                const paramsStr = encodeURIComponent(JSON.stringify(globalFilters));
                const res = await fetch(`/api/reports/${reportId}/data?params=${paramsStr}`);
                data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load report data');
                reportDataCache[reportId] = data;
            } catch (err) {
                const container = document.getElementById(`chart-${uniqueWidgetId}`);
                if (container) {
                    container.innerHTML = `<div class="alert alert-danger p-2 m-2" style="font-size:12px;"><i class="bi bi-exclamation-triangle me-1"></i>${err.message}</div>`;
                }
                return;
            }
        }

        let vc = data.visual_config;
        if (typeof vc === 'string') {
            try { vc = JSON.parse(vc); } catch (e) {}
        }
        data.visual_config = vc;

        const defaultReportType = (vc && vc.chart_type) || data.chart_type || 'bar';
        const effectiveType = node.chart_type || defaultReportType;
        node.chart_type = effectiveType;

        const select = contentEl.querySelector('.widget-chart-type');
        if (select && select.value !== effectiveType) select.value = effectiveType;

        updateDashFilterOptions(data);
        renderDataInWidget(uniqueWidgetId, data, effectiveType);
    }

    // 8. Render Data into Widget (Chart or HTML Table)
    function renderDataInWidget(uniqueWidgetId, data, chartType) {
        const container = document.getElementById(`chart-${uniqueWidgetId}`);
        if (!container) return;

        if (chartType === 'table') {
            if (charts[uniqueWidgetId]) {
                charts[uniqueWidgetId].dispose();
                delete charts[uniqueWidgetId];
            }

            const { yFields, xFields, rows } = aggregateWidgetData(data);
            const xArr = Array.isArray(xFields) ? xFields : [xFields];
            const tableCols = [...xArr, ...yFields];

            const ths = tableCols.map(c => `<th style="position:sticky; top:0; background:#343a40; color:#fff; font-size:11px; padding:4px 8px; z-index: 1;">${c}</th>`).join('');
            const trs = rows.map(r =>
                `<tr>${tableCols.map(c => `<td style="font-size:11px; padding:4px 8px;">${typeof r[c] === 'number' ? r[c].toLocaleString() : (r[c] ?? '')}</td>`).join('')}</tr>`
            ).join('');

            container.innerHTML = `
                <div class="table-responsive h-100" style="overflow:auto;">
                    <table class="table table-bordered table-hover table-sm mb-0">
                        <thead><tr>${ths}</tr></thead>
                        <tbody>${trs}</tbody>
                    </table>
                </div>
            `;
        } else {
            container.innerHTML = '';
            if (charts[uniqueWidgetId]) {
                charts[uniqueWidgetId].dispose();
                delete charts[uniqueWidgetId];
            }

            const chart = echarts.init(container);
            charts[uniqueWidgetId] = chart;

            const option = buildChartOption(chartType, data);
            chart.setOption(option);

            if (!container.__resizeObserver) {
                const observer = new ResizeObserver(() => chart?.resize());
                observer.observe(container);
                container.__resizeObserver = observer;
            }
        }
    }

    function aggregateWidgetData(data) {
        const rows = data.rows || [];
        const cols = data.columns || [];
        let vc = data.visual_config;
        if (typeof vc === 'string') {
            try { vc = JSON.parse(vc); } catch (e) {}
        }

        const strCols = cols.filter(c => typeof rows[0]?.[c] === 'string' || rows[0]?.[c] instanceof Date);
        const numCols = cols.filter(c => typeof rows[0]?.[c] === 'number');

        let xFields = vc && vc.x;
        if (typeof xFields === 'string' && xFields) xFields = [xFields];
        if (!Array.isArray(xFields) || xFields.length === 0) {
            xFields = [strCols[0] || cols[0]];
        }
        xFields = xFields.filter(f => cols.includes(f));
        if (xFields.length === 0) xFields = [strCols[0] || cols[0]];

        let yFields = vc && vc.y;
        if (typeof yFields === 'string' && yFields) yFields = [yFields];
        if (!Array.isArray(yFields) || yFields.length === 0) {
            const metricCols = numCols.filter(c => !c.toLowerCase().endsWith('_id') && !c.toLowerCase().endsWith('code') && c.toLowerCase() !== 'id');
            yFields = metricCols.length > 0 ? metricCols : (numCols.length > 0 ? [numCols[numCols.length - 1]] : [cols[cols.length - 1]]);
        }
        yFields = yFields.filter(f => cols.includes(f));
        if (yFields.length === 0) yFields = [numCols[0] || cols[cols.length - 1]];

        const X_SEP = ' | ';
        const labels = rows.map(r =>
            xFields.map(f => String(r[f] ?? '')).join(X_SEP)
        );

        return {
            labels,
            xFields,
            yFields,
            rows
        };
    }

    // 9. ECharts Option Builder
    function buildChartOption(type, data) {
        if (!data || !data.rows || data.rows.length === 0) return { title: { text: 'ไม่มีข้อมูล', left: 'center', top: 'center', textStyle: { fontSize: 12 } } };

        const { labels, yFields, rows } = aggregateWidgetData(data);

        if (type === 'pie') {
            const firstY = yFields[0] || (data.columns ? data.columns[data.columns.length - 1] : '');
            return {
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 10 } },
                series: [{
                    type: 'pie',
                    radius: ['30%', '65%'],
                    data: rows.map((r, idx) => ({ name: labels[idx], value: parseFloat(r[firstY]) || 0 })),
                    label: { show: false }
                }]
            };
        } else if (type === 'hbar') {
            const series = yFields.map(col => ({
                name: col,
                type: 'bar',
                data: rows.map(r => parseFloat(r[col]) || 0),
                barMaxWidth: 30
            }));
            return {
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                legend: { bottom: 0, show: yFields.length > 1, textStyle: { fontSize: 10 } },
                grid: { left: '3%', right: '4%', bottom: '12%', top: '10%', containLabel: true },
                yAxis: { type: 'category', data: labels, inverse: true, axisLabel: { fontSize: 10 } },
                xAxis: { type: 'value', axisLabel: { fontSize: 10 } },
                series
            };
        } else {
            const series = yFields.map(col => ({
                name: col,
                type: type,
                data: rows.map(r => parseFloat(r[col]) || 0),
                smooth: type === 'line',
                areaStyle: type === 'line' ? { opacity: 0.1 } : undefined,
                barMaxWidth: 40
            }));
            return {
                tooltip: { trigger: 'axis' },
                legend: { bottom: 0, show: yFields.length > 1, textStyle: { fontSize: 10 } },
                grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
                xAxis: {
                    type: 'category',
                    data: labels,
                    axisLabel: { fontSize: 10, rotate: labels.length > 8 ? 30 : 0 }
                },
                yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
                series
            };
        }
    }

    // 10. Save Dashboard
    const btnSave = document.getElementById('btn-save-dash');
    const dashTitle = document.getElementById('dash-title');
    const btnEditTitle = document.getElementById('btn-edit-title');

    btnEditTitle?.addEventListener('click', () => {
        const newTitle = prompt('Enter Dashboard Title:', dashTitle.textContent);
        if (newTitle && newTitle.trim()) {
            dashTitle.textContent = newTitle.trim();
        }
    });

    btnSave?.addEventListener('click', async () => {
        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

        try {
            const items = grid.getGridItems();
            const layout = items.map(el => {
                const node = el.gridstackNode || {};
                const selectType = el.querySelector('.widget-chart-type')?.value;
                return {
                    x: node.x,
                    y: node.y,
                    w: node.w,
                    h: node.h,
                    id: el.getAttribute('data-id') || node.id,
                    name: el.getAttribute('data-name') || node.name,
                    chart_type: selectType || node.chart_type || 'bar',
                    widget_id: node.widget_id
                };
            });

            const payload = {
                name: dashTitle.textContent.trim(),
                layout_config: layout
            };

            const isEdit = window.DASHBOARD_ID !== null;
            const url = isEdit ? `/api/dashboards/${window.DASHBOARD_ID}` : '/api/dashboards';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (res.ok) {
                alert('บันทึก Dashboard สำเร็จแล้ว!');
                if (!isEdit) {
                    window.location.href = `/dashboards/${result.id}/edit`;
                }
            } else {
                alert('Error: ' + result.error);
            }
        } catch (err) {
            alert('Failed to save dashboard: ' + err.message);
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="bi bi-save"></i> Save Dashboard';
        }
    });
});
