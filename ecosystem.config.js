// PM2 Ecosystem Configuration
// รันด้วย: pm2 start ecosystem.config.js --env production
module.exports = {
    apps: [
        {
            name: 'data-insight',           // ชื่อ process ใน PM2
            script: 'app.js',               // ไฟล์หลัก
            instances: 1,                   // จำนวน instance (1 เพียงพอสำหรับ HIS Internal)
            exec_mode: 'fork',              // ใช้ fork mode (cluster ต้องการ stateless session)
            watch: false,                   // ปิด watch ใน production
            max_memory_restart: '512M',     // รีสตาร์ทอัตโนมัติถ้าใช้ RAM เกิน 512MB
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            merge_logs: true,

            env: {
                NODE_ENV: 'development',
                PORT: 3000
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000              // เปลี่ยน port ได้ถ้าต้องการ (เช่น 80 หรือ 8080)
            }
        }
    ]
};
