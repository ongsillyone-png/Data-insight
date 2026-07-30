class SqlParamService {
    /**
     * Thai Label Humanizer Dictionary for HIS field names
     */
    static getHumanLabel(name) {
        if (!name) return '';
        const n = name.toLowerCase();
        
        const dictionary = {
            'start_date': 'วันที่เริ่มต้น',
            'begin_date': 'วันที่เริ่มต้น',
            'end_date': 'ถึงวันที่',
            'to_date': 'ถึงวันที่',
            'date': 'วันที่',
            'vstdate': 'วันที่รับบริการ',
            'hn': 'HN คนไข้',
            'patient_hn': 'HN คนไข้',
            'an': 'AN ผู้ป่วยใน',
            'vn': 'VN ผู้ป่วยนอก',
            'cid': 'เลขบัตรประชาชน',
            'idcard': 'เลขบัตรประชาชน',
            'patient_name': 'ชื่อ-นามสกุล คนไข้',
            'pt_name': 'ชื่อ-นามสกุล คนไข้',
            'doctor_code': 'รหัสแพทย์',
            'doctor': 'แพทย์ผู้ตรวจ',
            'clinic': 'คลินิก/แผนก',
            'clinic_code': 'รหัสคลินิก',
            'dept': 'แผนก',
            'department': 'แผนก',
            'ward': 'หอผู้ป่วย (Ward)',
            'ward_code': 'รหัสหอผู้ป่วย',
            'position': 'ตำแหน่ง',
            'position_id': 'ตำแหน่ง',
            'pttype': 'สิทธิการรักษา',
            'icd10': 'รหัสโรค (ICD10)',
            'diag': 'รหัสโรค',
            'pdx': 'โรคหลัก (PDX)',
            'search_text': 'คำค้นหา',
            'search': 'คำค้นหา',
            'icode': 'รหัสยา/ค่าบริการ'
        };

        if (dictionary[n]) return dictionary[n];

        // Format snake_case to Title Case (e.g., patient_age -> Patient Age)
        return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Extract parameter placeholders from SQL string
     * e.g. {{start_date}}, {{position_id:in|เลือกหลายตำแหน่ง}}, {{position:select:หมอ,พยาบาล|ตำแหน่ง}}
     */
    static parseParameters(sql) {
        if (!sql || typeof sql !== 'string') return [];

        const regex = /\{\{\s*([a-zA-Z0-9_]+)(?:\s*:\s*([a-zA-Z0-9_]+))?(?::\s*([^|}]+))?(?:\s*\|\s*([^}]+))?\s*\}\}/g;
        const paramsMap = new Map();
        let match;

        while ((match = regex.exec(sql)) !== null) {
            const raw = match[0];
            const name = match[1];
            let type = match[2] ? match[2].toLowerCase() : null;
            const rawOptions = match[3] ? match[3].trim() : null;
            const customLabel = match[4] ? match[4].trim() : null;

            if (!type) {
                if (name.includes('date') || name === 'start' || name === 'end') {
                    type = 'date';
                } else if (name.includes('code') || name.includes('type') || name.includes('dept') || name.includes('doctor') || name.includes('clinic') || name.includes('position')) {
                    type = 'select';
                } else {
                    type = 'text';
                }
            }

            // Standardize multi-select IN type
            if (type === 'in' || type === 'multiselect' || type === 'multi') {
                type = 'in';
            }

            const options = rawOptions ? rawOptions.split(',').map(o => o.trim()).filter(Boolean) : [];
            const label = customLabel || this.getHumanLabel(name);

            if (!paramsMap.has(name)) {
                paramsMap.set(name, { name, type, options, label, raw });
            }
        }

        return Array.from(paramsMap.values());
    }

    /**
     * Safely escape and replace placeholders with user values supporting =, LIKE, IN, BETWEEN operators
     */
    static processSql(sql, userParams = {}) {
        if (!sql || typeof sql !== 'string') return sql;

        const regex = /\{\{\s*([a-zA-Z0-9_]+)(?:\s*:\s*([a-zA-Z0-9_]+))?(?::\s*([^|}]+))?(?:\s*\|\s*([^}]+))?\s*\}\}/g;

        let resultSql = sql;

        // Pass 1: Replace IN (...) or IN {{param}}
        resultSql = resultSql.replace(/IN\s*\(?\s*\{\{\s*([a-zA-Z0-9_]+)(?:\s*:\s*([a-zA-Z0-9_]+))?(?::\s*([^|}]+))?(?:\s*\|\s*([^}]+))?\s*\}\}\s*\)?/gi, (match, name) => {
            let val = userParams[name];
            if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
                return "LIKE '%'"; // Empty selection matches all
            }
            if (typeof val === 'string') {
                val = val.split(',').map(s => s.trim()).filter(Boolean);
            }
            if (Array.isArray(val) && val.length > 0) {
                const escapedArr = val.map(v => {
                    const str = String(v).trim();
                    if (/^-?\d+(\.\d+)?$/.test(str)) return str;
                    return `'${str.replace(/'/g, "\\'")}'`;
                });
                return `IN (${escapedArr.join(', ')})`;
            }
            return "LIKE '%'";
        });

        // Pass 2: Handle empty values for dropdown/text parameters preceded by = or LIKE
        resultSql = resultSql.replace(/(=\s*\(?|LIKE\s+)\{\{\s*([a-zA-Z0-9_]+)(?:\s*:\s*([a-zA-Z0-9_]+))?(?::\s*([^|}]+))?(?:\s*\|\s*([^}]+))?\s*\}\}(\)?)/gi, (match, prefix, name, typeHint, opt, label, suffix) => {
            const val = userParams[name];
            if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
                if (name === 'start_date' || name === 'begin_date') {
                    const firstDayOfMonth = new Date(); firstDayOfMonth.setDate(1);
                    return `${prefix}'${firstDayOfMonth.toISOString().slice(0, 10)}'${suffix}`;
                }
                if (name === 'end_date' || name === 'date' || name === 'today') {
                    return `${prefix}'${new Date().toISOString().slice(0, 10)}'${suffix}`;
                }
                return `LIKE '%'`;
            }
            return match;
        });

        // Pass 3: Standard replacement for remaining placeholders
        return resultSql.replace(regex, (match, name) => {
            let val = userParams[name];
            if (Array.isArray(val)) val = val.join(',');
            
            if (val === undefined || val === null || val === '') {
                if (name === 'start_date' || name === 'begin_date') {
                    const firstDayOfMonth = new Date(); firstDayOfMonth.setDate(1);
                    return `'${firstDayOfMonth.toISOString().slice(0, 10)}'`;
                }
                if (name === 'end_date' || name === 'date' || name === 'today') {
                    return `'${new Date().toISOString().slice(0, 10)}'`;
                }
                return `'%'`;
            }

            const strVal = String(val).trim();

            if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
                return `'${strVal}'`;
            }

            if (/^-?\d+(\.\d+)?$/.test(strVal)) {
                return strVal;
            }

            const escaped = strVal.replace(/'/g, "\\'");
            return `'${escaped}'`;
        });
    }
}

module.exports = SqlParamService;
