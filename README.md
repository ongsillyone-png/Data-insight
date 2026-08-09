# 📊 Data Insight — Hospital Analytics Portal

แพลตฟอร์ม Data Analytics และ Business Intelligence (BI) แบบ Self-Service สำหรับระบบสารสนเทศโรงพยาบาล (HIS) โดยเฉพาะ ช่วยให้ Data Analyst และผู้ดูแลระบบสร้างรายงานและ Dashboard แบบไดนามิกด้วย SQL `SELECT` โดยไม่ต้องพึ่งนักพัฒนา

---

## ✨ ฟีเจอร์หลัก

- **Multi-Database** — แยกฐานข้อมูลระบบ กับฐานข้อมูล HIS อย่างชัดเจน
- **SQL Editor (Monaco)** — Editor เดียวกับ VS Code รองรับ Syntax Highlighting
- **SQL Security** — Middleware ป้องกัน `INSERT / UPDATE / DELETE / DROP` และ Stacked Queries
- **Auto Chart Recommendation** — แนะนำกราฟตาม Data Type อัตโนมัติ (Table, Bar, Pie, Line, KPI Card)
- **Dashboard Builder** — Drag & Drop จัดหน้าได้เอง
- **Password-Protected Sharing** — แชร์รายงานพร้อมรหัสผ่าน
- **Brute Force Protection** — ล็อค 5 นาทีหากล็อกอินผิดเกิน 5 ครั้ง
- **PDPA Data Masking** — ซ่อนเลขบัตรประชาชนใน Shared Link สาธารณะ
- **Session Security** — `httpOnly`, `sameSite`, `secure` cookie
- **Setup Wizard** — ติดตั้งผ่านหน้าเว็บ ไม่ต้องแก้ Config เอง

---

## 🛠️ Tech Stack

| Layer | เทคโนโลยี |
|---|---|
| Backend | Node.js v22, Express.js 5 |
| Database | MySQL 8 (mysql2 Pool) |
| View Engine | EJS |
| Frontend | Bootstrap 5, Apache ECharts, Monaco Editor |
| Security | bcryptjs, express-session |

---

## 🚀 การติดตั้งและใช้งาน

### 1. ความต้องการระบบ (Prerequisites)

- Node.js v18 ขึ้นไป
- MySQL หรือ Maridb v.10.x หรือสูงกว่า
- Git
- (Production) PM2: `npm install -g pm2`

---

### 2. ติดตั้งครั้งแรก

```bash
git clone https://github.com/ongsillyone-png/Data-insight.git
cd Data-insight
npm install
```

---

### 3. รันสำหรับ Development

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`  
ระบบจะพาเข้า **Setup Wizard** โดยอัตโนมัติ ให้ทำตามขั้นตอน:
1. ตั้งค่าฐานข้อมูลหลักของแอป (ระบบสร้างตารางให้อัตโนมัติ)
2. ตั้งค่าเชื่อมต่อฐานข้อมูล HIS
3. สร้างบัญชี Admin

หลังตั้งค่าเสร็จ **รีสตาร์ท Server** ด้วย `Ctrl+C` แล้วรัน `npm run dev` ใหม่

---

## 🏭 การขึ้น Production ด้วย PM2

PM2 คือ Process Manager สำหรับ Node.js ช่วยให้แอปทำงานตลอดเวลา รีสตาร์ทอัตโนมัติเมื่อ crash และ boot ตั้งแต่เปิดเครื่อง

### ขั้นตอนที่ 1: ติดตั้ง PM2

```bash
npm install -g pm2
```

### ขั้นตอนที่ 2: ตั้งค่า Environment

สร้างไฟล์ `.env` ใน root ของโปรเจกต์ (ถ้ายังไม่มี):

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-very-long-random-secret-key-here
APP_INSTALLED=true
```

> ⚠️ **สำคัญ**: เปลี่ยน `SESSION_SECRET` เป็น random string ยาวๆ เสมอในโหมด production  
> สร้างได้ด้วย: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### ขั้นตอนที่ 3: รันด้วย PM2

```bash
# รันด้วย ecosystem config (แนะนำ)
pm2 start ecosystem.config.js --env production

# หรือรันตรงๆ
pm2 start app.js --name data-insight --env production
```

### ขั้นตอนที่ 4: ตั้งให้รันอัตโนมัติเมื่อเปิดเครื่อง (Startup)

```bash
pm2 startup
# คัดลอกคำสั่งที่ PM2 แสดงออกมา แล้วรัน
pm2 save
```

---

## 🔧 คำสั่ง PM2 ที่ใช้บ่อย

```bash
# ดูสถานะทุก process
pm2 status

# ดู Log แบบ realtime
pm2 logs data-insight

# รีสตาร์ทแอป
pm2 restart data-insight

# หยุดแอป
pm2 stop data-insight

# ลบออกจาก PM2
pm2 delete data-insight

# ดูการใช้ CPU / RAM
pm2 monit
```

---

## 📁 โครงสร้างโปรเจกต์

```
Data-insight/
├── app.js                    # Entry point
├── ecosystem.config.js       # PM2 config
├── package.json
├── .env                      # Environment variables (ไม่อยู่ใน Git)
├── controllers/              # Business logic
│   ├── auth.controller.js    # Login + Brute Force Protection
│   ├── report.controller.js
│   ├── dashboard.controller.js
│   └── shared.controller.js  # Public share + PDPA masking
├── middlewares/
│   ├── auth.middleware.js    # RBAC / session check
│   └── sql-validator.middleware.js  # SQL security
├── services/
│   ├── sql-execution.service.js
│   └── sql-param.service.js
├── models/                   # Database models
├── routes/                   # Express routes
├── views/pages/              # EJS templates
├── public/js/                # Client-side JS
│   ├── dashboard-builder.js  # Dashboard widget engine
│   ├── report-builder.js     # Report builder engine
│   └── report-view.js        # Report view + chart engine
└── logs/                     # PM2 log files (auto-created)
```

---

## 🔐 Security Features

| มาตรการ | รายละเอียด |
|---|---|
| SQL Injection Prevention | Middleware บล็อก DDL/DML และ Stacked Queries (`;`) |
| XSS Protection | `escapeHtml()` ครอบ cell ทุกตัวก่อน render |
| Brute Force Protection | ล็อค 5 นาทีหากผิดเกิน 5 ครั้ง (นับต่อ IP) |
| Session Security | `httpOnly`, `sameSite: lax`, `secure` บน Production |
| PDPA Masking | ซ่อน CID 13 หลักใน Public Shared Links |

---

## 🛣️ Roadmap

- [x] Sprint 1: โครงสร้างหลัก, ฐานข้อมูล, Login, Layout
- [x] Sprint 2: Report Builder Engine, SQL Security, Auto Chart
- [x] Sprint 3: Dashboard Builder (Drag & Drop)
- [x] Sprint 4: Export PDF/Excel, RBAC, Audit Logs
- [x] Sprint 5: Password-Protected Sharing, Setup Wizard
- [x] Sprint 6: KPI Card Widget, Multi-X/Y Axis, Production Security Hardening

---

## 📄 License

โปรเจกต์นี้สร้างขึ้นสำหรับใช้งานภายในองค์กรเท่านั้น  
Developed by **ongsillyone** · [ongsillyone@gmail.com](mailto:ongsillyone@gmail.com)
.d