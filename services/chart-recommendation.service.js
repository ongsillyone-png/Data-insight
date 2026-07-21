class ChartRecommendationService {
    static recommendChart(columns, rows) {
        if (!rows || rows.length === 0) return 'table';
        
        // Analyze first row data types
        const sample = rows[0];
        let stringCols = 0;
        let numberCols = 0;
        let dateCols = 0;

        columns.forEach(col => {
            const val = sample[col];
            if (typeof val === 'number') {
                numberCols++;
            } else if (val instanceof Date || (typeof val === 'string' && !isNaN(Date.parse(val)) && val.includes('-'))) {
                dateCols++;
            } else if (typeof val === 'string') {
                stringCols++;
            }
        });

        // Heuristics
        if (dateCols === 1 && numberCols >= 1) {
            return 'line';
        }
        if (stringCols === 1 && numberCols === 1) {
            if (rows.length < 10) return 'pie';
            return 'bar';
        }
        if (stringCols === 1 && numberCols > 1) {
            return 'bar'; // could be stacked bar
        }

        return 'table'; // default fallback
    }
}

module.exports = ChartRecommendationService;
