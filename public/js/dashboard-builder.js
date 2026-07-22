document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize GridStack
    let grid = GridStack.init({
        cellHeight: 100,
        acceptWidgets: true,
        dragIn: '.report-draggable', // class that can be dragged from outside
        dragInOptions: { revert: 'invalid', scroll: false, appendTo: 'body', helper: 'clone' },
        margin: 10
    });

    const charts = {}; // Store echarts instances by widget id

    // 2. Load existing layout if editing
    if (window.DASHBOARD_DATA && window.DASHBOARD_DATA.length > 0) {
        grid.load(window.DASHBOARD_DATA);
        // GridStack creates the nodes, now we need to render the charts inside them
        const items = grid.getGridItems();
        items.forEach(el => {
            const node = el.gridstackNode;
            renderWidgetContent(el, node.id, node.name);
        });
    }

    // 3. Handle Dropping new widgets from the sidebar
    grid.on('added', function(e, items) {
        items.forEach(node => {
            // If it's a new drop from the sidebar, it won't have an ID as a grid item yet, but we passed data-id
            if (!node.id) {
                // The original dragged element
                const el = node.el;
                const reportId = el.getAttribute('data-id');
                const reportName = el.getAttribute('data-name');
                
                // Set the node properties
                grid.update(el, { id: reportId, name: reportName, w: 4, h: 3 });
                
                // Clear the "grip" text that was cloned
                el.innerHTML = '';
                
                // Render the actual chart content
                renderWidgetContent(el, reportId, reportName);
            }
        });
    });

    // Handle resizing to resize charts
    grid.on('resizestop', function(e, el) {
        const reportId = el.gridstackNode.id;
        if (charts[reportId]) {
            charts[reportId].resize();
        }
    });

    // 4. Widget Content Renderer
    function renderWidgetContent(el, reportId, reportName) {
        // Create UI structure for widget
        el.innerHTML = `
            <div class="grid-stack-item-content">
                <div class="widget-header">
                    <h6 class="widget-title" title="${reportName}">${reportName}</h6>
                    <i class="bi bi-x btn-remove-widget" data-id="${reportId}"></i>
                </div>
                <div class="widget-body">
                    <div class="chart-container" id="chart-${reportId}">
                        <div class="d-flex justify-content-center align-items-center h-100">
                            <div class="spinner-border text-primary" role="status"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind remove button
        el.querySelector('.btn-remove-widget').addEventListener('click', () => {
            grid.removeWidget(el);
            if (charts[reportId]) {
                charts[reportId].dispose();
                delete charts[reportId];
            }
        });

        // Fetch data and render chart
        fetchChartData(reportId);
    }

    // 5. Fetch and Render Chart Data
    async function fetchChartData(reportId) {
        try {
            const res = await fetch(`/api/reports/${reportId}/data`);
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error);

            const container = document.getElementById(`chart-${reportId}`);
            if (!container) return; // widget might have been removed

            // Initialize EChart
            const chart = echarts.init(container);
            charts[reportId] = chart;

            // Prepare ECharts Option
            const option = buildChartOption(data.chart_type, data.columns, data.rows);
            chart.setOption(option);
            
            // Re-bind resize since container changed
            new ResizeObserver(() => chart.resize()).observe(container);

        } catch (err) {
            const container = document.getElementById(`chart-${reportId}`);
            if (container) {
                container.innerHTML = `<div class="alert alert-danger p-1 m-1" style="font-size:12px;">Error: ${err.message}</div>`;
            }
        }
    }

    function buildChartOption(type, cols, rows) {
        if (!rows || rows.length === 0) return { title: { text: 'No Data' }};
        
        let labelCol = cols[0];
        let valCol = cols.length > 1 ? cols[1] : cols[0];

        const stringCols = cols.filter(c => typeof rows[0][c] === 'string');
        const numCols = cols.filter(c => typeof rows[0][c] === 'number');
        
        if (stringCols.length > 0) labelCol = stringCols[0];
        if (numCols.length > 0) valCol = numCols[0];

        const labels = rows.map(r => r[labelCol]);
        const values = rows.map(r => r[valCol]);

        if (type === 'pie') {
            return {
                tooltip: { trigger: 'item' },
                series: [{
                    type: 'pie',
                    radius: '70%',
                    data: rows.map(r => ({ name: r[labelCol], value: r[valCol] }))
                }]
            };
        } else if (type === 'table') {
            // Echarts doesn't do native HTML tables easily, but we can just use a fake grid or a text graphic.
            // For simplicity in a chart library, if they chose table but we only have echarts, 
            // let's fallback to bar chart or just show a message since we didn't implement a custom HTML table widget here.
            // Actually, we can just replace the echarts container with an HTML table.
            return {
                title: { text: 'Table view is best viewed in Report mode.', textStyle: {fontSize: 12}},
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: labels },
                yAxis: { type: 'value' },
                series: [{ data: values, type: 'bar' }]
            };
        } else {
            return {
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: labels },
                yAxis: { type: 'value' },
                series: [{ data: values, type: type }]
            };
        }
    }

    // 6. Save Dashboard functionality
    const btnSave = document.getElementById('btn-save-dash');
    const dashTitle = document.getElementById('dash-title');
    const btnEditTitle = document.getElementById('btn-edit-title');

    btnEditTitle.addEventListener('click', () => {
        const newTitle = prompt('Enter Dashboard Title:', dashTitle.textContent);
        if (newTitle) {
            dashTitle.textContent = newTitle;
        }
    });

    btnSave.addEventListener('click', async () => {
        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

        try {
            // Save just the layout coordinates, ids, and names
            const layout = grid.save().map(node => ({
                x: node.x, y: node.y, w: node.w, h: node.h, id: node.id, name: node.name
            }));
            
            const payload = {
                name: dashTitle.textContent,
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
                alert('Dashboard saved successfully!');
                if (!isEdit) {
                    window.location.href = `/dashboards/${result.id}/edit`;
                }
            } else {
                alert('Error: ' + result.error);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="bi bi-save"></i> Save Dashboard';
        }
    });
});
