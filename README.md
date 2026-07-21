# 📊 Data Insight (Dynamic Report Builder)

แพลตฟอร์ม Data Analytics และ Business Intelligence (BI) แบบ Self-Service ที่ออกแบบมาสำหรับระบบสารสนเทศโรงพยาบาล (HIS) โดยเฉพาะ เครื่องมือนี้ช่วยให้ Data Analyst และผู้ดูแลระบบสามารถสร้างรายงานและ Dashboard แบบไดนามิกได้ด้วยตนเอง เพียงแค่เขียนคำสั่ง SQL `SELECT` โดยไม่จำเป็นต้องพึ่งพานักพัฒนาโปรแกรมในการเขียนหน้าจอใหม่ทุกครั้ง

## ✨ ฟีเจอร์หลัก

- **รองรับหลายฐานข้อมูล (Multi-Database)**: แยกระบบฐานข้อมูลของแอปพลิเคชัน (สำหรับเก็บข้อมูล User, Dashboard) ออกจากฐานข้อมูล HIS (สำหรับดึงข้อมูล) อย่างชัดเจน
- **SQL Editor ประสิทธิภาพสูง**: ผสานการทำงานกับ **Monaco Editor** (ตัวเดียวกับที่ใช้ใน VS Code) รองรับ Syntax Highlighting
- **ความปลอดภัยระดับสูง (SQL Security)**: มี Middleware ดักจับและป้องกันคำสั่งที่แก้ไขข้อมูล (เช่น `INSERT`, `UPDATE`, `DELETE`, `DROP`) ทำให้มั่นใจได้ว่าฐานข้อมูล HIS จะปลอดภัย 100%
- **ระบบเลือกกราฟอัตโนมัติ (Auto Chart Recommendation)**: ระบบจะวิเคราะห์ชนิดของข้อมูล (Data Types) และแนะนำประเภทของกราฟที่เหมาะสมให้โดยอัตโนมัติ (Table, Bar, Pie, Line)
- **การเข้ารหัสข้อมูลสำคัญ (Environment Encryption)**: มีสคริปต์เข้ารหัสรหัสผ่านฐานข้อมูลในไฟล์ `.env` ด้วย AES-256-CBC
- **UI ทันสมัยสำหรับองค์กร**: ออกแบบอย่างสวยงามและใช้งานง่ายด้วย **AdminLTE 4** และ **Bootstrap 5**

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

**Backend:**
- Node.js (v22)
- Express.js
- MySQL2 (Promise-based Connection Pool)
- bcryptjs & crypto (Security)

**Frontend:**
- EJS (Embedded JavaScript templates)
- AdminLTE 4 & Bootstrap 5
- Apache ECharts (Data Visualization)
- Monaco Editor (SQL Editor)

## 🚀 วิธีการติดตั้งและใช้งาน

ทำตามขั้นตอนด้านล่างนี้เพื่อรันโปรเจกต์ในเครื่องของคุณ

### 1. สิ่งที่ต้องมี (Prerequisites)
- Node.js (v18 ขึ้นไป)
- MySQL Server (v8.0+)
- Git

### 2. การติดตั้ง
โคลนโปรเจกต์และติดตั้ง Dependencies:
```bash
git clone https://github.com/ongsillyone-png/Data-insight.git
cd Data-insight
npm install
```

### 3. ตั้งค่าฐานข้อมูล
1. สร้างฐานข้อมูลชื่อ `data_insight` ใน MySQL Server ของคุณ
2. นำเข้าโครงสร้างตารางโดยรันไฟล์สคริปต์ `database.sql` ที่อยู่ในโฟลเดอร์หลัก
   *(สคริปต์นี้จะสร้างตารางและสร้าง User ผู้ดูแลระบบเริ่มต้นให้)*

### 4. การตั้งค่า Environment
คัดลอกไฟล์ตั้งค่าเริ่มต้น:
```bash
cp .env.example .env
```
เปิดไฟล์ `.env` และกรอกข้อมูลการเชื่อมต่อสำหรับฐานข้อมูลระบบ (`data_insight`) และฐานข้อมูล HIS

#### 🔒 การเข้ารหัสรหัสผ่านฐานข้อมูล
เพื่อความปลอดภัย ห้ามเก็บรหัสผ่านเป็นข้อความธรรมดา ให้รันสคริปต์เข้ารหัสดังนี้:
```bash
node encrypt-password.js "รหัสผ่านที่แท้จริงของคุณ"
```
คัดลอกข้อความผลลัพธ์ที่ขึ้นต้นด้วย `ENC:...` ไปวางในไฟล์ `.env` ตรงค่า `DB_PASSWORD` และ `HIS_DB_PASSWORD`

### 5. รันโปรแกรม
เริ่มต้น Development Server:
```bash
npm run dev
```
แอปพลิเคชันจะรันอยู่ที่ `http://localhost:3000`

**บัญชีสำหรับเข้าระบบ (Default Login):**
- **อีเมล:** `admin@example.com`
- **รหัสผ่าน:** `password123`

## 🛣️ แผนการพัฒนา (Roadmap)

- [x] **Sprint 1:** โครงสร้างหลักของโปรเจกต์, ฐานข้อมูล, ระบบล็อกอิน และ Layout
- [x] **Sprint 2:** Report Builder Engine, ระบบกรอง SQL และกราฟอัตโนมัติ
- [ ] **Sprint 3:** Dashboard Builder (ระบบจัดหน้าจอด้วยการลากวาง - Drag & Drop)
- [ ] **Sprint 4:** Enterprise Features (การ Export เป็น PDF/Excel, ระบบจำกัดสิทธิ์ และ Audit Logs)

## 📄 ลิขสิทธิ์ (License)
โปรเจกต์นี้สร้างขึ้นสำหรับใช้งานภายในองค์กรเท่านั้น
