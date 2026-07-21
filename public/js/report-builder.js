document.addEventListener('DOMContentLoaded', () => {
    let editor;
    let chartInstance;
    let currentData = null;

    // Initialize Monaco Editor
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        editor = monaco.editor.create(document.getElementById('sql-editor'), {
            value: 'SELECT * FROM users;\n',
            language: 'sql',
            theme: 'vs-light',
            minimap: { enabled: false },
            automaticLayout: true
        });
    });

    const btnRun = document.getElementById('btn-run');
    const btnSave = document.getElementById('btn-save');
    const chartTypeSelect = document.getElementById('chart-type');
    
    const alertBox = document.getElementById('alert-box');
    const emptyState = document.getElementById('empty-state');
    const tablePreview = document.getElementById('table-preview');
    const chartPreview = document.getElementById('chart-preview');
    
    const thead = document.querySelector('#result-table thead tr');
    const tbody = document.querySelector('#result-table tbody');

    function showAlert(msg, isError = true) {
        alertBox.textContent = msg;
        alertBox.className = `alert alert-${isError ? 'danger' : 'success'}`;
        alertBox.classList.remove('d-none');
    }

    function hideAlert() {
        alertBox.classList.add('d-none');
    }

    btnRun.addEventListener('click', async () => {
        if (!editor) return;
        const sql = editor.getValue();
        hideAlert();
        
        btnRun.disabled = true;
        btnRun.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Running...';

        try {
            const res = await fetch('/api/reports/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql_query: sql })
            });
            const result = await res.json();
            
            if (!res.ok) {
                showAlert(result.error || 'Execution failed');
            } else {
                currentData = result;
                // Auto change select box
                chartTypeSelect.value = result.recommendedChart;
                renderPreview();
                btnSave.disabled = false;
            }
        } catch (err) {
            showAlert(err.message);
        } finally {
            btnRun.disabled = false;
            btnRun.innerHTML = '<i class="bi bi-play-fill"></i> Run SQL';
        }
    });

    chartTypeSelect.addEventListener('change', () => {
        if (currentData) renderPreview();
    });

    function renderPreview() {
        emptyState.classList.add('d-none');
        
        const type = chartTypeSelect.value;
        if (type === 'table') {
            chartPreview.classList.add('d-none');
            tablePreview.classList.remove('d-none');
            renderTable(currentData.columns, currentData.rows);
        } else {
            tablePreview.classList.add('d-none');
            chartPreview.classList.remove('d-none');
            renderChart(type, currentData.columns, currentData.rows);
        }
    }

    function renderTable(cols, rows) {
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        cols.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            thead.appendChild(th);
        });

        rows.forEach(row => {
            const tr = document.createElement('tr');
            cols.forEach(col => {
                const td = document.createElement('td');
                td.textContent = row[col];
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    function renderChart(type, cols, rows) {
        if (!chartInstance) {
            chartInstance = echarts.init(document.getElementById('chart-preview'));
        }
        
        // Simple mapping: first string col = X axis/Names, first number col = Y axis/Values
        let labelCol = cols[0];
        let valCol = cols.length > 1 ? cols[1] : cols[0];

        // Try to find a better fit
        const stringCols = cols.filter(c => rows.length && typeof rows[0][c] === 'string');
        const numCols = cols.filter(c => rows.length && typeof rows[0][c] === 'number');
        
        if (stringCols.length > 0) labelCol = stringCols[0];
        if (numCols.length > 0) valCol = numCols[0];

        const labels = rows.map(r => r[labelCol]);
        const values = rows.map(r => r[valCol]);

        let option = {};

        if (type === 'pie') {
            option = {
                tooltip: { trigger: 'item' },
                series: [{
                    type: 'pie',
                    radius: '50%',
                    data: rows.map(r => ({ name: r[labelCol], value: r[valCol] }))
                }]
            };
        } else {
            option = {
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: labels },
                yAxis: { type: 'value' },
                series: [{ data: values, type: type }]
            };
        }

        chartInstance.setOption(option, true);
        chartInstance.resize();
    }

    btnSave.addEventListener('click', async () => {
        if (!currentData || !editor) return;
        
        const name = prompt('Enter Report Name:', 'Untitled Report');
        if (!name) return;

        const description = prompt('Enter Description (optional):', '');
        
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    sql_query: editor.getValue(),
                    chart_type: chartTypeSelect.value,
                    chart_config: {}
                })
            });
            
            const result = await res.json();
            if (res.ok) {
                showAlert('Report saved successfully!', false);
                setTimeout(() => window.location.href = '/reports', 1500);
            } else {
                showAlert(result.error || 'Failed to save report');
            }
        } catch (err) {
            showAlert(err.message);
        }
    });
});
